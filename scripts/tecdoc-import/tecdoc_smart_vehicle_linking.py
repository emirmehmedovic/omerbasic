"""
TecDoc Smart Vehicle Linking Script
====================================
Super napredni matching vozila sa validacijom i externalId mapiranjem

Features:
- Smart mapping: Marke → Modeli → Generacije → Motori
- ExternalId tracking (TecDoc ID → tvoj ID)
- Validacija (max vozila per proizvod)
- DRY RUN mode (prvo loguj, pa onda update)
- Cleanup mode (obriši postojeće pogrešne linkove)
- Auto-create marki/modela/generacija/motora ako ne postoje

Autor: Claude Code
Datum: 22. decembar 2025.
"""

import psycopg2
import mysql.connector
from typing import Dict, List, Optional, Tuple
import json
import logging
from datetime import datetime
import re

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('tecdoc_smart_vehicle_linking.log'),
        logging.StreamHandler()
    ]
)

class SmartVehicleLinker:
    """
    Pametno linkovanje vozila iz TecDoc-a u tvoju strukturu
    """

    def __init__(self, dry_run: bool = True):
        # TecDoc MySQL (read-only)
        self.tecdoc_conn = mysql.connector.connect(
            host="localhost",
            user="root",
            password="",
            database="tecdoc1q2019",
            charset='utf8mb4'
        )

        # Postgres (read-write)
        self.postgres_conn = psycopg2.connect(
            host="localhost",
            database="omerbasicdb",
            user="emir_mw",
            password=""
        )

        self.dry_run = dry_run

        # Cache za performance
        self.brand_cache = {}  # {tecdoc_name: {id, externalId}}
        self.model_cache = {}  # {tecdoc_model_id: {id, externalId}}
        self.generation_cache = {}  # {tecdoc_vehicle_id: {id, externalId}}
        self.engine_cache = {}  # {tecdoc_engine_id: {id, externalId}}

        # Statistics
        self.stats = {
            'products_processed': 0,
            'brands_created': 0,
            'brands_found': 0,
            'models_created': 0,
            'models_found': 0,
            'generations_created': 0,
            'generations_found': 0,
            'engines_created': 0,
            'engines_found': 0,
            'fitments_created': 0,
            'fitments_skipped_universal': 0,
            'fitments_skipped_too_many': 0,
            'errors': 0
        }

        # Config - BALANCED MODE (sa OEM filteringom!)
        self.MAX_VEHICLES_PER_PRODUCT = 200   # Max total vehicles
        self.MAX_MODELS = 25                   # Max different models (povećano - OEM filtering radi!)
        self.MAX_GENERATIONS = 200             # Max different generations (= MAX_VEHICLES, svaki model ima više generacija)
        self.MAX_BRANDS = 3                    # Max different brands (smanjeno - OEM je specifičniji!)
        self.MAX_ENGINES_PER_GENERATION = 15   # Max engine variants per generation
        self.REQUIRE_ENGINE_SPEC = True        # Obavezno engine_id

        # Manufacturer Groups (za OEM filtering)
        self.MANUFACTURER_GROUPS = {
            'VW': ['VOLKSWAGEN', 'VW', 'AUDI', 'SEAT', 'SKODA', 'ŠKODA', 'PORSCHE', 'BENTLEY', 'LAMBORGHINI', 'BUGATTI', 'VAG'],
            'FCA': ['FIAT', 'ALFA ROMEO', 'LANCIA', 'JEEP', 'CHRYSLER', 'DODGE', 'RAM', 'ABARTH'],
            'RENAULT': ['RENAULT', 'DACIA', 'NISSAN', 'INFINITI', 'MITSUBISHI'],
            'PSA': ['PEUGEOT', 'CITROEN', 'CITROËN', 'OPEL', 'VAUXHALL', 'DS'],
            'BMW': ['BMW', 'MINI', 'ROLLS-ROYCE'],
            'DAIMLER': ['MERCEDES-BENZ', 'MERCEDES', 'SMART', 'MAYBACH'],
            'GM': ['CHEVROLET', 'BUICK', 'GMC', 'CADILLAC', 'HOLDEN'],
            'FORD': ['FORD', 'LINCOLN', 'MERCURY'],
            'TOYOTA': ['TOYOTA', 'LEXUS', 'DAIHATSU', 'HINO'],
            'HONDA': ['HONDA', 'ACURA'],
            'HYUNDAI': ['HYUNDAI', 'KIA', 'GENESIS']
        }

    # ===================================================================
    # HELPER FUNCTIONS
    # ===================================================================

    def normalize_brand_name(self, name: str) -> str:
        """Normalizuj ime marke za matching"""
        if not name:
            return ""

        # VW/Volkswagen special case
        if name.upper() in ['VW', 'VOLKSWAGEN', 'VAG']:
            return 'Volkswagen'

        # Mercedes-Benz variations
        if 'MERCEDES' in name.upper():
            return 'Mercedes-Benz'

        # BMW
        if name.upper() == 'BMW':
            return 'Bmw'

        # Capitalize first letter
        return name.strip().title()

    def create_slug(self, text: str) -> str:
        """Kreiraj slug za model"""
        slug = text.lower()
        slug = re.sub(r'[^a-z0-9\-\s]', '', slug)
        slug = re.sub(r'\s+', '-', slug)
        slug = slug.strip('-')
        return slug[:100]  # Limit length

    def get_oem_manufacturers(self, product_id: str) -> List[str]:
        """
        Izvuci OEM manufacturers za proizvod iz ArticleOENumber
        """
        cursor = self.postgres_conn.cursor()

        query = """
            SELECT DISTINCT manufacturer
            FROM "ArticleOENumber"
            WHERE "productId" = %s
              AND manufacturer IS NOT NULL
              AND manufacturer != ''
        """

        cursor.execute(query, (product_id,))
        manufacturers = [row[0].upper() for row in cursor.fetchall()]
        cursor.close()

        return manufacturers

    def get_allowed_vehicle_brands(self, oem_manufacturers: List[str]) -> List[str]:
        """
        Na osnovu OEM manufacturers, vrati dozvoljene vehicle brands

        Koristi MANUFACTURER_GROUPS za mapiranje
        """
        if not oem_manufacturers:
            return []  # Ako nema OEM brojeva, ne filtriramo (ili vratimo sve?)

        allowed_brands = set()

        for oem_mfr in oem_manufacturers:
            oem_upper = oem_mfr.upper()

            # Nađi grupu kojoj pripada
            for group_name, brands in self.MANUFACTURER_GROUPS.items():
                if oem_upper in brands:
                    # Dodaj sve brendove iz iste grupe
                    allowed_brands.update([b.upper() for b in brands])
                    break
            else:
                # Ako nije u grupi, dodaj samo tog proizvođača
                allowed_brands.add(oem_upper)

        return list(allowed_brands)

    # ===================================================================
    # GET OR CREATE FUNCTIONS
    # ===================================================================

    def get_or_create_brand(self, tecdoc_manufacturer_name: str, tecdoc_manufacturer_id: int) -> Optional[str]:
        """
        Pronađi ili kreiraj marku

        Returns: brand_id (tvoj Postgres ID)
        """
        # Normalize name
        normalized_name = self.normalize_brand_name(tecdoc_manufacturer_name)

        # Check cache
        cache_key = f"{tecdoc_manufacturer_id}_{normalized_name}"
        if cache_key in self.brand_cache:
            self.stats['brands_found'] += 1
            return self.brand_cache[cache_key]['id']

        cursor = self.postgres_conn.cursor()

        # Try to find by externalId
        query = """
            SELECT id FROM "VehicleBrand"
            WHERE "externalId" = %s
        """
        cursor.execute(query, (str(tecdoc_manufacturer_id),))
        result = cursor.fetchone()

        if result:
            brand_id = result[0]
            self.brand_cache[cache_key] = {'id': brand_id, 'externalId': str(tecdoc_manufacturer_id)}
            cursor.close()
            self.stats['brands_found'] += 1
            return brand_id

        # Try to find by name
        query = """
            SELECT id FROM "VehicleBrand"
            WHERE LOWER(name) = LOWER(%s)
        """
        cursor.execute(query, (normalized_name,))
        result = cursor.fetchone()

        if result:
            brand_id = result[0]

            # Update externalId if missing
            if not self.dry_run:
                update_query = """
                    UPDATE "VehicleBrand"
                    SET "externalId" = %s
                    WHERE id = %s AND "externalId" IS NULL
                """
                cursor.execute(update_query, (str(tecdoc_manufacturer_id), brand_id))
                self.postgres_conn.commit()

            self.brand_cache[cache_key] = {'id': brand_id, 'externalId': str(tecdoc_manufacturer_id)}
            cursor.close()
            self.stats['brands_found'] += 1
            return brand_id

        # Create new brand
        logging.info(f"  → Creating new brand: {normalized_name} (TecDoc ID: {tecdoc_manufacturer_id})")

        if self.dry_run:
            logging.info(f"    [DRY RUN] Would create brand: {normalized_name}")
            cursor.close()
            return None

        query = """
            INSERT INTO "VehicleBrand" (id, name, type, "externalId", source)
            VALUES (gen_random_uuid()::text, %s, 'PASSENGER', %s, 'tecdoc')
            RETURNING id
        """

        try:
            cursor.execute(query, (normalized_name, str(tecdoc_manufacturer_id)))
            brand_id = cursor.fetchone()[0]
            self.postgres_conn.commit()

            self.brand_cache[cache_key] = {'id': brand_id, 'externalId': str(tecdoc_manufacturer_id)}
            self.stats['brands_created'] += 1
            cursor.close()
            return brand_id

        except Exception as e:
            logging.error(f"    ERROR creating brand {normalized_name}: {str(e)}")
            self.postgres_conn.rollback()
            cursor.close()
            return None

    def get_or_create_model(self, brand_id: str, tecdoc_model_name: str, tecdoc_model_id: int) -> Optional[str]:
        """
        Pronađi ili kreiraj model

        Returns: model_id (tvoj Postgres ID)
        """
        # Check cache
        cache_key = f"{brand_id}_{tecdoc_model_id}"
        if cache_key in self.model_cache:
            self.stats['models_found'] += 1
            return self.model_cache[cache_key]['id']

        cursor = self.postgres_conn.cursor()

        # Try to find by externalId
        query = """
            SELECT id FROM "VehicleModel"
            WHERE "brandId" = %s AND "externalId" = %s
        """
        cursor.execute(query, (brand_id, str(tecdoc_model_id)))
        result = cursor.fetchone()

        if result:
            model_id = result[0]
            self.model_cache[cache_key] = {'id': model_id, 'externalId': str(tecdoc_model_id)}
            cursor.close()
            self.stats['models_found'] += 1
            return model_id

        # Try to find by name
        query = """
            SELECT id FROM "VehicleModel"
            WHERE "brandId" = %s AND LOWER(name) = LOWER(%s)
        """
        cursor.execute(query, (brand_id, tecdoc_model_name))
        result = cursor.fetchone()

        if result:
            model_id = result[0]

            # Update externalId if missing
            if not self.dry_run:
                update_query = """
                    UPDATE "VehicleModel"
                    SET "externalId" = %s
                    WHERE id = %s AND "externalId" IS NULL
                """
                cursor.execute(update_query, (str(tecdoc_model_id), model_id))
                self.postgres_conn.commit()

            self.model_cache[cache_key] = {'id': model_id, 'externalId': str(tecdoc_model_id)}
            cursor.close()
            self.stats['models_found'] += 1
            return model_id

        # Create new model
        logging.info(f"    → Creating new model: {tecdoc_model_name} (TecDoc ID: {tecdoc_model_id})")

        if self.dry_run:
            logging.info(f"      [DRY RUN] Would create model: {tecdoc_model_name}")
            cursor.close()
            return None

        query = """
            INSERT INTO "VehicleModel" (id, name, "brandId", "externalId")
            VALUES (gen_random_uuid()::text, %s, %s, %s)
            RETURNING id
        """

        try:
            cursor.execute(query, (tecdoc_model_name, brand_id, str(tecdoc_model_id)))
            model_id = cursor.fetchone()[0]
            self.postgres_conn.commit()

            self.model_cache[cache_key] = {'id': model_id, 'externalId': str(tecdoc_model_id)}
            self.stats['models_created'] += 1
            cursor.close()
            return model_id

        except Exception as e:
            logging.error(f"      ERROR creating model {tecdoc_model_name}: {str(e)}")
            self.postgres_conn.rollback()
            cursor.close()
            return None

    def get_or_create_generation(
        self,
        model_id: str,
        tecdoc_vehicle_name: str,
        tecdoc_vehicle_id: int,
        year_from: Optional[int],
        year_to: Optional[int]
    ) -> Optional[str]:
        """
        Pronađi ili kreiraj generaciju

        Returns: generation_id (tvoj Postgres ID)
        """
        # Check cache
        cache_key = f"{model_id}_{tecdoc_vehicle_id}"
        if cache_key in self.generation_cache:
            self.stats['generations_found'] += 1
            return self.generation_cache[cache_key]['id']

        cursor = self.postgres_conn.cursor()

        # Try to find by externalId
        query = """
            SELECT id FROM "VehicleGeneration"
            WHERE "modelId" = %s AND "externalId" = %s
        """
        cursor.execute(query, (model_id, str(tecdoc_vehicle_id)))
        result = cursor.fetchone()

        if result:
            generation_id = result[0]
            self.generation_cache[cache_key] = {'id': generation_id, 'externalId': str(tecdoc_vehicle_id)}
            cursor.close()
            self.stats['generations_found'] += 1
            return generation_id

        # Try to find by name
        query = """
            SELECT id FROM "VehicleGeneration"
            WHERE "modelId" = %s AND LOWER(name) = LOWER(%s)
        """
        cursor.execute(query, (model_id, tecdoc_vehicle_name))
        result = cursor.fetchone()

        if result:
            generation_id = result[0]

            # Update externalId if missing
            if not self.dry_run:
                update_query = """
                    UPDATE "VehicleGeneration"
                    SET "externalId" = %s
                    WHERE id = %s AND "externalId" IS NULL
                """
                cursor.execute(update_query, (str(tecdoc_vehicle_id), generation_id))
                self.postgres_conn.commit()

            self.generation_cache[cache_key] = {'id': generation_id, 'externalId': str(tecdoc_vehicle_id)}
            cursor.close()
            self.stats['generations_found'] += 1
            return generation_id

        # Create new generation
        logging.info(f"      → Creating new generation: {tecdoc_vehicle_name} (TecDoc ID: {tecdoc_vehicle_id})")

        if self.dry_run:
            logging.info(f"        [DRY RUN] Would create generation: {tecdoc_vehicle_name}")
            cursor.close()
            return None

        # Build production period string
        production_start = f"{year_from}-01-01" if year_from else None
        production_end = f"{year_to}-12-31" if year_to else None

        query = """
            INSERT INTO "VehicleGeneration" (
                id, "modelId", name, "externalId",
                "productionStart", "productionEnd",
                "createdAt", "updatedAt"
            )
            VALUES (
                gen_random_uuid()::text, %s, %s, %s,
                %s::timestamp, %s::timestamp,
                NOW(), NOW()
            )
            RETURNING id
        """

        try:
            cursor.execute(query, (
                model_id,
                tecdoc_vehicle_name,
                str(tecdoc_vehicle_id),
                production_start,
                production_end
            ))
            generation_id = cursor.fetchone()[0]
            self.postgres_conn.commit()

            self.generation_cache[cache_key] = {'id': generation_id, 'externalId': str(tecdoc_vehicle_id)}
            self.stats['generations_created'] += 1
            cursor.close()
            return generation_id

        except Exception as e:
            logging.error(f"        ERROR creating generation {tecdoc_vehicle_name}: {str(e)}")
            self.postgres_conn.rollback()
            cursor.close()
            return None

    def get_or_create_engine(
        self,
        generation_id: str,
        tecdoc_engine_desc: str,
        tecdoc_engine_id: int,
        engine_type: Optional[str] = None
    ) -> Optional[str]:
        """
        Pronađi ili kreiraj motor

        Returns: engine_id (tvoj Postgres ID)
        """
        if not tecdoc_engine_desc or not tecdoc_engine_id:
            return None

        # Check cache
        cache_key = f"{generation_id}_{tecdoc_engine_id}"
        if cache_key in self.engine_cache:
            self.stats['engines_found'] += 1
            return self.engine_cache[cache_key]['id']

        cursor = self.postgres_conn.cursor()

        # Try to find by externalId
        query = """
            SELECT id FROM "VehicleEngine"
            WHERE "generationId" = %s AND "externalId" = %s
        """
        cursor.execute(query, (generation_id, str(tecdoc_engine_id)))
        result = cursor.fetchone()

        if result:
            engine_id = result[0]
            self.engine_cache[cache_key] = {'id': engine_id, 'externalId': str(tecdoc_engine_id)}
            cursor.close()
            self.stats['engines_found'] += 1
            return engine_id

        # Try to find by engineType
        query = """
            SELECT id FROM "VehicleEngine"
            WHERE "generationId" = %s AND LOWER("engineType") = LOWER(%s)
        """
        cursor.execute(query, (generation_id, tecdoc_engine_desc))
        result = cursor.fetchone()

        if result:
            engine_id = result[0]

            # Update externalId if missing
            if not self.dry_run:
                update_query = """
                    UPDATE "VehicleEngine"
                    SET "externalId" = %s
                    WHERE id = %s AND "externalId" IS NULL
                """
                cursor.execute(update_query, (str(tecdoc_engine_id), engine_id))
                self.postgres_conn.commit()

            self.engine_cache[cache_key] = {'id': engine_id, 'externalId': str(tecdoc_engine_id)}
            cursor.close()
            self.stats['engines_found'] += 1
            return engine_id

        # Create new engine
        logging.info(f"        → Creating new engine: {tecdoc_engine_desc} (TecDoc ID: {tecdoc_engine_id})")

        if self.dry_run:
            logging.info(f"          [DRY RUN] Would create engine: {tecdoc_engine_desc}")
            cursor.close()
            return None

        query = """
            INSERT INTO "VehicleEngine" (
                id, "generationId", "engineType", "externalId", source,
                "createdAt", "updatedAt"
            )
            VALUES (
                gen_random_uuid()::text, %s, %s, %s, 'tecdoc',
                NOW(), NOW()
            )
            RETURNING id
        """

        try:
            cursor.execute(query, (generation_id, tecdoc_engine_desc, str(tecdoc_engine_id)))
            engine_id = cursor.fetchone()[0]
            self.postgres_conn.commit()

            self.engine_cache[cache_key] = {'id': engine_id, 'externalId': str(tecdoc_engine_id)}
            self.stats['engines_created'] += 1
            cursor.close()
            return engine_id

        except Exception as e:
            logging.error(f"          ERROR creating engine {tecdoc_engine_desc}: {str(e)}")
            self.postgres_conn.rollback()
            cursor.close()
            return None

    # ===================================================================
    # VEHICLE EXTRACTION FROM TECDOC
    # ===================================================================

    def get_vehicles_from_tecdoc(self, tecdoc_article_id: int, limit: int = 200, allowed_brands: List[str] = None) -> List[Dict]:
        """
        Izvuci vozila iz TecDoc-a za dati article_id

        Koristi tree_node_products (KOREKTNO!)

        Args:
            tecdoc_article_id: TecDoc article ID
            limit: Max broj vozila
            allowed_brands: Optional lista dozvoljenih marki (primjenjuje se PRE LIMIT-a!)
        """
        cursor = self.tecdoc_conn.cursor()

        # Prvo dohvati product_id
        query = "SELECT CurrentProduct FROM articles WHERE id = %s"
        cursor.execute(query, (tecdoc_article_id,))
        result = cursor.fetchone()

        if not result or not result[0]:
            cursor.close()
            return []

        product_id = result[0]

        # Build WHERE clause for manufacturer filtering
        manufacturer_filter = ""
        query_params = [product_id]

        if allowed_brands:
            placeholders = ', '.join(['%s'] * len(allowed_brands))
            manufacturer_filter = f" AND mf.Description IN ({placeholders})"
            query_params.extend(allowed_brands)

        query_params.append(limit)

        # Izvuci vozila preko tree_node_products
        # STROGI MOD: Zahtijeva engine_id za veću specifičnost
        query = f"""
            SELECT DISTINCT
                mf.Description as manufacturer_name,
                mf.id as manufacturer_id,
                m.Description as model_name,
                m.id as model_id,
                pc.Description as vehicle_name,
                pc.internalID as vehicle_internal_id,
                YEAR(pc.From) as year_from,
                YEAR(pc.To) as year_to,
                e.Description as engine_desc,
                e.id as engine_id
            FROM tree_node_products tnp
            JOIN passengercars pc ON tnp.itemId = pc.internalID AND tnp.tree_id = 1
            JOIN models m ON pc.Model = m.id
            JOIN manufacturers mf ON m.ManufacturerId = mf.id
            JOIN passengercars_link_engines ple ON pc.id = ple.car_id
            JOIN engines e ON ple.engine_id = e.id
            WHERE tnp.product_id = %s
              AND tnp.valid_state = 1
              AND e.id IS NOT NULL
              {manufacturer_filter}
            ORDER BY mf.Description, m.Description, year_from, e.Description
            LIMIT %s
        """

        cursor.execute(query, tuple(query_params))

        vehicles = []
        for row in cursor.fetchall():
            vehicles.append({
                'manufacturer_name': row[0],
                'manufacturer_id': row[1],
                'model_name': row[2],
                'model_id': row[3],
                'vehicle_name': row[4],
                'vehicle_internal_id': row[5],
                'year_from': row[6],
                'year_to': row[7],
                'engine_desc': row[8],
                'engine_id': row[9]
            })

        cursor.close()
        return vehicles

    # ===================================================================
    # VALIDATION
    # ===================================================================

    def validate_vehicle_count(self, vehicles: List[Dict], product_name: str) -> bool:
        """
        Validacija: Da li ima previše vozila?

        Provjera:
        1. Total vehicle count
        2. Number of different brands
        3. Number of different models
        4. Number of different generations

        Returns: True ako je OK, False ako treba preskočiti
        """
        vehicle_count = len(vehicles)

        if vehicle_count == 0:
            logging.warning(f"  ⚠️  No vehicles found")
            return False

        # Count unique entities
        unique_manufacturers = len(set(v['manufacturer_name'] for v in vehicles))
        unique_models = len(set((v['manufacturer_name'], v['model_name']) for v in vehicles))
        unique_generations = len(set(v['vehicle_internal_id'] for v in vehicles))

        # Check engines per generation
        from collections import defaultdict
        engines_per_gen = defaultdict(set)
        for v in vehicles:
            if v.get('engine_id'):
                engines_per_gen[v['vehicle_internal_id']].add(v['engine_id'])

        max_engines_in_gen = max(len(engines) for engines in engines_per_gen.values()) if engines_per_gen else 0

        # Log summary
        logging.info(f"  📊 Summary: {vehicle_count} vehicles, {unique_generations} gen, {unique_models} models, {unique_manufacturers} brands (max {max_engines_in_gen} engines/gen)")

        # Validation 1: Too many total vehicles
        if vehicle_count > self.MAX_VEHICLES_PER_PRODUCT:
            logging.warning(f"  ⚠️  TOO MANY vehicles ({vehicle_count} > {self.MAX_VEHICLES_PER_PRODUCT})! SKIPPING.")
            self.stats['fitments_skipped_too_many'] += 1
            return False

        # Validation 2: Too many brands
        if unique_manufacturers > self.MAX_BRANDS:
            logging.warning(f"  ⚠️  TOO MANY brands ({unique_manufacturers} > {self.MAX_BRANDS})! SKIPPING.")
            self.stats['fitments_skipped_universal'] += 1
            return False

        # Validation 3: Too many different models
        if unique_models > self.MAX_MODELS:
            logging.warning(f"  ⚠️  TOO MANY models ({unique_models} > {self.MAX_MODELS})! SKIPPING.")
            self.stats['fitments_skipped_universal'] += 1
            return False

        # Validation 4: Too many different generations
        if unique_generations > self.MAX_GENERATIONS:
            logging.warning(f"  ⚠️  TOO MANY generations ({unique_generations} > {self.MAX_GENERATIONS})! SKIPPING.")
            self.stats['fitments_skipped_universal'] += 1
            return False

        # Validation 5: Too many engines per generation (NOVO!)
        if max_engines_in_gen > self.MAX_ENGINES_PER_GENERATION:
            logging.warning(f"  ⚠️  TOO MANY engine variants per generation ({max_engines_in_gen} > {self.MAX_ENGINES_PER_GENERATION})! SKIPPING.")
            self.stats['fitments_skipped_universal'] += 1
            return False

        # Show top generations
        from collections import Counter
        generation_counts = Counter()
        for v in vehicles:
            gen_key = f"{v['manufacturer_name']} {v['model_name']} {v['vehicle_name']}"
            generation_counts[gen_key] += 1

        logging.info(f"  📋 Top generations:")
        for gen, count in generation_counts.most_common(5):
            logging.info(f"     - {gen}: {count} variants")

        if len(generation_counts) > 5:
            logging.info(f"     ... and {len(generation_counts) - 5} more generations")

        logging.info(f"  ✅ Validation PASSED")
        return True

    # ===================================================================
    # FITMENT CREATION
    # ===================================================================

    def upsert_vehicle_fitments(self, product_id: str, vehicles: List[Dict]):
        """
        Kreiraj/update ProductVehicleFitment zapise

        Logika:
        - Ako ima engine_id → linkuj sa engine
        - Ako nema engine_id → linkuj samo sa generation
        """
        cursor = self.postgres_conn.cursor()

        # Group vehicles by generation (to avoid duplicates)
        generation_groups = {}
        for vehicle in vehicles:
            key = (
                vehicle['manufacturer_name'],
                vehicle['model_name'],
                vehicle['vehicle_internal_id']
            )

            if key not in generation_groups:
                generation_groups[key] = {
                    'vehicle': vehicle,
                    'engines': []
                }

            if vehicle['engine_id']:
                generation_groups[key]['engines'].append(vehicle)

        # Process each generation
        for key, data in generation_groups.items():
            vehicle = data['vehicle']

            # 1. Get/Create Brand
            brand_id = self.get_or_create_brand(
                vehicle['manufacturer_name'],
                vehicle['manufacturer_id']
            )

            if not brand_id:
                continue

            # 2. Get/Create Model
            model_id = self.get_or_create_model(
                brand_id,
                vehicle['model_name'],
                vehicle['model_id']
            )

            if not model_id:
                continue

            # 3. Get/Create Generation
            generation_id = self.get_or_create_generation(
                model_id,
                vehicle['vehicle_name'],
                vehicle['vehicle_internal_id'],
                vehicle['year_from'],
                vehicle['year_to']
            )

            if not generation_id:
                continue

            # 4. Linkuj sa generacijom (bez motora ako nema)
            if not data['engines']:
                # Nema motora → linkuj samo sa generacijom
                self._create_fitment(product_id, generation_id, None, vehicle)
            else:
                # Ima motore → linkuj sa svakim motorom
                for engine_data in data['engines']:
                    engine_id = self.get_or_create_engine(
                        generation_id,
                        engine_data['engine_desc'],
                        engine_data['engine_id']
                    )

                    if engine_id:
                        self._create_fitment(product_id, generation_id, engine_id, vehicle)
                    else:
                        # Ako nije kreiran motor, linkuj samo sa generacijom
                        self._create_fitment(product_id, generation_id, None, vehicle)

        cursor.close()

    def _create_fitment(
        self,
        product_id: str,
        generation_id: str,
        engine_id: Optional[str],
        vehicle_data: Dict
    ):
        """
        Kreiraj jedan ProductVehicleFitment zapis
        """
        if self.dry_run:
            engine_info = f" + Engine: {vehicle_data.get('engine_desc')}" if engine_id else ""
            logging.info(
                f"          [DRY RUN] Would link: "
                f"{vehicle_data['manufacturer_name']} {vehicle_data['model_name']} "
                f"{vehicle_data['vehicle_name']}{engine_info}"
            )
            return

        cursor = self.postgres_conn.cursor()

        # Upsert (insert or update)
        if engine_id:
            # Sa motorom
            query = """
                INSERT INTO "ProductVehicleFitment" (
                    id, "productId", "generationId", "engineId",
                    "yearFrom", "yearTo", "isUniversal",
                    "externalVehicleId", "createdAt", "updatedAt"
                )
                VALUES (
                    gen_random_uuid()::text, %s, %s, %s,
                    %s, %s, FALSE,
                    %s, NOW(), NOW()
                )
                ON CONFLICT ("productId", "generationId", "engineId")
                DO UPDATE SET "updatedAt" = NOW()
            """

            cursor.execute(query, (
                product_id,
                generation_id,
                engine_id,
                vehicle_data['year_from'],
                vehicle_data['year_to'],
                str(vehicle_data['vehicle_internal_id'])
            ))
        else:
            # Bez motora
            query = """
                INSERT INTO "ProductVehicleFitment" (
                    id, "productId", "generationId",
                    "yearFrom", "yearTo", "isUniversal",
                    "externalVehicleId", "createdAt", "updatedAt"
                )
                VALUES (
                    gen_random_uuid()::text, %s, %s,
                    %s, %s, FALSE,
                    %s, NOW(), NOW()
                )
                ON CONFLICT ("productId", "generationId", "engineId")
                DO NOTHING
            """

            cursor.execute(query, (
                product_id,
                generation_id,
                vehicle_data['year_from'],
                vehicle_data['year_to'],
                str(vehicle_data['vehicle_internal_id'])
            ))

        self.postgres_conn.commit()
        self.stats['fitments_created'] += 1
        cursor.close()

    # ===================================================================
    # CLEANUP
    # ===================================================================

    def cleanup_existing_fitments(self, product_id: str):
        """
        Obriši postojeće fitmente za proizvod
        """
        if self.dry_run:
            logging.info(f"  [DRY RUN] Would delete existing fitments for product")
            return

        cursor = self.postgres_conn.cursor()

        query = """
            DELETE FROM "ProductVehicleFitment"
            WHERE "productId" = %s
        """

        cursor.execute(query, (product_id,))
        deleted_count = cursor.rowcount
        self.postgres_conn.commit()
        cursor.close()

        if deleted_count > 0:
            logging.info(f"  🗑️  Deleted {deleted_count} existing fitments")

    # ===================================================================
    # MAIN PROCESSING
    # ===================================================================

    def process_product(self, product: Dict, cleanup: bool = False):
        """
        Procesira jedan proizvod - linkuje vozila
        """
        product_id = product['id']
        catalog = product['catalogNumber']
        name = product['name']
        tecdoc_article_id = product.get('tecdocArticleId')

        if not tecdoc_article_id:
            logging.warning(f"[{catalog}] No tecdocArticleId, skipping")
            return

        logging.info(f"\n{'='*70}")
        logging.info(f"Processing: [{catalog}] {name}")
        logging.info(f"TecDoc Article ID: {tecdoc_article_id}")

        try:
            # 1. Cleanup existing fitments if requested
            if cleanup:
                self.cleanup_existing_fitments(product_id)

            # 2. Get OEM manufacturers and allowed brands (BEFORE getting vehicles!)
            oem_manufacturers = self.get_oem_manufacturers(product_id)
            allowed_brands = None

            if oem_manufacturers:
                allowed_brands = self.get_allowed_vehicle_brands(oem_manufacturers)
                logging.info(f"  → OEM Manufacturers: {', '.join(oem_manufacturers)}")
                logging.info(f"  → Allowed vehicle brands: {', '.join(allowed_brands[:5])}{'...' if len(allowed_brands) > 5 else ''}")

            # 3. Get vehicles from TecDoc (sa OEM filteringom u SQL upitu!)
            vehicles = self.get_vehicles_from_tecdoc(tecdoc_article_id, allowed_brands=allowed_brands)

            if not vehicles:
                if allowed_brands:
                    logging.warning(f"  ⚠️  No vehicles found matching allowed brands")
                else:
                    logging.warning(f"  ⚠️  No vehicles found in TecDoc")
                return

            # Log kako je filtering prosao
            if allowed_brands:
                logging.info(f"  ✅ Found {len(vehicles)} vehicles matching OEM brands")

            # 3. Validate vehicle count
            if not self.validate_vehicle_count(vehicles, name):
                return

            # 4. Create fitments
            logging.info(f"  → Linking {len(vehicles)} vehicles...")
            self.upsert_vehicle_fitments(product_id, vehicles)

            self.stats['products_processed'] += 1
            logging.info(f"  ✅ SUCCESS")

        except Exception as e:
            logging.error(f"  ❌ ERROR: {str(e)}")
            self.stats['errors'] += 1
            import traceback
            traceback.print_exc()

    def run_batch(
        self,
        limit: int = 50,
        offset: int = 0,
        cleanup: bool = False,
        filter_mode: str = 'has_tecdoc'
    ):
        """
        Pokreni batch processing

        Args:
            limit: Broj proizvoda za procesirati
            offset: Offset
            cleanup: Da li obrisati postojeće fitmente prije linkovanja
            filter_mode:
                - 'has_tecdoc': Samo proizvodi sa tecdocArticleId
                - 'no_fitments': Proizvodi sa tecdocArticleId ali bez fitmenata
                - 'has_fitments': Proizvodi koji već imaju fitmente (re-link)
        """
        cursor = self.postgres_conn.cursor()

        # Build query based on filter
        where_clause = 'WHERE "tecdocArticleId" IS NOT NULL'

        if filter_mode == 'no_fitments':
            where_clause += """ AND NOT EXISTS (
                SELECT 1 FROM "ProductVehicleFitment" pvf
                WHERE pvf."productId" = "Product".id
            )"""
        elif filter_mode == 'has_fitments':
            where_clause += """ AND EXISTS (
                SELECT 1 FROM "ProductVehicleFitment" pvf
                WHERE pvf."productId" = "Product".id
            )"""

        query = f"""
            SELECT
                id,
                name,
                "catalogNumber",
                "tecdocArticleId"
            FROM "Product"
            {where_clause}
            ORDER BY "updatedAt" ASC
            LIMIT %s OFFSET %s
        """

        cursor.execute(query, (limit, offset))

        products = []
        for row in cursor.fetchall():
            products.append({
                'id': row[0],
                'name': row[1],
                'catalogNumber': row[2],
                'tecdocArticleId': row[3]
            })

        cursor.close()

        total = len(products)
        mode = "DRY RUN" if self.dry_run else "LIVE"
        cleanup_mode = "WITH CLEANUP" if cleanup else "NO CLEANUP"

        logging.info(f"\n{'='*70}")
        logging.info(f"BATCH START [{mode}] [{cleanup_mode}]")
        logging.info(f"Filter: {filter_mode}")
        logging.info(f"Products: {total}")
        logging.info(f"Max vehicles per product: {self.MAX_VEHICLES_PER_PRODUCT}")
        logging.info(f"{'='*70}\n")

        # Process each product
        for i, product in enumerate(products, 1):
            logging.info(f"\n[{i}/{total}] Progress: {(i/total*100):.1f}%")
            self.process_product(product, cleanup=cleanup)

        # Final stats
        logging.info(f"\n{'='*70}")
        logging.info(f"BATCH COMPLETED [{mode}]")
        logging.info(f"{'='*70}")
        logging.info(json.dumps(self.stats, indent=2))
        logging.info(f"{'='*70}\n")

    def close(self):
        """Zatvori konekcije"""
        self.tecdoc_conn.close()
        self.postgres_conn.close()


