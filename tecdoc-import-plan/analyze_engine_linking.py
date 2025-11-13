#!/usr/bin/env python3
"""
Analiza kako su motori povezani - tražimo zajedničke atribute za cross-linking
"""

import asyncio
import sys
import asyncpg
from collections import defaultdict

DATABASE_URL = "postgresql://neondb_owner:npg_fr1hSiyUN0gR@ep-floral-frog-a28sjyps-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"


async def main():
    conn = await asyncpg.connect(DATABASE_URL)

    try:
        print("\n" + "="*90)
        print("🔬 ANALIZA ZAJEDNIČKIH ATRIBUTA MOTORA - BKC")
        print("="*90)

        # 1. Pregledaj sve motore sa istim engineCode
        query = """
            SELECT
                ve.id,
                ve."externalId",
                ve."engineCode",
                ve."engineType",
                ve."enginePowerKW",
                ve."engineCapacity",
                ve.description,
                vb.name as brand_name,
                vm.name as model_name,
                vg.name as generation_name
            FROM "VehicleEngine" ve
            INNER JOIN "VehicleGeneration" vg ON ve."generationId" = vg.id
            INNER JOIN "VehicleModel" vm ON vg."modelId" = vm.id
            INNER JOIN "VehicleBrand" vb ON vm."brandId" = vb.id
            WHERE ve."engineCode" = $1
            ORDER BY ve."externalId", vb.name
        """

        engines = await conn.fetch(query, 'BKC')

        print(f"\n✓ Pronađeno {len(engines)} motora sa engineCode 'BKC'\n")

        # Analiza po atributima
        print("1️⃣  GRUPIRANO PO COMMON ATTRIBUTES:")
        print("-" * 90)

        # Grupiraj po različitim atributima
        by_external_id = defaultdict(list)
        by_power_capacity = defaultdict(list)
        by_description = defaultdict(list)
        by_engine_type = defaultdict(list)

        for engine in engines:
            ext_id = engine['externalId']
            power_capacity = f"{engine['enginePowerKW']}kW_{engine['engineCapacity']}ccm"
            description = engine['description']
            engine_type = engine['engineType']

            by_external_id[ext_id].append(engine)
            by_power_capacity[power_capacity].append(engine)
            by_description[description].append(engine)
            by_engine_type[engine_type].append(engine)

        print("\n📋 GRUPIRANO PO externalId (TecDoc ID):")
        print("-" * 90)
        for ext_id in sorted(by_external_id.keys(), key=lambda x: str(x)):
            items = by_external_id[ext_id]
            print(f"\nTecDoc ID: {ext_id} - {len(items)} motora")
            for eng in items:
                print(f"  • {eng['brand_name']:15} {eng['model_name']:20} {eng['generation_name']:20} ({eng['enginePowerKW']}kW, {eng['engineCapacity']}ccm)")

        print("\n\n📋 GRUPIRANO PO SNAZI I ZAPREMINI:")
        print("-" * 90)
        for key in sorted(by_power_capacity.keys()):
            items = by_power_capacity[key]
            print(f"\n{key} - {len(items)} motora")
            for eng in items:
                print(f"  • {eng['brand_name']:15} {eng['model_name']:20} (TecDoc: {eng['externalId']})")

        print("\n\n📋 GRUPIRANO PO OPISU:")
        print("-" * 90)
        for desc in sorted(by_description.keys()):
            items = by_description[desc]
            print(f"\n{desc} - {len(items)} motora")
            for eng in items:
                print(f"  • {eng['brand_name']:15} (TecDoc: {eng['externalId']})")

        print("\n\n" + "="*90)
        print("🔍 ANALIZA MOGUĆNOSTI ZA CROSS-LINKING")
        print("="*90)

        # Pronađi sve različite kombinacije
        unique_external_ids = set(eng['externalId'] for eng in engines)
        print(f"\n✓ Različiti TecDoc ID-evi: {len(unique_external_ids)}")
        for ext_id in sorted(unique_external_ids):
            print(f"   • {ext_id}")

        # Pronađi engine codes koji se ponavljaju
        query_all_codes = """
            SELECT
                ve."engineCode",
                COUNT(DISTINCT ve."externalId") as distinct_tecdoc_ids,
                COUNT(*) as total_motors,
                STRING_AGG(DISTINCT ve."externalId"::text, ', ' ORDER BY ve."externalId"::text) as all_tecdoc_ids
            FROM "VehicleEngine" ve
            GROUP BY ve."engineCode"
            HAVING COUNT(*) > 1
            ORDER BY COUNT(*) DESC
            LIMIT 20
        """

        code_stats = await conn.fetch(query_all_codes)

        print(f"\n\n📊 TOP ENGINECODE-OVI SA VIŠE TECDOC ID-EVA (mogu biti isti motor!):")
        print("-" * 90)
        print(f"{'Engine Code':<15} {'Različiti TecDoc IDs':<20} {'Ukupno Motors':<15} {'TecDoc IDs':<50}")
        print("-" * 90)
        for stat in code_stats:
            if stat['distinct_tecdoc_ids'] > 1:  # Samo ako ima više TecDoc ID-eva
                print(f"{stat['engineCode']:<15} {stat['distinct_tecdoc_ids']:<20} {stat['total_motors']:<15} {stat['all_tecdoc_ids']:<50}")

        print("\n" + "="*90)
        print("💡 ZAKLJUČCI ZA CROSS-LINKING")
        print("="*90)

        print("""
1. ENGINE CODE (BKC) je ZAJEDNIČKI IDENTIFIKATOR
   - Svi motori sa BKC kodom su isti motor fizički
   - Koristi se u različitim markama i generacijama

2. TECDOC ID je SPECIFIČAN PER MARKA
   - Audi: 17026
   - Seat: 17355
   - Skoda: 17497
   - VW: 17079
   - Različiti ID-evi jer su odvojene baze po marki u TecDoc

3. SNAGA I ZAPREMINA su IDENTIČNI
   - 77.0 kW (105 HP)
   - 1896 ccm
   - Potvrđuje da je isti motor

4. BEST APPROACH ZA CROSS-LINKING:

   OPTION A: Po Engine Code + Power + Capacity
   ✓ Pronađi sve motore sa istim engineCode
   ✓ Provjeri da snaga i kapacitet budu isti
   ✓ Povezi proizvod sa svima
   → Problem: Može biti drugi motor s istim kodom u drugoj generaciji

   OPTION B: Po Engine Code + Brand Group
   ✓ Definiraj grupe marki (VAG grupa: VW, Audi, Skoda, Seat)
   ✓ Za svaki motor sa BKC kodom u VAG grupi
   ✓ Pronađi sve druge BKC motore u istoj grupi
   ✓ Povezi proizvod
   → Koristi: engine code + vehicle type + power + capacity

   OPTION C: Direktno mapiranje TecDoc ID
   ✓ Kreiraj mapiranje: engineCode → lista TecDoc ID-eva
   ✓ Za svaki TecDoc ID pronađi sve generacije
   ✓ Povezi proizvod sa svima
   → Najjednostavnije, ali zahtjeva mapiranje

5. PREPORUKA:
   Koristi OPTION B (Brand Group)
   - Definiraj grupe marki (VAG = VW + Audi + Skoda + Seat, itd.)
   - Za proizvod povezan sa motorom u jednoj marki
   - Pronađi sve motore sa istim engineCode u grupi
   - Povezi sa svima gdje je snaga i kapacitet isti
""")

        print("="*90)

    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
