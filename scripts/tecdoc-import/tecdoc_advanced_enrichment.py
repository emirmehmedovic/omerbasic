"""
TecDoc Advanced Product Enrichment Script
==========================================
Napredni matching i obogaćivanje proizvoda sa TecDoc podacima

Strategija:
1. Za proizvode sa tecdocArticleId → dopuni EAN, karakteristike, vozila
2. Za proizvode sa eanCode → egzaktni match preko EAN
3. Za ostale → multi-level matching (catalog + OEM normalizovano)

Autor: Claude Code
Datum: 22. decembar 2025.
"""

import psycopg2
import mysql.connector
from typing import Dict, List, Optional, Tuple
import json
from dataclasses import dataclass, asdict
from datetime import datetime
import logging
import re

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('tecdoc_advanced_enrichment.log'),
        logging.StreamHandler()
    ]
)

@dataclass
class MatchResult:
    """Rezultat matchinga"""
    article_id: Optional[int]
    confidence: int  # 0-100
    method: str  # catalog_exact, catalog_norm, oem_exact, oem_norm, ean_exact, fuzzy

@dataclass
class TecDocData:
    """Kompletni TecDoc podaci za proizvod"""
    article_id: int
    tecdoc_product_id: Optional[int]
    manufacturer: str
    manufacturer_id: int
    product_type: str
    ean_codes: List[str]
    oem_numbers: List[Dict[str, str]]  # [{"oem": "...", "manufacturer": "..."}]
    technical_specs: Dict
    vehicles: List[Dict]
    cross_references: List[Dict]
    match_result: MatchResult