# ===================================================================
# MAIN EXECUTION
# ===================================================================

if __name__ == "__main__":
    # ===================================================================
    # KONFIGURACIJA
    # ===================================================================

    DRY_RUN = True  # ← Promijeni na False za stvarni update!
    CLEANUP = False  # ← Obriši postojeće fitmente prije linkovanja?
    LIMIT = 20  # Broj proizvoda
    FILTER = 'has_tecdoc'  # 'has_tecdoc', 'no_fitments', 'has_fitments'

    # ===================================================================
    # POKRETANJE
    # ===================================================================

    linker = SmartVehicleLinker(dry_run=DRY_RUN)

    try:
        logging.info(f"""
        ╔═══════════════════════════════════════════════════════════╗
        ║   TecDoc Smart Vehicle Linking                           ║
        ║   Mode: {"DRY RUN (no changes)" if DRY_RUN else "LIVE (updating database)"}                           ║
        ║   Cleanup: {"YES (deleting existing)" if CLEANUP else "NO (keeping existing)"}                        ║
        ║   Max vehicles: {linker.MAX_VEHICLES_PER_PRODUCT}                                       ║
        ╚═══════════════════════════════════════════════════════════╝
        """)

        linker.run_batch(
            limit=LIMIT,
            offset=0,
            cleanup=CLEANUP,
            filter_mode=FILTER
        )

    except Exception as e:
        logging.error(f"FATAL ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        linker.close()
        logging.info("Connections closed.")
