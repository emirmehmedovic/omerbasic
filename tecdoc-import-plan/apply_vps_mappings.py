#!/usr/bin/env python3
"""
Script za primjenu TecDoc image mapiranja na VPS PostgreSQL bazu.

Čita JSON mapiranje iz Neon baze i primjenjuje ga na production PostgreSQL.
Struktura je identična, samo trebam prebrisati putanje slika.

Korištenje:
    python3 apply_vps_mappings.py
"""

import json
import psycopg2
import os
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
MAPPINGS_FILE = '/Users/emir_mw/omerbasic/tecdoc-import-plan/vps_image_mappings.json'

# VPS PostgreSQL connection string (from .env)
VPS_PG_CONNECTION = os.environ.get(
    'VPS_DATABASE_URL',
    'postgresql://emiir:emirMehmedovic123456789omerbasic@localhost:5432/omerbasicdb'
)


def apply_mappings():
    """Primjeni mapiranja na VPS bazu."""

    logger.info("=" * 70)
    logger.info("PRIMJENA MAPIRANJA NA VPS")
    logger.info("=" * 70)

    # Load JSON mappings
    if not os.path.exists(MAPPINGS_FILE):
        logger.error(f"✗ Datoteka sa mapiranjima ne postoji: {MAPPINGS_FILE}")
        return False

    with open(MAPPINGS_FILE, 'r') as f:
        mappings = json.load(f)

    logger.info(f"\n✓ Učitana mapiranja: {len(mappings)}")

    # Connect to VPS PostgreSQL
    try:
        pg_conn = psycopg2.connect(VPS_PG_CONNECTION)
        logger.info("✓ Spojena VPS PostgreSQL baza")
    except psycopg2.Error as e:
        logger.error(f"✗ Greška pri spajanju VPS PostgreSQL: {e}")
        return False

    cursor = pg_conn.cursor()

    # Apply each mapping
    logger.info("\nPrimjenjujem mapiranja...")
    updated_count = 0
    skipped_count = 0
    error_count = 0

    for product_id, image_url in mappings.items():
        try:
            # Check if product already has imageUrl
            cursor.execute(
                'SELECT "imageUrl" FROM "Product" WHERE id = %s',
                (product_id,)
            )
            result = cursor.fetchone()

            if result is None:
                logger.warning(f"  ⚠ Proizvod ne postoji: {product_id}")
                skipped_count += 1
                continue

            existing_url = result[0]
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
    logger.info(f"Ažurirana mapiranja: {updated_count}")
    logger.info(f"Preskoči: {skipped_count}")
    logger.info(f"Greške: {error_count}")
    logger.info(f"Ukupno: {updated_count + skipped_count + error_count}")

    return True


if __name__ == '__main__':
    import sys
    success = apply_mappings()
    sys.exit(0 if success else 1)
