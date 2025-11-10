"""
ISPRAVAN Import Vozila iz TecDoc-a
====================================
1. Uvozi MODELE iz models tabele → VehicleModel
2. Uvozi MOTORE/GENERACIJE iz passengercars tabele → VehicleGeneration
"""

import psycopg2
import mysql.connector
from datetime import datetime
import logging
import secrets
import string

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('import_vehicles_correct.log'),
        logging.StreamHandler()
    ]
)

class VehicleImporter:
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
            'models_total': 0,
            'models_imported': 0,
            'models_skipped': 0,
            'generations_total': 0,
            'generations_imported': 0,
            'generations_skipped': 0,
            'errors': 0
        }
        
        logging.info("✅ Database connections established")
    
    def generate_cuid(self):
        """Generiši Prisma-style cuid"""
        timestamp = str(int(datetime.now().timestamp() * 1000))[-10:]
        random_part = ''.join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(15))
        return f"c{timestamp}{random_part}"
    
    def get_brand_mapping(self):
        """Učitaj mapiranje marki iz Postgres"""
        cursor = self.prod_conn.cursor()
        
        query = """
            SELECT id, name, "externalId"
            FROM "VehicleBrand"
            WHERE type = 'PASSENGER'
        """
        
        cursor.execute(query)
        brands = cursor.fetchall()
        cursor.close()
        
        # Mapiranje: externalId -> brand_id
        mapping = {}
        for brand_id, name, external_id in brands:
            if external_id:
                mapping[external_id.lower()] = brand_id
            mapping[name.lower()] = brand_id
        
        logging.info(f"📋 Loaded {len(brands)} brands from database")
        return mapping
    
    def get_tecdoc_manufacturers(self):
        """Učitaj proizvođače iz TecDoc-a"""
        cursor = self.tecdoc_conn.cursor()
        
        query = "SELECT ID, Description FROM manufacturers ORDER BY Description"
        cursor.execute(query)
        manufacturers = {row[0]: row[1] for row in cursor.fetchall()}
        cursor.close()
        
        logging.info(f"📋 Loaded {len(manufacturers)} manufacturers from TecDoc")
        return manufacturers
    
    def get_models_from_tecdoc(self, year_from=1990):
        """Učitaj MODELE iz TecDoc models tabele"""
        cursor = self.tecdoc_conn.cursor()
        
        query = """
            SELECT DISTINCT
                m.id as model_id,
                m.Description as model_name,
                m.ManufacturerId as manufacturer_id,
                YEAR(m.`From`) as year_from,
                YEAR(m.`To`) as year_to
            FROM models m
            WHERE m.IsPassengerCar = 1
            AND (YEAR(m.`From`) >= %s OR YEAR(m.`To`) >= %s OR YEAR(m.`To`) = 0)
            AND m.ManufacturerId IS NOT NULL
            AND m.Description IS NOT NULL
            ORDER BY m.ManufacturerId, m.Description
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
        
        return result[0] if result else None
    
    def insert_model(self, brand_id, model_data):
        """Ubaci model u bazu"""
        cursor = self.prod_conn.cursor()
        
        model_id, model_name, manufacturer_id, year_from, year_to = model_data
        
        # Konvertuj godine u DateTime
        production_start = f"{year_from}-01-01" if year_from and year_from > 0 else None
        production_end = f"{year_to}-12-31" if year_to and year_to > 0 else None
        
        generated_id = self.generate_cuid()
        
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
            str(model_id)  # TecDoc model ID kao externalId
        ))
        
        self.prod_conn.commit()
        cursor.close()
        
        return generated_id
    
    def get_generations_for_model(self, tecdoc_model_id):
        """Učitaj MOTORE/GENERACIJE za model iz passengercars tabele"""
        cursor = self.tecdoc_conn.cursor()
        
        query = """
            SELECT 
                pc.id as generation_id,
                pc.Description as generation_name,
                YEAR(pc.`From`) as year_from,
                YEAR(pc.`To`) as year_to
            FROM passengercars pc
            WHERE pc.Model = %s
            ORDER BY pc.`From`, pc.Description
        """
        
        cursor.execute(query, (tecdoc_model_id,))
        generations = cursor.fetchall()
        cursor.close()
        
        return generations
    
    def generation_exists(self, model_id, generation_name):
        """Provjeri da li generacija već postoji"""
        cursor = self.prod_conn.cursor()
        
        query = """
            SELECT id
            FROM "VehicleGeneration"
            WHERE "modelId" = %s
            AND name = %s
            LIMIT 1
        """
        
        cursor.execute(query, (model_id, generation_name))
        result = cursor.fetchone()
        cursor.close()
        
        return result is not None
    
    def insert_generation(self, model_id, generation_data):
        """Ubaci generaciju/motor u bazu"""
        cursor = self.prod_conn.cursor()
        
        generation_id, generation_name, year_from, year_to = generation_data
        
        # Period string
        year_from_str = str(year_from) if year_from and year_from > 0 else "?"
        year_to_str = str(year_to) if year_to and year_to > 0 else "present"
        period = f"{year_from_str}-{year_to_str}"
        
        generated_id = self.generate_cuid()
        
        query = """
            INSERT INTO "VehicleGeneration" (
                id,
                "modelId",
                name,
                period,
                "externalId"
            ) VALUES (
                %s, %s, %s, %s, %s
            )
            RETURNING id
        """
        
        cursor.execute(query, (
            generated_id,
            model_id,
            generation_name,
            period,
            str(generation_id)  # TecDoc passengercars ID kao externalId
        ))
        
        self.prod_conn.commit()
        cursor.close()
        
        return generated_id
    
    def run(self, year_from=1990):
        """Pokreni import"""
        
        logging.info(f"\n{'#'*70}")
        logging.info(f"🚗 ISPRAVAN Import Vozila iz TecDoc-a (>= {year_from})")
        logging.info(f"{'#'*70}\n")
        
        # 1. Učitaj mapiranje marki
        brand_mapping = self.get_brand_mapping()
        
        # 2. Učitaj proizvođače
        manufacturers = self.get_tecdoc_manufacturers()
        
        # 3. Učitaj MODELE
        models = self.get_models_from_tecdoc(year_from)
        self.stats['models_total'] = len(models)
        
        logging.info(f"\n{'='*70}")
        logging.info(f"📦 FAZA 1: Import MODELA")
        logging.info(f"{'='*70}\n")
        
        # 4. Importuj MODELE
        model_mapping = {}  # tecdoc_model_id -> our_model_id
        
        for idx, model_data in enumerate(models, 1):
            try:
                model_id, model_name, manufacturer_id, year_from_val, year_to_val = model_data
                
                # Pronađi proizvođača
                manufacturer_name = manufacturers.get(manufacturer_id, '').lower()
                
                # Pronađi brand_id
                brand_id = brand_mapping.get(manufacturer_name)
                
                if not brand_id:
                    self.stats['models_skipped'] += 1
                    continue
                
                # Provjeri da li model već postoji
                existing_model_id = self.model_exists(brand_id, model_name)
                
                if existing_model_id:
                    model_mapping[model_id] = existing_model_id
                    self.stats['models_skipped'] += 1
                    continue
                
                # Ubaci model
                new_model_id = self.insert_model(brand_id, model_data)
                model_mapping[model_id] = new_model_id
                
                logging.info(f"✅ [{idx}/{len(models)}] {manufacturer_name.upper()} {model_name} ({year_from_val}-{year_to_val if year_to_val > 0 else 'present'})")
                self.stats['models_imported'] += 1
                
                # Progress update
                if idx % 50 == 0:
                    logging.info(f"\n📊 Progress: {idx}/{len(models)} ({idx/len(models)*100:.1f}%)")
                    logging.info(f"   Imported: {self.stats['models_imported']}, Skipped: {self.stats['models_skipped']}\n")
                
            except Exception as e:
                logging.error(f"❌ Error processing model {model_name}: {e}")
                self.stats['errors'] += 1
                continue
        
        logging.info(f"\n{'='*70}")
        logging.info(f"🏁 FAZA 1 Završena: {self.stats['models_imported']} modela uvezeno")
        logging.info(f"{'='*70}\n")
        
        # 5. Importuj GENERACIJE/MOTORE
        logging.info(f"\n{'='*70}")
        logging.info(f"🔧 FAZA 2: Import GENERACIJA/MOTORA")
        logging.info(f"{'='*70}\n")
        
        generation_count = 0
        
        for tecdoc_model_id, our_model_id in model_mapping.items():
            try:
                # Učitaj generacije za ovaj model
                generations = self.get_generations_for_model(tecdoc_model_id)
                self.stats['generations_total'] += len(generations)
                
                for gen_data in generations:
                    generation_count += 1
                    gen_id, gen_name, gen_year_from, gen_year_to = gen_data
                    
                    # Provjeri da li generacija već postoji
                    if self.generation_exists(our_model_id, gen_name):
                        self.stats['generations_skipped'] += 1
                        continue
                    
                    # Ubaci generaciju
                    self.insert_generation(our_model_id, gen_data)
                    self.stats['generations_imported'] += 1
                    
                    if generation_count % 100 == 0:
                        logging.info(f"✅ Imported {self.stats['generations_imported']} generations...")
                
            except Exception as e:
                logging.error(f"❌ Error processing generations for model {tecdoc_model_id}: {e}")
                self.stats['errors'] += 1
                continue
        
        # Final stats
        logging.info(f"\n{'#'*70}")
        logging.info(f"✅ IMPORT COMPLETED")
        logging.info(f"{'#'*70}")
        logging.info(f"📊 Final Stats:")
        logging.info(f"\n  MODELI:")
        logging.info(f"    Total: {self.stats['models_total']}")
        logging.info(f"    Imported: {self.stats['models_imported']}")
        logging.info(f"    Skipped: {self.stats['models_skipped']}")
        logging.info(f"\n  GENERACIJE/MOTORI:")
        logging.info(f"    Total: {self.stats['generations_total']}")
        logging.info(f"    Imported: {self.stats['generations_imported']}")
        logging.info(f"    Skipped: {self.stats['generations_skipped']}")
        logging.info(f"\n  Errors: {self.stats['errors']}")
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
    
    importer = VehicleImporter()
    
    try:
        importer.run(year_from=year_from)
    except Exception as e:
        logging.error(f"❌ Fatal error: {e}")
        raise
    finally:
        importer.close()

if __name__ == "__main__":
    main()
