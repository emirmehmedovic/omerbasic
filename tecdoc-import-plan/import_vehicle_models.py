"""
Import Modela Vozila iz TecDoc-a
==================================
Uvozi modele vozila (mlađi od 1990) iz TecDoc baze
i povezuje ih sa postojećim markama u Postgres bazi
"""

import psycopg2
import mysql.connector
import json
from datetime import datetime
import logging
import secrets
import string

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('import_vehicle_models.log'),
        logging.StreamHandler()
    ]
)

class VehicleModelImporter:
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
            'total_models': 0,
            'imported': 0,
            'skipped': 0,
            'errors': 0
        }
        
        logging.info("✅ Database connections established")
    
    def get_brand_mapping(self):
        """
        Učitaj mapiranje marki iz Postgres baze
        Returns: dict {tecdoc_name: brand_id}
        """
        cursor = self.prod_conn.cursor()
        
        query = """
            SELECT id, name, "externalId"
            FROM "VehicleBrand"
            WHERE type = 'PASSENGER'
        """
        
        cursor.execute(query)
        brands = cursor.fetchall()
        cursor.close()
        
        # Kreiraj mapiranje: externalId -> brand_id
        mapping = {}
        for brand_id, name, external_id in brands:
            if external_id:
                mapping[external_id.lower()] = brand_id
            # Dodaj i po imenu
            mapping[name.lower()] = brand_id
        
        logging.info(f"📋 Loaded {len(brands)} brands from database")
        return mapping
    
    def get_tecdoc_manufacturers(self):
        """Učitaj sve proizvođače iz TecDoc-a"""
        cursor = self.tecdoc_conn.cursor()
        
        query = """
            SELECT ID, Description
            FROM manufacturers
            ORDER BY Description
        """
        
        cursor.execute(query)
        manufacturers = {row[0]: row[1] for row in cursor.fetchall()}
        cursor.close()
        
        logging.info(f"📋 Loaded {len(manufacturers)} manufacturers from TecDoc")
        return manufacturers
    
    def get_models_from_tecdoc(self, year_from=1990):
        """
        Učitaj modele iz TecDoc-a (mlađi od year_from)
        """
        cursor = self.tecdoc_conn.cursor()
        
        # Tačan query sa ManufacturerId kolonom
        query = """
            SELECT DISTINCT
                pc.id as model_id,
                pc.Description as model_name,
                pc.ManufacturerId as manufacturer_id,
                YEAR(pc.From) as year_from,
                YEAR(pc.To) as year_to
            FROM passengercars pc
            WHERE (YEAR(pc.From) >= %s OR YEAR(pc.To) >= %s)
            AND pc.ManufacturerId IS NOT NULL
            AND pc.Description IS NOT NULL
            ORDER BY pc.ManufacturerId, pc.Description
        """
        
        cursor.execute(query, (year_from, year_from))
        models = cursor.fetchall()
        cursor.close()
        
        logging.info(f"📦 Loaded {len(models)} models from TecDoc (>= {year_from})")
        return models
    
    def model_exists(self, brand_id, model_name):
        """Provjeri da li model već postoji"""
        cursor = self.prod_conn.cursor()
        
        query = """
            SELECT id
            FROM "VehicleModel"
            WHERE "brandId" = %s
            AND name = %s
            LIMIT 1
        """
        
        cursor.execute(query, (brand_id, model_name))
        result = cursor.fetchone()
        cursor.close()
        
        return result is not None
    
    def insert_model(self, brand_id, model_data):
        """Ubaci model u bazu"""
        cursor = self.prod_conn.cursor()
        
        model_id, model_name, manufacturer_id, year_from, year_to = model_data
        
        # Konvertuj godine u DateTime
        production_start = f"{year_from}-01-01" if year_from else None
        production_end = f"{year_to}-12-31" if year_to else None
        
        # Generiši cuid (Prisma format)
        def generate_cuid():
            # Jednostavan cuid generator (c + timestamp + random)
            timestamp = str(int(datetime.now().timestamp() * 1000))[-10:]
            random_part = ''.join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(15))
            return f"c{timestamp}{random_part}"
        
        generated_id = generate_cuid()
        
        query = """
            INSERT INTO "VehicleModel" (
                id,
                "brandId",
                name,
                "productionStart",
                "productionEnd",
                "externalId"
            ) VALUES (
                %s, %s, %s, %s, %s, %s
            )
            RETURNING id
        """
        
        cursor.execute(query, (
            generated_id,
            brand_id,
            model_name,
            production_start,
            production_end,
            str(model_id)  # TecDoc ID kao externalId
        ))
        
        self.prod_conn.commit()
        cursor.close()
        
        return generated_id
    
    def run(self, year_from=1990):
        """Pokreni import"""
        
        logging.info(f"\n{'#'*70}")
        logging.info(f"🚗 Import Modela Vozila iz TecDoc-a (>= {year_from})")
        logging.info(f"{'#'*70}\n")
        
        # 1. Učitaj mapiranje marki
        brand_mapping = self.get_brand_mapping()
        
        # 2. Učitaj proizvođače iz TecDoc-a
        manufacturers = self.get_tecdoc_manufacturers()
        
        # 3. Učitaj modele iz TecDoc-a
        models = self.get_models_from_tecdoc(year_from)
        self.stats['total_models'] = len(models)
        
        # 4. Importuj modele
        for idx, model_data in enumerate(models, 1):
            try:
                model_id, model_name, manufacturer_id, year_from, year_to = model_data
                
                # Pronađi proizvođača
                manufacturer_name = manufacturers.get(manufacturer_id, '').lower()
                
                # Pronađi brand_id u našoj bazi
                brand_id = brand_mapping.get(manufacturer_name)
                
                if not brand_id:
                    logging.debug(f"⚠️  [{idx}/{len(models)}] Skipped: {manufacturer_name} {model_name} - Brand not in database")
                    self.stats['skipped'] += 1
                    continue
                
                # Provjeri da li model već postoji
                if self.model_exists(brand_id, model_name):
                    logging.debug(f"⏭️  [{idx}/{len(models)}] Skipped: {model_name} - Already exists")
                    self.stats['skipped'] += 1
                    continue
                
                # Ubaci model
                new_id = self.insert_model(brand_id, model_data)
                logging.info(f"✅ [{idx}/{len(models)}] Imported: {manufacturer_name.upper()} {model_name} ({year_from}-{year_to})")
                self.stats['imported'] += 1
                
                # Progress update
                if idx % 100 == 0:
                    logging.info(f"\n📊 Progress: {idx}/{len(models)} ({idx/len(models)*100:.1f}%)")
                    logging.info(f"   Imported: {self.stats['imported']}, Skipped: {self.stats['skipped']}")
                
            except Exception as e:
                logging.error(f"❌ Error processing model {model_name}: {e}")
                self.stats['errors'] += 1
                continue
        
        # Final stats
        logging.info(f"\n{'#'*70}")
        logging.info(f"✅ IMPORT COMPLETED")
        logging.info(f"{'#'*70}")
        logging.info(f"📊 Final Stats:")
        logging.info(f"   Total models: {self.stats['total_models']}")
        logging.info(f"   Imported: {self.stats['imported']}")
        logging.info(f"   Skipped: {self.stats['skipped']}")
        logging.info(f"   Errors: {self.stats['errors']}")
        logging.info(f"{'#'*70}\n")
    
    def close(self):
        """Zatvori konekcije"""
        self.tecdoc_conn.close()
        self.prod_conn.close()
        logging.info("🔌 Database connections closed")

def main():
    """Main funkcija"""
    
    import sys
    year_from = int(sys.argv[1]) if len(sys.argv) > 1 else 1990
    
    importer = VehicleModelImporter()
    
    try:
        importer.run(year_from=year_from)
    except Exception as e:
        logging.error(f"❌ Fatal error: {e}")
        raise
    finally:
        importer.close()

if __name__ == "__main__":
    main()
