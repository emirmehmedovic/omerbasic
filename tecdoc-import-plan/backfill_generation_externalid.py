#!/usr/bin/env python3
"""
Backfill VehicleGeneration.externalId sa passengercars.id
Mapira preko brand + model + generation name
"""

import psycopg2
import mysql.connector
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# TecDoc MySQL
tecdoc_conn = mysql.connector.connect(
    host="localhost",
    user="root",
    password="",
    database="tecdoc1q2019",
    connect_timeout=300
)

# Postgres (Neon)
prod_conn = psycopg2.connect(
    "postgresql://neondb_owner:npg_fr1hSiyUN0gR@ep-floral-frog-a28sjyps-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require",
    connect_timeout=300
)

logging.info("✅ Database connections established")

# Učitaj sve generacije bez externalId
prod_cursor = prod_conn.cursor()
prod_cursor.execute("""
    SELECT 
        vg.id,
        vg.name as generation_name,
        vm.name as model_name,
        vb.name as brand_name
    FROM "VehicleGeneration" vg
    JOIN "VehicleModel" vm ON vm.id = vg."modelId"
    JOIN "VehicleBrand" vb ON vb.id = vm."brandId"
    WHERE vg."externalId" IS NULL
    ORDER BY vb.name, vm.name, vg.name
""")

generations = prod_cursor.fetchall()
logging.info(f"Found {len(generations)} generations without externalId")

updated_count = 0
skipped_count = 0

tecdoc_cursor = tecdoc_conn.cursor()

for gen_id, gen_name, model_name, brand_name in generations:
    # Pronađi passengercars koji odgovara ovoj generaciji
    # Mapiranje preko manufacturer + model + generation description
    
    # Brand aliases (TecDoc koristi skraćenice)
    brand_aliases = {
        'volkswagen': 'vw',
        'mercedes benz': 'mercedes-benz',
        'alfa romeo': 'alfa',
    }
    
    # Normalizuj brand name (ukloni razmake i crtice za matching)
    brand_lower = brand_name.lower()
    brand_search = brand_aliases.get(brand_lower, brand_lower)
    brand_normalized = brand_search.replace(' ', '').replace('-', '').lower()
    
    query = """
        SELECT DISTINCT pc.id
        FROM passengercars pc
        JOIN models mo ON mo.id = pc.Model
        JOIN manufacturers m ON m.id = mo.ManufacturerId
        WHERE REPLACE(REPLACE(LOWER(m.Description), ' ', ''), '-', '') = %s
        AND LOWER(mo.Description) LIKE CONCAT('%%', LOWER(%s), '%%')
        LIMIT 1
    """
    
    tecdoc_cursor.execute(query, (brand_normalized, model_name))
    result = tecdoc_cursor.fetchone()
    
    if result:
        passengercars_id = result[0]
        
        # Update VehicleGeneration
        update_cursor = prod_conn.cursor()
        update_cursor.execute("""
            UPDATE "VehicleGeneration"
            SET "externalId" = %s
            WHERE id = %s
        """, (str(passengercars_id), gen_id))
        
        prod_conn.commit()
        update_cursor.close()
        
        updated_count += 1
        logging.info(f"✅ {brand_name} {model_name} {gen_name} -> externalId: {passengercars_id}")
    else:
        skipped_count += 1
        logging.warning(f"⚠️  No match: {brand_name} {model_name} {gen_name}")

tecdoc_cursor.close()
prod_cursor.close()

logging.info(f"\n{'='*70}")
logging.info(f"✅ Updated: {updated_count}")
logging.info(f"⚠️  Skipped: {skipped_count}")
logging.info(f"{'='*70}")

prod_conn.close()
tecdoc_conn.close()
