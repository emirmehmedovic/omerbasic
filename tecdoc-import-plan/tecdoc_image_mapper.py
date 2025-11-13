#!/usr/bin/env python3
"""
Script za mapiranje TecDoc slika sa PostgreSQL proizvodima

Što radi:
1. Učitava sve proizvode sa tecdocArticleId iz PostgreSQL
2. Pronalazi slike na file sistemu
3. Kreira JSON mapiranje samo za proizvode gdje su pronađene NOVE slike
4. Ostavlja proizvode sa EXISTING imageUrl neizmijenjene
"""

import os
import sys
import psycopg2
import json
import argparse
from pathlib import Path
from typing import Optional, Dict, List
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============================================================================
# KONFIGURACIJA
# ============================================================================

# Putanja do TecDoc slika (lokalno)
TECDOC_IMAGES_PATH = os.environ.get('TECDOC_IMAGES_PATH', '/Users/emir_mw/omerbasic/tecdoc_images/images')

# PostgreSQL konfiguracija
PG_CONNECTION_STRING = os.environ.get(
    'DATABASE_URL',
    'postgresql://emiir:emirMehmedovic123456789omerbasic@localhost:5432/omerbasicdb'
)

# Output file
OUTPUT_JSON = '/Users/emir_mw/omerbasic/tecdoc-import-plan/image_mappings.json'


class TecDocImageMapper:
    """Mapper za TecDoc slike sa PostgreSQL proizvodima."""

    def __init__(self):
        self.pg_conn = None
        self.mappings = {}
        self.stats = {
            'total_products': 0,
            'with_tecdoc_id': 0,
            'with_existing_images': 0,
            'new_images_found': 0,
            'no_images_found': 0
        }

    def connect_postgres(self):
        """Spojite se na PostgreSQL bazu."""
        try:
            self.pg_conn = psycopg2.connect(PG_CONNECTION_STRING)
            logger.info("✓ Spojena PostgreSQL baza")
        except psycopg2.Error as e:
            logger.error(f"✗ Greška pri spajanju PostgreSQL: {e}")
            raise

    def get_products_with_tecdoc_id(self) -> List[tuple]:
        """Pronađi sve proizvode sa tecdocArticleId."""
        cursor = self.pg_conn.cursor()
        query = """
            SELECT id, name, "tecdocArticleId", "imageUrl"
            FROM "Product"
            WHERE "tecdocArticleId" IS NOT NULL
            ORDER BY "tecdocArticleId"
        """
        cursor.execute(query)
        results = cursor.fetchall()
        cursor.close()
        return results

    def find_image_file(self, supplier_id: int, picture_name: str) -> Optional[str]:
        """Pronađi sliku na file sistemu."""
        if not supplier_id or not picture_name:
            return None

        # Očekivana putanja: /path/Supplier/First2Chars/...
        first_2_chars = picture_name[:2]
        expected_path = os.path.join(TECDOC_IMAGES_PATH, str(supplier_id), first_2_chars, picture_name)

        if os.path.exists(expected_path):
            return expected_path

        # Ako nije na expected path-u, pretraži sve slike
        supplier_path = os.path.join(TECDOC_IMAGES_PATH, str(supplier_id))
        if not os.path.exists(supplier_path):
            return None

        # Pretraži sve slike u supplier folderu
        for root, dirs, files in os.walk(supplier_path):
            if picture_name in files:
                return os.path.join(root, picture_name)

        return None

    def get_article_supplier(self, article_id: int) -> Optional[int]:
        """Pronađi Supplier ID za artikal iz MySQL."""
        import mysql.connector

        try:
            mysql_conn = mysql.connector.connect(
                host='localhost',
                user='root',
                password='',
                database='tecdoc1q2019'
            )
            cursor = mysql_conn.cursor()
            query = "SELECT Supplier FROM articles WHERE id = %s"
            cursor.execute(query, (article_id,))
            result = cursor.fetchone()
            cursor.close()
            mysql_conn.close()
            return result[0] if result else None
        except Exception as e:
            logger.debug(f"Greška pri pronalaženju supplier-a: {e}")
            return None

    def get_article_pictures(self, article_id: int) -> List[str]:
        """Pronađi sve slike za artikal iz MySQL."""
        import mysql.connector

        try:
            mysql_conn = mysql.connector.connect(
                host='localhost',
                user='root',
                password='',
                database='tecdoc1q2019'
            )
            cursor = mysql_conn.cursor()
            query = """
                SELECT PictureName
                FROM article_mediainformation
                WHERE article_id = %s
                AND DocumentType = 'Picture'
                AND PictureName IS NOT NULL
                AND PictureName != ''
            """
            cursor.execute(query, (article_id,))
            results = cursor.fetchall()
            cursor.close()
            mysql_conn.close()
            return [row[0] for row in results]
        except Exception as e:
            logger.debug(f"Greška pri pronalaženju slika: {e}")
            return []

    def process_products(self):
        """Procesiraj sve proizvode i pronađi slike."""
        logger.info("\n" + "="*70)
        logger.info("MAPIRANJE: Pronalaženje slika za proizvode")
        logger.info("="*70)

        products = self.get_products_with_tecdoc_id()
        self.stats['total_products'] = len(products)
        self.stats['with_tecdoc_id'] = len(products)

        logger.info(f"\n✓ Pronađeno proizvoda sa tecdocArticleId: {len(products)}")

        for i, (product_id, product_name, article_id, existing_image_url) in enumerate(products, 1):
            if i % 100 == 0:
                logger.info(f"  Obrađeno: {i}/{len(products)}")

            # Ako proizvod već ima imageUrl, preskoči ga
            if existing_image_url:
                self.stats['with_existing_images'] += 1
                logger.debug(f"  ⊘ {product_name} - već ima imageUrl: {existing_image_url}")
                continue

            # Pronađi Supplier ID
            supplier_id = self.get_article_supplier(article_id)
            if not supplier_id:
                logger.debug(f"  ✗ {product_name} - Supplier ID nije pronađen")
                continue

            # Pronađi slike
            pictures = self.get_article_pictures(article_id)
            if not pictures:
                self.stats['no_images_found'] += 1
                logger.debug(f"  ✗ {product_name} - Nema slika u TecDoc bazi")
                continue

            # Pronađi fizičku datoteku (uzmi prvu)
            for picture_name in pictures:
                image_path = self.find_image_file(supplier_id, picture_name)
                if image_path:
                    # Kreiraj relativnu putanju
                    relative_path = image_path.replace(TECDOC_IMAGES_PATH + "/", "")
                    image_url = f"/images/tecdoc/{relative_path}"

                    self.mappings[product_id] = {
                        'name': product_name,
                        'tecdocArticleId': article_id,
                        'imageUrl': image_url,
                        'pictureName': picture_name
                    }
                    self.stats['new_images_found'] += 1
                    logger.debug(f"  ✓ {product_name} - Pronađena slika: {relative_path}")
                    break

        logger.info("\n" + "="*70)
        logger.info("REZULTATI")
        logger.info("="*70)
        logger.info(f"Ukupno proizvoda: {self.stats['total_products']}")
        logger.info(f"Sa tecdocArticleId: {self.stats['with_tecdoc_id']}")
        logger.info(f"Već sa imageUrl (preskoči): {self.stats['with_existing_images']}")
        logger.info(f"Nove slike pronađene: {self.stats['new_images_found']}")
        logger.info(f"Bez dostupnih slika: {self.stats['no_images_found']}")

    def export_json(self):
        """Eksportiraj mapiranje u JSON datoteku."""
        logger.info("\n" + "="*70)
        logger.info("EXPORT")
        logger.info("="*70)

        with open(OUTPUT_JSON, 'w') as f:
            json.dump(self.mappings, f, indent=2)

        logger.info(f"✓ JSON datoteka kreirana: {OUTPUT_JSON}")
        logger.info(f"  Mapiranja: {len(self.mappings)}")

    def close(self):
        """Zatvori sve konekcije."""
        if self.pg_conn:
            self.pg_conn.close()


