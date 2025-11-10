#!/usr/bin/env python3
"""Check if VehicleGeneration.externalId column exists and has data"""

import sys
sys.path.insert(0, '/Users/emir_mw/omerbasic/tecdoc-import-plan')

from phase2_enrich_products_batch import TecDocEnricherBatch

enricher = TecDocEnricherBatch()

cursor = enricher.prod_conn.cursor()

# Check if column exists
try:
    cursor.execute('SELECT "externalId" FROM "VehicleGeneration" LIMIT 1')
    print("✅ Column 'externalId' EXISTS in VehicleGeneration table")
except Exception as e:
    print(f"❌ Column 'externalId' does NOT exist: {e}")
    cursor.close()
    enricher.prod_conn.close()
    enricher.tecdoc_conn.close()
    sys.exit(1)

# Check how many have data
cursor.execute('SELECT COUNT(*) FROM "VehicleGeneration"')
total = cursor.fetchone()[0]
print(f"Total VehicleGeneration records: {total}")

cursor.execute('SELECT COUNT(*) FROM "VehicleGeneration" WHERE "externalId" IS NOT NULL')
with_external = cursor.fetchone()[0]
print(f"Records with externalId: {with_external}")

if with_external == 0:
    print("\n⚠️  WARNING: Column exists but NO DATA!")
    print("   Need to re-import vehicles with externalId populated")
else:
    print(f"\n✅ {with_external}/{total} records have externalId")
    
    # Show samples
    cursor.execute('SELECT name, "externalId" FROM "VehicleGeneration" WHERE "externalId" IS NOT NULL LIMIT 5')
    samples = cursor.fetchall()
    print("\nSample records:")
    for name, ext_id in samples:
        print(f"  {name} -> externalId: {ext_id}")

cursor.close()
enricher.prod_conn.close()
enricher.tecdoc_conn.close()
