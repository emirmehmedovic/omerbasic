#!/usr/bin/env python3
"""
VPS Script - Sinkronizuj image mappiranja iz Neon baze u production PostgreSQL.

Ova skripta se pokreće na VPS-u:
1. Spojava se na Neon bazu (test) i pročita sve proizvode sa imageUrl
2. Spojava se na local PostgreSQL (production)
3. Primjenjuje mapiranja na production bazu

Korištenje:
    python3 vps_sync_images.py

Trebate .env sa:
    - NEON_DATABASE_URL (test baza - Neon)
    - DATABASE_URL (production baza - local PostgreSQL)
"""

import os
import sys
import psycopg2
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
NEON_PG_CONNECTION = os.environ.get('NEON_DATABASE_URL')
VPS_PG_CONNECTION = os.environ.get('DATABASE_URL')


class ImageSyncer:
    """Sinkronizator slika između Neon i production baza."""

    def __init__(self):
        self.neon_conn = None
        self.vps_conn = None
        self.stats = {
            'total_mappings': 0,
            'updated': 0,
            'skipped': 0,
            'not_found': 0,
            'errors': 0
        }

    def connect_neon(self):
        """Spojava se na Neon test bazu."""
        try:
            self.neon_conn = psycopg2.connect(NEON_PG_CONNECTION)
            logger.info("✓ Spojena Neon test baza")
        except psycopg2.Error as e:
            logger.error(f"✗ Greška pri spajanju Neon: {e}")
            raise

    def connect_vps(self):
        """Spojava se na VPS production bazu."""
        try:
            self.vps_conn = psycopg2.connect(VPS_PG_CONNECTION)
            logger.info("✓ Spojena VPS production baza")
        except psycopg2.Error as e:
            logger.error(f"✗ Greška pri spajanju VPS: {e}")
            raise

    def get_neon_mappings(self):
        """Pročita sve proizvode sa tecdoc imageUrl iz Neon baze."""
        cursor = self.neon_conn.cursor()
        query = """
            SELECT id, "imageUrl"
            FROM "Product"
            WHERE "imageUrl" IS NOT NULL
            AND "imageUrl" LIKE '%tecdoc%'
        """
        cursor.execute(query)
        results = cursor.fetchall()
        cursor.close()
        return results

    def sync_mappings(self):
        """Sinkronizuj mapiranja sa Neon na VPS."""
        logger.info("\n" + "="*70)
        logger.info("SINKRONIZACIJA: Neon → VPS")
        logger.info("="*70)

        # Get mappings from Neon
        mappings = self.get_neon_mappings()
        self.stats['total_mappings'] = len(mappings)

        logger.info(f"\n✓ Pronađena mapiranja u Neon: {len(mappings)}")

        # Apply to VPS
        vps_cursor = self.vps_conn.cursor()

        for i, (product_id, image_url) in enumerate(mappings, 1):
            if i % 50 == 0:
                logger.info(f"  Obrađeno: {i}/{len(mappings)}")

            try:
                # Check if product exists and doesn't already have a different imageUrl
                vps_cursor.execute(
                    'SELECT "imageUrl" FROM "Product" WHERE id = %s',
                    (product_id,)
                )
                result = vps_cursor.fetchone()

                if result is None:
                    logger.debug(f"  ⚠ Proizvod ne postoji: {product_id}")
                    self.stats['not_found'] += 1
                    continue

                existing_url = result[0]

                # Skip if already has a different imageUrl (don't overwrite custom values)
                if existing_url and existing_url != image_url:
                    logger.debug(f"  ⊘ {product_id} - već ima drugačiji imageUrl, preskaču")
                    self.stats['skipped'] += 1
                    continue

                # Update
                vps_cursor.execute(
                    'UPDATE "Product" SET "imageUrl" = %s WHERE id = %s',
                    (image_url, product_id)
                )
                self.vps_conn.commit()
                self.stats['updated'] += 1

            except psycopg2.Error as e:
                logger.error(f"  ✗ Greška pri ažuriranju {product_id}: {e}")
                self.vps_conn.rollback()
                self.stats['errors'] += 1

        vps_cursor.close()

        # Report
        logger.info("\n" + "="*70)
        logger.info("REZULTATI")
        logger.info("="*70)
        logger.info(f"Ažurirana mapiranja: {self.stats['updated']}")
        logger.info(f"Preskoči: {self.stats['skipped']}")
        logger.info(f"Nisu pronađeni proizvodi: {self.stats['not_found']}")
        logger.info(f"Greške: {self.stats['errors']}")
        logger.info(f"Ukupno: {sum(self.stats.values())}")

    def close(self):
        """Zatvori sve konekcije."""
        if self.neon_conn:
            self.neon_conn.close()
        if self.vps_conn:
            self.vps_conn.close()


def main():
    syncer = ImageSyncer()

    try:
        syncer.connect_neon()
        syncer.connect_vps()
        syncer.sync_mappings()
        logger.info("\n✓ Sinkronizacija je završena!")
        return 0
    except Exception as e:
        logger.error(f"\n✗ Kritična greška: {e}")
        import traceback
        traceback.print_exc()
        return 1
    finally:
        syncer.close()


if __name__ == '__main__':
    sys.exit(main())
