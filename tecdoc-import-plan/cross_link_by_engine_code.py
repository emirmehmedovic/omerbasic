#!/usr/bin/env python3
"""
Cross-Link Products by Engine Code (Fizički Isti Motor)

Pronalazi sve motore sa istim engineCode, snagom i kapacitetom,
te povezuje proizvode sa svim njima (bez obzira na TecDoc ID ili marku).

Primjer: 1.9 TDI BKC - ima 14 kombinacija u 4 marke (VW, Audi, Seat, Skoda)
"""

import asyncio
import sys
import argparse
from datetime import datetime
from typing import Optional, List, Dict
from collections import defaultdict

import asyncpg

DATABASE_URL = "postgresql://neondb_owner:npg_fr1hSiyUN0gR@ep-floral-frog-a28sjyps-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"


class EngineCodeLinker:
    def __init__(self, dry_run: bool = False, report_path: Optional[str] = None, engine_code: Optional[str] = None):
        self.dry_run = dry_run
        self.report_path = report_path
        self.engine_code = engine_code
        self.conn: Optional[asyncpg.Connection] = None
        self.report_rows: List[Dict] = []
        self.stats = {
            "unique_engine_codes": 0,
            "products_processed": 0,
            "fitments_created": 0,
            "fitments_skipped": 0,
            "errors": 0,
        }

    async def connect(self):
        """Konekcija na bazu"""
        self.conn = await asyncpg.connect(DATABASE_URL)
        print("✓ Povezan na bazu")

    async def disconnect(self):
        """Prekini konekciju"""
        if self.conn:
            await self.conn.close()
            print("✓ Okinuta konekcija sa bazom")

    async def get_engine_codes_with_products(self) -> List[str]:
        """
        Pronađi sve engine codes koji imaju povezane proizvode
        """
        query = """
            SELECT DISTINCT ve."engineCode"
            FROM "VehicleEngine" ve
            INNER JOIN "ProductVehicleFitment" pvf ON ve.id = pvf."engineId"
            WHERE ve."engineCode" IS NOT NULL
            AND ve."engineCode" != ''
            ORDER BY ve."engineCode"
        """

        if self.engine_code:
            query = f"""
                SELECT DISTINCT ve."engineCode"
                FROM "VehicleEngine" ve
                INNER JOIN "ProductVehicleFitment" pvf ON ve.id = pvf."engineId"
                WHERE ve."engineCode" = '{self.engine_code}'
            """

        codes = await self.conn.fetch(query)
        return [row['engineCode'] for row in codes]

    async def get_products_for_engine_code(self, engine_code: str) -> List[Dict]:
        """
        Pronađi sve proizvode koji su već povezani sa motorima sa ovim engine code-om
        """
        query = """
            SELECT DISTINCT
                p.id,
                p.name,
                p."catalogNumber"
            FROM "Product" p
            INNER JOIN "ProductVehicleFitment" pvf ON p.id = pvf."productId"
            INNER JOIN "VehicleEngine" ve ON pvf."engineId" = ve.id
            WHERE ve."engineCode" = $1
            ORDER BY p.name
        """

        products = await self.conn.fetch(query, engine_code)
        return products

    async def get_all_matching_engines(self, engine_code: str) -> List[Dict]:
        """
        Pronađi sve motore sa istim engine code-om
        Grupiraj po (snaga, kapacitet) jer može biti više verzija istog engine code-a
        """
        query = """
            SELECT
                ve.id as engine_id,
                ve."engineCode",
                ve."engineType",
                ve."enginePowerKW",
                ve."engineCapacity",
                ve."externalId" as tecdoc_id,
                vg.id as generation_id,
                vm.id as model_id,
                vb.id as brand_id,
                vb.name as brand_name,
                vm.name as model_name,
                vg.name as generation_name
            FROM "VehicleEngine" ve
            INNER JOIN "VehicleGeneration" vg ON ve."generationId" = vg.id
            INNER JOIN "VehicleModel" vm ON vg."modelId" = vm.id
            INNER JOIN "VehicleBrand" vb ON vm."brandId" = vb.id
            WHERE ve."engineCode" = $1
            ORDER BY ve."enginePowerKW", ve."engineCapacity", vb.name, vm.name
        """

        engines = await self.conn.fetch(query, engine_code)
        return engines

    async def get_fitments_for_product_and_engine_code(self, product_id: str, engine_code: str) -> List[Dict]:
        """
        Pronađi sve motore sa istim engine code-om koji su već povezani sa proizvodom
        """
        query = """
            SELECT
                ve.id as engine_id,
                ve."enginePowerKW",
                ve."engineCapacity",
                vg.id as generation_id,
                vb.name as brand_name,
                vm.name as model_name,
                vg.name as generation_name
            FROM "ProductVehicleFitment" pvf
            INNER JOIN "VehicleEngine" ve ON pvf."engineId" = ve.id
            INNER JOIN "VehicleGeneration" vg ON ve."generationId" = vg.id
            INNER JOIN "VehicleModel" vm ON vg."modelId" = vm.id
            INNER JOIN "VehicleBrand" vb ON vm."brandId" = vb.id
            WHERE pvf."productId" = $1
            AND ve."engineCode" = $2
        """

        fitments = await self.conn.fetch(query, product_id, engine_code)
        return fitments

    async def check_fitment_exists(self, product_id: str, generation_id: str, engine_id: str) -> bool:
        """
        Provjeri da li već postoji fitment
        """
        query = """
            SELECT 1 FROM "ProductVehicleFitment"
            WHERE "productId" = $1
            AND "generationId" = $2
            AND "engineId" = $3
        """

        result = await self.conn.fetch(query, product_id, generation_id, engine_id)
        return len(result) > 0

    async def create_fitment(self, product_id: str, generation_id: str, engine_id: str,
                            fitment_notes: str) -> Optional[str]:
        """
        Kreiraj novi ProductVehicleFitment
        """
        if self.dry_run:
            return "DRY_RUN_ID"

        query = """
            INSERT INTO "ProductVehicleFitment"
            ("productId", "generationId", "engineId", "fitmentNotes", "createdAt", "updatedAt")
            VALUES ($1, $2, $3, $4, NOW(), NOW())
            RETURNING id
        """

        try:
            result = await self.conn.fetchval(query, product_id, generation_id, engine_id, fitment_notes)
            return result
        except asyncpg.UniqueViolationError:
            return None
        except Exception as e:
            print(f"    ✗ Greška pri kreiranju fitment: {e}")
            self.stats["errors"] += 1
            return None

    async def process_engine_code(self, engine_code: str) -> int:
        """
        Obradi sve proizvode za dati engine code
        """
        print(f"\n🔧 Engine Code: {engine_code}")
        print("=" * 80)

        # 1. Pronađi sve motore sa ovim engine code-om
        all_engines = await self.get_all_matching_engines(engine_code)

        if not all_engines:
            print(f"  ℹ Nema motora sa engine code-om '{engine_code}'")
            return 0

        print(f"  Pronađeno {len(all_engines)} motora")

        # 2. Grupiraj po (power, capacity) jer može biti više verzija
        by_power_capacity = defaultdict(list)
        for engine in all_engines:
            key = (engine['enginePowerKW'], engine['engineCapacity'])
            by_power_capacity[key].append(engine)

        print(f"  Različite verzije (snaga/kapacitet): {len(by_power_capacity)}")

        new_fitments = 0

        # 3. Za svaku verziju (power/capacity), obradi
        for (power, capacity), engines_for_version in by_power_capacity.items():
            print(f"\n  📊 Verzija: {power}kW / {capacity}ccm ({len(engines_for_version)} kombinacija)")

            # 4. Pronađi sve proizvode koji su već povezani sa ovom verzijom
            products = await self.get_products_for_engine_code(engine_code)

            if not products:
                print(f"    ℹ Nema proizvoda sa ovim engine code-om")
                continue

            print(f"    Obrađujem {len(products)} proizvod(a)")

            for product in products:
                product_id = product['id']
                product_name = product['name']

                # 5. Pronađi motore sa istim power/capacity koje je proizvod već imao
                existing_fitments = await self.get_fitments_for_product_and_engine_code(
                    product_id, engine_code
                )

                # Provjeri da li su svi sa istom snagom/kapacitetom
                existing_power_capacity = set()
                for fit in existing_fitments:
                    existing_power_capacity.add((fit['enginePowerKW'], fit['engineCapacity']))

                # Ako nema existing fitments sa ovom verzijom, preskoči
                if (power, capacity) not in existing_power_capacity:
                    continue

                print(f"      📦 {product_name}")

                # 6. Za svaki motor sa istom verzijom, provjeri da li je povezan
                for engine in engines_for_version:
                    brand = engine['brand_name']
                    model = engine['model_name']
                    generation = engine['generation_name']
                    engine_id = engine['engine_id']
                    generation_id = engine['generation_id']

                    # Provjeri da li već postoji veza
                    exists = await self.check_fitment_exists(product_id, generation_id, engine_id)

                    if exists:
                        print(f"         ⊘ Već povezano: {brand} {model} {generation}")
                        self.stats["fitments_skipped"] += 1
                    else:
                        # Kreiraj novu vezu
                        fitment_notes = f"Auto-linked by engine code {engine_code}"
                        result = await self.create_fitment(
                            product_id, generation_id, engine_id, fitment_notes
                        )

                        if result:
                            status = "✓" if not self.dry_run else "✓ (DRY-RUN)"
                            print(f"         {status} Kreirano: {brand} {model} {generation}")
                            new_fitments += 1
                            self.stats["fitments_created"] += 1

                            # Dodaj u report
                            self.report_rows.append({
                                "timestamp": datetime.now().isoformat(),
                                "product_id": product_id,
                                "product_name": product_name,
                                "catalog_number": product['catalogNumber'],
                                "action": "created" if not self.dry_run else "dry_run_created",
                                "engine_code": engine_code,
                                "power_kw": power,
                                "capacity_ccm": capacity,
                                "brand": brand,
                                "model": model,
                                "generation": generation,
                                "tecdoc_id": engine['tecdoc_id'],
                                "notes": fitment_notes
                            })

        return new_fitments

    async def run(self):
        """Izvršavanje glavne skripte"""
        await self.connect()

        try:
            print("\n" + "="*80)
            print("🔗 CROSS-LINK PRODUCTS BY ENGINE CODE")
            print("="*80)

            if self.dry_run:
                print("⚠️  DRY-RUN MODE - Bez stvarnih promjena u bazi\n")

            # Pronađi sve engine codes sa produktima
            engine_codes = await self.get_engine_codes_with_products()
            self.stats["unique_engine_codes"] = len(engine_codes)

            print(f"\n📋 Pronađeno {len(engine_codes)} različitih engine code-ova sa proizvodima")

            if self.engine_code:
                print(f"Filtriranje na: {self.engine_code}")
                engine_codes = [self.engine_code] if self.engine_code in engine_codes else []

            total_new = 0
            for i, code in enumerate(engine_codes, 1):
                new = await self.process_engine_code(code)
                total_new += new

                if i >= 5 and not self.engine_code:  # Limit za test
                    print(f"\n... (prikazani samo prvi 5 engine codes)")
                    break

            print("\n" + "="*80)
            print("📊 STATISTIKA")
            print("="*80)
            print(f"Različitih engine code-ova: {self.stats['unique_engine_codes']}")
            print(f"Proizvoda obrađeno: {self.stats['products_processed']}")
            print(f"Novih fitmenta kreiranog: {self.stats['fitments_created']}")
            print(f"Fitmenta preskočeno (duplikata): {self.stats['fitments_skipped']}")
            print(f"Greške: {self.stats['errors']}")
            print("="*80)

            # Ispis reporta
            if self.report_path:
                self._write_report()

        finally:
            await self.disconnect()

    def _write_report(self):
        """Upiši CSV report"""
        import csv

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
    parser = argparse.ArgumentParser(description="Cross-link products by engine code")
    parser.add_argument("--dry-run", action="store_true", help="Pregled bez promjena u bazi")
    parser.add_argument("--report", type=str, help="Putanja do CSV report datoteke")
    parser.add_argument("--engine-code", type=str, help="Obradi samo ovaj engine code (npr. BKC)")

    args = parser.parse_args()

    linker = EngineCodeLinker(
        dry_run=args.dry_run,
        report_path=args.report,
        engine_code=args.engine_code
    )

    await linker.run()


if __name__ == "__main__":
    asyncio.run(main())
