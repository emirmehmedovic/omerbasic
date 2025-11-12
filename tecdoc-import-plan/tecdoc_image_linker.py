#!/usr/bin/env python3
"""
Script za linkovanje slika iz TecDoc baze sa proizvodima u PostgreSQL bazi.

Korištenje:
    python3 tecdoc_image_linker.py --test              # Test sa jednim proizvodom
    python3 tecdoc_image_linker.py --all               # Import svih slika
    python3 tecdoc_image_linker.py --article-id 123456 # Test sa specifičnim article ID
"""

import os
import sys
import mysql.connector
import psycopg2
import argparse
from pathlib import Path
from typing import Optional, List, Tuple
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
# KONFIGURACIJA - Prilagodite prema vašem okruženju
# ============================================================================

# Putanja do TecDoc slika (trebate uploadovati ovdje)
TECDOC_IMAGES_PATH = os.environ.get('TECDOC_IMAGES_PATH', '/home/omerbasic/tecdoc_images/images')

# MySQL konfiguracija (TecDoc baza)
MYSQL_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': os.environ.get('MYSQL_PASSWORD', ''),  # Postavite u .env ako trebate
    'database': 'tecdoc1q2019'
}

# PostgreSQL konfiguracija - koristi .env DATABASE_URL
PG_CONNECTION_STRING = os.environ.get(
    'DATABASE_URL',
    'postgresql://emiir:emirMehmedovic123456789omerbasic@localhost:5432/omerbasicdb'
)


