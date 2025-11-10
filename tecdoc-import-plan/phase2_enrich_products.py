"""
FAZA 2: Prikupi Sve Podatke O Pronađenim Proizvodima
=====================================================
Za svaki proizvod koji ima tecdocArticleId, prikupi:
1. Root kategoriju (putnička vozila)
2. Atribute proizvoda
3. Cross reference (zamjenske proizvode)
4. Kompatibilna vozila iz naše baze
5. Proizvođač

Output: JSON fajl sa svim podacima za svaki proizvod
"""

import psycopg2
import mysql.connector
import json
from datetime import datetime
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('phase2_enrich_products.log'),
        logging.StreamHandler()
    ]
)

class TecDocEnricher:
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
            'processed': 0,
            'with_category': 0,
            'with_attributes': 0,
            'with_cross_ref': 0,
            'with_vehicles': 0,
            'errors': 0
        }
        
        # Output JSON
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        self.output_file = f'enriched_products_{timestamp}.json'
        self.enriched_data = []
        
        logging.info("✅ Database connections established")
    
    def get_products_with_tecdoc(self):
        """Učitaj proizvode koji imaju tecdocArticleId"""
        cursor = self.prod_conn.cursor()
        
        query = """
            SELECT 
                id,
                name,
                "catalogNumber",
                "tecdocArticleId",
                "tecdocProductId",
                "manufacturerId"
            FROM "Product"
            WHERE "tecdocArticleId" IS NOT NULL
            ORDER BY id
            LIMIT 100
        """
        
        cursor.execute(query)
        products = cursor.fetchall()
        cursor.close()
        
        logging.info(f"📦 Loaded {len(products)} products with TecDoc ID")
        return products
    
    def get_root_category(self, article_id: int) -> dict:
        """
        Pronađi root kategoriju za putnička vozila
        Returns: {id, name, parent_path}
        """
        cursor = self.tecdoc_conn.cursor()
        
        query = """
            SELECT DISTINCT
                pc.id,
                pc.Description,
                pc.ParentCategory
            FROM article_product_categories apc
            JOIN product_categories pc ON pc.id = apc.product_category_id
            WHERE apc.article_id = %s
            AND pc.IsPassengerCar = 1
            LIMIT 1
        """
        
        cursor.execute(query, (article_id,))
        result = cursor.fetchone()
        
        if not result:
            cursor.close()
            return None
        
        category_id, category_name, parent_id = result
        
        # Pronađi root kategoriju (parent chain)
        parent_chain = []
        current_parent = parent_id
        
        while current_parent:
            parent_query = """
                SELECT id, Description, ParentCategory
                FROM product_categories
                WHERE id = %s
            """
            cursor.execute(parent_query, (current_parent,))
            parent_result = cursor.fetchone()
            
            if parent_result:
                parent_chain.append({
                    'id': parent_result[0],
                    'name': parent_result[1]
                })
                current_parent = parent_result[2]
            else:
                break
        
        cursor.close()
        
        return {
            'id': category_id,
            'name': category_name,
            'root_category': parent_chain[-1] if parent_chain else {'id': category_id, 'name': category_name},
            'parent_chain': parent_chain
        }
    
    def get_attributes(self, article_id: int) -> list:
        """
        Pronađi atribute proizvoda
        Returns: [{name, value, unit}, ...]
        """
        cursor = self.tecdoc_conn.cursor()
        
        query = """
            SELECT DISTINCT
                aa.DisplayTitle,
                aa.DisplayValue
            FROM article_attributes aa
            WHERE aa.article_id = %s
            ORDER BY aa.DisplayTitle
        """
        
        cursor.execute(query, (article_id,))
        results = cursor.fetchall()
        cursor.close()
        
        attributes = []
        for title, value in results:
            if title and value:
                attributes.append({
                    'name': title,
                    'value': value
                })
        
        return attributes
    
    def get_cross_references(self, article_id: int) -> list:
        """
        Pronađi zamjenske proizvode (cross references)
        Returns: [{article_id, article_number, supplier, type}, ...]
        """
        cursor = self.tecdoc_conn.cursor()
        
        query = """
            SELECT DISTINCT
                acr.ReplacementArticleId,
                a.DataSupplierArticleNumber,
                s.Description,
                acr.Type
            FROM article_cross_references acr
            JOIN articles a ON a.id = acr.ReplacementArticleId
            JOIN suppliers s ON s.id = a.Supplier
            WHERE acr.article_id = %s
            LIMIT 20
        """
        
        cursor.execute(query, (article_id,))
        results = cursor.fetchall()
        cursor.close()
        
        cross_refs = []
        for replacement_id, article_number, supplier, ref_type in results:
            cross_refs.append({
                'article_id': replacement_id,
                'article_number': article_number,
                'supplier': supplier,
                'type': ref_type
            })
        
        return cross_refs
    
    def get_compatible_vehicles(self, article_id: int) -> list:
        """
        Pronađi kompatibilna vozila iz NAŠE baze
        Koristi passengercars.id iz TecDoc i mapira na VehicleEngine.externalId
        Returns: [{brand, model, generation, engine}, ...]
        """
        # 1. Pronađi passengercars IDs iz TecDoc
        tecdoc_cursor = self.tecdoc_conn.cursor()
        
        query = """
            SELECT DISTINCT pc.id
            FROM article_passengercars apc
            JOIN passengercars pc ON pc.id = apc.passengercars_id
            WHERE apc.article_id = %s
            LIMIT 50
        """
        
        tecdoc_cursor.execute(query, (article_id,))
        passengercars_ids = [row[0] for row in tecdoc_cursor.fetchall()]
        tecdoc_cursor.close()
        
        if not passengercars_ids:
            return []
        
        # 2. Pronađi vozila u našoj bazi
        prod_cursor = self.prod_conn.cursor()
        
        # VehicleEngine.externalId = engines.id (iz TecDoc)
        # Ali passengercars_ids su iz passengercars tabele
        # Trebamo mapirati passengercars → engines → VehicleEngine
        
        # Za sada, koristimo passengercars_ids direktno (pretpostavljamo da je externalId = passengercars.id)
        placeholders = ','.join(['%s'] * len(passengercars_ids))
        
        query = f"""
            SELECT DISTINCT
                vb.name as brand,
                vm.name as model,
                vg.name as generation,
                ve."engineCode" as engine_code,
                ve."externalId" as external_id
            FROM "VehicleEngine" ve
            JOIN "VehicleGeneration" vg ON vg.id = ve."generationId"
            JOIN "VehicleModel" vm ON vm.id = vg."modelId"
            JOIN "VehicleBrand" vb ON vb.id = vm."brandId"
            WHERE ve."externalId" IN ({placeholders})
            LIMIT 50
        """
        
        prod_cursor.execute(query, tuple(map(str, passengercars_ids)))
        results = prod_cursor.fetchall()
        prod_cursor.close()
        
        vehicles = []
        for brand, model, generation, engine_code, external_id in results:
            vehicles.append({
                'brand': brand,
                'model': model,
                'generation': generation,
                'engine_code': engine_code,
                'external_id': external_id
            })
        
        return vehicles
    
    def get_manufacturer(self, article_id: int) -> dict:
        """
        Pronađi proizvođača artikla
        Returns: {id, name}
        """
        cursor = self.tecdoc_conn.cursor()
        
        query = """
            SELECT 
                s.id,
                s.Description
            FROM articles a
            JOIN suppliers s ON s.id = a.Supplier
            WHERE a.id = %s
            LIMIT 1
        """
        
        cursor.execute(query, (article_id,))
        result = cursor.fetchone()
        cursor.close()
        
        if result:
            return {
                'id': result[0],
                'name': result[1]
            }
        
        return None
    
    def enrich_product(self, product_data: tuple) -> dict:
        """Obogati jedan proizvod sa svim podacima"""
        product_id, name, catalog_number, article_id, tecdoc_product_id, manufacturer_id = product_data
        
        logging.info(f"\n{'='*70}")
        logging.info(f"📦 Processing: {name} ({catalog_number})")
        logging.info(f"   Article ID: {article_id}")
        
        enriched = {
            'product_id': product_id,
            'name': name,
            'catalog_number': catalog_number,
            'tecdoc_article_id': article_id,
            'tecdoc_product_id': tecdoc_product_id,
            'manufacturer_id': manufacturer_id,
            'category': None,
            'attributes': [],
            'cross_references': [],
            'compatible_vehicles': [],
            'supplier': None
        }
        
        # 1. Root kategorija
        try:
            category = self.get_root_category(article_id)
            if category:
                enriched['category'] = category
                self.stats['with_category'] += 1
                logging.info(f"   ✅ Category: {category['root_category']['name']}")
        except Exception as e:
            logging.error(f"   ❌ Category error: {e}")
        
        # 2. Atributi
        try:
            attributes = self.get_attributes(article_id)
            if attributes:
                enriched['attributes'] = attributes
                self.stats['with_attributes'] += 1
                logging.info(f"   ✅ Attributes: {len(attributes)}")
        except Exception as e:
            logging.error(f"   ❌ Attributes error: {e}")
        
        # 3. Cross references
        try:
            cross_refs = self.get_cross_references(article_id)
            if cross_refs:
                enriched['cross_references'] = cross_refs
                self.stats['with_cross_ref'] += 1
                logging.info(f"   ✅ Cross references: {len(cross_refs)}")
        except Exception as e:
            logging.error(f"   ❌ Cross references error: {e}")
        
        # 4. Kompatibilna vozila
        try:
            vehicles = self.get_compatible_vehicles(article_id)
            if vehicles:
                enriched['compatible_vehicles'] = vehicles
                self.stats['with_vehicles'] += 1
                logging.info(f"   ✅ Compatible vehicles: {len(vehicles)}")
        except Exception as e:
            logging.error(f"   ❌ Vehicles error: {e}")
        
        # 5. Proizvođač
        try:
            supplier = self.get_manufacturer(article_id)
            if supplier:
                enriched['supplier'] = supplier
                logging.info(f"   ✅ Supplier: {supplier['name']}")
        except Exception as e:
            logging.error(f"   ❌ Supplier error: {e}")
        
        return enriched
    
    def run(self):
        """Pokreni obogaćivanje"""
        
        logging.info(f"\n{'#'*70}")
        logging.info(f"📊 FAZA 2: Obogaćivanje Proizvoda")
        logging.info(f"{'#'*70}\n")
        
        products = self.get_products_with_tecdoc()
        self.stats['total'] = len(products)
        
        for idx, product_data in enumerate(products, 1):
            try:
                enriched = self.enrich_product(product_data)
                self.enriched_data.append(enriched)
                self.stats['processed'] += 1
                
                # Progress
                if idx % 10 == 0:
                    logging.info(f"\n📊 Progress: {idx}/{len(products)} ({idx/len(products)*100:.1f}%)")
                    logging.info(f"   Processed: {self.stats['processed']}")
                    logging.info(f"   With category: {self.stats['with_category']}")
                    logging.info(f"   With attributes: {self.stats['with_attributes']}")
                    logging.info(f"   With vehicles: {self.stats['with_vehicles']}\n")
                
            except Exception as e:
                logging.error(f"❌ Error processing product: {e}")
                self.stats['errors'] += 1
                continue
        
        # Spremi u JSON
        with open(self.output_file, 'w', encoding='utf-8') as f:
            json.dump(self.enriched_data, f, indent=2, ensure_ascii=False)
        
        # Final stats
        logging.info(f"\n{'#'*70}")
        logging.info(f"✅ FAZA 2 COMPLETED")
        logging.info(f"{'#'*70}")
        logging.info(f"📊 Final Stats:")
        logging.info(f"   Total: {self.stats['total']}")
        logging.info(f"   Processed: {self.stats['processed']}")
        logging.info(f"   With category: {self.stats['with_category']} ({self.stats['with_category']/self.stats['total']*100:.1f}%)")
        logging.info(f"   With attributes: {self.stats['with_attributes']} ({self.stats['with_attributes']/self.stats['total']*100:.1f}%)")
        logging.info(f"   With cross ref: {self.stats['with_cross_ref']} ({self.stats['with_cross_ref']/self.stats['total']*100:.1f}%)")
        logging.info(f"   With vehicles: {self.stats['with_vehicles']} ({self.stats['with_vehicles']/self.stats['total']*100:.1f}%)")
        logging.info(f"   Errors: {self.stats['errors']}")
        logging.info(f"\n📄 Output: {self.output_file}")
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
        enricher.run()
    except Exception as e:
        logging.error(f"❌ Fatal error: {e}")
        raise
    finally:
        enricher.close()

if __name__ == "__main__":
    main()