def main():
    parser = argparse.ArgumentParser(
        description='Mapira TecDoc slike sa PostgreSQL proizvodima'
    )
    parser.add_argument(
        '--check-mysql',
        action='store_true',
        help='Provjerite MySQL konekciju'
    )

    args = parser.parse_args()

    mapper = TecDocImageMapper()

    try:
        # Spojite se na PostgreSQL
        mapper.connect_postgres()

        # Ako trebate provjeriti MySQL
        if args.check_mysql:
            logger.info("\nProvjeravamo MySQL konekciju...")
            try:
                import mysql.connector
                mysql_conn = mysql.connector.connect(
                    host='localhost',
                    user='root',
                    password='',
                    database='tecdoc1q2019'
                )
                cursor = mysql_conn.cursor()
                cursor.execute("SELECT COUNT(*) FROM articles")
                count = cursor.fetchone()[0]
                logger.info(f"✓ MySQL je dostupan - {count} artikala")
                cursor.close()
                mysql_conn.close()
            except Exception as e:
                logger.error(f"✗ MySQL greška: {e}")
                return

        # Procesiraj proizvode
        mapper.process_products()

        # Eksportiraj JSON
        mapper.export_json()

        logger.info("\n✓ Mapiranje je završeno!")

    except Exception as e:
        logger.error(f"\n✗ Kritična greška: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        mapper.close()


if __name__ == '__main__':
    main()
