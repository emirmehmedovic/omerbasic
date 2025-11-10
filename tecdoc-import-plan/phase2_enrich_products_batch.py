"""
FAZA 2 - Batch Obogaćivanje Proizvoda
======================================
Obogaćuje proizvode sa TecDoc podacima u batch-evima od 50
Nastavlja gdje je stalo ako se prekine
"""

import psycopg2
import mysql.connector
import json
import logging

# Setup logging
from datetime import datetime
import time

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f'phase2_batch_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'),
        logging.StreamHandler()
    ]
)

class TecDocEnricherBatch:
    def __init__(self, tecdoc_host="localhost", tecdoc_port=3306):
        """
        Inicijalizacija konekcija
        
        Args:
            tecdoc_host: TecDoc MySQL host (default: localhost)
            tecdoc_port: TecDoc MySQL port (default: 3306, koristi 3307 za SSH tunel)
        """
        
        # TecDoc MySQL
        logging.info(f"Connecting to TecDoc MySQL at {tecdoc_host}:{tecdoc_port}")
        self.tecdoc_conn = mysql.connector.connect(
            host=tecdoc_host,
            port=tecdoc_port,
            user="root",
            password="",
            database="tecdoc1q2019",
            connect_timeout=300
        )
        
        # Postgres (Production VPS - localhost jer skripta radi na VPS-u)
        logging.info("Connecting to Production PostgreSQL at localhost:5432")
        self.prod_conn = psycopg2.connect(
            "postgresql://emiir:emirMehmedovic123456789omerbasic@localhost:5432/omerbasicdb",
            connect_timeout=300
        )
        
        # Statistika
        self.stats = {
            'total_processed': 0,
            'with_category': 0,
            'with_attributes': 0,
            'with_cross_refs': 0,
            'with_vehicles': 0,
            'with_manufacturer': 0,
            'with_oe_numbers': 0,
            'errors': 0
        }
        
        logging.info("✅ Database connections established")
    
    def get_products_batch(self, batch_size=50, offset=0):
        """Učitaj batch proizvoda sa tecdocArticleId"""
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
            LIMIT %s OFFSET %s
        """
        
        cursor.execute(query, (batch_size, offset))
        products = cursor.fetchall()
        cursor.close()
        
        return products
    
    def get_last_processed_offset(self):
        """Pronađi gdje smo stali (zadnji obrađeni proizvod)"""
        cursor = self.prod_conn.cursor()
        
        # Provjeravamo koji proizvodi imaju technicalSpecs (znak da su obrađeni)
        query = """
            SELECT COUNT(*)
            FROM "Product"
            WHERE "tecdocArticleId" IS NOT NULL
            AND "technicalSpecs" IS NOT NULL
        """
        
        cursor.execute(query)
        result = cursor.fetchone()
        cursor.close()
        
        return result[0] if result else 0
    
    def get_one_product(self):
        """Učitaj prvi proizvod sa tecdocArticleId"""
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
            LIMIT 1
        """
        
        cursor.execute(query)
        product = cursor.fetchone()
        cursor.close()
        
        return product
    
    def get_root_category(self, article_id: int):
        """Pronađi root kategoriju preko search_trees"""
        cursor = self.tecdoc_conn.cursor()
        
        # 1. Pronađi Product ID
        query = """
            SELECT CurrentProduct
            FROM articles
            WHERE id = %s
            LIMIT 1
        """
        
        cursor.execute(query, (article_id,))
        result = cursor.fetchone()
        
        if not result or not result[0]:
            cursor.close()
            return None
        
        product_id = result[0]
        
        # 2. Pronađi Product Description
        query = """
            SELECT Description
            FROM products
            WHERE ID = %s
            LIMIT 1
        """
        
        cursor.execute(query, (product_id,))
        result = cursor.fetchone()
        
        if not result:
            cursor.close()
            return None
        
        product_description = result[0]
        
        # 3. Pronađi search_trees čvor (putnička vozila = tree_id 1)
        query = """
            SELECT node_id, Description, parent_node_id
            FROM search_trees
            WHERE tree_id = 1
            AND parent_node_id > 0
            AND %s LIKE CONCAT('%%', Description, '%%')
            ORDER BY LENGTH(Description) DESC
            LIMIT 1
        """
        
        cursor.execute(query, (product_description,))
        result = cursor.fetchone()
        
        if not result:
            cursor.close()
            return None
        
        node_id, node_description, parent_node_id = result
        
        # 4. Pronađi root kategoriju (parent_node_id = 0)
        parent_chain = []
        current_parent = parent_node_id
        
        while current_parent and current_parent > 0:
            parent_query = """
                SELECT node_id, Description, parent_node_id
                FROM search_trees
                WHERE node_id = %s
                AND tree_id = 1
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
            'id': node_id,
            'name': node_description,
            'product_id': product_id,
            'product_description': product_description,
            'root_category': parent_chain[-1] if parent_chain else {'id': node_id, 'name': node_description},
            'parent_chain': parent_chain
        }
    
    def get_attributes(self, article_id: int):
        """Pronađi atribute"""
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
    
    def get_cross_references(self, article_id: int):
        """Pronađi zamjenske proizvode preko OE brojeva"""
        cursor = self.tecdoc_conn.cursor()
        
        # Pronađi sve artikle sa istim OE brojevima
        query = """
            SELECT
                a.id as article_id,
                a.DataSupplierArticleNumber as article_number,
                s.Description as supplier
            FROM articles a
            LEFT JOIN suppliers s ON s.id = a.Supplier
            LEFT JOIN article_oe_numbers aon ON aon.article_id = a.id
            WHERE aon.OENbr IN (
                SELECT DISTINCT OENbr 
                FROM article_oe_numbers 
                WHERE article_id = %s
            )
            AND a.id != %s
            ORDER BY s.Description
            LIMIT 20
        """
        
        cursor.execute(query, (article_id, article_id))
        results = cursor.fetchall()
        cursor.close()
        
        cross_refs = []
        for article_id_ref, article_number, supplier in results:
            cross_refs.append({
                'article_id': article_id_ref,
                'article_number': article_number,
                'supplier': supplier,
                'type': 'OE_match'
            })
        
        return cross_refs
    
    def has_specific_engines(self, article_id: int):
        """
        Detektujem da li artikal ima specifične motore
        - True: Ako OE brojevi vode do passengercars sa engine linkovima
        - False: Ako nema engine linkova (universal)
        
        Razlika: Motor-specific ima MALI broj passengercars sa engine linkovima
                 Universal ima VELIKI broj passengercars BEZ engine specifičnosti
        """
        tecdoc_cursor = self.tecdoc_conn.cursor()

        # Provjerimo da li postoje engine linkovi za passengercars ovog artikla
        query = """
            SELECT COUNT(DISTINCT ple.engine_id)
            FROM article_oe_numbers aon
            JOIN passengercars pc ON pc.ManufacturerId = aon.Manufacturer
            JOIN passengercars_link_engines ple ON ple.car_id = pc.id
            WHERE aon.article_id = %s
            LIMIT 1
        """

        tecdoc_cursor.execute(query, (article_id,))
        result = tecdoc_cursor.fetchone()
        engine_count = result[0] if result else 0
        
        # Provjerimo ukupan broj passengercars (bez engine filtera)
        query2 = """
            SELECT COUNT(DISTINCT pc.id)
            FROM article_oe_numbers aon
            JOIN passengercars pc ON pc.ManufacturerId = aon.Manufacturer
            WHERE aon.article_id = %s
            LIMIT 1
        """
        
        tecdoc_cursor.execute(query2, (article_id,))
        result2 = tecdoc_cursor.fetchone()
        total_count = result2[0] if result2 else 0
        
        tecdoc_cursor.close()

        # Ako ima engine linkove I nije previše universal (ratio > 0.1), onda je motor-specific
        if engine_count > 0 and total_count > 0:
            ratio = engine_count / total_count
            logging.info(f"   Engine detection: {engine_count} engines / {total_count} passengercars = {ratio:.2%}")
            return ratio > 0.1  # Ako više od 10% passengercars ima engine linkove
        
        logging.info(f"   Engine detection: {engine_count} engines / {total_count} passengercars")
        return False

    def get_compatible_vehicles_with_engines(self, article_id: int):
        """
        Pronađi kompatibilna vozila sa SPECIFIČNIM motorima
        Koristi passengercars_link_engines
        """
        tecdoc_cursor = self.tecdoc_conn.cursor()

        # QUERY sa engine specifičnošću
        query = """
            SELECT DISTINCT
                pc.id as passengercars_id,
                mo.Description as model_name,
                pc.Description as motor_description,
                e.Description as engine_code,
                m.Description as manufacturer_name
            FROM article_oe_numbers aon
            LEFT JOIN passengercars pc ON pc.ManufacturerId = aon.Manufacturer
            LEFT JOIN passengercars_link_engines ple ON ple.car_id = pc.id
            LEFT JOIN engines e ON e.id = ple.engine_id
            LEFT JOIN models mo ON mo.id = pc.Model
            LEFT JOIN manufacturers m ON m.id = pc.ManufacturerId
            WHERE aon.article_id = %s
            AND m.id = aon.Manufacturer
            AND ple.engine_id IS NOT NULL
            LIMIT 500
        """

        tecdoc_cursor.execute(query, (article_id,))
        results = tecdoc_cursor.fetchall()
        tecdoc_cursor.close()

        if not results:
            logging.info(f"   No results from TecDoc passengercars_link_engines query")
            return []

        logging.info(f"   Found {len(results)} passengercars with engines from TecDoc")

        # Ekstrakuj passengercars IDs (bez limita!)
        all_passengercars_ids = list(set([r[0] for r in results]))
        logging.info(f"   Unique passengercars IDs: {len(all_passengercars_ids)}")
        logging.info(f"   Sample IDs: {all_passengercars_ids[:5]}")

        # Mapiranje na našu bazu preko VehicleGeneration.externalId = passengercars.id
        prod_cursor = self.prod_conn.cursor()
        
        placeholders = ','.join(['%s'] * len(all_passengercars_ids))
        
        query = f"""
            SELECT DISTINCT
                vb.name as brand,
                vm.name as model,
                vg.name as generation,
                ve."engineCode" as engine_code,
                vg."externalId" as tecdoc_passengercars_id,
                vg.id as generation_id
            FROM "VehicleGeneration" vg
            JOIN "VehicleModel" vm ON vm.id = vg."modelId"
            JOIN "VehicleBrand" vb ON vb.id = vm."brandId"
            LEFT JOIN "VehicleEngine" ve ON ve."generationId" = vg.id
            WHERE vg."externalId" IN ({placeholders})
        """
        
        prod_cursor.execute(query, tuple(map(str, all_passengercars_ids)))
        results = prod_cursor.fetchall()
        
        logging.info(f"   Mapped to {len(results)} vehicles in our database")
        
        prod_cursor.close()

        vehicles = []
        for brand, model, generation, engine_code, tecdoc_id, generation_id in results:
            vehicles.append({
                'brand': brand,
                'model': model,
                'generation': generation,
                'generation_id': generation_id,
                'engine_code': engine_code,
                'tecdoc_passengercars_id': tecdoc_id,
                'has_engine': True
            })

        return vehicles

    def get_compatible_vehicles_by_model(self, article_id: int):
        """
        Pronađi kompatibilna vozila samo po MODELIMA (bez specifičnih motora)
        Za universal dijelove (License Plate Light, Bonnet Cap itd.)
        """
        tecdoc_cursor = self.tecdoc_conn.cursor()

        # QUERY bez engine filtriranja - samo modeli
        query = """
            SELECT DISTINCT
                m.id as manufacturer_id,
                m.Description as manufacturer_name,
                mo.id as model_id,
                mo.Description as model_name
            FROM article_oe_numbers aon
            LEFT JOIN manufacturers m ON m.id = aon.Manufacturer
            LEFT JOIN models mo ON mo.ManufacturerId = m.id
            WHERE aon.article_id = %s
            AND m.id = aon.Manufacturer
            LIMIT 500
        """

        tecdoc_cursor.execute(query, (article_id,))
        results = tecdoc_cursor.fetchall()
        tecdoc_cursor.close()

        if not results:
            return []

        # Mapiranje modela na naše vozile (bez motora)
        prod_cursor = self.prod_conn.cursor()

        vehicles = []

        for manufacturer_id, manufacturer_name, model_id, model_name in results:
            # Za svaki model, pronađi sve generacije
            query = """
                SELECT DISTINCT
                    vb.name as brand,
                    vm.name as model,
                    vg.name as generation,
                    vg.id as generation_id
                FROM "VehicleGeneration" vg
                JOIN "VehicleModel" vm ON vm.id = vg."modelId"
                JOIN "VehicleBrand" vb ON vb.id = vm."brandId"
                WHERE LOWER(vb.name) = LOWER(%s)
                AND LOWER(vm.name) = LOWER(%s)
                LIMIT 100
            """

            prod_cursor.execute(query, (manufacturer_name, model_name))
            generations = prod_cursor.fetchall()

            for brand, model, generation, generation_id in generations:
                vehicles.append({
                    'brand': brand,
                    'model': model,
                    'generation': generation,
                    'generation_id': generation_id,
                    'engine_code': None,  # Nema specifičnog motora
                    'has_engine': False
                })

        prod_cursor.close()
        return vehicles

    def get_compatible_vehicles(self, article_id: int):
        """
        Pronađi kompatibilna vozila - prvo pokušaj sa engine specifičnošću, pa fallback na modele
        """
        # Prvo pokušaj sa engine specifičnošću
        vehicles = self.get_compatible_vehicles_with_engines(article_id)
        
        if vehicles:
            logging.info(f"   ✅ Found {len(vehicles)} vehicles with engine specificity")
            return vehicles
        
        # Fallback: Pronađi samo po modelima (universal)
        logging.info(f"   ⚠️  No engine-specific vehicles, trying by model...")
        vehicles = self.get_compatible_vehicles_by_model(article_id)
        
        if vehicles:
            logging.info(f"   ✅ Found {len(vehicles)} vehicles by model (universal)")
        
        return vehicles
    
    def get_supplier(self, article_id: int):
        """Pronađi proizvođača"""
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
    
    def get_oe_numbers(self, article_id: int):
        """Pronađi OE brojeve za artikal"""
        cursor = self.tecdoc_conn.cursor()
        
        query = """
            SELECT DISTINCT
                aon.OENbr,
                aon.Manufacturer,
                m.Description as manufacturer_name
            FROM article_oe_numbers aon
            LEFT JOIN manufacturers m ON m.id = aon.Manufacturer
            WHERE aon.article_id = %s
            ORDER BY aon.OENbr
        """
        
        cursor.execute(query, (article_id,))
        results = cursor.fetchall()
        cursor.close()
        
        oe_numbers = []
        for oe_number, manufacturer_id, manufacturer_name in results:
            oe_numbers.append({
                'oe_number': oe_number,
                'manufacturer_id': manufacturer_id,
                'manufacturer_name': manufacturer_name
            })
        
        return oe_numbers
    
    def update_oe_number(self, product_id: str, oe_numbers: list):
        """
        Ažuriraj OEM broj u bazi
        - Ako je trenutni oemNumber NULL ili '0', upiši prvi OE broj
        - Ako ima više OE brojeva, spremi ih kao JSON array (opciono)
        """
        if not oe_numbers:
            return False
        
        cursor = self.prod_conn.cursor()
        
        # Provjeri trenutni oemNumber
        query = """
            SELECT "oemNumber"
            FROM "Product"
            WHERE id = %s
        """
        
        cursor.execute(query, (product_id,))
        result = cursor.fetchone()
        
        if not result:
            cursor.close()
            return False
        
        current_oem = result[0]
        
        # Ako je NULL, '0', ili prazan string, ažuriraj
        if not current_oem or current_oem in ['0', '00', '000', '']:
            # Uzmi prvi OE broj
            new_oem = oe_numbers[0]['oe_number']
            
            update_query = """
                UPDATE "Product"
                SET "oemNumber" = %s,
                    "updatedAt" = NOW()
                WHERE id = %s
            """
            
            cursor.execute(update_query, (new_oem, product_id))
            self.prod_conn.commit()
            cursor.close()
            
            logging.info(f"   ✅ Updated oemNumber: {new_oem}")
            return True
        else:
            logging.info(f"   ⏭️  oemNumber already set: {current_oem}")
            cursor.close()
            return False
    
    def get_or_create_manufacturer(self, supplier_id: int, supplier_name: str):
        """
        Pronađi ili kreiraj proizvođača u našoj bazi
        Returns: manufacturer_id ili None
        """
        cursor = self.prod_conn.cursor()
        
        # 1. Provjeri da li postoji po externalId
        query = """
            SELECT id
            FROM "Manufacturer"
            WHERE "externalId" = %s
            LIMIT 1
        """
        
        cursor.execute(query, (str(supplier_id),))
        result = cursor.fetchone()
        
        if result:
            cursor.close()
            return result[0]
        
        # 2. Provjeri da li postoji po imenu (case-insensitive)
        query = """
            SELECT id
            FROM "Manufacturer"
            WHERE LOWER(name) = LOWER(%s)
            LIMIT 1
        """
        
        cursor.execute(query, (supplier_name,))
        result = cursor.fetchone()
        
        if result:
            # Ažuriraj externalId
            update_query = """
                UPDATE "Manufacturer"
                SET "externalId" = %s,
                    "updatedAt" = NOW()
                WHERE id = %s
            """
            cursor.execute(update_query, (str(supplier_id), result[0]))
            self.prod_conn.commit()
            cursor.close()
            return result[0]
        
        # 3. Kreiraj novog proizvođača
        import secrets
        import string
        import re
        from datetime import datetime
        
        def generate_cuid():
            timestamp = str(int(datetime.now().timestamp() * 1000))[-10:]
            random_part = ''.join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(15))
            return f"c{timestamp}{random_part}"
        
        def slugify(text):
            """Kreiraj slug iz naziva"""
            text = text.lower()
            text = re.sub(r'[^a-z0-9]+', '-', text)
            text = text.strip('-')
            return text
        
        new_id = generate_cuid()
        slug = slugify(supplier_name)
        
        insert_query = """
            INSERT INTO "Manufacturer" (
                id,
                name,
                slug,
                "externalId",
                "createdAt",
                "updatedAt"
            ) VALUES (
                %s, %s, %s, %s, NOW(), NOW()
            )
            RETURNING id
        """
        
        cursor.execute(insert_query, (new_id, supplier_name, slug, str(supplier_id)))
        self.prod_conn.commit()
        cursor.close()
        
        logging.info(f"   ✅ Created new manufacturer: {supplier_name}")
        return new_id
    
    def update_manufacturer(self, product_id: str, supplier: dict):
        """
        Ažuriraj manufacturerId u proizvodu
        - Ako je NULL, upiši
        - Ako već postoji, preskači
        """
        if not supplier:
            return False
        
        cursor = self.prod_conn.cursor()
        
        # Provjeri trenutni manufacturerId
        query = """
            SELECT "manufacturerId"
            FROM "Product"
            WHERE id = %s
        """
        
        cursor.execute(query, (product_id,))
        result = cursor.fetchone()
        
        if not result:
            cursor.close()
            return False
        
        current_manufacturer_id = result[0]
        
        # Ako je NULL, ažuriraj
        if not current_manufacturer_id:
            # Pronađi ili kreiraj proizvođača
            manufacturer_id = self.get_or_create_manufacturer(supplier['id'], supplier['name'])
            
            if manufacturer_id:
                update_query = """
                    UPDATE "Product"
                    SET "manufacturerId" = %s,
                        "updatedAt" = NOW()
                    WHERE id = %s
                """
                
                cursor.execute(update_query, (manufacturer_id, product_id))
                self.prod_conn.commit()
                cursor.close()
                
                logging.info(f"   ✅ Updated manufacturerId: {supplier['name']}")
                return True
        else:
            logging.info(f"   ⏭️  manufacturerId already set")
            cursor.close()
            return False
    
    def update_category(self, product_id: str, tecdoc_root_node_id: int):
        """
        Ažuriraj categoryId u proizvodu na osnovu TecDoc root node ID-a
        - Pronađi kategoriju po externalId
        - Ažuriraj categoryId
        """
        cursor = self.prod_conn.cursor()
        
        # Pronađi kategoriju po externalId (TecDoc node_id)
        query = """
            SELECT id, name
            FROM "Category"
            WHERE "externalId" = %s
            LIMIT 1
        """
        
        cursor.execute(query, (str(tecdoc_root_node_id),))
        result = cursor.fetchone()
        
        if not result:
            logging.info(f"   ❌ Category with externalId {tecdoc_root_node_id} not found in database")
            cursor.close()
            return False
        
        category_id, category_name = result
        
        # Ažuriraj categoryId
        update_query = """
            UPDATE "Product"
            SET "categoryId" = %s,
                "updatedAt" = NOW()
            WHERE id = %s
        """
        
        cursor.execute(update_query, (category_id, product_id))
        self.prod_conn.commit()
        cursor.close()
        
        logging.info(f"   ✅ Updated categoryId: {category_name}")
        return True
    
    def create_vehicle_fitments(self, product_id: str, vehicles: list):
        """
        Kreiraj ProductVehicleFitment zapise za kompatibilna vozila
        """
        if not vehicles:
            return 0
        
        cursor = self.prod_conn.cursor()
        created_count = 0
        
        for vehicle in vehicles:
            brand = vehicle['brand']
            model = vehicle['model']
            generation = vehicle['generation']
            engine_code = vehicle.get('engine_code')
            
            # Pronađi VehicleGeneration ID, period i production dates
            query = """
                SELECT vg.id, vg."productionStart", vg."productionEnd", vg.period
                FROM "VehicleGeneration" vg
                JOIN "VehicleModel" vm ON vm.id = vg."modelId"
                JOIN "VehicleBrand" vb ON vb.id = vm."brandId"
                WHERE LOWER(vb.name) = LOWER(%s)
                AND LOWER(vm.name) = LOWER(%s)
                AND LOWER(vg.name) = LOWER(%s)
                LIMIT 1
            """
            
            cursor.execute(query, (brand, model, generation))
            result = cursor.fetchone()
            
            if not result:
                continue
            
            generation_id = result[0]
            production_start = result[1]  # Date or None
            production_end = result[2]    # Date or None
            period = result[3]            # String like "2009-2016" or None
            
            # Ekstraktuj godine iz datuma
            year_from = production_start.year if production_start else None
            year_to = production_end.year if production_end else None
            
            # Ako nema datuma, pokušaj parsirati iz generation.period (npr. "2009-2016")
            if not year_from and not year_to and period:
                # Parse "2009-2016" ili "2009-present"
                import re
                match = re.match(r'(\d{4})-(\d{4}|present|\?)', period)
                if match:
                    year_from = int(match.group(1))
                    year_to_str = match.group(2)
                    if year_to_str.isdigit():
                        year_to = int(year_to_str)
            
            # Pronađi VehicleEngine ID ako postoji engine_code
            engine_id = None
            if engine_code:
                engine_query = """
                    SELECT id FROM "VehicleEngine"
                    WHERE "generationId" = %s
                    AND "engineCode" = %s
                    LIMIT 1
                """
                cursor.execute(engine_query, (generation_id, engine_code))
                engine_result = cursor.fetchone()
                if engine_result:
                    engine_id = engine_result[0]
            
            # Provjeri da li već postoji
            check_query = """
                SELECT id FROM "ProductVehicleFitment"
                WHERE "productId" = %s AND "generationId" = %s
                LIMIT 1
            """
            
            cursor.execute(check_query, (product_id, generation_id))
            if cursor.fetchone():
                continue
            
            # Kreiraj ProductVehicleFitment
            import secrets
            import string
            from datetime import datetime
            
            def generate_cuid():
                timestamp = str(int(datetime.now().timestamp() * 1000))[-10:]
                random_part = ''.join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(15))
                return f"c{timestamp}{random_part}"
            
            new_id = generate_cuid()
            
            insert_query = """
                INSERT INTO "ProductVehicleFitment" (
                    id,
                    "productId",
                    "generationId",
                    "engineId",
                    "yearFrom",
                    "yearTo",
                    "createdAt",
                    "updatedAt"
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, NOW(), NOW()
                )
            """
            
            cursor.execute(insert_query, (new_id, product_id, generation_id, engine_id, year_from, year_to))
            self.prod_conn.commit()
            created_count += 1
        
        cursor.close()
        return created_count
    
    def save_attributes_to_technical_specs(self, product_id: str, attributes: list):
        """
        Spremi atribute u technicalSpecs JSON polje
        Format: {"Fitting Position": "Left and right", ...}
        """
        if not attributes:
            return False
        
        cursor = self.prod_conn.cursor()
        
        # Konvertuj atribute u dictionary
        tech_specs = {}
        for attr in attributes:
            tech_specs[attr['name']] = attr['value']
        
        # Ažuriraj technicalSpecs
        import json
        
        update_query = """
            UPDATE "Product"
            SET "technicalSpecs" = %s,
                "updatedAt" = NOW()
            WHERE id = %s
        """
        
        cursor.execute(update_query, (json.dumps(tech_specs), product_id))
        self.prod_conn.commit()
        cursor.close()
        
        logging.info(f"   ✅ Saved {len(attributes)} attribute(s) to technicalSpecs")
        return True
    
    def create_cross_references(self, product_id: str, cross_refs: list):
        """
        Kreiraj ProductCrossReference zapise samo za proizvode koje imamo u bazi
        - Provjeri da li replacement proizvod postoji u našoj bazi (po catalogNumber)
        - Ako postoji, kreiraj ProductCrossReference
        """
        if not cross_refs:
            return 0
        
        cursor = self.prod_conn.cursor()
        created_count = 0
        
        for ref in cross_refs:
            article_number = ref['article_number']
            supplier = ref['supplier']
            
            # 1. Provjeri da li replacement proizvod postoji u našoj bazi
            query = """
                SELECT id, name
                FROM "Product"
                WHERE "catalogNumber" = %s
                LIMIT 1
            """
            
            cursor.execute(query, (article_number,))
            result = cursor.fetchone()
            
            if not result:
                logging.debug(f"   ⏭️  Skipped {supplier} {article_number} (not in our database)")
                continue
            
            replacement_id, replacement_name = result
            
            # 2. Provjeri da li već postoji cross reference
            check_query = """
                SELECT id FROM "ProductCrossReference"
                WHERE "productId" = %s AND "replacementId" = %s
                LIMIT 1
            """
            
            cursor.execute(check_query, (product_id, replacement_id))
            if cursor.fetchone():
                logging.debug(f"   ⏭️  Cross reference already exists: {article_number}")
                continue
            
            # 3. Kreiraj ProductCrossReference
            import secrets
            import string
            from datetime import datetime
            
            def generate_cuid():
                timestamp = str(int(datetime.now().timestamp() * 1000))[-10:]
                random_part = ''.join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(15))
                return f"c{timestamp}{random_part}"
            
            new_id = generate_cuid()
            
            insert_query = """
                INSERT INTO "ProductCrossReference" (
                    id,
                    "productId",
                    "replacementId",
                    "createdAt",
                    "updatedAt"
                ) VALUES (
                    %s, %s, %s, NOW(), NOW()
                )
            """
            
            cursor.execute(insert_query, (new_id, product_id, replacement_id))
            self.prod_conn.commit()
            
            logging.info(f"   ✅ Created cross reference: {supplier} {article_number}")
            created_count += 1
        
        cursor.close()
        return created_count
    
    def test(self):
        """Testiraj na jednom proizvodu"""
        
        logging.info(f"\n{'#'*70}")
        logging.info(f"🧪 TEST FAZA 2 - Jedan Proizvod")
        logging.info(f"{'#'*70}\n")
        
        # 1. Učitaj proizvod
        product = self.get_one_product()
        
        if not product:
            logging.error("❌ No products with tecdocArticleId found!")
            return
        
        product_id, name, catalog_number, article_id, tecdoc_product_id, manufacturer_id = product
        
        logging.info(f"📦 Product:")
        logging.info(f"   ID: {product_id}")
        logging.info(f"   Name: {name}")
        logging.info(f"   Catalog Number: {catalog_number}")
        logging.info(f"   TecDoc Article ID: {article_id}")
        logging.info(f"   TecDoc Product ID: {tecdoc_product_id}")
        
        result = {
            'product_id': product_id,
            'name': name,
            'catalog_number': catalog_number,
            'tecdoc_article_id': article_id,
            'tecdoc_product_id': tecdoc_product_id
        }
        
        # 1. Root kategorija + UPDATE
        logging.info(f"\n{'='*70}")
        logging.info(f"🔍 1. ROOT CATEGORY + UPDATE")
        logging.info(f"{'='*70}")
        
        try:
            category = self.get_root_category(article_id)
            if category:
                result['category'] = category
                logging.info(f"✅ Category: {category['name']}")
                logging.info(f"   Root: {category['root_category']['name']}")
                logging.info(f"   Root ID: {category['root_category']['id']}")
                logging.info(f"   Parent chain: {len(category['parent_chain'])} levels")
                
                # Ažuriraj categoryId u proizvodu
                updated = self.update_category(product_id, category['root_category']['id'])
                if updated:
                    result['category_updated'] = True
            else:
                logging.info(f"❌ No category found")
        except Exception as e:
            logging.error(f"❌ Error: {e}")
        
        # 2. Atributi + SAVE
        logging.info(f"\n{'='*70}")
        logging.info(f"🔍 2. ATTRIBUTES + SAVE")
        logging.info(f"{'='*70}")
        
        try:
            attributes = self.get_attributes(article_id)
            if attributes:
                result['attributes'] = attributes
                logging.info(f"✅ Found {len(attributes)} attributes:")
                for attr in attributes[:5]:  # Prikaži prvih 5
                    logging.info(f"   - {attr['name']}: {attr['value']}")
                if len(attributes) > 5:
                    logging.info(f"   ... and {len(attributes) - 5} more")
                
                # Spremi u technicalSpecs JSON
                saved = self.save_attributes_to_technical_specs(product_id, attributes)
                if saved:
                    result['attributes_saved'] = True
            else:
                logging.info(f"❌ No attributes found")
        except Exception as e:
            logging.error(f"❌ Error: {e}")
        
        # 3. Cross references + CREATE
        logging.info(f"\n{'='*70}")
        logging.info(f"🔍 3. CROSS REFERENCES + CREATE")
        logging.info(f"{'='*70}")
        
        try:
            cross_refs = self.get_cross_references(article_id)
            if cross_refs:
                result['cross_references'] = cross_refs
                logging.info(f"✅ Found {len(cross_refs)} cross references from TecDoc:")
                for ref in cross_refs[:5]:
                    logging.info(f"   - {ref['supplier']}: {ref['article_number']} (type: {ref['type']})")
                if len(cross_refs) > 5:
                    logging.info(f"   ... and {len(cross_refs) - 5} more")
                
                # Kreiraj ProductCrossReference zapise samo za one koje imamo u bazi
                created = self.create_cross_references(product_id, cross_refs)
                if created > 0:
                    result['cross_references_created'] = created
                    logging.info(f"   ✅ Created {created} ProductCrossReference record(s)")
                else:
                    logging.info(f"   ⏭️  No cross references created (products not in our database)")
            else:
                logging.info(f"❌ No cross references found")
        except Exception as e:
            logging.error(f"❌ Error: {e}")
        
        # 5. Kompatibilna vozila
        logging.info(f"\n{'='*70}")
        logging.info(f"🔍 4. COMPATIBLE VEHICLES")
        logging.info(f"{'='*70}")
        
        try:
            vehicles = self.get_compatible_vehicles(article_id)
            if vehicles:
                result['compatible_vehicles'] = vehicles
                logging.info(f"✅ Found {len(vehicles)} compatible vehicles:")
                for vehicle in vehicles[:5]:
                    logging.info(f"   - {vehicle['brand']} {vehicle['model']} {vehicle['generation']} ({vehicle['engine_code']})")
                if len(vehicles) > 5:
                    logging.info(f"   ... and {len(vehicles) - 5} more")
                
                # Kreiraj ProductVehicleFitment zapise
                created = self.create_vehicle_fitments(product_id, vehicles)
                if created > 0:
                    result['vehicle_fitments_created'] = created
                    logging.info(f"   ✅ Created {created} ProductVehicleFitment record(s)")
                else:
                    logging.info(f"   ⏭️  No vehicle fitments created")
            else:
                logging.info(f"❌ No compatible vehicles found")
        except Exception as e:
            logging.error(f"❌ Error: {e}")
        
        # 6. Supplier + UPDATE
        logging.info(f"\n{'='*70}")
        logging.info(f"🔍 5. SUPPLIER + UPDATE")
        logging.info(f"{'='*70}")
        
        try:
            supplier = self.get_supplier(article_id)
            if supplier:
                result['supplier'] = supplier
                logging.info(f"✅ Supplier: {supplier['name']} (ID: {supplier['id']})")
                
                # Ažuriraj manufacturerId u bazi ako je NULL
                updated = self.update_manufacturer(product_id, supplier)
                if updated:
                    result['manufacturer_updated'] = True
            else:
                logging.info(f"❌ No supplier found")
        except Exception as e:
            logging.error(f"❌ Error: {e}")
        
        # 7. OE Numbers + UPDATE
        logging.info(f"\n{'='*70}")
        logging.info(f"🔍 6. OE NUMBERS + UPDATE")
        logging.info(f"{'='*70}")
        
        try:
            oe_numbers = self.get_oe_numbers(article_id)
            if oe_numbers:
                result['oe_numbers'] = oe_numbers
                logging.info(f"✅ Found {len(oe_numbers)} OE number(s):")
                for oe in oe_numbers:
                    logging.info(f"   - {oe['oe_number']} ({oe['manufacturer_name']})")
                
                # Ažuriraj oemNumber u bazi ako je NULL ili '0'
                updated = self.update_oe_number(product_id, oe_numbers)
                if updated:
                    result['oe_number_updated'] = True
            else:
                logging.info(f"❌ No OE numbers found")
        except Exception as e:
            logging.error(f"❌ Error: {e}")
        
        # 7. Spremi rezultat
        output_file = 'test_single_product.json'
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
        
        logging.info(f"\n{'#'*70}")
        logging.info(f"✅ TEST COMPLETED")
        logging.info(f"{'#'*70}")
        logging.info(f"📄 Output: {output_file}")
        logging.info(f"{'#'*70}\n")
    
    def close(self):
        """Zatvori konekcije"""
        self.tecdoc_conn.close()
        self.prod_conn.close()
        logging.info("🔌 Database connections closed")

    def process_product(self, product):
        """Obradi jedan proizvod - bez logovanja detalja"""
        product_id, name, catalog_number, article_id, tecdoc_product_id, manufacturer_id = product
        
        try:
            # 1. Root kategorija
            try:
                category = self.get_root_category(article_id)
                if category:
                    self.update_category(product_id, category['root_category']['id'])
                    self.stats['with_category'] += 1
            except Exception as e:
                self.prod_conn.rollback()
                pass
            
            # 2. Atributi
            try:
                attributes = self.get_attributes(article_id)
                if attributes:
                    self.save_attributes_to_technical_specs(product_id, attributes)
                    self.stats['with_attributes'] += 1
            except Exception as e:
                self.prod_conn.rollback()
                pass
            
            # 3. Cross references
            try:
                cross_refs = self.get_cross_references(article_id)
                if cross_refs:
                    created = self.create_cross_references(product_id, cross_refs)
                    if created > 0:
                        self.stats['with_cross_refs'] += 1
            except Exception as e:
                self.prod_conn.rollback()
                pass
            
            # 4. Kompatibilna vozila
            try:
                vehicles = self.get_compatible_vehicles(article_id)
                if vehicles:
                    created = self.create_vehicle_fitments(product_id, vehicles)
                    if created > 0:
                        self.stats['with_vehicles'] += 1
            except Exception as e:
                self.prod_conn.rollback()
                pass
            
            # 5. Supplier/Manufacturer
            try:
                supplier = self.get_supplier(article_id)
                if supplier:
                    updated = self.update_manufacturer(product_id, supplier)
                    if updated:
                        self.stats['with_manufacturer'] += 1
            except Exception as e:
                self.prod_conn.rollback()
                pass
            
            # 6. OE Numbers
            try:
                oe_numbers = self.get_oe_numbers(article_id)
                if oe_numbers:
                    updated = self.update_oe_number(product_id, oe_numbers)
                    if updated:
                        self.stats['with_oe_numbers'] += 1
            except Exception as e:
                self.prod_conn.rollback()
                pass
            
            self.stats['total_processed'] += 1
            return True
            
        except Exception as e:
            logging.error(f"❌ Error processing {catalog_number}: {e}")
            self.stats['errors'] += 1
            return False
    
    def run(self, batch_size=50, force_rerun=False):
        """Pokreni batch procesiranje"""
        
        logging.info(f"\n{'#'*70}")
        logging.info(f"🚀 FAZA 2 - Batch Obogaćivanje Proizvoda")
        logging.info(f"{'#'*70}\n")
        
        # Pronađi gdje smo stali
        if force_rerun:
            start_offset = 0
            logging.info(f"🔄 FORCE MODE: Starting from offset 0 (re-processing ALL)")
        else:
            start_offset = self.get_last_processed_offset()
            logging.info(f"📍 Starting from offset: {start_offset}")
        
        batch_num = (start_offset // batch_size) + 1
        current_offset = start_offset
        
        while True:
            # Učitaj batch
            products = self.get_products_batch(batch_size, current_offset)
            
            if not products:
                logging.info(f"\n✅ No more products to process!")
                break
            
            logging.info(f"\n{'='*70}")
            logging.info(f"📦 BATCH #{batch_num} (offset: {current_offset}, size: {len(products)})")
            logging.info(f"{'='*70}")
            
            # Obradi svaki proizvod u batch-u
            for i, product in enumerate(products, 1):
                product_id, name, catalog_number, article_id, tecdoc_product_id, manufacturer_id = product
                
                logging.info(f"[{i}/{len(products)}] {catalog_number} - {name[:40]}...")
                
                self.process_product(product)
                
                # Pauza između proizvoda
                time.sleep(0.05)
            
            # Statistika nakon batch-a
            logging.info(f"\n📊 BATCH #{batch_num} STATS: Processed={self.stats['total_processed']}, Cat={self.stats['with_category']}, Attr={self.stats['with_attributes']}, Veh={self.stats['with_vehicles']}, Errors={self.stats['errors']}")
            
            # Pripremi za sljedeći batch
            current_offset += batch_size
            batch_num += 1
            
            # Pauza između batch-eva
            time.sleep(1)
        
        # Finalna statistika
        logging.info(f"\n{'#'*70}")
        logging.info(f"🎉 FINAL STATISTICS")
        logging.info(f"{'#'*70}")
        logging.info(f"Total processed: {self.stats['total_processed']}")
        logging.info(f"With category: {self.stats['with_category']}")
        logging.info(f"With attributes: {self.stats['with_attributes']}")
        logging.info(f"With cross refs: {self.stats['with_cross_refs']}")
        logging.info(f"With vehicles: {self.stats['with_vehicles']}")
        logging.info(f"With manufacturer: {self.stats['with_manufacturer']}")
        logging.info(f"With OE numbers: {self.stats['with_oe_numbers']}")
        logging.info(f"Errors: {self.stats['errors']}")

def main():
    """Main funkcija"""
    
    import sys
    import argparse
    
    parser = argparse.ArgumentParser(description='TecDoc Product Enrichment - Batch Processing')
    parser.add_argument('--force', action='store_true', help='Force re-process all products from beginning')
    parser.add_argument('--limit', type=int, help='Limit number of products to process (for testing)')
    parser.add_argument('--tecdoc-host', default='localhost', help='TecDoc MySQL host (default: localhost)')
    parser.add_argument('--tecdoc-port', type=int, default=3306, help='TecDoc MySQL port (default: 3306, use 3307 for SSH tunnel)')
    
    args = parser.parse_args()
    
    logging.info(f"🚀 Starting TecDoc Enrichment")
    logging.info(f"   TecDoc MySQL: {args.tecdoc_host}:{args.tecdoc_port}")
    logging.info(f"   PostgreSQL: localhost:5432 (production)")
    logging.info(f"   Force mode: {args.force}")
    if args.limit:
        logging.info(f"   Limit: {args.limit} products")
    
    enricher = TecDocEnricherBatch(tecdoc_host=args.tecdoc_host, tecdoc_port=args.tecdoc_port)
    
    try:
        if args.force:
            logging.info("🔄 FORCE MODE: Re-processing ALL products from the beginning!")
            enricher.run(batch_size=50, force_rerun=True)
        else:
            enricher.run(batch_size=50, force_rerun=False)
    except KeyboardInterrupt:
        logging.info("\n⚠️  Interrupted by user - progress saved!")
    except Exception as e:
        logging.error(f"❌ Fatal error: {e}")
        raise
    finally:
        enricher.close()

if __name__ == "__main__":
    main()
