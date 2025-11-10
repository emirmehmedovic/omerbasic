"""
FAZA 1: Pronađi Sve Proizvode U TecDoc-u
=========================================
Brzo pronalazi sve proizvode koji postoje u TecDoc bazi
i sprema samo article_id i product_id

Cilj: Identifikovati koji proizvodi postoje prije nego što tražimo dodatne podatke
"""

import psycopg2
import mysql.connector
import json
from datetime import datetime
import logging
import csv

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('phase1_find_products.log'),
        logging.StreamHandler()
    ]
)

class TecDocFinder:
    def __init__(self):
        """Inicijalizacija konekcija"""
        
        # TecDoc MySQL
        self.tecdoc_conn = mysql.connector.connect(
            host="localhost",
            user="root",
            password="",  # ← EDITUJ
            database="tecdoc1q2019",
            connect_timeout=300
        )
        
        # Postgres (Neon)
        self.prod_conn = psycopg2.connect(
            "postgresql://neondb_owner:npg_fr1hSiyUN0gR@ep-floral-frog-a28sjyps-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require",
            connect_timeout=300
        )
        
        self.stats = {
            'total': 0,
            'found': 0,
            'not_found': 0,
            'updated': 0
        }
        
        # CSV fajlovi za export
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        self.found_csv = f'found_products_{timestamp}.csv'
        self.not_found_csv = f'not_found_products_{timestamp}.csv'
        
        # Kreiraj CSV fajlove sa headerima
        with open(self.found_csv, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['product_id', 'catalog_number', 'product_name', 'article_id', 'tecdoc_product_id'])
        
        with open(self.not_found_csv, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['product_id', 'catalog_number', 'product_name'])
        
        logging.info("✅ Database connections established")
        logging.info(f"📄 Export files: {self.found_csv}, {self.not_found_csv}")
    
    def get_all_products(self):
        """Učitaj sve proizvode iz Postgres"""
        cursor = self.prod_conn.cursor()
        
        query = """
            SELECT 
                id,
                name,
                "catalogNumber"
            FROM "Product"
            WHERE "catalogNumber" IS NOT NULL
            AND "tecdocArticleId" IS NULL
            ORDER BY id
        """
        
        cursor.execute(query)
        products = cursor.fetchall()
        cursor.close()
        
        logging.info(f"📦 Loaded {len(products)} products without TecDoc ID")
        return products
    
    def find_in_tecdoc(self, catalog_number: str) -> tuple:
        """
        Pronađi artikel u TecDoc
        Returns: (article_id, product_id) ili (None, None)
        """
        cursor = self.tecdoc_conn.cursor()
        
        # Query 1: Exact match
        query = """
            SELECT id, CurrentProduct
            FROM articles 
            WHERE DataSupplierArticleNumber = %s
            LIMIT 1
        """
        
        cursor.execute(query, (catalog_number,))
        result = cursor.fetchone()
        
        if result:
            cursor.close()
            return (result[0], result[1])
        
        # Query 2: Sa razmakom (HX81D → HX 81D)
        if len(catalog_number) > 3 and ' ' not in catalog_number:
            variants = [
                catalog_number[:2] + ' ' + catalog_number[2:],
                catalog_number[:3] + ' ' + catalog_number[3:],
            ]
            
            for variant in variants:
                cursor.execute(query, (variant,))
                result = cursor.fetchone()
                if result:
                    logging.info(f"   Found with variant: {variant}")
                    cursor.close()
                    return (result[0], result[1])
        
        cursor.close()
        return (None, None)
    
    def update_product(self, product_id: str, article_id: int, tecdoc_product_id: int):
        """Update proizvod sa TecDoc ID-jevima"""
        cursor = self.prod_conn.cursor()
        
        query = """
            UPDATE "Product"
            SET 
                "tecdocArticleId" = %s,
                "tecdocProductId" = %s,
                "updatedAt" = NOW()
            WHERE id = %s
        """
        
        cursor.execute(query, (article_id, tecdoc_product_id, product_id))
        self.prod_conn.commit()
        cursor.close()
    
    def run(self):
        """Pokreni pronalaženje"""
        
        logging.info(f"\n{'#'*70}")
        logging.info(f"🔍 FAZA 1: Pronalaženje Proizvoda U TecDoc-u")
        logging.info(f"{'#'*70}\n")
        
        products = self.get_all_products()
        self.stats['total'] = len(products)
        
        for idx, (product_id, name, catalog_number) in enumerate(products, 1):
            try:
                # Pronađi u TecDoc
                article_id, tecdoc_product_id = self.find_in_tecdoc(catalog_number)
                
                if article_id:
                    logging.info(f"✅ [{idx}/{len(products)}] {catalog_number} → article_id={article_id}")
                    self.stats['found'] += 1
                    
                    # Update bazu
                    self.update_product(product_id, article_id, tecdoc_product_id)
                    self.stats['updated'] += 1
                    
                    # Spremi u CSV (FOUND)
                    with open(self.found_csv, 'a', newline='', encoding='utf-8') as f:
                        writer = csv.writer(f)
                        writer.writerow([product_id, catalog_number, name, article_id, tecdoc_product_id])
                else:
                    logging.debug(f"❌ [{idx}/{len(products)}] {catalog_number} → Not found")
                    self.stats['not_found'] += 1
                    
                    # Spremi u CSV (NOT FOUND)
                    with open(self.not_found_csv, 'a', newline='', encoding='utf-8') as f:
                        writer = csv.writer(f)
                        writer.writerow([product_id, catalog_number, name])
                
                # Progress update
                if idx % 100 == 0:
                    logging.info(f"\n📊 Progress: {idx}/{len(products)} ({idx/len(products)*100:.1f}%)")
                    logging.info(f"   Found: {self.stats['found']}, Not found: {self.stats['not_found']}")
                
            except Exception as e:
                logging.error(f"❌ Error processing {catalog_number}: {e}")
                continue
        
        # Final stats
        logging.info(f"\n{'#'*70}")
        logging.info(f"✅ FAZA 1 COMPLETED")
        logging.info(f"{'#'*70}")
        logging.info(f"📊 Final Stats:")
        logging.info(f"   Total: {self.stats['total']}")
        logging.info(f"   Found: {self.stats['found']} ({self.stats['found']/self.stats['total']*100:.1f}%)")
        logging.info(f"   Not found: {self.stats['not_found']} ({self.stats['not_found']/self.stats['total']*100:.1f}%)")
        logging.info(f"   Updated: {self.stats['updated']}")
        logging.info(f"\n📄 Export Files:")
        logging.info(f"   ✅ Found: {self.found_csv}")
        logging.info(f"   ❌ Not found: {self.not_found_csv}")
        logging.info(f"{'#'*70}\n")
    
    def close(self):
        """Zatvori konekcije"""
        self.tecdoc_conn.close()
        self.prod_conn.close()
        logging.info("🔌 Database connections closed")

def main():
    """Main funkcija"""
    
    finder = TecDocFinder()
    
    try:
        finder.run()
    except Exception as e:
        logging.error(f"❌ Fatal error: {e}")
        raise
    finally:
        finder.close()

if __name__ == "__main__":
    main()
