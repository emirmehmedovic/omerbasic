#!/usr/bin/env python3
"""
Smart Cross-Link: Za svaki proizvod pronađi motore sa kojima je već povezan,
a onda pronađi druge brendove/modele sa istim engine kodovima i povežiih.

Primjer:
- Proizvod je povezan sa BMW sa motorom S52 B32 (326S2)
- Skripta pronalazi sve brendove koji imaju motor sa kodom S52 B32
- Poveza proizvod sa svim njima (osim BMW-a sa kojim je već povezan)
"""

import asyncio
import asyncpg
import argparse
import os
from datetime import datetime
from typing import Optional, List, Dict, Set
from collections import defaultdict
import csv
from dotenv import load_dotenv

load_dotenv()

# Koristi DATABASE_URL iz .env ili environ, inače koristi default
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://emiir:emirMehmedovic123456789omerbasic@localhost:5432/omerbasicdb")


class SmartProductLinker:
    def __init__(self, dry_run: bool = False, report_path: Optional[str] = None, product_id: Optional[str] = None, limit: Optional[int] = None):
        self.dry_run = dry_run
        self.report_path = report_path
        self.product_id = product_id
        self.limit = limit
        self.conn: Optional[asyncpg.Connection] = None
        self.report_rows: List[Dict] = []
        self.stats = {
            "products_processed": 0,
            "engine_codes_found": 0,
            "matching_generations": 0,
            "fitments_created": 0,
            "fitments_skipped": 0,
            "errors": 0,
        }

    async def connect(self):
        self.conn = await asyncpg.connect(DATABASE_URL)
        print("✓ Povezan na bazu")

    async def disconnect(self):
        if self.conn:
            await self.conn.close()
            print("✓ Okinuta konekcija sa bazom")

    async def get_products_with_fitments(self) -> List[Dict]:
        """Pronađi sve proizvode sa vehicle fitmentima"""
        if self.product_id:
            query = f"""
                SELECT DISTINCT p.id, p.name, p."catalogNumber"
                FROM "Product" p
                INNER JOIN "ProductVehicleFitment" pvf ON p.id = pvf."productId"
                WHERE p.id = '{self.product_id}'
            """
        else:
            query = """
                SELECT DISTINCT p.id, p.name, p."catalogNumber"
                FROM "Product" p
                INNER JOIN "ProductVehicleFitment" pvf ON p.id = pvf."productId"
                WHERE p."isArchived" = false
                ORDER BY p.name
                LIMIT $1
            """
            limit = self.limit or 10  # Default limit za safety
            products = await self.conn.fetch(query, limit)
            return products

        products = await self.conn.fetch(query)
        return products

    async def get_product_fitments(self, product_id: str) -> List[Dict]:
        """Pronađi sve vehicle fitmente za proizvod sa detaljima"""
        query = """
            SELECT
                pvf.id as fitment_id,
                pvf."generationId",
                pvf."engineId",
                ve.id as engine_id,
                ve."engineCode",
                ve."engineType",
                ve."enginePowerKW",
                ve."engineCapacity",
                vg.id as generation_id,
                vg.name as generation_name,
                vm.id as model_id,
                vm.name as model_name,
                vb.id as brand_id,
                vb.name as brand_name
            FROM "ProductVehicleFitment" pvf
            LEFT JOIN "VehicleGeneration" vg ON pvf."generationId" = vg.id
            LEFT JOIN "VehicleModel" vm ON vg."modelId" = vm.id
            LEFT JOIN "VehicleBrand" vb ON vm."brandId" = vb.id
            LEFT JOIN "VehicleEngine" ve ON pvf."engineId" = ve.id
            WHERE pvf."productId" = $1
            ORDER BY vb.name, vm.name, vg.name
        """

        fitments = await self.conn.fetch(query, product_id)
        return fitments

    async def get_generations_with_engine_code(self, engine_code: str, exclude_brand_id: str) -> List[Dict]:
        """
        Pronađi sve generacije sa istim engine code-om,
        ali isključi marku koja je već povezana
        """
        query = """
            SELECT
                ve.id as engine_id,
                ve."engineCode",
                ve."engineType",
                ve."enginePowerKW",
                ve."engineCapacity",
                vg.id as generation_id,
                vg.name as generation_name,
                vm.id as model_id,
                vm.name as model_name,
                vb.id as brand_id,
                vb.name as brand_name
            FROM "VehicleEngine" ve
            INNER JOIN "VehicleGeneration" vg ON ve."generationId" = vg.id
            INNER JOIN "VehicleModel" vm ON vg."modelId" = vm.id
            INNER JOIN "VehicleBrand" vb ON vm."brandId" = vb.id
            WHERE ve."engineCode" = $1
            AND vb.id != $2
            ORDER BY vb.name, vm.name, vg.name
        """

        generations = await self.conn.fetch(query, engine_code, exclude_brand_id)
        return generations

    async def check_fitment_exists(self, product_id: str, generation_id: str, engine_id: Optional[str]) -> bool:
        """Provjeri da li već postoji fitment"""
        query = """
            SELECT 1 FROM "ProductVehicleFitment"
            WHERE "productId" = $1
            AND "generationId" = $2
            AND "engineId" IS NOT DISTINCT FROM $3
        """

        result = await self.conn.fetch(query, product_id, generation_id, engine_id)
        return len(result) > 0

    async def create_fitment(self, product_id: str, generation_id: str, engine_id: Optional[str],
                            fitment_notes: str) -> Optional[str]:
        """Kreiraj novi ProductVehicleFitment"""
        import uuid

        if self.dry_run:
            return "DRY_RUN_ID"

        # Generiši CUID-like ID (Prisma format)
        import secrets
        import string
        def generate_cuid():
            chars = string.ascii_lowercase + string.digits
            return ''.join(secrets.choice(chars) for _ in range(24))

        new_id = generate_cuid()

        query = """
            INSERT INTO "ProductVehicleFitment"
            (id, "productId", "generationId", "engineId", "fitmentNotes", "createdAt", "updatedAt")
            VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
            RETURNING id
        """

        try:
            result = await self.conn.fetchval(query, new_id, product_id, generation_id, engine_id, fitment_notes)
            return result
        except asyncpg.UniqueViolationError:
            return None
        except Exception as e:
            print(f"        ✗ Greška: {e}")
            self.stats["errors"] += 1
            return None

    async def process_product(self, product: Dict) -> int:
        """Obradi jedan proizvod"""
        product_id = product['id']
        product_name = product['name']
        catalog_number = product['catalogNumber']

        print(f"\n📦 Proizvod: {product_name} ({catalog_number})")
        print("=" * 80)

        # 1. Pronađi sve motore koji su već povezani
        fitments = await self.get_product_fitments(product_id)

        if not fitments:
            print("  ℹ Nema povezanih vozila")
            return 0

        print(f"  ✓ Pronađeno {len(fitments)} povezanih vozila")

        # 2. Skupi engine kodove i brendove koji su već povezani
        engine_codes: Set[str] = set()
        connected_brands: Set[str] = set()

        for fitment in fitments:
            engine_code = fitment['engineCode']
            brand_name = fitment['brand_name']

            if engine_code:
                engine_codes.add(engine_code)
            if brand_name:
                connected_brands.add(brand_name)

        print(f"  ✓ Engine kodovi: {', '.join(sorted(engine_codes)) or 'nema'}")
        print(f"  ✓ Brendovi: {', '.join(sorted(connected_brands))}")

        if not engine_codes:
            print("  ℹ Nema engine kodova za cross-linking")
            return 0

        new_fitments = 0

        # 3. Za svaki engine kod, pronađi druge brendove sa istim kodom
        for engine_code in sorted(engine_codes):
            print(f"\n  🔍 Tražim engine kod: {engine_code}")

            # Pronađi prvi fitment sa ovim engine kodom da vidim koju marku da isključim
            first_fitment = next((f for f in fitments if f['engineCode'] == engine_code), None)
            if not first_fitment:
                continue

            exclude_brand_id = first_fitment['brand_id']
            exclude_brand_name = first_fitment['brand_name']

            # Pronađi sve generacije sa istim engine code-om (osim te marke)
            other_generations = await self.get_generations_with_engine_code(engine_code, exclude_brand_id)

            if not other_generations:
                print(f"    ℹ Nema drugih brendova sa engine kodom {engine_code}")
                continue

            print(f"    ✓ Pronađeno {len(other_generations)} generacija u drugim brendovima")

            # 4. Povežи proizvod sa svim pronađenim generacijama
            for gen in other_generations:
                brand = gen['brand_name']
                model = gen['model_name']
                generation = gen['generation_name']
                generation_id = gen['generation_id']
                engine_id = gen['engine_id']

                # Provjeri da li već postoji veza
                exists = await self.check_fitment_exists(product_id, generation_id, engine_id)

                if exists:
                    print(f"      ⊘ Već povezano: {brand} {model} {generation}")
                    self.stats["fitments_skipped"] += 1
                else:
                    # Kreiraj novu vezu
                    fitment_notes = f"Auto-linked by engine code {engine_code}"
                    result = await self.create_fitment(product_id, generation_id, engine_id, fitment_notes)

                    if result:
                        status = "✓" if not self.dry_run else "✓ (DRY)"
                        print(f"      {status} Kreirano: {brand} {model} {generation}")
                        new_fitments += 1
                        self.stats["fitments_created"] += 1
                        self.stats["matching_generations"] += 1

                        self.report_rows.append({
                            "timestamp": datetime.now().isoformat(),
                            "product_id": product_id,
                            "product_name": product_name,
                            "catalog_number": catalog_number,
                            "action": "created" if not self.dry_run else "dry_run_created",
                            "original_brand": exclude_brand_name,
                            "engine_code": engine_code,
                            "new_brand": brand,
                            "new_model": model,
                            "new_generation": generation,
                            "notes": fitment_notes
                        })

        return new_fitments

    async def run(self):
        """Glavna funkcija"""
        await self.connect()

        try:
            print("\n" + "="*80)
            print("🔗 SMART CROSS-LINK PRODUCTS BY ENGINE CODE")
            print("="*80)

            if self.dry_run:
                print("⚠️  DRY-RUN MODE - Bez stvarnih promjena u bazi\n")

            # Pronađi proizvode
            products = await self.get_products_with_fitments()

            if not products:
                print(f"❌ Nema pronađenih proizvoda")
                return

            print(f"\n📋 Obrađujem {len(products)} proizvod(a)")

            total_new = 0
            for product in products:
                new = await self.process_product(product)
                total_new += new
                self.stats["products_processed"] += 1

            print("\n" + "="*80)
            print("📊 STATISTIKA")
            print("="*80)
            print(f"Proizvoda obrađeno: {self.stats['products_processed']}")
            print(f"Engine kodova pronađeno: {self.stats['engine_codes_found']}")
            print(f"Matching generacija pronađeno: {self.stats['matching_generations']}")
            print(f"Novih fitmenta kreiranog: {self.stats['fitments_created']}")
            print(f"Fitmenta preskočeno (duplikata): {self.stats['fitments_skipped']}")
            print(f"Greške: {self.stats['errors']}")
            print("="*80)

            if self.report_path:
                self._write_report()

        finally:
            await self.disconnect()

    def _write_report(self):
        """Upiši CSV report"""
        with open(self.report_path, 'w', newline='', encoding='utf-8') as f:
            if self.report_rows:
                fieldnames = self.report_rows[0].keys()
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(self.report_rows)
                print(f"\n📄 Report upisano: {self.report_path} ({len(self.report_rows)} redaka)")
            else:
                print(f"\n📄 Report je prazan (nema novih veza)")


async def main():
    parser = argparse.ArgumentParser(description="Smart cross-link products by engine code")
    parser.add_argument("--dry-run", action="store_true", help="Pregled bez promjena")
    parser.add_argument("--report", type=str, help="CSV report datoteka")
    parser.add_argument("--product-id", type=str, help="Obradi samo ovaj proizvod")
    parser.add_argument("--limit", type=int, help="Limit broj proizvoda za obradu")

    args = parser.parse_args()

    linker = SmartProductLinker(
        dry_run=args.dry_run,
        report_path=args.report,
        product_id=args.product_id,
        limit=args.limit
    )

    await linker.run()


if __name__ == "__main__":
    asyncio.run(main())
