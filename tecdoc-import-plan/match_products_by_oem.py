"""
TecDoc Matching - OEM Brojevi
==============================
Pronalazi TecDoc ID za proizvode koristeći OEM brojeve.
Radi SAMO za proizvode koji NEMAJU tecdocId.

Strategija:
1. Normalizacija OEM brojeva (ukloni razmake, crtice, uppercase)
2. Pretraga u TecDoc articles_oe tabeli
3. Multiple matches - loguje sve, bira najbolji
4. UPDATE tecdocId u Postgres bazi
"""

import psycopg2
import mysql.connector
import logging
import json
import re
from collections import defaultdict

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('match_oem.log'),
        logging.StreamHandler()
    ]
)

class OEMatcher:
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
            'total_products': 0,
            'products_with_oem': 0,
            'oem_numbers_checked': 0,
            'matches_found': 0,
            'multiple_matches': 0,
            'updated': 0,
            'skipped': 0,
            'errors': 0
        }
        
        logging.info("✅ Database connections established")
    
    def normalize_oem(self, oem_number):
        """
        Normalizuj OEM broj - ukloni razmake, crtice, uppercase
        Input: "1K0 615 301 AA" ili "1K0-615-301-AA"
        Output: "1K0615301AA"
        """
        if not oem_number:
            return None
        
        # Ukloni sve što nije slovo ili broj
        normalized = re.sub(r'[^A-Z0-9]', '', str(oem_number).upper())
        return normalized if normalized else None
    
    def get_products_without_tecdoc(self):
        """Učitaj proizvode koji NEMAJU tecdocId ali IMAJU oemNumbers"""
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
        """
        
        cursor.execute(query)
        products = cursor.fetchall()
        cursor.close()
        
        logging.info(f"📦 Found {len(products)} products without TecDoc ID but with OEM numbers")
        return products
    
    def search_by_oem(self, oem_number):
        """
        Pretraži TecDoc po OEM broju
        Vraća: [(article_id, supplier_id, brand_name, article_number), ...]
        """
        cursor = self.tecdoc_conn.cursor()
        
        # Normalizuj OEM broj
        normalized_oem = self.normalize_oem(oem_number)
        
        if not normalized_oem:
            return []
        
        # Pretraga u article_oe_numbers tabeli
        query = """
            SELECT DISTINCT 
                aon.article_id,
                a.Supplier,
                s.Description,
                a.DataSupplierArticleNumber
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
    
    def get_article_details(self, article_id):
        """Učitaj detalje artikla iz TecDoc"""
        cursor = self.tecdoc_conn.cursor()
        
        query = """
            SELECT 
                a.ArticleNumber,
                s.Description as brand,
                a.NormalizedDescription as description
            FROM articles a
            JOIN suppliers s ON s.id = a.DataSupplierId
            WHERE a.id = %s
            LIMIT 1
        """
        
        cursor.execute(query, (article_id,))
        result = cursor.fetchone()
        cursor.close()
        
        return result
    
    def select_best_match(self, matches, product_name, article_number):
        """
        Odaberi najbolji match iz više rezultata
        Prioritet:
        1. Exact article number match
        2. Isti brand (ako je u nazivu)
        3. Prvi rezultat
        """
        if not matches:
            return None
        
        if len(matches) == 1:
            return matches[0]
        
        # Normalizuj article number iz baze
        normalized_article = self.normalize_oem(article_number) if article_number else None
        
        # 1. Provjeri exact article number match
        for match in matches:
            article_id, supplier_id, brand_name, tecdoc_article_number = match
            
            if normalized_article and self.normalize_oem(tecdoc_article_number) == normalized_article:
                logging.info(f"   ✅ Exact article number match: {tecdoc_article_number}")
                return match
        
        # 2. Provjeri brand match (ako je brand u nazivu proizvoda)
        product_name_upper = product_name.upper() if product_name else ""
        
        for match in matches:
            article_id, supplier_id, brand_name, tecdoc_article_number = match
            
            if brand_name and brand_name.upper() in product_name_upper:
                logging.info(f"   ✅ Brand match: {brand_name}")
                return match
        
        # 3. Vrati prvi
        logging.info(f"   ⚠️  Using first match (no exact match found)")
        return matches[0]
    
    def update_product_tecdoc_id(self, product_id, tecdoc_id):
        """Update tecdocArticleId u Postgres"""
        cursor = self.prod_conn.cursor()
        
        query = """
            UPDATE "Product"
            SET "tecdocArticleId" = %s,
                "updatedAt" = NOW()
            WHERE id = %s
        """
        
        cursor.execute(query, (tecdoc_id, product_id))
        self.prod_conn.commit()
        cursor.close()
    
    def run(self):
        """Pokreni matching"""
        
        logging.info(f"\n{'#'*70}")
        logging.info(f"🔍 TecDoc Matching - OEM Brojevi")
        logging.info(f"{'#'*70}\n")
        
        # 1. Učitaj proizvode
        products = self.get_products_without_tecdoc()
        self.stats['total_products'] = len(products)
        
        if not products:
            logging.info("✅ No products to process!")
            return
        
        logging.info(f"\n{'='*70}")
        logging.info(f"🔍 MATCHING PROCESS")
        logging.info(f"{'='*70}\n")
        
        # 2. Procesuj svaki proizvod
        for idx, (product_id, product_name, oem_numbers_json, article_number) in enumerate(products, 1):
            try:
                # oemNumber je TEXT, ne JSON array
                oem_number = oem_numbers_json if oem_numbers_json else None
                
                # Filter out invalid OEM numbers (empty, "0", etc.)
                if not oem_number or str(oem_number).strip() in ['0', '00', '000', '-', 'N/A', 'n/a', 'NA', '']:
                    self.stats['skipped'] += 1
                    continue
                
                oem_numbers = [oem_number]  # Stavi u listu za kompatibilnost
                
                self.stats['products_with_oem'] += 1
                
                logging.info(f"\n[{idx}/{len(products)}] 📦 {product_name[:50]}")
                logging.info(f"   OEM Numbers: {oem_numbers}")
                
                # Pretraži po svakom OEM broju
                all_matches = []
                
                for oem in oem_numbers:
                    self.stats['oem_numbers_checked'] += 1
                    
                    matches = self.search_by_oem(oem)
                    
                    if matches:
                        logging.info(f"   🔍 OEM '{oem}' → {len(matches)} match(es)")
                        all_matches.extend(matches)
                    else:
                        logging.debug(f"   ❌ OEM '{oem}' → No matches")
                
                # Ako ima matcheva
                if all_matches:
                    self.stats['matches_found'] += 1
                    
                    # Ukloni duplikate
                    unique_matches = list(set(all_matches))
                    
                    if len(unique_matches) > 1:
                        self.stats['multiple_matches'] += 1
                        logging.info(f"   ⚠️  Multiple matches found: {len(unique_matches)}")
                        
                        # Loguj sve matcheve
                        for match in unique_matches:
                            article_id, supplier_id, brand_name, tecdoc_article_number = match
                            logging.info(f"      - Article ID: {article_id}, Brand: {brand_name}, Number: {tecdoc_article_number}")
                    
                    # Odaberi najbolji match
                    best_match = self.select_best_match(unique_matches, product_name, article_number)
                    
                    if best_match:
                        article_id, supplier_id, brand_name, tecdoc_article_number = best_match
                        
                        # Update bazu
                        self.update_product_tecdoc_id(product_id, article_id)
                        self.stats['updated'] += 1
                        
                        logging.info(f"   ✅ MATCHED → TecDoc ID: {article_id} ({brand_name} {tecdoc_article_number})")
                else:
                    logging.info(f"   ❌ No matches found")
                    self.stats['skipped'] += 1
                
                # Progress
                if idx % 50 == 0:
                    logging.info(f"\n{'='*70}")
                    logging.info(f"📊 Progress: {idx}/{len(products)} ({idx/len(products)*100:.1f}%)")
                    logging.info(f"   Matched: {self.stats['updated']}")
                    logging.info(f"   Skipped: {self.stats['skipped']}")
                    logging.info(f"{'='*70}\n")
                
            except Exception as e:
                logging.error(f"❌ Error processing product {product_id}: {e}")
                self.stats['errors'] += 1
                continue
        
        # Final stats
        logging.info(f"\n{'#'*70}")
        logging.info(f"✅ MATCHING COMPLETED")
        logging.info(f"{'#'*70}")
        logging.info(f"📊 Final Stats:")
        logging.info(f"\n  Total Products: {self.stats['total_products']}")
        logging.info(f"  Products with OEM: {self.stats['products_with_oem']}")
        logging.info(f"  OEM Numbers Checked: {self.stats['oem_numbers_checked']}")
        logging.info(f"  Matches Found: {self.stats['matches_found']}")
        logging.info(f"  Multiple Matches: {self.stats['multiple_matches']}")
        logging.info(f"  Updated: {self.stats['updated']}")
        logging.info(f"  Skipped: {self.stats['skipped']}")
        logging.info(f"  Errors: {self.stats['errors']}")
        logging.info(f"\n  Success Rate: {self.stats['updated']/self.stats['total_products']*100:.1f}%")
        logging.info(f"{'#'*70}\n")
    
    def close(self):
        """Zatvori konekcije"""
        self.tecdoc_conn.close()
        self.prod_conn.close()
        logging.info("🔌 Database connections closed")

def main():
    """Main funkcija"""
    
    matcher = OEMatcher()
    
    try:
        matcher.run()
    except Exception as e:
        logging.error(f"❌ Fatal error: {e}")
        raise
    finally:
        matcher.close()

if __name__ == "__main__":
    main()
