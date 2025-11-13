#!/usr/bin/env python3
"""
Lista svih engine code-ova koji imaju proizvode
"""

import asyncio
import asyncpg

DATABASE_URL = "postgresql://neondb_owner:npg_fr1hSiyUN0gR@ep-floral-frog-a28sjyps-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"


async def main():
    conn = await asyncpg.connect(DATABASE_URL)

    try:
        query = """
            SELECT
                ve."engineCode",
                COUNT(DISTINCT pvf."productId") as product_count,
                COUNT(DISTINCT ve."externalId") as distinct_tecdoc_ids,
                STRING_AGG(DISTINCT ve."externalId"::text, ', ') as tecdoc_ids,
                AVG(ve."enginePowerKW") as avg_power,
                AVG(ve."engineCapacity") as avg_capacity
            FROM "VehicleEngine" ve
            INNER JOIN "ProductVehicleFitment" pvf ON ve.id = pvf."engineId"
            GROUP BY ve."engineCode"
            HAVING COUNT(DISTINCT pvf."productId") > 0
            ORDER BY COUNT(DISTINCT pvf."productId") DESC
            LIMIT 30
        """

        results = await conn.fetch(query)

        print("\n" + "="*100)
        print("🔧 ENGINE CODES SA PROIZVODIMA")
        print("="*100)
        print(f"\n{'Engine Code':<15} {'Products':<10} {'Different TecDoc IDs':<20} {'Avg Power':<12} {'Avg Capacity':<15}")
        print("-" * 100)

        for row in results:
            print(f"{row['engineCode']:<15} {row['product_count']:<10} {row['distinct_tecdoc_ids']:<20} {row['avg_power']:<12.1f} {row['avg_capacity']:<15.0f}")

        print("\n" + "="*100)
        print(f"✓ Pronađeno {len(results)} engine code-ova sa proizvodima\n")

    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
