"""
TecDoc Product Enrichment Script
=================================
Obogaćuje proizvode iz Postgres webshopa sa podacima iz TecDoc MySQL baze

Proces:
1. Učitaj proizvode iz Postgres (12,000)
2. Za svaki proizvod - query TecDoc MySQL
3. Obogati podatke (OEM, specs, vozila, cross-refs)
4. Update Postgres bazu
"""

import psycopg2
import mysql.connector
from typing import Dict, List, Optional
import json
from dataclasses import dataclass
from datetime import datetime
import logging

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
    oem_numbers: List[str]
    technical_specs: List[Dict]
    vehicle_fitments: List[Dict]
    cross_references: List[Dict]
    supplier_info: Dict
    tecdoc_article_id: Optional[int] = None

class TecDocEnricher:
    def __init__(self):
        # TecDoc MySQL konekcija (read-only)
        self.tecdoc_conn = mysql.connector.connect(
            host="localhost",
            user="root",
            password="",  # tvoj password
            database="tecdoc1q2019"
        )
        
        # Produkcijska Postgres konekcija
        self.prod_conn = psycopg2.connect(
            host="localhost",
            database="webshop",
            user="postgres",
            password=""  # tvoj password
        )
        
        self.stats = {
            'processed': 0,
            'found_in_tecdoc': 0,
            'oem_found': 0,
            'specs_found': 0,
            'vehicles_found': 0,
            'cross_refs_found': 0,
            'errors': 0
        }
    
    def get_products_to_enrich(self, limit: int = None) -> List[Dict]:
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
                "vehicleFitments"
            FROM "Product"
        """
        
        if limit:
            query += f" LIMIT {limit}"
        
        cursor.execute(query)
        
        products = []
        for row in cursor.fetchall():
            products.append({
                'id': row[0],
                'name': row[1],
                'catalog_number': row[2],
                'oem_number': row[3],
                'vehicle_fitments': row[4]
            })
        
        cursor.close()
        return products
    
    def find_in_tecdoc(self, catalog_number: str, oem_number: str = None) -> Optional[int]:
        """
        Pronađi artikel u TecDoc po kataloš kom ili OEM broju
        """
        cursor = self.tecdoc_conn.cursor()
        
        # Prvo pokušaj po kataloškom broju
        query = """
            SELECT id, Supplier, NormalizedDescription
            FROM articles
            WHERE DataSupplierArticleNumber = %s
            LIMIT 1
        """
        cursor.execute(query, (catalog_number,))
        result = cursor.fetchone()
        
        if result:
            cursor.close()
            return result[0]  # article_id
        
        # Ako nije pronađeno, pokušaj po OEM broju
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
    
    def get_oem_numbers(self, article_id: int) -> List[str]:
        """
        Izvuci sve OEM brojeve za artikel
        """
        cursor = self.tecdoc_conn.cursor()
        
        query = """
            SELECT DISTINCT OENbr
            FROM article_oe_numbers
            WHERE article_id = %s
        """
        cursor.execute(query, (article_id,))
        
        oem_numbers = [row[0] for row in cursor.fetchall()]
        cursor.close()
        
        return oem_numbers
    
    def get_technical_specs(self, article_id: int) -> List[Dict]:
        """
        Izvuci tehničke specifikacije
        """
        cursor = self.tecdoc_conn.cursor()
        
        query = """
            SELECT 
                aa.attrName,
                aa.attrValue,
                aa.attrUnit
            FROM article_attributes aa
            WHERE aa.article_id = %s
        """
        cursor.execute(query, (article_id,))
        
        specs = []
        for row in cursor.fetchall():
            specs.append({
                'name': row[0],
                'value': row[1],
                'unit': row[2] if row[2] else ''
            })
        
        cursor.close()
        return specs
    
    def get_vehicle_fitments(self, article_id: int) -> List[Dict]:
        """
        Pronađi kompatibilna vozila
        
        Koristi mapiranje iz ARTICLE_ROOT_CATEGORY_MAPPING_VERIFIED.md:
        articles → products → search_trees → passengercars
        """
        cursor = self.tecdoc_conn.cursor()
        
        # Koristi articles_linkages za pronalaženje vozila
        query = """
            SELECT DISTINCT
                m.Description as manufacturer,
                mo.Description as model,
                pc.Description as variant,
                pc.YearOfConstrFrom,
                pc.YearOfConstrTo,
                e.Description as engine
            FROM article_linkages al
            JOIN passengercars pc ON al.item = pc.InternalID AND al.item_type = 1
            JOIN manufacturers m ON pc.Manufacturer = m.id
            JOIN models mo ON pc.Model = mo.id
            LEFT JOIN passengercars_link_engines pcle ON pc.InternalID = pcle.car_InternalID
            LEFT JOIN engines e ON pcle.engine_ID = e.ID
            WHERE al.article_id = %s
            LIMIT 100
        """
        cursor.execute(query, (article_id,))
        
        vehicles = []
        for row in cursor.fetchall():
            vehicles.append({
                'brand': row[0],
                'model': row[1],
                'variant': row[2],
                'year_from': row[3],
                'year_to': row[4],
                'engine': row[5]
            })
        
        cursor.close()
        return vehicles
    
    def get_cross_references(self, article_id: int, max_results: int = 10) -> List[Dict]:
        """
        Pronađi ekvivalentne dijelove (cross references)
        
        Logika iz CROSS_REFERENCES_DETAILED.md:
        1. Pronađi sve OEM brojeve ovog artikla
        2. Pronađi sve druge artikle sa istim OEM brojevima
        3. Sortiraj po kvaliteti dobavljača
        """
        cursor = self.tecdoc_conn.cursor()
        
        # Prvo izvuci OEM brojeve
        oem_numbers = self.get_oem_numbers(article_id)
        
        if not oem_numbers:
            cursor.close()
            return []
        
        # Pronađi artikle sa istim OEM brojevima
        placeholders = ','.join(['%s'] * len(oem_numbers))
        query = f"""
            SELECT DISTINCT
                a.id,
                a.DataSupplierArticleNumber,
                s.Description as supplier,
                a.NormalizedDescription,
                COUNT(DISTINCT aon.OENbr) as shared_oems
            FROM articles a
            JOIN article_oe_numbers aon ON a.id = aon.article_id
            JOIN suppliers s ON a.Supplier = s.id
            WHERE aon.OENbr IN ({placeholders})
              AND a.id != %s
            GROUP BY a.id, a.DataSupplierArticleNumber, s.Description, a.NormalizedDescription
            ORDER BY shared_oems DESC, s.Description
            LIMIT %s
        """
        
        params = tuple(oem_numbers) + (article_id, max_results)
        cursor.execute(query, params)
        
        cross_refs = []
        for row in cursor.fetchall():
            # Odredi kvalitet na osnovu dobavljača
            quality = self._determine_quality(row[2])
            
            cross_refs.append({
                'article_number': row[1],
                'supplier': row[2],
                'description': row[3],
                'shared_oems': row[4],
                'quality': quality
            })
        
        cursor.close()
        return cross_refs
    
    def _determine_quality(self, supplier: str) -> str:
        """Odredi kvalitet na osnovu dobavljača"""
        premium = ['BOSCH', 'HENGST FILTER', 'MEYLE', 'FEBI BILSTEIN']
        oem_quality = ['BLUE PRINT', 'WILMINK GROUP', 'SWAG']
        
        supplier_upper = supplier.upper()
        
        if any(p in supplier_upper for p in premium):
            return 'Premium'
        elif any(o in supplier_upper for o in oem_quality):
            return 'OEM Quality'
        else:
            return 'Budget'
    
    def enrich_product(self, product: Dict) -> Optional[ProductEnrichment]:
        """
        Glavni proces obogaćivanja jednog proizvoda
        """
        catalog = product['catalog_number']
        oem = product.get('oem_number')
        
        logging.info(f"Processing: {catalog}")
        
        # 1. Pronađi u TecDoc
        article_id = self.find_in_tecdoc(catalog, oem)
        
        if not article_id:
            logging.warning(f"Not found in TecDoc: {catalog}")
            self.stats['errors'] += 1
            return None
        
        self.stats['found_in_tecdoc'] += 1
        
        # 2. Izvuci podatke
        enrichment = ProductEnrichment(
            catalog_number=catalog,
            tecdoc_article_id=article_id,
            oem_numbers=[],
            technical_specs=[],
            vehicle_fitments=[],
            cross_references=[],
            supplier_info={}
        )
        
        # OEM brojevi
        enrichment.oem_numbers = self.get_oem_numbers(article_id)
        if enrichment.oem_numbers:
            self.stats['oem_found'] += 1
        
        # Tehničke specifikacije
        enrichment.technical_specs = self.get_technical_specs(article_id)
        if enrichment.technical_specs:
            self.stats['specs_found'] += 1
        
        # Vozila
        enrichment.vehicle_fitments = self.get_vehicle_fitments(article_id)
        if enrichment.vehicle_fitments:
            self.stats['vehicles_found'] += 1
        
        # Cross references
        enrichment.cross_references = self.get_cross_references(article_id, max_results=10)
        if enrichment.cross_references:
            self.stats['cross_refs_found'] += 1
        
        return enrichment
    
    def update_product_in_db(self, product_id: str, enrichment: ProductEnrichment):
        """
        Update proizvod u Postgres bazi sa obogaćenim podacima
        """
        cursor = self.prod_conn.cursor()
        
        # Konvertuj u JSON za Postgres JSONB polja
        oem_json = json.dumps(enrichment.oem_numbers)
        specs_json = json.dumps(enrichment.technical_specs)
        vehicles_json = json.dumps(enrichment.vehicle_fitments)
        cross_refs_json = json.dumps(enrichment.cross_references)
        
        query = """
            UPDATE "Product"
            SET 
                "oemNumber" = %s,
                "technicalSpecs" = %s,
                "vehicleFitments" = %s,
                "crossReferences" = %s,
                "updatedAt" = NOW()
            WHERE id = %s
        """
        
        cursor.execute(query, (
            oem_json if enrichment.oem_numbers else None,
            specs_json if enrichment.technical_specs else None,
            vehicles_json if enrichment.vehicle_fitments else None,
            cross_refs_json if enrichment.cross_references else None,
            product_id
        ))
        
        self.prod_conn.commit()
        cursor.close()
    
    def run_batch(self, batch_size: int = 100, start_from: int = 0):
        """
        Pokreni batch procesiranje
        """
        logging.info(f"Starting batch enrichment (size: {batch_size}, from: {start_from})")
        
        # Učitaj proizvode
        products = self.get_products_to_enrich(limit=batch_size)
        
        total = len(products)
        logging.info(f"Loaded {total} products")
        
        for i, product in enumerate(products[start_from:], start=start_from):
            try:
                # Obogati proizvod
                enrichment = self.enrich_product(product)
                
                if enrichment:
                    # Update bazu
                    self.update_product_in_db(product['id'], enrichment)
                    self.stats['processed'] += 1
                
                # Progress log
                if (i + 1) % 10 == 0:
                    logging.info(f"Progress: {i+1}/{total} ({((i+1)/total*100):.1f}%)")
                    logging.info(f"Stats: {self.stats}")
            
            except Exception as e:
                logging.error(f"Error processing {product['catalog_number']}: {str(e)}")
                self.stats['errors'] += 1
        
        # Final stats
        logging.info("=" * 50)
        logging.info("BATCH COMPLETED")
        logging.info(f"Final stats: {self.stats}")
        logging.info("=" * 50)
    
    def close(self):
        """Zatvori konekcije"""
        self.tecdoc_conn.close()
        self.prod_conn.close()


# MAIN EXECUTION
if __name__ == "__main__":
    enricher = TecDocEnricher()
    
    try:
        # BATCH 1: Test sa 50 proizvoda
        enricher.run_batch(batch_size=50, start_from=0)
        
        # Za full run (svih 12,000):
        # enricher.run_batch(batch_size=12000, start_from=0)
        
    except Exception as e:
        logging.error(f"Fatal error: {str(e)}")
    finally:
        enricher.close()
