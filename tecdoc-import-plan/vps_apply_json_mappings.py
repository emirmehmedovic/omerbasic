#!/usr/bin/env python3
"""
VPS Script - Primjeni image mapiranja iz JSON fajla na PostgreSQL bazu.

Ova skripta čita vps_image_mappings.json i primjenjuje mapiranja na lokalnu
PostgreSQL bazu na VPS-u.

Korištenje:
    python3 vps_apply_json_mappings.py
"""

import json
import psycopg2
import os
import sys
import logging
from dotenv import load_dotenv

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Configuration
MAPPINGS_FILE = 'vps_image_mappings.json'
PG_CONNECTION = os.environ.get(
    'DATABASE_URL',
    'postgresql://emiir:emirMehmedovic123456789omerbasic@localhost:5432/omerbasicdb'
)


def apply_json_mappings():
    """Primjeni mapiranja iz JSON fajla na PostgreSQL."""

    logger.info("=" * 70)
    logger.info("PRIMJENA MAPIRANJA: JSON → PostgreSQL")
    logger.info("=" * 70)

    # Load JSON mappings
    if not os.path.exists(MAPPINGS_FILE):
        logger.error(f"✗ Datoteka sa mapiranjima ne postoji: {MAPPINGS_FILE}")
        logger.error(f"  Trebate uploadovati: {MAPPINGS_FILE}")
        return False

    try:
        with open(MAPPINGS_FILE, 'r') as f:
            mappings = json.load(f)
    except json.JSONDecodeError as e:
        logger.error(f"✗ JSON greška: {e}")
        return False

    logger.info(f"\n✓ Učitana mapiranja iz JSON: {len(mappings)}")

    # Connect to PostgreSQL
    try:
        pg_conn = psycopg2.connect(PG_CONNECTION)
        logger.info("✓ Spojena PostgreSQL baza")
    except psycopg2.Error as e:
        logger.error(f"✗ Greška pri spajanju PostgreSQL: {e}")
        return False

    cursor = pg_conn.cursor()

    # Apply each mapping
    logger.info("\nPrimjenjujem mapiranja...")
    updated_count = 0
    skipped_count = 0
    not_found_count = 0
    error_count = 0

    for product_id, image_url in mappings.items():
        try:
            # Check if product exists
            cursor.execute(
                'SELECT "imageUrl" FROM "Product" WHERE id = %s',
                (product_id,)
            )
            result = cursor.fetchone()

            if result is None:
                logger.debug(f"  ⚠ Proizvod ne postoji: {product_id}")
                not_found_count += 1
                continue

            existing_url = result[0]

            # Skip if already has a different imageUrl
            if existing_url and existing_url != image_url:
                logger.debug(f"  ⊘ {product_id} - već ima drugačiji imageUrl, preskaču")
                skipped_count += 1
                continue

            # Update
            cursor.execute(
                'UPDATE "Product" SET "imageUrl" = %s WHERE id = %s',
                (image_url, product_id)
            )
            pg_conn.commit()
            updated_count += 1

            if updated_count % 50 == 0:
                logger.info(f"  Ažurirano: {updated_count}/{len(mappings)}")

        except psycopg2.Error as e:
            logger.error(f"  ✗ Greška pri ažuriranju {product_id}: {e}")
            pg_conn.rollback()
            error_count += 1

    cursor.close()
    pg_conn.close()

    # Report results
    logger.info("\n" + "=" * 70)
    logger.info("REZULTATI")
    logger.info("=" * 70)
    logger.info(f"Ukupno mapiranja: {len(mappings)}")
    logger.info(f"Ažurirana mapiranja: {updated_count}")
    logger.info(f"Preskoči (drugačiji imageUrl): {skipped_count}")
    logger.info(f"Nisu pronađeni proizvodi: {not_found_count}")
    logger.info(f"Greške: {error_count}")

    if updated_count > 0:
        logger.info(f"\n✓ Успјешно ažurirana mapiranja: {updated_count}")
    else:
        logger.warning("\n⚠ Nisu ažurirana nikakva mapiranja")

    return True


if __name__ == '__main__':
    success = apply_json_mappings()
    sys.exit(0 if success else 1)
