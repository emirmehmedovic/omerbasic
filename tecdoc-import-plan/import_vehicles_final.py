"""
FINALNI Import Vozila iz TecDoc-a
===================================
Struktura:
  Marka: Audi
    └─ Model: A4
        └─ Generacija: B6 (8E2) - 2.0 TDI CDBA [2004-2008]
            ├─ engineCode: CDBA
            ├─ powerKW: 90
            ├─ powerHP: 122
            └─ engineCC: 1968
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
        logging.FileHandler('import_vehicles_final.log'),
        logging.StreamHandler()
    ]
)

class VehicleImporterFinal:
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
        
        # Cache za generacije
        self.generation_cache = {}
        
        logging.info("✅ Database connections established")
    
    def generate_cuid(self):
        """Generiši Prisma-style cuid"""
        timestamp = str(int(datetime.now().timestamp() * 1000))[-10:]
        random_part = ''.join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(15))
        return f"c{timestamp}{random_part}"
    
    def parse_model_name(self, full_description):
        """
        Parsira naziv modela iz TecDoc opisa
        Input: "A4 (8E2, B6)" ili "GOLF III (1H1, 1HX1)"
        Output: "A4" ili "Golf"
        """
        # Ukloni sve u zagradama
        match = re.match(r'^([^(]+)', full_description)
        if match:
            return match.group(1).strip()
        return full_description.strip()
    
    def parse_generation_code(self, full_description):
        """
        Izvuče kod generacije iz opisa
        Input: "A4 (8E2, B6)"
        Output: "B6 (8E2)"
        """
        # Pronađi sve u zagradama
        match = re.search(r'\(([^)]+)\)', full_description)
        if match:
            codes = match.group(1)
            # Ako ima B5, B6, B7... izdvoji to
            b_match = re.search(r'(B\d+)', codes)
            if b_match:
                b_code = b_match.group(1)
                # Vrati "B6 (8E2)" format
                other_codes = codes.replace(b_code, '').strip(', ')
                if other_codes:
                    return f"{b_code} ({other_codes})"
                return b_code
            return codes
        return None
    
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
        
        # Dodaj ručna mapiranja za TecDoc nazive
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
    
    def get_generations_for_model(self, tecdoc_model_id, model_description):
        """Učitaj MOTORE/GENERACIJE za model"""
        cursor = self.tecdoc_conn.cursor()
        
        # Izvuci kod generacije iz model description
        generation_code = self.parse_generation_code(model_description)
        
        query = """
            SELECT 
                pc.id as car_id,
                pc.Description as car_description,
                YEAR(pc.`From`) as year_from,
                YEAR(pc.`To`) as year_to,
                pc.InternalID as internal_id
            FROM passengercars pc
            WHERE pc.Model = %s
            ORDER BY pc.`From`, pc.Description
        """
        
        cursor.execute(query, (tecdoc_model_id,))
        generations = cursor.fetchall()
        cursor.close()
        
        return generations, generation_code
    
    def get_engine_codes(self, car_id):
        """Učitaj kodove motora za vozilo"""
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
        
        # Parsiraj specs
        power_kw = None
        power_hp = None
        capacity = None
        
        for title, value in specs:
            if title == 'Power':
                if 'kW' in value:
                    power_kw = int(re.search(r'(\d+)', value).group(1))
                elif 'PS' in value:
                    power_hp = int(re.search(r'(\d+)', value).group(1))
            elif title == 'Capacity':
                capacity = int(re.search(r'(\d+)', value).group(1))
        
        return power_kw, power_hp, capacity
    
    def generation_exists(self, model_id, generation_name):
        """Provjeri da li generacija postoji (sa cache-om)"""
        cache_key = f"{model_id}:{generation_name}"
        
        if cache_key in self.generation_cache:
            return self.generation_cache[cache_key]
        
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
        
        exists = result is not None
        self.generation_cache[cache_key] = exists
        
        return exists
    
    def insert_generation(self, model_id, generation_data, generation_code):
        """Ubaci generaciju/motor"""
        cursor = self.prod_conn.cursor()
        
        car_id, car_description, year_from, year_to, internal_id = generation_data
        
        # Učitaj kodove motora
        engines = self.get_engine_codes(car_id)
        
        if not engines:
            # Nema engine code, koristi samo opis
            engine_codes_str = ""
        else:
            # Uzmi prvi engine code
            engine_id, engine_code = engines[0]
            engine_codes_str = engine_code
            
            # Učitaj specs
            power_kw, power_hp, capacity = self.get_engine_specs(engine_id)
        
        # Kreiraj naziv generacije
        if generation_code and engine_codes_str:
            generation_name = f"{generation_code} - {car_description} {engine_codes_str}"
        elif generation_code:
            generation_name = f"{generation_code} - {car_description}"
        elif engine_codes_str:
            generation_name = f"{car_description} {engine_codes_str}"
        else:
            generation_name = car_description
        
        # Period
        year_from_str = str(year_from) if year_from and year_from > 0 else "?"
        year_to_str = str(year_to) if year_to and year_to > 0 else "present"
        period = f"{year_from_str}-{year_to_str}"
        
        generated_id = self.generate_cuid()
        
        # Pripremi vinCode sa engine specs
        vin_data = {}
        if engines:
            vin_data['engineCode'] = engine_codes_str
            if power_kw:
                vin_data['powerKW'] = power_kw
            if power_hp:
                vin_data['powerHP'] = power_hp
            if capacity:
                vin_data['engineCC'] = capacity
        
        vin_code = str(vin_data) if vin_data else None
        
        query = """
            INSERT INTO "VehicleGeneration" (
                id,
                "modelId",
                name,
                period,
                "vinCode",
                "externalId",
                "createdAt",
                "updatedAt"
            ) VALUES (
                %s, %s, %s, %s, %s, %s, NOW(), NOW()
            )
            RETURNING id
        """
        
        cursor.execute(query, (
            generated_id,
            model_id,
            generation_name,
            period,
            vin_code,
            str(car_id)
        ))
        
        self.prod_conn.commit()
        cursor.close()
        
        return generated_id
    
    def run(self, year_from=1990):
        """Pokreni import"""
        
        logging.info(f"\n{'#'*70}")
        logging.info(f"🚗 FINALNI Import Vozila iz TecDoc-a (>= {year_from})")
        logging.info(f"{'#'*70}\n")
        
        # 1. Učitaj mapiranje
        brand_mapping = self.get_brand_mapping()
        manufacturers = self.get_tecdoc_manufacturers()
        
        # 2. Učitaj MODELE
        models = self.get_models_from_tecdoc(year_from)
        self.stats['models_total'] = len(models)
        
        logging.info(f"\n{'='*70}")
        logging.info(f"📦 FAZA 1: Import MODELA")
        logging.info(f"{'='*70}\n")
        
        model_mapping = {}
        
        for idx, model_data in enumerate(models, 1):
            try:
                model_id, model_description, manufacturer_id, year_from_val, year_to_val = model_data
                
                # Pronađi proizvođača
                manufacturer_name = manufacturers.get(manufacturer_id, '').lower()
                brand_id = brand_mapping.get(manufacturer_name)
                
                if not brand_id:
                    if idx % 100 == 0:
                        logging.debug(f"⏭️  [{idx}/{len(models)}] Skipped: {manufacturer_name} - not in database")
                    self.stats['models_skipped'] += 1
                    continue
                
                # Parsiraj naziv modela
                model_name = self.parse_model_name(model_description)
                
                # Provjeri da li model postoji
                existing_model_id = self.model_exists(brand_id, model_name)
                
                if existing_model_id:
                    model_mapping[model_id] = (existing_model_id, model_description)
                    self.stats['models_skipped'] += 1
                    continue
                
                # Ubaci model
                new_model_id = self.insert_model(brand_id, model_name, model_data)
                model_mapping[model_id] = (new_model_id, model_description)
                
                logging.info(f"✅ [{idx}/{len(models)}] {manufacturer_name.upper()} {model_name} ({year_from_val}-{year_to_val if year_to_val > 0 else 'present'})")
                self.stats['models_imported'] += 1
                
                if idx % 50 == 0:
                    logging.info(f"\n📊 Progress: {idx}/{len(models)} ({idx/len(models)*100:.1f}%)")
                    logging.info(f"   Imported: {self.stats['models_imported']}, Skipped: {self.stats['models_skipped']}\n")
                
                # Progress za svaki 10. model
                if idx % 10 == 0:
                    logging.debug(f"Processing {idx}/{len(models)}...")
                
            except Exception as e:
                logging.error(f"❌ Error processing model: {e}")
                self.prod_conn.rollback()  # Rollback transaction
                self.stats['errors'] += 1
                continue
        
        logging.info(f"\n{'='*70}")
        logging.info(f"🏁 FAZA 1 Završena: {self.stats['models_imported']} modela")
        logging.info(f"{'='*70}\n")
        
        # 3. Import GENERACIJA
        logging.info(f"\n{'='*70}")
        logging.info(f"🔧 FAZA 2: Import GENERACIJA/MOTORA")
        logging.info(f"{'='*70}\n")
        
        generation_count = 0
        
        for tecdoc_model_id, (our_model_id, model_description) in model_mapping.items():
            try:
                generations, generation_code = self.get_generations_for_model(tecdoc_model_id, model_description)
                self.stats['generations_total'] += len(generations)
                
                for gen_data in generations:
                    generation_count += 1
                    car_id, car_description, year_from, year_to, internal_id = gen_data
                    
                    try:
                        self.insert_generation(our_model_id, gen_data, generation_code)
                        self.stats['generations_imported'] += 1
                    except Exception as gen_error:
                        if 'duplicate key' in str(gen_error):
                            self.stats['generations_skipped'] += 1
                        else:
                            logging.error(f"❌ Error inserting generation {car_description}: {gen_error}")
                            self.prod_conn.rollback()
                            self.stats['errors'] += 1
                        continue
                    
                    if generation_count % 100 == 0:
                        logging.info(f"✅ Imported {self.stats['generations_imported']} generations...")
                
            except Exception as e:
                logging.error(f"❌ Error processing generations for model {tecdoc_model_id}: {e}")
                self.prod_conn.rollback()  # Rollback transaction
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
    
    importer = VehicleImporterFinal()
    
    try:
        importer.run(year_from=year_from)
    except Exception as e:
        logging.error(f"❌ Fatal error: {e}")
        raise
    finally:
        importer.close()

if __name__ == "__main__":
    main()