class TecDocAdvancedEnricher:
    """
    Napredni TecDoc obogaćivač
    """

    def __init__(self):
        # TecDoc MySQL (read-only)
        self.tecdoc_conn = mysql.connector.connect(
            host="localhost",
            user="tecdoc_user",
            password="tecdoc_password_2025",
            database="tecdoc1q2019",
            charset='utf8mb4'
        )

        # Postgres (read-write)
        self.postgres_conn = psycopg2.connect(
            host="localhost",
            database="omerbasicdb",
            user="postgres",
            password="123456789EmIna!"
        )

        # Cache
        self.manufacturer_cache = {}
        self.vehicle_generation_cache = {}
        self.vehicle_engine_cache = {}

        # Statistics
        self.stats = {
            'total': 0,
            'already_matched': 0,
            'newly_matched': 0,
            'ean_updated': 0,
            'specs_updated': 0,
            'oem_updated': 0,
            'vehicles_updated': 0,
            'not_found': 0,
            'errors': 0
        }

    # ===================================================================
    # NORMALIZACIJA FUNKCIJA
    # ===================================================================

    def normalize_catalog(self, catalog: str) -> str:
        """Normalizacija kataloš   kog broja"""
        if not catalog:
            return ""

        # Uppercase + remove spaces, dashes, dots
        normalized = catalog.upper()
        normalized = re.sub(r'[\s\-\./]', '', normalized)

        return normalized

    def should_skip_oem_matching(self, oem: str) -> bool:
        """
        Provjeri da li je OEM vrijednost placeholder/invalid

        Skipuje:
        - Prazne vrijednosti
        - Placeholder vrijednosti kao "0", "N/A", "NONE"
        - Veoma kratke vrijednosti (< 3 karaktera)
        """
        if not oem:
            return True

        oem_clean = oem.strip().upper()

        # Placeholder values
        placeholder_values = ['0', 'N/A', 'NA', 'NONE', '-', '/', 'X', 'XX', 'XXX']
        if oem_clean in placeholder_values:
            return True

        # Too short to be a valid OEM
        if len(oem_clean) < 3:
            return True

        # All zeros (0, 00, 000, 0000, etc.)
        if oem_clean.replace('0', '') == '':
            return True

        return False

    def normalize_oem(self, oem: str) -> List[str]:
        """
        Normalizacija OEM broja - vraća liste varijanti

        Primjer:
        "A 004 094 24 04" → ["A00409424 04", "00409424 04"]
        """
        if not oem:
            return []

        # Uppercase + remove spaces, dashes, slashes
        normalized = oem.upper()
        normalized = re.sub(r'[\s\-\./]', '', normalized)

        variants = [normalized]

        # Varijante sa/bez početnog "A"
        if normalized.startswith('A'):
            variants.append(normalized[1:])
        else:
            variants.append('A' + normalized)

        # Varijante sa/bez vodećih nula (opcionalno)
        # no_leading_zeros = normalized.lstrip('0')
        # if no_leading_zeros and no_leading_zeros != normalized:
        #     variants.append(no_leading_zeros)

        return list(set(variants))  # Remove duplicates

    # ===================================================================
    # MATCHING FUNKCIJE (5 NIVOA)
    # ===================================================================

    def find_by_catalog_exact(self, catalog: str) -> Optional[int]:
        """Nivo 1: Exact match kataloškog broja"""
        cursor = self.tecdoc_conn.cursor()

        query = """
            SELECT id FROM articles
            WHERE DataSupplierArticleNumber = %s
            LIMIT 1
        """

        cursor.execute(query, (catalog,))
        result = cursor.fetchone()
        cursor.close()

        return result[0] if result else None

    def find_by_catalog_normalized(self, catalog: str) -> Optional[int]:
        """Nivo 2: Normalized match kataloškog broja"""
        normalized = self.normalize_catalog(catalog)
        if not normalized:
            return None

        cursor = self.tecdoc_conn.cursor()

        # Search by normalized (uppercase, no spaces)
        query = """
            SELECT id FROM articles
            WHERE REPLACE(REPLACE(REPLACE(REPLACE(
                UPPER(DataSupplierArticleNumber),
                ' ', ''), '-', ''), '.', ''), '/', '') = %s
            LIMIT 1
        """

        cursor.execute(query, (normalized,))
        result = cursor.fetchone()
        cursor.close()

        return result[0] if result else None

    def find_by_ean_exact(self, ean: str) -> Optional[int]:
        """Nivo 0: EAN exact match (najviši prioritet!)"""
        if not ean:
            return None

        cursor = self.tecdoc_conn.cursor()

        query = """
            SELECT article_id FROM article_ea_numbers
            WHERE EAN = %s
            LIMIT 1
        """

        cursor.execute(query, (ean,))
        result = cursor.fetchone()
        cursor.close()

        return result[0] if result else None

    def find_by_oem_exact(self, oem: str) -> Optional[int]:
        """Nivo 3: Exact match OEM broja"""
        if not oem:
            return None

        cursor = self.tecdoc_conn.cursor()

        query = """
            SELECT article_id FROM article_oe_numbers
            WHERE OENbr = %s
            LIMIT 1
        """

        cursor.execute(query, (oem,))
        result = cursor.fetchone()
        cursor.close()

        return result[0] if result else None

    def find_by_oem_normalized(self, oem: str) -> Optional[int]:
        """Nivo 4: Normalized match OEM broja (multiple variants)"""
        if not oem:
            return None

        variants = self.normalize_oem(oem)

        cursor = self.tecdoc_conn.cursor()

        for variant in variants:
            query = """
                SELECT article_id FROM article_oe_numbers
                WHERE REPLACE(REPLACE(REPLACE(REPLACE(
                    UPPER(OENbr),
                    ' ', ''), '-', ''), '.', ''), '/', '') = %s
                LIMIT 1
            """

            cursor.execute(query, (variant,))
            result = cursor.fetchone()

            if result:
                cursor.close()
                return result[0]

        cursor.close()
        return None

    def advanced_match(self, catalog: str, oem: str = None, ean: str = None) -> MatchResult:
        """
        Multi-level matching strategy

        Prioriteti:
        0. EAN exact (100%)
        1. Catalog exact (95%)
        2. Catalog normalized (85%)
        3. OEM exact (80%) - SAMO AKO JE VALID OEM
        4. OEM normalized (70%) - SAMO AKO JE VALID OEM
        """

        # Nivo 0: EAN Exact Match
        if ean:
            article_id = self.find_by_ean_exact(ean)
            if article_id:
                return MatchResult(article_id, 100, "ean_exact")

        # Nivo 1: Catalog Exact Match
        article_id = self.find_by_catalog_exact(catalog)
        if article_id:
            return MatchResult(article_id, 95, "catalog_exact")

        # Nivo 2: Catalog Normalized
        article_id = self.find_by_catalog_normalized(catalog)
        if article_id:
            return MatchResult(article_id, 85, "catalog_normalized")

        # Validiraj OEM prije matchinga
        skip_oem = self.should_skip_oem_matching(oem)
        if skip_oem and oem:
            logging.debug(f"  → Skipping OEM matching for placeholder value: '{oem}'")

        # Nivo 3: OEM Exact (samo ako je validan OEM)
        if oem and not skip_oem:
            article_id = self.find_by_oem_exact(oem)
            if article_id:
                return MatchResult(article_id, 80, "oem_exact")

        # Nivo 4: OEM Normalized (samo ako je validan OEM)
        if oem and not skip_oem:
            article_id = self.find_by_oem_normalized(oem)
            if article_id:
                return MatchResult(article_id, 70, "oem_normalized")

        # Not found
        return MatchResult(None, 0, "not_found")

    # ===================================================================
    # DATA EXTRACTION FUNKCIJE
    # ===================================================================

    def get_basic_article_data(self, article_id: int) -> Dict:
        """Osnovni podaci o artiklu"""
        cursor = self.tecdoc_conn.cursor()

        query = """
            SELECT
                a.id,
                a.CurrentProduct as product_id,
                a.Supplier as supplier_id,
                s.Description as manufacturer,
                a.NormalizedDescription as product_type
            FROM articles a
            LEFT JOIN suppliers s ON a.Supplier = s.id
            WHERE a.id = %s
        """

        cursor.execute(query, (article_id,))
        result = cursor.fetchone()
        cursor.close()

        if result:
            return {
                'article_id': result[0],
                'product_id': result[1],
                'supplier_id': result[2],
                'manufacturer': result[3],
                'product_type': result[4]
            }

        return {}

    def get_ean_codes(self, article_id: int) -> List[str]:
        """Izvuci EAN kodove"""
        cursor = self.tecdoc_conn.cursor()

        query = """
            SELECT DISTINCT EAN
            FROM article_ea_numbers
            WHERE article_id = %s
        """

        cursor.execute(query, (article_id,))
        ean_codes = [row[0] for row in cursor.fetchall()]
        cursor.close()

        return ean_codes

    def get_oem_numbers_with_manufacturers(self, article_id: int) -> List[Dict]:
        """Izvuci OEM brojeve sa proizvođačima"""
        cursor = self.tecdoc_conn.cursor()

        query = """
            SELECT DISTINCT
                aon.OENbr as oem_number,
                m.Description as manufacturer
            FROM article_oe_numbers aon
            LEFT JOIN manufacturers m ON aon.Manufacturer = m.id
            WHERE aon.article_id = %s
            ORDER BY m.Description, aon.OENbr
        """

        cursor.execute(query, (article_id,))

        oem_numbers = []
        for row in cursor.fetchall():
            oem_numbers.append({
                'oem': row[0],
                'manufacturer': row[1] if row[1] else 'Unknown'
            })

        cursor.close()
        return oem_numbers

    def get_technical_specs(self, article_id: int) -> Dict:
        """
        Izvuci tehničke specifikacije

        Returns Dict sa nested strukturom:
        {
            "Opening Temperature": {"value": "95", "unit": "°C"},
            "with housing": {"value": "yes", "unit": ""}
        }
        """
        cursor = self.tecdoc_conn.cursor()

        query = """
            SELECT
                aa.DisplayTitle as attr_name,
                aa.DisplayValue as attr_value,
                aa.AttributeType as attr_type
            FROM article_attributes aa
            WHERE aa.article_id = %s
            ORDER BY aa.DisplayTitle
        """

        cursor.execute(query, (article_id,))

        specs = {}
        for row in cursor.fetchall():
            attr_name = row[0] if row[0] else 'Unknown'
            attr_value = row[1] if row[1] else ''
            attr_type = row[2] if row[2] else ''

            # Store simple value if no type, or include type info
            if attr_type:
                specs[attr_name] = {
                    'value': attr_value,
                    'type': attr_type
                }
            else:
                specs[attr_name] = attr_value

        cursor.close()
        return specs

    def get_vehicles_from_tree_node(self, article_id: int, limit: int = 500) -> List[Dict]:
        """
        KOREKTNO izvlačenje vozila preko tree_node_products

        VAŽNO: NE koristi articles_linkages (samo 12K redova)!
        """
        cursor = self.tecdoc_conn.cursor()

        # Prvo dohvati product_id
        basic_data = self.get_basic_article_data(article_id)
        product_id = basic_data.get('product_id')

        if not product_id:
            cursor.close()
            return []

        # KORISTI tree_node_products (45M redova!)
        query = """
            SELECT DISTINCT
                mf.Description as manufacturer,
                mf.id as manufacturer_id,
                m.Description as model,
                m.id as model_id,
                pc.Description as variant,
                pc.internalID as vehicle_internal_id,
                YEAR(pc.From) as year_from,
                YEAR(pc.To) as year_to,
                e.Description as engine_desc,
                e.id as engine_id,
                e.SalesDescription as engine_sales_desc
            FROM tree_node_products tnp
            JOIN passengercars pc ON tnp.itemId = pc.internalID AND tnp.tree_id = 1
            JOIN models m ON pc.Model = m.id
            JOIN manufacturers mf ON m.ManufacturerId = mf.id
            LEFT JOIN passengercars_link_engines ple ON pc.id = ple.car_id
            LEFT JOIN engines e ON ple.engine_id = e.id
            WHERE tnp.product_id = %s
            ORDER BY mf.Description, m.Description, year_from
            LIMIT %s
        """

        cursor.execute(query, (product_id, limit))

        vehicles = []
        for row in cursor.fetchall():
            vehicles.append({
                'manufacturer': row[0],
                'manufacturer_id': row[1],
                'model': row[2],
                'model_id': row[3],
                'variant': row[4],
                'vehicle_internal_id': row[5],
                'year_from': row[6],
                'year_to': row[7],
                'engine': row[8],
                'engine_id': row[9],
                'engine_sales_desc': row[10]
            })

        cursor.close()
        return vehicles

    def get_cross_references(self, article_id: int, limit: int = 20) -> List[Dict]:
        """Pronađi ekvivalentne proizvode"""
        # Prvo izvuci OEM brojeve
        oem_data = self.get_oem_numbers_with_manufacturers(article_id)

        if not oem_data:
            return []

        oem_numbers = [item['oem'] for item in oem_data]

        cursor = self.tecdoc_conn.cursor()

        # Pronađi artikle sa istim OEM brojevima
        placeholders = ','.join(['%s'] * len(oem_numbers))
        query = f"""
            SELECT DISTINCT
                a.DataSupplierArticleNumber as catalog_number,
                s.Description as manufacturer,
                a.NormalizedDescription as product_type,
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

        params = tuple(oem_numbers) + (article_id, limit)
        cursor.execute(query, params)

        cross_refs = []
        for row in cursor.fetchall():
            cross_refs.append({
                'catalog_number': row[0],
                'manufacturer': row[1],
                'product_type': row[2],
                'shared_oems': row[3]
            })

        cursor.close()
        return cross_refs

    def enrich_article(self, article_id: int, match_result: MatchResult) -> TecDocData:
        """
        Izvuci SVE podatke za artikel
        """
        basic = self.get_basic_article_data(article_id)

        return TecDocData(
            article_id=article_id,
            tecdoc_product_id=basic.get('product_id'),
            manufacturer=basic.get('manufacturer', ''),
            manufacturer_id=basic.get('supplier_id'),
            product_type=basic.get('product_type', ''),
            ean_codes=self.get_ean_codes(article_id),
            oem_numbers=self.get_oem_numbers_with_manufacturers(article_id),
            technical_specs=self.get_technical_specs(article_id),
            vehicles=self.get_vehicles_from_tree_node(article_id),
            cross_references=self.get_cross_references(article_id),
            match_result=match_result
        )

    # ===================================================================
    # DATABASE UPDATE FUNKCIJE
    # ===================================================================

    def update_product(self, product_id: str, tecdoc_data: TecDocData):
        """
        Update Product tabelu
        """
        cursor = self.postgres_conn.cursor()

        # Konstruiraj EAN string (prvi EAN ili prazan string)
        ean_code = tecdoc_data.ean_codes[0] if tecdoc_data.ean_codes else None

        query = """
            UPDATE "Product"
            SET
                "tecdocArticleId" = %s,
                "tecdocProductId" = %s,
                "eanCode" = COALESCE(%s, "eanCode"),
                "technicalSpecs" = %s,
                "updatedAt" = NOW()
            WHERE id = %s
        """

        cursor.execute(query, (
            tecdoc_data.article_id,
            tecdoc_data.tecdoc_product_id,
            ean_code,
            json.dumps(tecdoc_data.technical_specs),
            product_id
        ))

        self.postgres_conn.commit()
        cursor.close()

    def upsert_oem_numbers(self, product_id: str, oem_numbers: List[Dict]):
        """
        Insert/Update OEM brojeve u ArticleOENumber tabelu
        """
        cursor = self.postgres_conn.cursor()

        for oem_data in oem_numbers:
            query = """
                INSERT INTO "ArticleOENumber" (
                    id, "productId", "oemNumber", manufacturer, "referenceType", "createdAt", "updatedAt"
                )
                VALUES (
                    gen_random_uuid()::text, %s, %s, %s, 'Original', NOW(), NOW()
                )
                ON CONFLICT ("productId", "oemNumber") DO UPDATE
                SET manufacturer = EXCLUDED.manufacturer,
                    "updatedAt" = NOW()
            """

            cursor.execute(query, (
                product_id,
                oem_data['oem'],
                oem_data['manufacturer']
            ))

        self.postgres_conn.commit()
        cursor.close()

    def get_or_create_manufacturer(self, tecdoc_manufacturer: str, tecdoc_id: int) -> Optional[str]:
        """
        Pronađi ili kreiraj proizvođača u Manufacturer tabeli
        """
        # Check cache
        cache_key = f"{tecdoc_id}_{tecdoc_manufacturer}"
        if cache_key in self.manufacturer_cache:
            return self.manufacturer_cache[cache_key]

        cursor = self.postgres_conn.cursor()

        # Try to find existing
        query = """
            SELECT id FROM "Manufacturer"
            WHERE "externalId" = %s OR LOWER(name) = LOWER(%s)
            LIMIT 1
        """

        cursor.execute(query, (str(tecdoc_id), tecdoc_manufacturer))
        result = cursor.fetchone()

        if result:
            manufacturer_id = result[0]
            self.manufacturer_cache[cache_key] = manufacturer_id
            cursor.close()
            return manufacturer_id

        # Create new
        slug = tecdoc_manufacturer.lower().replace(' ', '-').replace('_', '-')
        slug = re.sub(r'[^a-z0-9\-]', '', slug)

        query = """
            INSERT INTO "Manufacturer" (
                id, name, slug, "externalId", "createdAt", "updatedAt"
            )
            VALUES (
                gen_random_uuid()::text, %s, %s, %s, NOW(), NOW()
            )
            ON CONFLICT (slug) DO UPDATE
            SET "externalId" = EXCLUDED."externalId"
            RETURNING id
        """

        cursor.execute(query, (tecdoc_manufacturer, slug, str(tecdoc_id)))
        manufacturer_id = cursor.fetchone()[0]

        self.postgres_conn.commit()
        self.manufacturer_cache[cache_key] = manufacturer_id
        cursor.close()

        return manufacturer_id

    # ===================================================================
    # MAIN PROCESSING
    # ===================================================================

    def process_product(self, product: Dict) -> bool:
        """
        Procesira jedan proizvod

        Returns True ako je uspješno obogaćen
        """
        product_id = product['id']
        catalog = product['catalogNumber']
        oem = product.get('oemNumber')
        ean = product.get('eanCode')
        existing_tecdoc_id = product.get('tecdocArticleId')

        logging.info(f"Processing: {catalog} (ID: {product_id})")

        try:
            # Ako već ima tecdocArticleId, samo dopuni podatke
            if existing_tecdoc_id:
                logging.info(f"  → Already has tecdocArticleId={existing_tecdoc_id}, enriching...")
                match_result = MatchResult(existing_tecdoc_id, 100, "existing")
                self.stats['already_matched'] += 1
            else:
                # Napredno pretraživanje
                match_result = self.advanced_match(catalog, oem, ean)

                if not match_result.article_id:
                    logging.warning(f"  → NOT FOUND in TecDoc")
                    self.stats['not_found'] += 1
                    return False

                logging.info(f"  → MATCHED: article_id={match_result.article_id}, confidence={match_result.confidence}%, method={match_result.method}")
                self.stats['newly_matched'] += 1

            # Izvuci sve podatke
            tecdoc_data = self.enrich_article(match_result.article_id, match_result)

            # Update Product tabelu
            self.update_product(product_id, tecdoc_data)

            # Update OEM brojeve
            if tecdoc_data.oem_numbers:
                self.upsert_oem_numbers(product_id, tecdoc_data.oem_numbers)
                self.stats['oem_updated'] += 1

            # Update EAN if found
            if tecdoc_data.ean_codes:
                self.stats['ean_updated'] += 1

            # Update specs
            if tecdoc_data.technical_specs:
                self.stats['specs_updated'] += 1

            # Update vozila (TODO: implement vehicle mapping)
            if tecdoc_data.vehicles:
                # Za sada samo logujemo
                logging.info(f"  → Found {len(tecdoc_data.vehicles)} vehicles")
                # self.upsert_vehicle_fitments(product_id, tecdoc_data.vehicles)
                # self.stats['vehicles_updated'] += 1

            logging.info(f"  ✅ SUCCESS: EAN={len(tecdoc_data.ean_codes)}, OEM={len(tecdoc_data.oem_numbers)}, Specs={len(tecdoc_data.technical_specs)}, Vehicles={len(tecdoc_data.vehicles)}")

            return True

        except Exception as e:
            logging.error(f"  ❌ ERROR processing {catalog}: {str(e)}")
            self.stats['errors'] += 1
            return False

    def run_batch(self, limit: int = 50, offset: int = 0, filter_mode: str = 'all'):
        """
        Pokreni batch processing

        filter_mode:
        - 'all': Svi proizvodi
        - 'no_tecdoc': Samo proizvodi bez tecdocArticleId
        - 'has_tecdoc': Samo proizvodi sa tecdocArticleId
        - 'has_ean': Samo proizvodi sa eanCode
        """
        cursor = self.postgres_conn.cursor()

        # Build query based on filter
        where_clause = ""
        if filter_mode == 'no_tecdoc':
            where_clause = 'WHERE "tecdocArticleId" IS NULL'
        elif filter_mode == 'has_tecdoc':
            where_clause = 'WHERE "tecdocArticleId" IS NOT NULL'
        elif filter_mode == 'has_ean':
            where_clause = 'WHERE "eanCode" IS NOT NULL AND "eanCode" != \'\''

        query = f"""
            SELECT
                id,
                name,
                "catalogNumber",
                "oemNumber",
                "eanCode",
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
                'oemNumber': row[3],
                'eanCode': row[4],
                'tecdocArticleId': row[5]
            })

        cursor.close()

        total = len(products)
        logging.info(f"=" * 70)
        logging.info(f"BATCH START: {total} products (filter: {filter_mode})")
        logging.info(f"=" * 70)

        # Process each product
        for i, product in enumerate(products, 1):
            self.stats['total'] += 1

            logging.info(f"\n[{i}/{total}] Progress: {(i/total*100):.1f}%")
            self.process_product(product)

            # Log stats every 10 products
            if i % 10 == 0:
                logging.info(f"\n--- STATS @ {i}/{total} ---")
                logging.info(f"Newly matched: {self.stats['newly_matched']}")
                logging.info(f"Already matched: {self.stats['already_matched']}")
                logging.info(f"Not found: {self.stats['not_found']}")
                logging.info(f"EAN updated: {self.stats['ean_updated']}")
                logging.info(f"OEM updated: {self.stats['oem_updated']}")
                logging.info(f"Specs updated: {self.stats['specs_updated']}")
                logging.info(f"Errors: {self.stats['errors']}")

        # Final stats
        logging.info(f"\n" + "=" * 70)
        logging.info(f"BATCH COMPLETED")
        logging.info(f"=" * 70)
        logging.info(json.dumps(self.stats, indent=2))
        logging.info(f"=" * 70)

    def close(self):
        """Zatvori konekcije"""
        self.tecdoc_conn.close()
        self.postgres_conn.close()


# ===================================================================
# MAIN EXECUTION
# ===================================================================

if __name__ == "__main__":
    enricher = TecDocAdvancedEnricher()

    try:
        # DOPUNA: Proizvodi koji već imaju tecdocArticleId (dodaj OEM, EAN, Specs)
        logging.info("Starting ENRICHMENT - Products with tecdocArticleId (add OEM numbers)")
        enricher.run_batch(limit=100, offset=0, filter_mode='has_tecdoc')

        # Alternativno:
        # enricher.run_batch(limit=50, offset=0, filter_mode='no_tecdoc')  # Matchaj nove
        # enricher.run_batch(limit=50, offset=0, filter_mode='has_ean')  # Samo sa EAN
        # enricher.run_batch(limit=10000, offset=0, filter_mode='all')  # SVE

    except Exception as e:
        logging.error(f"FATAL ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        enricher.close()
        logging.info("Connections closed.")
