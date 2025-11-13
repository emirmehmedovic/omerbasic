#!/usr/bin/env python3
"""
Debug TecDoc Engine - Pronađi motor po engine code i prikaži sve veze
"""

import asyncio
import sys
import asyncpg
from typing import List, Dict

DATABASE_URL = "postgresql://neondb_owner:npg_fr1hSiyUN0gR@ep-floral-frog-a28sjyps-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"


async def main():
    conn = await asyncpg.connect(DATABASE_URL)

    try:
        print("\n" + "="*80)
        print("🔍 PRONALAŽENJE MOTORA - 1.9 TDI (BKC)")
        print("="*80)

        # 1. Pronađi motor po engineCode
        query_engine = """
            SELECT
                ve.id,
                ve."externalId" as tecdoc_id,
                ve."engineCode",
                ve."engineType",
                ve."enginePowerKW",
                ve."enginePowerHP",
                ve."engineCapacity",
                ve.description,
                ve."generationId",
                vg.name as generation_name,
                vm.name as model_name,
                vb.name as brand_name,
                vb.type as vehicle_type
            FROM "VehicleEngine" ve
            LEFT JOIN "VehicleGeneration" vg ON ve."generationId" = vg.id
            LEFT JOIN "VehicleModel" vm ON vg."modelId" = vm.id
            LEFT JOIN "VehicleBrand" vb ON vm."brandId" = vb.id
            WHERE ve."engineCode" = $1
            ORDER BY vb.name, vm.name, vg.name
        """

        engines = await conn.fetch(query_engine, 'BKC')

        if not engines:
            print(f"\n❌ Motor sa engine code 'BKC' nije pronađen u bazi!")
            await conn.close()
            return

        print(f"\n✓ Pronađeno {len(engines)} motora sa engine code 'BKC':\n")

        # Prikaži motore
        tecdoc_ids = set()
        for i, engine in enumerate(engines, 1):
            tecdoc_id = engine['tecdoc_id']
            if tecdoc_id:
                tecdoc_ids.add(tecdoc_id)

            print(f"{i}. Motor:")
            print(f"   ID: {engine['id']}")
            print(f"   TecDoc ID: {tecdoc_id or '❌ NEMA'}")
            print(f"   Engine Code: {engine['engineCode']}")
            print(f"   Type: {engine['engineType']}")
            print(f"   Power: {engine['enginePowerKW']} kW ({engine['enginePowerHP']} HP)")
            print(f"   Capacity: {engine['engineCapacity']} ccm")
            print(f"   Description: {engine['description']}")
            print(f"   Generation: {engine['brand_name']} {engine['model_name']} {engine['generation_name']}")
            print(f"   Vehicle Type: {engine['vehicle_type']}")
            print()

        # 2. Pronađi sve modele sa ovim motorom
        print("\n" + "="*80)
        print("📊 MODELI SA OVIM MOTOROM")
        print("="*80 + "\n")

        query_models = """
            SELECT DISTINCT
                vb.id as brand_id,
                vb.name as brand_name,
                vb.type as vehicle_type,
                vm.id as model_id,
                vm.name as model_name,
                vg.id as generation_id,
                vg.name as generation_name,
                ve.id as engine_id,
                ve."engineCode",
                ve."engineType"
            FROM "VehicleEngine" ve
            INNER JOIN "VehicleGeneration" vg ON ve."generationId" = vg.id
            INNER JOIN "VehicleModel" vm ON vg."modelId" = vm.id
            INNER JOIN "VehicleBrand" vb ON vm."brandId" = vb.id
            WHERE ve."engineCode" = $1
            ORDER BY vb.name, vm.name, vg.name
        """

        models = await conn.fetch(query_models, 'BKC')
        print(f"Ukupno kombinacija: {len(models)}\n")

        # Grupiranje po marki
        by_brand = {}
        for model in models:
            brand = model['brand_name']
            if brand not in by_brand:
                by_brand[brand] = []
            by_brand[brand].append(model)

        for brand, items in sorted(by_brand.items()):
            print(f"🚗 {brand} ({items[0]['vehicle_type']}):")
            by_model = {}
            for item in items:
                model = item['model_name']
                if model not in by_model:
                    by_model[model] = []
                by_model[model].append(item)

            for model, gens in sorted(by_model.items()):
                gens_str = ", ".join([f"{g['generation_name']}" for g in gens])
                print(f"   • {model}: {gens_str}")
            print()

        # 3. Pronađi proizvode povezane sa ovim motorom
        print("\n" + "="*80)
        print("📦 PROIZVODI POVEZANI SA OVIM MOTOROM")
        print("="*80 + "\n")

        query_products = """
            SELECT DISTINCT
                p.id,
                p.name,
                p."catalogNumber",
                COUNT(DISTINCT pvf.id) as fitment_count,
                STRING_AGG(DISTINCT vb.name, ', ' ORDER BY vb.name) as brands,
                STRING_AGG(DISTINCT vm.name, ', ' ORDER BY vm.name) as models
            FROM "Product" p
            INNER JOIN "ProductVehicleFitment" pvf ON p.id = pvf."productId"
            INNER JOIN "VehicleEngine" ve ON pvf."engineId" = ve.id
            INNER JOIN "VehicleGeneration" vg ON ve."generationId" = vg.id
            INNER JOIN "VehicleModel" vm ON vg."modelId" = vm.id
            INNER JOIN "VehicleBrand" vb ON vm."brandId" = vb.id
            WHERE ve."engineCode" = $1
            GROUP BY p.id, p.name, p."catalogNumber"
            ORDER BY p.name
        """

        products = await conn.fetch(query_products, 'BKC')

        if not products:
            print("❌ Nema proizvoda povezanih sa ovim motorom")
        else:
            print(f"✓ Pronađeno {len(products)} proizvod(a):\n")
            for i, prod in enumerate(products, 1):
                print(f"{i}. {prod['name']} ({prod['catalogNumber']})")
                print(f"   ID: {prod['id']}")
                print(f"   Fitment veza: {prod['fitment_count']}")
                print(f"   Marke: {prod['brands']}")
                print(f"   Modeli: {prod['models']}")
                print()

        # 4. Pronađi sve motore sa istim TecDoc ID
        if tecdoc_ids:
            print("\n" + "="*80)
            print("🔄 DRUGI MOTORI SA ISTIM TECDOC ID")
            print("="*80 + "\n")

            for tecdoc_id in tecdoc_ids:
                if not tecdoc_id:
                    continue

                print(f"TecDoc ID: {tecdoc_id}\n")

                query_same_tecdoc = """
                    SELECT
                        vb.name as brand_name,
                        vm.name as model_name,
                        vg.name as generation_name,
                        ve."engineCode",
                        ve."engineType",
                        ve."enginePowerKW",
                        ve."engineCapacity"
                    FROM "VehicleEngine" ve
                    INNER JOIN "VehicleGeneration" vg ON ve."generationId" = vg.id
                    INNER JOIN "VehicleModel" vm ON vg."modelId" = vm.id
                    INNER JOIN "VehicleBrand" vb ON vm."brandId" = vb.id
                    WHERE ve."externalId" = $1
                    ORDER BY vb.name, vm.name, vg.name
                """

                same_tecdoc = await conn.fetch(query_same_tecdoc, tecdoc_id)
                print(f"Pronađeno {len(same_tecdoc)} motora sa istim TecDoc ID:\n")

                by_brand = {}
                for item in same_tecdoc:
                    brand = item['brand_name']
                    if brand not in by_brand:
                        by_brand[brand] = []
                    by_brand[brand].append(item)

                for brand, items in sorted(by_brand.items()):
                    print(f"  🚗 {brand}:")
                    for item in items:
                        print(f"     • {item['model_name']} {item['generation_name']} - {item['engineCode']} ({item['engineType']}, {item['enginePowerKW']}kW)")
                    print()

        print("="*80)

    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
