#!/usr/bin/env python3
"""Test VehicleGeneration.externalId"""

import sys
sys.path.insert(0, '/Users/emir_mw/omerbasic/tecdoc-import-plan')

from phase2_enrich_products_batch import TecDocEnricherBatch

enricher = TecDocEnricherBatch()

# Check VehicleGeneration externalId
cursor = enricher.prod_conn.cursor()

cursor.execute('SELECT COUNT(*) FROM "VehicleGeneration" WHERE "externalId" IS NOT NULL')
count = cursor.fetchone()[0]
print(f"VehicleGeneration with externalId: {count}")

cursor.execute('SELECT "externalId", name FROM "VehicleGeneration" WHERE "externalId" IS NOT NULL LIMIT 10')
samples = cursor.fetchall()
print(f"\nSample externalIds:")
for ext_id, name in samples:
    print(f"  {ext_id} -> {name}")

# Check if TecDoc IDs match
cursor.execute('SELECT "externalId" FROM "VehicleGeneration" WHERE "externalId" IN (\'19968\', \'19969\', \'11268\', \'4613\', \'11782\')')
matches = cursor.fetchall()
print(f"\nMatching TecDoc IDs [19968, 19969, 11268, 4613, 11782]: {len(matches)}")
for match in matches:
    print(f"  Found: {match[0]}")

cursor.close()
enricher.prod_conn.close()
enricher.tecdoc_conn.close()