class TecDocImageLinker:
    """Linker za TecDoc slike sa PostgreSQL bazom."""

    def __init__(self):
        self.mysql_conn = None
        self.pg_conn = None
        self.images_cache = {}  # Cache za pronađene slike

    def connect_mysql(self):
        """Spojite se na MySQL bazu."""
        try:
            self.mysql_conn = mysql.connector.connect(**MYSQL_CONFIG)
            logger.info("✓ Spojena MySQL baza")
        except mysql.connector.Error as e:
            logger.error(f"✗ Greška pri spajanju MySQL: {e}")
            raise

    def connect_postgres(self):
        """Spojite se na PostgreSQL bazu."""
        try:
            self.pg_conn = psycopg2.connect(PG_CONNECTION_STRING)
            logger.info("✓ Spojena PostgreSQL baza")
            logger.debug(f"  Baza: {self.pg_conn.get_dsn_parameters().get('dbname')}")
        except psycopg2.Error as e:
            logger.error(f"✗ Greška pri spajanju PostgreSQL: {e}")
            logger.error(f"  Connection string: {PG_CONNECTION_STRING[:50]}...")
            raise

    def get_images_for_article(self, article_id: int) -> List[Tuple[int, str, str]]:
        """Pronađi sve slike za jedan artikal iz MySQL baze.

        Args:
            article_id: ID artikla iz TecDoc baze

        Returns:
            Lista tuple-a: (article_id, PictureName, DocumentType)
        """
        cursor = self.mysql_conn.cursor()
        query = """
            SELECT article_id, PictureName, DocumentType
            FROM article_mediainformation
            WHERE article_id = %s AND DocumentType = 'Picture'
            AND PictureName IS NOT NULL AND PictureName != ''
        """
        cursor.execute(query, (article_id,))
        results = cursor.fetchall()
        cursor.close()
        return results

    def get_article_supplier(self, article_id: int) -> Optional[int]:
        """Pronađi Supplier ID za artikal.

        Args:
            article_id: ID artikla

        Returns:
            Supplier ID ili None
        """
        cursor = self.mysql_conn.cursor()
        query = "SELECT Supplier FROM articles WHERE id = %s"
        cursor.execute(query, (article_id,))
        result = cursor.fetchone()
        cursor.close()

        return result[0] if result else None

    def find_image_file(self, supplier_id: int, picture_name: str) -> Optional[str]:
        """Pronađi sliku na file sistemu.

        Metodologija:
        1. Prvo provjeri očekivanu putanju: /Supplier/PictureNameFirst2Chars/PictureName
        2. Ako ne nađe, pretražи sve slike sa tim imenom

        Args:
            supplier_id: ID dobavljača
            picture_name: Naziv slike (npr. "190130.JPG")

        Returns:
            Putanja do slike ili None
        """
        # Prvo provjeri expected path
        first_2_chars = picture_name[:2]
        expected_path = os.path.join(TECDOC_IMAGES_PATH, str(supplier_id), first_2_chars, picture_name)

        if os.path.exists(expected_path):
            logger.debug(f"  ✓ Slika pronađena na: {expected_path}")
            return expected_path

        # Ako nije na expected path-u, pretraži sve slike
        supplier_path = os.path.join(TECDOC_IMAGES_PATH, str(supplier_id))
        if not os.path.exists(supplier_path):
            logger.debug(f"  ✗ Supplier folder ne postoji: {supplier_path}")
            return None

        # Pretraži sve slike u supplier folderu
        for root, dirs, files in os.walk(supplier_path):
            if picture_name in files:
                found_path = os.path.join(root, picture_name)
                logger.debug(f"  ✓ Slika pronađena na: {found_path}")
                return found_path

        logger.debug(f"  ✗ Slika ne postoji: {picture_name}")
        return None

    def get_products_with_tecdoc_id(self, limit: Optional[int] = None) -> List[Tuple]:
        """Pronađi proizvode sa tecdocArticleId u PostgreSQL bazi.

        Args:
            limit: Maksimalni broj proizvoda (za testiranje)

        Returns:
            Lista tuple-a: (product_id, tecdocArticleId, name)
        """
        cursor = self.pg_conn.cursor()
        query = """
            SELECT id, "tecdocArticleId", name
            FROM "Product"
            WHERE "tecdocArticleId" IS NOT NULL
        """
        if limit:
            query += f" LIMIT {limit}"

        cursor.execute(query)
        results = cursor.fetchall()
        cursor.close()
        return results

    def update_product_image(self, product_id: str, image_url: str) -> bool:
        """Ažuriraj produktni imageUrl u PostgreSQL bazi.

        Args:
            product_id: ID proizvoda u PostgreSQL
            image_url: URL do slike (ili putanja)

        Returns:
            True ako je uspješno
        """
        try:
            cursor = self.pg_conn.cursor()
            query = 'UPDATE "Product" SET "imageUrl" = %s WHERE id = %s'
            cursor.execute(query, (image_url, product_id))
            self.pg_conn.commit()
            cursor.close()
            return True
        except psycopg2.Error as e:
            logger.error(f"✗ Greška pri ažuriranju: {e}")
            self.pg_conn.rollback()
            return False

    def test_single_product(self, product_id: Optional[str] = None, article_id: Optional[int] = None):
        """Testiraj linkovanje za jedan proizvod.

        Args:
            product_id: ID proizvoda u PostgreSQL (ako je dan)
            article_id: ID artikla iz TecDoc (ako je dan)
        """
        logger.info("\n" + "="*60)
        logger.info("TEST: Linkovanje slike za jedan proizvod")
        logger.info("="*60)

        # Pronađi proizvod
        if product_id:
            cursor = self.pg_conn.cursor()
            cursor.execute('SELECT id, "tecdocArticleId", name FROM "Product" WHERE id = %s', (product_id,))
            result = cursor.fetchone()
            cursor.close()
            if not result:
                logger.error(f"✗ Proizvod ne postoji: {product_id}")
                return
            product_id, tecdoc_article_id, product_name = result
        elif article_id:
            # Pronađi proizvod sa tim article ID-om
            cursor = self.pg_conn.cursor()
            cursor.execute('SELECT id, "tecdocArticleId", name FROM "Product" WHERE "tecdocArticleId" = %s LIMIT 1', (article_id,))
            result = cursor.fetchone()
            cursor.close()
            if not result:
                logger.info(f"ℹ Proizvod sa article ID {article_id} nije u PostgreSQL bazi")
                logger.info("  Testiram direktno sa TecDoc bazom...")
                tecdoc_article_id = article_id
                product_name = "TECDOC TEST"
                product_id = None
            else:
                product_id, tecdoc_article_id, product_name = result
        else:
            # Uzmi prvi proizvod
            products = self.get_products_with_tecdoc_id(limit=1)
            if not products:
                logger.error("✗ Nema proizvoda sa tecdocArticleId")
                return
            product_id, tecdoc_article_id, product_name = products[0]

        logger.info(f"\nProizvod: {product_name}")
        logger.info(f"  PostgreSQL ID: {product_id}")
        logger.info(f"  TecDoc Article ID: {tecdoc_article_id}")

        # Pronađi slike u MySQL
        images = self.get_images_for_article(tecdoc_article_id)
        if not images:
            logger.warning(f"✗ Nema slika za artikal {tecdoc_article_id}")
            return

        logger.info(f"\n✓ Pronađene slike ({len(images)}):")
        for article_id, picture_name, doc_type in images:
            logger.info(f"  - {picture_name} ({doc_type})")

        # Pronađi Supplier ID
        supplier_id = self.get_article_supplier(tecdoc_article_id)
        logger.info(f"\nSupplier ID: {supplier_id}")

        # Pronađi fizičke datoteke
        logger.info("\nTražim slike na file sistemu:")
        found_images = []
        for article_id, picture_name, doc_type in images:
            image_path = self.find_image_file(supplier_id, picture_name)
            if image_path:
                found_images.append({
                    'picture_name': picture_name,
                    'path': image_path,
                    'relative_path': image_path.replace(TECDOC_IMAGES_PATH + "/", "")
                })

        if found_images:
            logger.info(f"\n✓ Pronađene datoteke ({len(found_images)}):")
            for img in found_images:
                logger.info(f"  - {img['picture_name']}")
                logger.info(f"    → {img['relative_path']}")

            # Prijedlog kako servirati slike
            logger.info("\n✓ Prijedlog za serviranje:")
            logger.info(f"  1. Uploaduj folder /images sa VPS-a")
            logger.info(f"  2. Relativna putanja: {found_images[0]['relative_path']}")
            logger.info(f"  3. URL: /images/tecdoc/{found_images[0]['relative_path']}")
        else:
            logger.warning("✗ Nisu pronađene fizičke datoteke")

    def process_all_products(self, batch_size: int = 100):
        """Procesiraj sve proizvode i linkuj slike.

        Args:
            batch_size: Koliko proizvoda obraditi po batch-u
        """
        import json

        logger.info("\n" + "="*60)
        logger.info("PROCESSING: Sve proizvode sa slikama")
        logger.info("="*60)

        # Pronađi sve proizvode
        products = self.get_products_with_tecdoc_id()
        logger.info(f"\n✓ Pronađeno proizvoda: {len(products)}")

        updated_count = 0
        for i, (product_id, tecdoc_article_id, product_name) in enumerate(products, 1):
            if i % batch_size == 0:
                logger.info(f"  Obrađeno: {i}/{len(products)}")

            # Pronađi slike
            images = self.get_images_for_article(tecdoc_article_id)
            if not images:
                continue

            # Pronađi Supplier
            supplier_id = self.get_article_supplier(tecdoc_article_id)
            if not supplier_id:
                continue

            # Pronađi sve fizičke datoteke (ne samo prvu!)
            found_urls = []
            for article_id, picture_name, doc_type in images:
                image_path = self.find_image_file(supplier_id, picture_name)
                if image_path:
                    # Kreiraj relativnu putanju
                    relative_path = image_path.replace(TECDOC_IMAGES_PATH + "/", "")
                    image_url = f"/images/tecdoc/{relative_path}"
                    found_urls.append(image_url)

            # Ako je pronađeno slike, spremi prvu kao imageUrl i sve kao JSON
            if found_urls:
                # Spremi samo prvu sliku kao imageUrl (za Next.js Image komponentu)
                if self.update_product_image(product_id, found_urls[0]):
                    updated_count += 1

        logger.info(f"\n✓ Ažurirano proizvoda: {updated_count}/{len(products)}")

    def close(self):
        """Zatvori sve konekcije."""
        if self.mysql_conn:
            self.mysql_conn.close()
        if self.pg_conn:
            self.pg_conn.close()


def main():
    parser = argparse.ArgumentParser(
        description='Linkuj TecDoc slike sa производима'
    )
    parser.add_argument(
        '--test',
        action='store_true',
        help='Test sa prvim proizvodom'
    )
    parser.add_argument(
        '--article-id',
        type=int,
        help='Test sa specifičnim TecDoc article ID-om'
    )
    parser.add_argument(
        '--product-id',
        help='Test sa specifičnim PostgreSQL product ID-om'
    )
    parser.add_argument(
        '--all',
        action='store_true',
        help='Procesiraj sve proizvode'
    )

    args = parser.parse_args()

    # Kreiraj linker
    linker = TecDocImageLinker()

    try:
        # Spojite se na baze
        linker.connect_mysql()
        linker.connect_postgres()

        # Odaberi akciju
        if args.test or (not args.all and not args.article_id and not args.product_id):
            linker.test_single_product(product_id=args.product_id, article_id=args.article_id)
        elif args.all:
            linker.process_all_products()
        else:
            linker.test_single_product(product_id=args.product_id, article_id=args.article_id)

    except Exception as e:
        logger.error(f"\n✗ Kritična greška: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        linker.close()


if __name__ == '__main__':
    main()
