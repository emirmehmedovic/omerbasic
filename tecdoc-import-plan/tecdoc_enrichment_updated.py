"""
TecDoc Product Enrichment Script - UPDATED VERSION
===================================================
Obogaćuje proizvode iz Postgres webshopa sa podacima iz TecDoc MySQL baze

Proces:
1. Učitaj proizvode iz Postgres (12,000)
2. Za svaki proizvod - query TecDoc MySQL
3. Pronađi ROOT kategoriju kroz search_trees
4. Obogati podatke (OEM, specs, vozila, cross-refs)
5. Update Postgres bazu sa mapiranom kategorijom
"""

import psycopg2
import mysql.connector
from typing import Dict, List, Optional
import json
from dataclasses import dataclass
from datetime import datetime
import logging
import time

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('tecdoc_enrichment.log'),
        logging.StreamHandler()
    ]
)

@dataclass
class ProductEnrichment:
    """Struktura obogaćenih podataka"""
    catalog_number: str
    tecdoc_article_id: Optional[int]
    category_mapping: Optional[Dict]
    oem_numbers: List[str]
    technical_specs: List[Dict]
    vehicle_fitments: List[Dict]
    cross_references: List[Dict]
    supplier_info: Dict

class TecDocEnricher:
    def __init__(self):
        """Inicijalizacija konekcija na baze"""
        
        # TecDoc MySQL konekcija (read-only)
        self.tecdoc_conn = mysql.connector.connect(
            host="localhost",
            user="root",
            password="",  # ← EDITUJ: tvoj MySQL password
            database="tecdoc1q2019",
            connect_timeout=300
        )
        
        # Produkcijska Postgres konekcija (Neon remote database)
        self.prod_conn = psycopg2.connect(
            "postgresql://neondb_owner:npg_fr1hSiyUN0gR@ep-floral-frog-a28sjyps-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require",
            connect_timeout=300
        )
        
        self.stats = {
            'processed': 0,
            'found_in_tecdoc': 0,
            'category_mapped': 0,
            'oem_found': 0,
            'specs_found': 0,
            'vehicles_found': 0,
            'cross_refs_found': 0,
            'errors': 0
        }
        
        logging.info("✅ Database connections established")
    
    def get_products_to_enrich(self, limit: int = 50, offset: int = 0) -> List[Dict]:
        """
        Učitaj proizvode iz Postgres baze
        """
        cursor = self.prod_conn.cursor()
        
        query = """
            SELECT 
                id,
                name,
                "catalogNumber",
                "oemNumber",
                "categoryId"
            FROM "Product"
            WHERE "catalogNumber" IS NOT NULL
            ORDER BY id
            LIMIT %s OFFSET %s
        """
        
        cursor.execute(query, (limit, offset))
        
        products = []
        for row in cursor.fetchall():
            products.append({
                'id': row[0],
                'name': row[1],
                'catalog_number': row[2],
                'oem_number': row[3],
                'category_id': row[4]
            })
        
        cursor.close()
        logging.info(f"📦 Loaded {len(products)} products (offset: {offset})")
        return products
    
    def find_in_tecdoc(self, catalog_number: str, oem_number: Optional[str] = None) -> Optional[int]:
        """
        Pronađi artikel u TecDoc bazi
        1. Prvo po catalogNumber (exact match)
        2. Probaj sa razmakom (npr. HX81D → HX 81D)
        3. Ako nema, probaj po oemNumber
        """
        cursor = self.tecdoc_conn.cursor()
        
        # Query 1: Po kataloškom broju (exact)
        query = """
            SELECT id 
            FROM articles 
            WHERE DataSupplierArticleNumber = %s
            LIMIT 1
        """
        
        cursor.execute(query, (catalog_number,))
        result = cursor.fetchone()
        
        if result:
            cursor.close()
            return result[0]
        
        # Query 2: Probaj sa razmakom (HX81D → HX 81D)
        # Dodaj razmak nakon prvih 2-3 karaktera
        if len(catalog_number) > 3 and ' ' not in catalog_number:
            # Probaj različite pozicije razmaka
            variants = [
                catalog_number[:2] + ' ' + catalog_number[2:],  # HX 81D
                catalog_number[:3] + ' ' + catalog_number[3:],  # HX8 1D
            ]
            
            for variant in variants:
                cursor.execute(query, (variant,))
                result = cursor.fetchone()
                if result:
                    logging.info(f"   Found with variant: {variant}")
                    cursor.close()
                    return result[0]
        
        # Query 3: Fallback na OEM broj
        if oem_number:
            query = """
                SELECT a.id 
                FROM articles a
                JOIN article_oe_numbers aon ON a.id = aon.article_id
                WHERE aon.OENbr = %s
                LIMIT 1
            """
            
            cursor.execute(query, (oem_number,))
            result = cursor.fetchone()
            
            if result:
                cursor.close()
                return result[0]
        
        cursor.close()
        return None
    
    def get_root_category_for_article(self, article_id: int) -> Optional[Dict]:
        """
        Pronađi ROOT kategoriju za artikel
        
        Logika (2 načina):
        1. DIREKTNO: Provjeri da li je CurrentProduct već u tree_node_products kao ROOT
        2. KROZ SEARCH_TREES: Pronađi kroz hijerarhiju search_trees
        """
        cursor = self.tecdoc_conn.cursor()
        
        # METODA 1: Direktno - provjeri tree_node_products
        query_direct = """
            SELECT
                tnp.node_id as root_node_id,
                p.Description as root_category_name
            FROM articles a
            JOIN products p ON p.ID = a.CurrentProduct
            JOIN tree_node_products tnp ON tnp.product_id = p.ID
            WHERE a.id = %s
            AND tnp.tree_id = 3
            AND tnp.parent_node_id = 0
            LIMIT 1
        """
        
        cursor.execute(query_direct, (article_id,))
        result = cursor.fetchone()
        
        if result and result[0]:
            root_node_id = result[0]
            root_category_name = result[1]
            logging.info(f"   🏷️  TecDoc ROOT (direct): {root_category_name} (node_id: {root_node_id})")
            cursor.close()
            return self._map_to_local_category(root_node_id, root_category_name)
        
        # METODA 2: Kroz search_trees hijerarhiju (sa LIKE matching + semantic relevance)
        query_hierarchy = """
            SELECT
                st_root.node_id as root_node_id,
                st_root.Description as root_category_name,
                CASE
                    WHEN p.Description LIKE CONCAT('%', st_root.Description, '%') THEN 3
                    WHEN st_child.Description = p.Description THEN 2
                    ELSE 1
                END as relevance_score
            FROM articles a
            LEFT JOIN products p ON p.ID = a.CurrentProduct
            LEFT JOIN search_trees st_child ON (
                p.Description LIKE CONCAT('%', st_child.Description, '%')
                AND st_child.tree_id = 1
                AND st_child.parent_node_id > 0
            )
            LEFT JOIN search_trees st_root ON (
                st_root.node_id = st_child.parent_node_id
                AND st_root.tree_id = 1
                AND st_root.parent_node_id = 0
            )
            WHERE a.id = %s
            AND st_root.node_id IS NOT NULL
            ORDER BY 
                relevance_score DESC,
                LENGTH(st_child.Description) DESC
            LIMIT 1
        """
        
        cursor.execute(query_hierarchy, (article_id,))
        result = cursor.fetchone()
        cursor.close()
        
        if result and result[0]:
            root_node_id = result[0]
            root_category_name = result[1]
            logging.info(f"   🏷️  TecDoc ROOT (hierarchy): {root_category_name} (node_id: {root_node_id})")
            return self._map_to_local_category(root_node_id, root_category_name)
        
        logging.warning(f"⚠️  No ROOT category found for article_id: {article_id}")
        return None
    
    def _map_to_local_category(self, root_node_id: int, root_category_name: str) -> Optional[Dict]:
        """Mapira TecDoc node_id na lokalnu kategoriju"""
        pg_cursor = self.prod_conn.cursor()
        pg_query = """
            SELECT id, name 
            FROM "Category"
            WHERE "externalId" = %s
        """
        
        pg_cursor.execute(pg_query, (str(root_node_id),))
        local_category = pg_cursor.fetchone()
        pg_cursor.close()
        
        if local_category:
            logging.info(f"   ✅ Mapped to: {local_category[1]} (ID: {local_category[0]})")
            return {
                'tecdoc_root_node_id': root_node_id,
                'tecdoc_root_name': root_category_name,
                'local_category_id': local_category[0],
                'local_category_name': local_category[1]
            }
        else:
            logging.warning(f"   ⚠️  No local category found for node_id: {root_node_id}")
            return None
    
    def get_oem_numbers(self, article_id: int) -> List[str]:
        """Izvuci OEM brojeve za artikel"""
        cursor = self.tecdoc_conn.cursor()
        
        query = """
            SELECT DISTINCT OENbr 
            FROM article_oe_numbers 
            WHERE article_id = %s
            AND OENbr IS NOT NULL
            AND LENGTH(OENbr) <= 50
            LIMIT 20
        """
        
        cursor.execute(query, (article_id,))
        results = cursor.fetchall()
        cursor.close()
        
        oem_numbers = [row[0] for row in results if row[0]]
        return oem_numbers
    
    def get_technical_specs(self, article_id: int) -> List[Dict]:
        """Izvuci tehničke specifikacije"""
        cursor = self.tecdoc_conn.cursor()
        
        query = """
            SELECT 
                aa.attrName,
                aa.attrValue,
                aa.attrUnit
            FROM article_attributes aa
            WHERE aa.article_id = %s
            AND aa.attrValue IS NOT NULL
            LIMIT 50
        """
        
        cursor.execute(query, (article_id,))
        results = cursor.fetchall()
        cursor.close()
        
        specs = []
        for row in results:
            specs.append({
                'name': row[0],
                'value': row[1],
                'unit': row[2] if row[2] else None
            })
        
        return specs
    
    def get_vehicle_fitments(self, article_id: int) -> List[Dict]:
        """Izvuci kompatibilna vozila"""
        cursor = self.tecdoc_conn.cursor()
        
        query = """
            SELECT DISTINCT
                mf.Description as brand,
                m.Description as model,
                pc.Description as variant,
                pc.From as year_from,
                pc.To as year_to,
                e.Description as engine_code,
                pc.internalID as tecdoc_internal_id
            FROM articles a
            JOIN articles_linkages al ON (
                al.article = a.DataSupplierArticleNumber
                AND al.supplier = a.Supplier
            )
            LEFT JOIN passengercars pc ON (
                al.item_type = 1 
                AND al.item = pc.internalID
            )
            LEFT JOIN models m ON pc.Model = m.id
            LEFT JOIN manufacturers mf ON m.ManufacturerId = mf.id
            LEFT JOIN passengercars_link_engines ple ON pc.id = ple.car_id
            LEFT JOIN engines e ON ple.engine_id = e.id
            WHERE a.id = %s
            AND mf.Description IS NOT NULL
            LIMIT 100
        """
        
        cursor.execute(query, (article_id,))
        results = cursor.fetchall()
        cursor.close()
        
        vehicles = []
        for row in results:
            vehicles.append({
                'brand': row[0],
                'model': row[1],
                'variant': row[2],
                'year_from': row[3],
                'year_to': row[4],
                'engine_code': row[5],
                'tecdoc_internal_id': row[6]
            })
        
        return vehicles
    
    def get_cross_references(self, article_id: int, oem_numbers: List[str]) -> List[Dict]:
        """Izvuci cross-references (ekvivalentne dijelove)"""
        if not oem_numbers:
            return []
        
        cursor = self.tecdoc_conn.cursor()
        
        # Pronađi druge artikle sa istim OEM brojevima
        placeholders = ','.join(['%s'] * len(oem_numbers))
        query = f"""
            SELECT DISTINCT
                a.DataSupplierArticleNumber as article_number,
                s.Description as supplier,
                COUNT(DISTINCT aon.OENbr) as shared_oems
            FROM article_oe_numbers aon
            JOIN articles a ON aon.article_id = a.id
            JOIN suppliers s ON a.Supplier = s.id
            WHERE aon.OENbr IN ({placeholders})
            AND a.id != %s
            GROUP BY a.id, a.DataSupplierArticleNumber, s.Description
            HAVING COUNT(DISTINCT aon.OENbr) >= 1
            ORDER BY shared_oems DESC
            LIMIT 20
        """
        
        params = oem_numbers + [article_id]
        cursor.execute(query, params)
        results = cursor.fetchall()
        cursor.close()
        
        cross_refs = []
        for row in results:
            cross_refs.append({
                'article_number': row[0],
                'supplier': row[1],
                'shared_oems': row[2],
                'quality': 'Premium' if row[2] >= 3 else 'Standard'
            })
        
        return cross_refs
    
    def enrich_product(self, product: Dict) -> Optional[ProductEnrichment]:
        """Obogati jedan proizvod sa TecDoc podacima"""
        
        catalog_number = product['catalog_number']
        logging.info(f"\n{'='*70}")
        logging.info(f"📦 Processing: {catalog_number} ({product['name'][:50]}...)")
        
        # 1. Pronađi artikel u TecDoc
        article_id = self.find_in_tecdoc(catalog_number, product.get('oem_number'))
        
        if not article_id:
            logging.warning(f"❌ Not found in TecDoc: {catalog_number}")
            self.stats['errors'] += 1
            return None
        
        logging.info(f"✅ Found article_id: {article_id}")
        self.stats['found_in_tecdoc'] += 1
        
        # 2. Pronađi ROOT kategoriju i mapira na lokalnu
        category_mapping = self.get_root_category_for_article(article_id)
        if category_mapping:
            self.stats['category_mapped'] += 1
        
        # 3. Izvuci OEM brojeve (ako fale)
        oem_numbers = self.get_oem_numbers(article_id)
        if oem_numbers:
            logging.info(f"   📋 Found {len(oem_numbers)} OEM numbers")
            self.stats['oem_found'] += 1
        
        # 4. Izvuci tehničke specifikacije (atribute)
        specs = self.get_technical_specs(article_id)
        if specs:
            logging.info(f"   🔧 Found {len(specs)} technical specs")
            self.stats['specs_found'] += 1
        
        # 5. Izvuci kompatibilna vozila
        vehicles = self.get_vehicle_fitments(article_id)
        if vehicles:
            logging.info(f"   🚗 Found {len(vehicles)} compatible vehicles")
            self.stats['vehicles_found'] += 1
        
        # 6. Izvuci cross-references (ekvivalente)
        cross_refs = self.get_cross_references(article_id, oem_numbers)
        if cross_refs:
            logging.info(f"   🔄 Found {len(cross_refs)} cross-references")
            self.stats['cross_refs_found'] += 1
        
        self.stats['processed'] += 1
        
        return ProductEnrichment(
            catalog_number=catalog_number,
            tecdoc_article_id=article_id,
            category_mapping=category_mapping,
            oem_numbers=oem_numbers,
            technical_specs=specs,
            vehicle_fitments=vehicles,
            cross_references=cross_refs,
            supplier_info={}
        )
    
    def update_product_in_db(self, product_id: str, enrichment: ProductEnrichment):
        """Update Postgres sa obogaćenim podacima"""
        cursor = self.prod_conn.cursor()
        
        # Pripremi podatke
        category_id = None
        tecdoc_root_node_id = None
        
        if enrichment.category_mapping:
            category_id = enrichment.category_mapping['local_category_id']
            tecdoc_root_node_id = enrichment.category_mapping['tecdoc_root_node_id']
        
        query = """
            UPDATE "Product"
            SET 
                "categoryId" = COALESCE(%s, "categoryId"),
                "oemNumber" = %s,
                "technicalSpecs" = %s::jsonb,
                "tecdocArticleId" = %s,
                "tecdocProductId" = %s,
                "updatedAt" = NOW()
            WHERE id = %s
        """
        
        cursor.execute(query, (
            category_id,
            json.dumps(enrichment.oem_numbers) if enrichment.oem_numbers else None,
            json.dumps(enrichment.technical_specs) if enrichment.technical_specs else None,
            enrichment.tecdoc_article_id,
            tecdoc_root_node_id,
            product_id
        ))
        
        self.prod_conn.commit()
        cursor.close()
        
        logging.info(f"   💾 Updated in database")
    
    def run_batch(self, batch_size: int = 50, start_from: int = 0):
        """Pokreni batch procesiranje"""
        
        logging.info(f"\n{'#'*70}")
        logging.info(f"🚀 Starting batch enrichment")
        logging.info(f"   Batch size: {batch_size}")
        logging.info(f"   Starting from: {start_from}")
        logging.info(f"{'#'*70}\n")
        
        start_time = time.time()
        
        # Učitaj proizvode
        products = self.get_products_to_enrich(limit=batch_size, offset=start_from)
        
        if not products:
            logging.warning("No products to process!")
            return
        
        # Procesuj svaki proizvod
        for idx, product in enumerate(products, 1):
            try:
                enrichment = self.enrich_product(product)
                
                if enrichment:
                    self.update_product_in_db(product['id'], enrichment)
                
                # Progress update
                if idx % 10 == 0:
                    elapsed = time.time() - start_time
                    rate = idx / elapsed if elapsed > 0 else 0
                    logging.info(f"\n📊 Progress: {idx}/{len(products)} ({idx/len(products)*100:.1f}%)")
                    logging.info(f"   Rate: {rate:.2f} products/sec")
                    logging.info(f"   Stats: {self.stats}")
                
            except Exception as e:
                logging.error(f"❌ Error processing {product['catalog_number']}: {e}")
                self.stats['errors'] += 1
                continue
        
        # Final stats
        elapsed = time.time() - start_time
        logging.info(f"\n{'#'*70}")
        logging.info(f"✅ BATCH COMPLETED")
        logging.info(f"{'#'*70}")
        logging.info(f"⏱️  Time: {elapsed:.2f} seconds")
        logging.info(f"📊 Final Stats:")
        for key, value in self.stats.items():
            logging.info(f"   {key}: {value}")
        logging.info(f"{'#'*70}\n")
    
    def close(self):
        """Zatvori konekcije"""
        self.tecdoc_conn.close()
        self.prod_conn.close()
        logging.info("🔌 Database connections closed")

def main():
    """Main funkcija"""
    
    enricher = TecDocEnricher()
    
    try:
        # TEST RUN: Prvih 50 proizvoda
        enricher.run_batch(batch_size=50, start_from=0)
        
        # Za FULL RUN, promijeni na:
        # enricher.run_batch(batch_size=12000, start_from=0)
        
        # Ili radi u batch-evima:
        # for i in range(0, 12000, 500):
        #     enricher.run_batch(batch_size=500, start_from=i)
        #     time.sleep(60)  # Pauza između batch-eva
        
    except Exception as e:
        logging.error(f"❌ Fatal error: {e}")
        raise
    finally:
        enricher.close()

if __name__ == "__main__":
    main()
