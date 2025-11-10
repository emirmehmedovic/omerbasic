"""
TEST FAZA 2 - Jedan Proizvod
=============================
Testira obogaćivanje na jednom proizvodu
"""

import psycopg2
import mysql.connector
import json
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)

class TecDocEnricherTest:
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
        
        logging.info("✅ Database connections established")
    
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
    
    def get_compatible_vehicles(self, article_id: int):
        """
        Pronađi kompatibilna vozila sa specifičnim motorima
        Koristi passengercars_link_engines za motor specifičnost
        """
        tecdoc_cursor = self.tecdoc_conn.cursor()
        
        # KLJUČNA QUERY: Vozila sa SPECIFICIRANIM motorima preko passengercars_link_engines
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
            LIMIT 500
        """
        
        tecdoc_cursor.execute(query, (article_id,))
        results = tecdoc_cursor.fetchall()
        
        if not results:
            tecdoc_cursor.close()
            logging.info(f"   No vehicles found with passengercars_link_engines")
            return []
        
        logging.info(f"   Found {len(results)} vehicles with specific engines from TecDoc")
        
        # Ekstrakuj passengercars IDs
        all_passengercars_ids = list(set([r[0] for r in results]))[:200]
        tecdoc_cursor.close()
        
        # Mapiranje na našu bazu preko VehicleGeneration.externalId (passengercars.id)
        prod_cursor = self.prod_conn.cursor()
        
        placeholders = ','.join(['%s'] * len(all_passengercars_ids))
        
        query = f"""
            SELECT DISTINCT
                vb.name as brand,
                vm.name as model,
                vg.name as generation,
                ve."engineCode" as engine_code,
                vg."externalId" as tecdoc_passengercars_id
            FROM "VehicleGeneration" vg
            JOIN "VehicleModel" vm ON vm.id = vg."modelId"
            JOIN "VehicleBrand" vb ON vb.id = vm."brandId"
            LEFT JOIN "VehicleEngine" ve ON ve."generationId" = vg.id
            WHERE vg."externalId" IN ({placeholders})
            LIMIT 200
        """
        
        prod_cursor.execute(query, tuple(map(str, all_passengercars_ids)))
        results = prod_cursor.fetchall()
        prod_cursor.close()
        
        logging.info(f"   Mapped to {len(results)} vehicles in our database")
        
        vehicles = []
        for brand, model, generation, engine_code, tecdoc_id in results:
            vehicles.append({
                'brand': brand,
                'model': model,
                'generation': generation,
                'engine_code': engine_code,
                'tecdoc_passengercars_id': tecdoc_id
            })
        
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
            
            # Pronađi VehicleGeneration ID
            query = """
                SELECT vg.id
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
                    "createdAt",
                    "updatedAt"
                ) VALUES (
                    %s, %s, %s, NOW(), NOW()
                )
            """
            
            cursor.execute(insert_query, (new_id, product_id, generation_id))
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

def main():
    """Main funkcija"""
    
    tester = TecDocEnricherTest()
    
    try:
        tester.test()
    except Exception as e:
        logging.error(f"❌ Fatal error: {e}")
        raise
    finally:
        tester.close()

if __name__ == "__main__":
    main()
