"""
ISPRAVAN Import Vozila iz TecDoc-a - V2
========================================
Struktura:
  Marka: Audi
    └─ Model: A4
        └─ Generacija: B8 (8K2) [2007-2015]
            ├─ Motor: 1.8 TFSI CABB (118kW/160PS)
            ├─ Motor: 2.0 TDI CAGA (105kW/143PS)
            └─ Motor: 3.0 TDI CCWA (176kW/240PS)

Baziran na analizi: TECDOC_STRUCTURE_ANALYSIS.md
"""

import psycopg2
import mysql.connector
from datetime import datetime
import logging
import secrets
import string
import re

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('import_vehicles_v2.log'),
        logging.StreamHandler()
    ]
)

class VehicleImporterV2:
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
            'engines_total': 0,
            'engines_imported': 0,
            'engines_skipped': 0,
            'errors': 0
        }
        
        logging.info("✅ Database connections established")
    
    def generate_cuid(self):
        """Generiši Prisma-style cuid"""
        timestamp = str(int(datetime.now().timestamp() * 1000))[-10:]
        random_part = ''.join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(15))
        return f"c{timestamp}{random_part}"
    
    def parse_model_and_generation(self, full_description):
        """
        Parsira model i generaciju iz TecDoc opisa
        Input: "A4 (8E2, B6)" ili "GOLF III (1H1)"
        Output: ("A4", "B6 (8E2)") ili ("Golf", "Golf III (1H1)")
        """
        # Ukloni sve u zagradama za model name
        match = re.match(r'^([^(]+)', full_description)
        if not match:
            return full_description.strip(), full_description.strip()
        
        model_name = match.group(1).strip()
        
        # Izvuci generaciju (sve u zagradama)
        gen_match = re.search(r'\(([^)]+)\)', full_description)
        if gen_match:
            codes = gen_match.group(1)
            
            # Ako ima B5, B6, B7... izdvoji to
            b_match = re.search(r'(B\d+)', codes)
            if b_match:
                b_code = b_match.group(1)
                other_codes = codes.replace(b_code, '').strip(', ')
                if other_codes:
                    generation_name = f"{b_code} ({other_codes})"
                else:
                    generation_name = b_code
            else:
                # Nema B kod, koristi cijeli opis kao generaciju
                generation_name = full_description
        else:
            generation_name = full_description
        
        return model_name, generation_name
    
    def get_brand_mapping(self):
        """Učitaj mapiranje marki"""
        cursor = self.prod_conn.cursor()
        
        query = """
            SELECT id, name, "externalId"
            FROM "VehicleBrand"
            WHERE type = 'PASSENGER'
        """
        
        cursor.execute(query)
        brands = cursor.fetchall()
        cursor.close()
        
        mapping = {}
        for brand_id, name, external_id in brands:
            if external_id:
                mapping[external_id.lower()] = brand_id
            mapping[name.lower()] = brand_id
        
        # Dodaj ručna mapiranja
        brand_aliases = {
            'vw': 'volkswagen',
            'mercedes-benz': 'mercedes benz',
            'mercedes': 'mercedes benz',
            'citroën': 'citroen'
        }
        
        for alias, real_name in brand_aliases.items():
            if real_name in mapping:
                mapping[alias] = mapping[real_name]
        
        logging.info(f"📋 Loaded {len(brands)} brands from database")
        return mapping
    
    def get_tecdoc_manufacturers(self):
        """Učitaj proizvođače"""
        cursor = self.tecdoc_conn.cursor()
        
        query = "SELECT ID, Description FROM manufacturers ORDER BY Description"
        cursor.execute(query)
        manufacturers = {row[0]: row[1] for row in cursor.fetchall()}
        cursor.close()
        
        logging.info(f"📋 Loaded {len(manufacturers)} manufacturers from TecDoc")
        return manufacturers
    
    def get_models_from_tecdoc(self, year_from=1990):
        """Učitaj MODELE"""
        cursor = self.tecdoc_conn.cursor()
        
        query = """
            SELECT DISTINCT
                m.id as model_id,
                m.Description as model_description,
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
        """Provjeri da li model postoji"""
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
    
    def insert_model(self, brand_id, model_name, model_data):
        """Ubaci model"""
        cursor = self.prod_conn.cursor()
        
        model_id, model_description, manufacturer_id, year_from, year_to = model_data
        
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
            str(model_id)
        ))
        
        self.prod_conn.commit()
        cursor.close()
        
        return generated_id
    
    def generation_exists(self, model_id, generation_name):
        """Provjeri da li generacija postoji"""
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
        
        return result[0] if result else None
    
    def insert_generation(self, model_id, generation_name, year_from, year_to, passengercars_id):
        """Ubaci generaciju sa externalId = passengercars.id"""
        cursor = self.prod_conn.cursor()
        
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
                "externalId",
                "createdAt",
                "updatedAt"
            ) VALUES (
                %s, %s, %s, %s, %s, NOW(), NOW()
            )
            RETURNING id
        """
        
        cursor.execute(query, (
            generated_id,
            model_id,
            generation_name,
            period,
            str(passengercars_id)  # externalId = passengercars.id
        ))
        
        self.prod_conn.commit()
        cursor.close()
        
        return generated_id
    
    def get_passengercars_for_model(self, tecdoc_model_id):
        """Učitaj sve passengercars za model"""
        cursor = self.tecdoc_conn.cursor()
        
        query = """
            SELECT 
                pc.id as car_id,
                pc.Description as car_description,
                YEAR(pc.`From`) as year_from,
                YEAR(pc.`To`) as year_to
            FROM passengercars pc
            WHERE pc.Model = %s
            ORDER BY pc.`From`, pc.Description
        """
        
        cursor.execute(query, (tecdoc_model_id,))
        cars = cursor.fetchall()
        cursor.close()
        
        return cars
    
    def get_engine_codes(self, car_id):
        """Učitaj kodove motora za passengercars"""
        cursor = self.tecdoc_conn.cursor()
        
        query = """
            SELECT e.id, e.Description
            FROM passengercars_link_engines ple
            JOIN engines e ON e.id = ple.engine_id
            WHERE ple.car_id = %s
        """
        
        cursor.execute(query, (car_id,))
        engines = cursor.fetchall()
        cursor.close()
        
        return engines
    
    def get_engine_specs(self, engine_id):
        """Učitaj specifikacije motora (KW, HP, CCM)"""
        cursor = self.tecdoc_conn.cursor()
        
        query = """
            SELECT DisplayTitle, DisplayValue
            FROM items_atributes
            WHERE item_id = %s
            AND IsEngine = 1
            AND DisplayTitle IN ('Power', 'Capacity')
        """
        
        cursor.execute(query, (engine_id,))
        specs = cursor.fetchall()
        cursor.close()
        
        power_kw = None
        power_hp = None
        capacity = None
        
        for title, value in specs:
            if title == 'Power':
                if 'kW' in value:
                    match = re.search(r'(\d+)', value)
                    if match:
                        power_kw = int(match.group(1))
                elif 'PS' in value:
                    match = re.search(r'(\d+)', value)
                    if match:
                        power_hp = int(match.group(1))
            elif title == 'Capacity':
                match = re.search(r'(\d+)', value)
                if match:
                    capacity = int(match.group(1))
        
        return power_kw, power_hp, capacity
    
    def engine_exists(self, generation_id, engine_code):
        """Provjeri da li motor postoji"""
        cursor = self.prod_conn.cursor()
        
        query = """
            SELECT id
            FROM "VehicleEngine"
            WHERE "generationId" = %s
            AND "engineCode" = %s
            LIMIT 1
        """
        
        cursor.execute(query, (generation_id, engine_code))
        result = cursor.fetchone()
        cursor.close()
        
        return result is not None
    
    def insert_engine(self, generation_id, car_description, engine_data, year_from, year_to):
        """Ubaci motor u VehicleEngine"""
        cursor = self.prod_conn.cursor()
        
        engine_id, engine_code = engine_data
        
        # Učitaj specs
        power_kw, power_hp, capacity = self.get_engine_specs(engine_id)
        
        # Odredi engine type iz description
        engine_type = "DIESEL" if "TDI" in car_description or "D" in car_description else "PETROL"
        
        # Kreiraj description
        description = f"{car_description} {engine_code}"
        
        generated_id = self.generate_cuid()
        
        query = """
            INSERT INTO "VehicleEngine" (
                id,
                "generationId",
                "engineType",
                "engineCode",
                "enginePowerKW",
                "enginePowerHP",
                "engineCapacity",
                "description",
                "externalId",
                "yearFrom",
                "yearTo",
                "createdAt",
                "updatedAt"
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW()
            )
            RETURNING id
        """
        
        year_from_date = f"{year_from}-01-01" if year_from and year_from > 0 else None
        year_to_date = f"{year_to}-12-31" if year_to and year_to > 0 else None
        
        cursor.execute(query, (
            generated_id,
            generation_id,
            engine_type,
            engine_code,
            power_kw,
            power_hp,
            capacity,
            description,
            str(engine_id),
            year_from_date,
            year_to_date
        ))
        
        self.prod_conn.commit()
        cursor.close()
        
        return generated_id
    
    def run(self, year_from=1990):
        """Pokreni import"""
        
        logging.info(f"\n{'#'*70}")
        logging.info(f"🚗 ISPRAVAN Import Vozila iz TecDoc-a V2 (>= {year_from})")
        logging.info(f"{'#'*70}\n")
        
        # 1. Učitaj mapiranje
        brand_mapping = self.get_brand_mapping()
        manufacturers = self.get_tecdoc_manufacturers()
        
        # 2. Učitaj MODELE
        models = self.get_models_from_tecdoc(year_from)
        self.stats['models_total'] = len(models)
        
        logging.info(f"\n{'='*70}")
        logging.info(f"📦 FAZA 1: Import MODELA i GENERACIJA")
        logging.info(f"{'='*70}\n")
        
        for idx, model_data in enumerate(models, 1):
            try:
                model_id, model_description, manufacturer_id, year_from_val, year_to_val = model_data
                
                # Pronađi proizvođača
                manufacturer_name = manufacturers.get(manufacturer_id, '').lower()
                brand_id = brand_mapping.get(manufacturer_name)
                
                if not brand_id:
                    self.stats['models_skipped'] += 1
                    continue
                
                # Parsiraj model i generaciju
                model_name, generation_name = self.parse_model_and_generation(model_description)
                
                # Provjeri da li model postoji
                existing_model_id = self.model_exists(brand_id, model_name)
                
                if not existing_model_id:
                    # Kreiraj model
                    existing_model_id = self.insert_model(brand_id, model_name, model_data)
                    self.stats['models_imported'] += 1
                    logging.info(f"✅ Model: {manufacturer_name.upper()} {model_name}")
                else:
                    self.stats['models_skipped'] += 1
                
                # Provjeri da li generacija postoji
                existing_generation_id = self.generation_exists(existing_model_id, generation_name)
                
                if not existing_generation_id:
                    # Kreiraj generaciju
                    existing_generation_id = self.insert_generation(
                        existing_model_id,
                        generation_name,
                        year_from_val,
                        year_to_val,
                        model_id
                    )
                    self.stats['generations_imported'] += 1
                    logging.info(f"  └─ Generacija: {generation_name} [{year_from_val}-{year_to_val if year_to_val > 0 else 'present'}]")
                else:
                    self.stats['generations_skipped'] += 1
                
                # Učitaj passengercars (motore) za ovaj model
                passengercars = self.get_passengercars_for_model(model_id)
                self.stats['engines_total'] += len(passengercars)
                
                # Import motora
                for car_id, car_description, pc_year_from, pc_year_to in passengercars:
                    # Učitaj engine codes
                    engines = self.get_engine_codes(car_id)
                    
                    if not engines:
                        continue
                    
                    for engine_data in engines:
                        engine_id, engine_code = engine_data
                        
                        # Provjeri da li motor postoji
                        if self.engine_exists(existing_generation_id, engine_code):
                            self.stats['engines_skipped'] += 1
                            continue
                        
                        # Ubaci motor
                        try:
                            self.insert_engine(
                                existing_generation_id,
                                car_description,
                                engine_data,
                                pc_year_from,
                                pc_year_to
                            )
                            self.stats['engines_imported'] += 1
                            logging.info(f"      └─ Motor: {car_description} {engine_code}")
                        except Exception as e:
                            if 'duplicate key' not in str(e):
                                logging.error(f"❌ Error inserting engine {engine_code}: {e}")
                                self.prod_conn.rollback()
                            self.stats['engines_skipped'] += 1
                
                # Progress
                if idx % 10 == 0:
                    logging.info(f"\n📊 Progress: {idx}/{len(models)} ({idx/len(models)*100:.1f}%)")
                    logging.info(f"   Models: {self.stats['models_imported']}, Generations: {self.stats['generations_imported']}, Engines: {self.stats['engines_imported']}\n")
                
            except Exception as e:
                logging.error(f"❌ Error processing model {model_description}: {e}")
                self.prod_conn.rollback()
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
        logging.info(f"\n  GENERACIJE:")
        logging.info(f"    Imported: {self.stats['generations_imported']}")
        logging.info(f"    Skipped: {self.stats['generations_skipped']}")
        logging.info(f"\n  MOTORI:")
        logging.info(f"    Total: {self.stats['engines_total']}")
        logging.info(f"    Imported: {self.stats['engines_imported']}")
        logging.info(f"    Skipped: {self.stats['engines_skipped']}")
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
    
    importer = VehicleImporterV2()
    
    try:
        importer.run(year_from=year_from)
    except Exception as e:
        logging.error(f"❌ Fatal error: {e}")
        raise
    finally:
        importer.close()

if __name__ == "__main__":
    main()
