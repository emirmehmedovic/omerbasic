#!/usr/bin/env python3
"""
Cross-Link Engine Products by TecDoc ID

Skriptu pregledá proizvode koji su već povezani sa motorima,
skuplja TecDoc ID-eve tih motora, pronalazi iste motore u drugim markama,
i automatski poveza proizvod sa tim markama/modelima/generacijama.

Usage:
    python scripts/cross_link_engines_by_tecdoc.py [--dry-run] [--report output.csv] [--product-id ID]
"""

import sys
import os
import asyncio
import argparse
from datetime import datetime
from typing import Optional, Set, Dict, List, Tuple
from collections import defaultdict

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncpg
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable not set")


class CrossLinkEngine:
    def __init__(self, dry_run: bool = False, report_path: Optional[str] = None, product_id: Optional[str] = None):
        self.dry_run = dry_run
        self.report_path = report_path
        self.product_id = product_id
        self.conn: Optional[asyncpg.Connection] = None
        self.report_rows: List[Dict] = []
        self.stats = {
            "total_products": 0,
            "products_with_fitments": 0,
            "engines_found": 0,
            "matching_engines": 0,
            "new_fitments_created": 0,
            "skipped_duplicates": 0,
        }

    async def connect(self):
        """Konekcija na bazu"""
        self.conn = await asyncpg.connect(DATABASE_URL)
        print("✓ Connected to database")

    async def disconnect(self):
        """Prekini konekciju"""
        if self.conn:
            await self.conn.close()
            print("✓ Disconnected from database")

    async def get_products_with_fitments(self) -> List[Dict]:
        """
        Pronađi sve proizvode koji imaju bar jednu vehicle fitment vezu
        """
        query = """
            SELECT DISTINCT p.id, p.name, p.catalogNumber
            FROM "Product" p
            INNER JOIN "ProductVehicleFitment" pvf ON p.id = pvf."productId"
            WHERE p."isArchived" = false
        """

        if self.product_id:
            query += f" AND p.id = '{self.product_id}'"

        query += " ORDER BY p.name"

        products = await self.conn.fetch(query)
        self.stats["total_products"] = len(products)
        return products

    async def get_fitments_for_product(self, product_id: str) -> List[Dict]:
        """
        Pronađi sve fitmente za dati proizvod sa detaljima motora
        """
        query = """
            SELECT
                pvf.id as fitment_id,
                pvf."generationId",
                pvf."engineId",
                vg.id as generation_id,
                vg."modelId",
                vm.id as model_id,
                vm."brandId",
                vb.name as brand_name,
                vb.type as vehicle_type,
                vm.name as model_name,
                vg.name as generation_name,
                ve.id as engine_id,
                ve."externalId" as engine_external_id,
                ve."engineCode",
                ve."engineType",
                ve."enginePowerKW",
                ve."engineCapacity"
            FROM "ProductVehicleFitment" pvf
            LEFT JOIN "VehicleGeneration" vg ON pvf."generationId" = vg.id
            LEFT JOIN "VehicleModel" vm ON vg."modelId" = vm.id
            LEFT JOIN "VehicleBrand" vb ON vm."brandId" = vb.id
            LEFT JOIN "VehicleEngine" ve ON pvf."engineId" = ve.id
            WHERE pvf."productId" = $1
            ORDER BY vb.name, vm.name, vg.name, ve."engineCode"
        """

        fitments = await self.conn.fetch(query, product_id)
        return fitments

    async def find_matching_engines_by_tecdoc(self, external_id: str, exclude_generation_id: str) -> List[Dict]:
        """
        Pronađi sve motore sa istim TecDoc ID-om u drugim generacijama
        """
        query = """
            SELECT
                ve.id as engine_id,
                ve.id as engine_id_dup,
                ve."externalId",
                ve."engineCode",
                ve."engineType",
                ve."enginePowerKW",
                ve."engineCapacity",
                vg.id as generation_id,
                vg.name as generation_name,
                vm.id as model_id,
                vm.name as model_name,
                vb.id as brand_id,
                vb.name as brand_name,
                vb.type as vehicle_type
            FROM "VehicleEngine" ve
            INNER JOIN "VehicleGeneration" vg ON ve."generationId" = vg.id
            INNER JOIN "VehicleModel" vm ON vg."modelId" = vm.id
            INNER JOIN "VehicleBrand" vb ON vm."brandId" = vb.id
            WHERE ve."externalId" = $1
            AND vg.id != $2
            ORDER BY vb.name, vm.name, vg.name
        """

        matching = await self.conn.fetch(query, external_id, exclude_generation_id)
        return matching

    async def check_fitment_exists(self, product_id: str, generation_id: str, engine_id: Optional[str]) -> bool:
        """
        Provjeri da li već postoji fitment za proizvod + generacija + motor
        """
        query = """
            SELECT 1 FROM "ProductVehicleFitment"
            WHERE "productId" = $1
            AND "generationId" = $2
            AND "engineId" IS NOT DISTINCT FROM $3
        """

        result = await self.conn.fetch(query, product_id, generation_id, engine_id)
        return len(result) > 0

    async def create_fitment(self, product_id: str, generation_id: str, engine_id: Optional[str],
                            year_from: Optional[int] = None, year_to: Optional[int] = None,
                            fitment_notes: Optional[str] = None) -> Optional[str]:
        """
        Kreiraj novi ProductVehicleFitment
        """
        if self.dry_run:
            return "DRY_RUN_ID"

        query = """
            INSERT INTO "ProductVehicleFitment"
            ("productId", "generationId", "engineId", "yearFrom", "yearTo", "fitmentNotes", "createdAt", "updatedAt")
            VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
            RETURNING id
        """

        try:
            result = await self.conn.fetchval(query, product_id, generation_id, engine_id, year_from, year_to, fitment_notes or None)
            return result
        except asyncpg.UniqueViolationError:
            return None
        except Exception as e:
            print(f"  ✗ Greška pri kreiranju fitment: {e}")
            return None

    async def process_product(self, product: Dict) -> int:
        """
        Obradi jedan proizvod:
        1. Pronađi sve njegove fitmente
        2. Za svaki fitment pronađi TecDoc ID motora
        3. Pronađi sve motore sa istim TecDoc ID-om
        4. Poveza proizvod sa tim motorima u drugim markama
        """
        product_id = product["id"]
        product_name = product["name"]
        catalog_number = product["catalogNumber"]

        print(f"\n📦 Obrađujem proizvod: {product_name} ({catalog_number})")

        fitments = await self.get_fitments_for_product(product_id)

        if not fitments:
            print(f"   ℹ Nema fitment veza")
            return 0

        self.stats["products_with_fitments"] += 1
        new_fitments = 0

        # Prikupljeni TecDoc ID-evi motora sa detaljima
        tecdoc_engines: Dict[str, Dict] = {}

        for fitment in fitments:
            engine_external_id = fitment["engine_external_id"]
            engine_id = fitment["engine_id"]
            brand_name = fitment["brand_name"]
            model_name = fitment["model_name"]
            generation_name = fitment["generation_name"]

            print(f"   ✓ Fitment: {brand_name} {model_name} {generation_name}", end="")

            if engine_id:
                print(f" - Motor: {fitment['engineCode']} (TecDoc: {engine_external_id})")
                if engine_external_id:
                    tecdoc_engines[engine_external_id] = {
                        "engine_code": fitment["engineCode"],
                        "engine_type": fitment["engineType"],
                        "engine_power_kw": fitment["enginePowerKW"],
                        "engine_capacity": fitment["engineCapacity"],
                        "original_generation_id": fitment["generationId"],
                    }
                    self.stats["engines_found"] += 1
            else:
                print(" - Bez motora (general fitment)")

        if not tecdoc_engines:
            print(f"   ℹ Nema TecDoc ID-eva motora")
            return 0

        # Za svaki pronađeni TecDoc ID motora
        for tecdoc_id, engine_info in tecdoc_engines.items():
            original_gen_id = engine_info["original_generation_id"]

            print(f"\n   🔍 Tražim motore sa TecDoc ID: {tecdoc_id}")
            matching_engines = await self.find_matching_engines_by_tecdoc(tecdoc_id, original_gen_id)

            self.stats["matching_engines"] += len(matching_engines)

            for matching in matching_engines:
                brand_name = matching["brand_name"]
                model_name = matching["model_name"]
                generation_name = matching["generation_name"]
                generation_id = matching["generation_id"]
                engine_id = matching["engine_id"]

                # Provjeri da li već postoji
                exists = await self.check_fitment_exists(product_id, generation_id, engine_id)

                if exists:
                    print(f"      ⊘ Već povezano: {brand_name} {model_name} {generation_name}")
                    self.stats["skipped_duplicates"] += 1
                else:
                    # Kreiraj novu vezu
                    fitment_notes = f"Auto-linked by TecDoc engine ID {tecdoc_id}"
                    result = await self.create_fitment(
                        product_id,
                        generation_id,
                        engine_id,
                        fitment_notes=fitment_notes
                    )

                    if result:
                        status = "✓ Kreirano" if not self.dry_run else "✓ (DRY-RUN)"
                        print(f"      {status}: {brand_name} {model_name} {generation_name}")
                        new_fitments += 1
                        self.stats["new_fitments_created"] += 1

                        # Dodaj u report
                        self.report_rows.append({
                            "timestamp": datetime.now().isoformat(),
                            "product_id": product_id,
                            "product_name": product_name,
                            "catalog_number": catalog_number,
                            "action": "created" if not self.dry_run else "dry_run_created",
                            "tecdoc_engine_id": tecdoc_id,
                            "brand": brand_name,
                            "model": model_name,
                            "generation": generation_name,
                            "engine_code": matching["engineCode"],
                            "notes": "Auto-linked by TecDoc ID"
                        })
                    else:
                        print(f"      ✗ Greška pri kreiranju: {brand_name} {model_name} {generation_name}")

        return new_fitments

    async def run(self):
        """Izvršavanje glavne skripte"""
        await self.connect()

        try:
            print("\n" + "="*70)
            print("🚀 CROSS-LINK ENGINES BY TECDOC ID")
            print("="*70)

            if self.dry_run:
                print("⚠️  DRY-RUN MODE - Bez stvarnih promjena u bazi")

            products = await self.get_products_with_fitments()
            print(f"\n📋 Pronađen {self.stats['total_products']} proizvod(a) sa fitmentima")

            total_new = 0
            for i, product in enumerate(products, 1):
                new = await self.process_product(product)
                total_new += new

            print("\n" + "="*70)
            print("📊 STATISTIKA")
            print("="*70)
            print(f"Ukupno proizvoda u bazi: {self.stats['total_products']}")
            print(f"Proizvoda sa fitmentima: {self.stats['products_with_fitments']}")
            print(f"Pronađenih TecDoc motora: {self.stats['engines_found']}")
            print(f"Matching motora u drugim markama: {self.stats['matching_engines']}")
            print(f"Novih fitmenta kreiranog: {self.stats['new_fitments_created']}")
            print(f"Preskočenih (duplikata): {self.stats['skipped_duplicates']}")
            print("="*70)

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
    parser = argparse.ArgumentParser(description="Cross-link engine products by TecDoc ID")
    parser.add_argument("--dry-run", action="store_true", help="Pregled bez promjena u bazi")
    parser.add_argument("--report", type=str, help="Putanja do CSV report datoteke")
    parser.add_argument("--product-id", type=str, help="Obradi samo ovaj proizvod (za testiranje)")

    args = parser.parse_args()

    linker = CrossLinkEngine(
        dry_run=args.dry_run,
        report_path=args.report,
        product_id=args.product_id
    )

    await linker.run()


if __name__ == "__main__":
    asyncio.run(main())
