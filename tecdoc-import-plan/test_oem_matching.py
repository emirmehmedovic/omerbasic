"""
TEST OEM Matching - Samo 10 Proizvoda
======================================
Testira OEM matching na malom uzorku proizvoda.
"""

import psycopg2
import mysql.connector
import logging
import json
import re

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)

class OEMMatcherTest:
    def __init__(self):
        """Inicijalizacija konekcija"""
        
        # TecDoc MySQL
        self.tecdoc_conn = mysql.connector.connect(
            host="localhost",
            user="root",
            password="",
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
            'matched': 0,
            'multiple_matches': 0,
            'no_match': 0
        }
        
        logging.info("✅ Database connections established")
    
    def normalize_oem(self, oem_number):
        """Normalizuj OEM broj"""
        if not oem_number:
            return None
        
        normalized = re.sub(r'[^A-Z0-9]', '', str(oem_number).upper())
        return normalized if normalized else None
    
    def get_test_products(self, limit=10):
        """Učitaj prvih 10 proizvoda bez TecDoc ID ali sa OEM brojevima"""
        cursor = self.prod_conn.cursor()
        
        query = """
            SELECT 
                id,
                name,
                "oemNumber",
                "catalogNumber"
            FROM "Product"
            WHERE "tecdocArticleId" IS NULL
            AND "oemNumber" IS NOT NULL
            AND "oemNumber" != ''
            AND "oemNumber" != '0'
            ORDER BY id
            LIMIT %s
        """
        
        cursor.execute(query, (limit,))
        products = cursor.fetchall()
        cursor.close()
        
        logging.info(f"📦 Found {len(products)} test products")
        return products
    
    def search_by_oem(self, oem_number):
        """Pretraži TecDoc po OEM broju"""
        cursor = self.tecdoc_conn.cursor()
        
        normalized_oem = self.normalize_oem(oem_number)
        
        if not normalized_oem:
            return []
        
        query = """
            SELECT DISTINCT 
                aon.article_id, 
                a.Supplier, 
                s.Description as brand, 
                a.DataSupplierArticleNumber,
                aon.OENbr as original_oem
            FROM article_oe_numbers aon
            JOIN articles a ON a.id = aon.article_id
            JOIN suppliers s ON s.id = a.Supplier
            WHERE REPLACE(REPLACE(REPLACE(UPPER(aon.OENbr), ' ', ''), '-', ''), '.', '') = %s
            LIMIT 20
        """
        
        try:
            cursor.execute(query, (normalized_oem,))
            results = cursor.fetchall()
            cursor.close()
            return results
        except Exception as e:
            logging.error(f"Query error: {e}")
            cursor.close()
            return []
    
    def run_test(self):
        """Pokreni test"""
        
        logging.info(f"\n{'#'*70}")
        logging.info(f"🧪 TEST OEM Matching - 10 Proizvoda")
        logging.info(f"{'#'*70}\n")
        
        # Učitaj proizvode
        products = self.get_test_products(10)
        self.stats['total'] = len(products)
        
        if not products:
            logging.info("❌ No test products found!")
            return
        
        # Procesuj
        for idx, (product_id, product_name, oem_numbers_json, article_number) in enumerate(products, 1):
            try:
                # oemNumber je TEXT, ne JSON array
                oem_number = oem_numbers_json if oem_numbers_json else None
                
                # Filter out invalid OEM numbers (empty, "0", etc.)
                if not oem_number or str(oem_number).strip() in ['0', '00', '000', '-', 'N/A', 'n/a', 'NA', '']:
                    logging.info(f"\n[{idx}/{len(products)}] ⏭️  SKIPPED: {product_name[:50]} (no valid OEM numbers)")
                    continue
                
                oem_numbers = [oem_number]  # Stavi u listu za kompatibilnost
                
                logging.info(f"\n{'='*70}")
                logging.info(f"[{idx}/{len(products)}] 📦 Product: {product_name}")
                logging.info(f"   ID: {product_id}")
                logging.info(f"   Article Number: {article_number}")
                logging.info(f"   OEM Numbers: {oem_numbers}")
                logging.info(f"{'='*70}")
                
                # Pretraži po svakom OEM broju
                all_matches = []
                
                for oem in oem_numbers:
                    logging.info(f"\n🔍 Searching for OEM: '{oem}'")
                    logging.info(f"   Normalized: '{self.normalize_oem(oem)}'")
                    
                    matches = self.search_by_oem(oem)
                    
                    if matches:
                        logging.info(f"   ✅ Found {len(matches)} match(es):")
                        
                        for match in matches:
                            article_id, supplier_id, brand, tecdoc_article_number, original_oem = match
                            logging.info(f"      - TecDoc ID: {article_id}")
                            logging.info(f"        Brand: {brand}")
                            logging.info(f"        Article Number: {tecdoc_article_number}")
                            logging.info(f"        OEM in TecDoc: {original_oem}")
                        
                        all_matches.extend(matches)
                    else:
                        logging.info(f"   ❌ No matches found")
                
                # Rezultat
                if all_matches:
                    unique_matches = list(set(all_matches))
                    self.stats['matched'] += 1
                    
                    if len(unique_matches) > 1:
                        self.stats['multiple_matches'] += 1
                        logging.info(f"\n⚠️  MULTIPLE MATCHES: {len(unique_matches)} unique articles found")
                    else:
                        logging.info(f"\n✅ SINGLE MATCH FOUND")
                    
                    # Prikaži najbolji match
                    best = unique_matches[0]
                    logging.info(f"\n🎯 Best Match:")
                    logging.info(f"   TecDoc ID: {best[0]}")
                    logging.info(f"   Brand: {best[2]}")
                    logging.info(f"   Article Number: {best[3]}")
                else:
                    self.stats['no_match'] += 1
                    logging.info(f"\n❌ NO MATCHES FOUND for this product")
                
            except Exception as e:
                logging.error(f"❌ Error: {e}")
                continue
        
        # Final stats
        logging.info(f"\n{'#'*70}")
        logging.info(f"✅ TEST COMPLETED")
        logging.info(f"{'#'*70}")
        logging.info(f"📊 Results:")
        logging.info(f"   Total Products: {self.stats['total']}")
        logging.info(f"   Matched: {self.stats['matched']}")
        logging.info(f"   Multiple Matches: {self.stats['multiple_matches']}")
        logging.info(f"   No Match: {self.stats['no_match']}")
        logging.info(f"   Success Rate: {self.stats['matched']/self.stats['total']*100:.1f}%")
        logging.info(f"{'#'*70}\n")
    
    def close(self):
        """Zatvori konekcije"""
        self.tecdoc_conn.close()
        self.prod_conn.close()
        logging.info("🔌 Database connections closed")

def main():
    """Main funkcija"""
    
    matcher = OEMMatcherTest()
    
    try:
        matcher.run_test()
    except Exception as e:
        logging.error(f"❌ Fatal error: {e}")
        raise
    finally:
        matcher.close()

if __name__ == "__main__":
    main()
