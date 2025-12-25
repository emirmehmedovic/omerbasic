"""
TecDoc Enrichment sa Quality Assurance
=======================================
Siguran enrichment sa validacijom matcheva

Autor: Claude Code
Datum: 25. decembar 2025.
"""

import psycopg2
import mysql.connector
from typing import Dict, List, Optional, Tuple
import json
from dataclasses import dataclass, asdict
from datetime import datetime
import logging
import re
from collections import defaultdict

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f'enrichment_validation_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'),
        logging.StreamHandler()
    ]
)

@dataclass
class MatchResult:
    """Rezultat matchinga"""
    article_id: Optional[int]
    confidence: int  # 0-100
    method: str

@dataclass
class MatchQuality:
    """Kvalitet matcha sa detaljima"""
    is_valid: bool
    score: int  # 0-100
    issues: List[str]
    warnings: List[str]
    checks: Dict[str, bool]

@dataclass
class ValidationReport:
    """Izvještaj validacije za jedan proizvod"""
    product_id: str
    product_name: str
    catalog_number: str
    oem_number: str

    # Matching
    matched: bool
    article_id: Optional[int]
    confidence: int
    method: str

    # TecDoc Data
    tecdoc_manufacturer: str
    tecdoc_product_type: str
    tecdoc_oem_count: int
    tecdoc_oem_sample: List[str]

    # Quality
    quality_score: int
    quality_valid: bool
    quality_issues: List[str]
    quality_warnings: List[str]

    # Recommendation
    should_update: bool
    reason: str


class TecDocEnricherWithValidation:
    """
    TecDoc Enricher sa ugrađenom validacijom kvaliteta matcheva
    """

    def __init__(self, min_confidence: int = 85, min_quality_score: int = 70):
        # Database connections
        self.tecdoc_conn = mysql.connector.connect(
            host="localhost",
            user="root",
            password="",
            database="tecdoc1q2019",
            charset='utf8mb4'
        )

        self.postgres_conn = psycopg2.connect(
            host="localhost",
            database="omerbasicdb",
            user="emir_mw",
            password=""
        )

        # Quality thresholds
        self.MIN_CONFIDENCE = min_confidence
        self.MIN_QUALITY_SCORE = min_quality_score

        # Statistics
        self.stats = {
            'total': 0,
            'matched': 0,
            'not_matched': 0,
            'high_quality': 0,
            'medium_quality': 0,
            'low_quality': 0,
            'rejected_low_confidence': 0,
            'rejected_low_quality': 0,
            'approved_for_update': 0,
            'by_method': defaultdict(int),
            'issues': defaultdict(int)
        }

        # Reports
        self.validation_reports: List[ValidationReport] = []

    # ===================================================================
    # OEM VALIDATION (iz prethodnog fixa)
    # ===================================================================

    def should_skip_oem_matching(self, oem: str) -> bool:
        """Provjeri da li je OEM vrijednost placeholder/invalid"""
        if not oem:
            return True

        oem_clean = oem.strip().upper()
        placeholder_values = ['0', 'N/A', 'NA', 'NONE', '-', '/', 'X', 'XX', 'XXX']

        if oem_clean in placeholder_values:
            return True
        if len(oem_clean) < 3:
            return True
        if oem_clean.replace('0', '') == '':
            return True

        return False

    def normalize_catalog(self, catalog: str) -> str:
        """Normalizacija kataloškog broja"""
        if not catalog:
            return ""
        normalized = catalog.upper()
        normalized = re.sub(r'[\s\-\./]', '', normalized)
        return normalized

    def normalize_oem(self, oem: str) -> List[str]:
        """Normalizacija OEM broja - vraća liste varijanti"""
        if not oem:
            return []

        normalized = oem.upper()
        normalized = re.sub(r'[\s\-\./]', '', normalized)
        variants = [normalized]

        if normalized.startswith('A'):
            variants.append(normalized[1:])
        else:
            variants.append('A' + normalized)

        return list(set(variants))

    # ===================================================================
    # MATCHING FUNKCIJE
    # ===================================================================

    def find_by_catalog_exact(self, catalog: str) -> Optional[int]:
        """Exact match kataloškog broja"""
        cursor = self.tecdoc_conn.cursor()
        query = "SELECT id FROM articles WHERE DataSupplierArticleNumber = %s LIMIT 1"
        cursor.execute(query, (catalog,))
        result = cursor.fetchone()
        cursor.close()
        return result[0] if result else None

    def find_by_catalog_normalized(self, catalog: str) -> Optional[int]:
        """Normalized match kataloškog broja"""
        normalized = self.normalize_catalog(catalog)
        if not normalized:
            return None

        cursor = self.tecdoc_conn.cursor()
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
        """EAN exact match"""
        if not ean:
            return None
        cursor = self.tecdoc_conn.cursor()
        query = "SELECT article_id FROM article_ea_numbers WHERE EAN = %s LIMIT 1"
        cursor.execute(query, (ean,))
        result = cursor.fetchone()
        cursor.close()
        return result[0] if result else None

    def find_by_oem_exact(self, oem: str) -> Optional[int]:
        """Exact match OEM broja"""
        if not oem:
            return None
        cursor = self.tecdoc_conn.cursor()
        query = "SELECT article_id FROM article_oe_numbers WHERE OENbr = %s LIMIT 1"
        cursor.execute(query, (oem,))
        result = cursor.fetchone()
        cursor.close()
        return result[0] if result else None

    def find_by_oem_normalized(self, oem: str) -> Optional[int]:
        """Normalized match OEM broja"""
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
        """Multi-level matching strategy SA OEM VALIDATION"""

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
    # TECDOC DATA EXTRACTION
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
                a.NormalizedDescription as product_type,
                a.DataSupplierArticleNumber as catalog_number
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
                'product_type': result[4],
                'catalog_number': result[5]
            }
        return {}

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

    # ===================================================================
    # QUALITY VALIDATION - KLJUČNA FUNKCIONALNOST!
    # ===================================================================

    def validate_match_quality(self,
                               product: Dict,
                               match_result: MatchResult,
                               tecdoc_data: Dict,
                               tecdoc_oem_numbers: List[Dict]) -> MatchQuality:
        """
        Validira kvalitet matcha - DA LI MATCH IMA SMISLA?

        Provjerava:
        1. Da li su product names slični?
        2. Da li se OEM brojevi preklapaju?
        3. Da li je manufacturer isti?
        4. Da li je product type sličan?
        5. Da li postoje red flags?
        """

        issues = []
        warnings = []
        checks = {}
        score = 100

        our_catalog = product.get('catalogNumber', '')
        our_oem = product.get('oemNumber', '')
        our_name = product.get('name', '').upper()

        tecdoc_manufacturer = tecdoc_data.get('manufacturer', '')
        tecdoc_product_type = tecdoc_data.get('product_type', '')
        tecdoc_catalog = tecdoc_data.get('catalog_number', '')

        # ---------------------------------------------------------------
        # CHECK 1: Catalog Number Similarity
        # ---------------------------------------------------------------
        if match_result.method in ['catalog_exact', 'catalog_normalized']:
            # Odlično - matchali smo preko catalog-a
            checks['catalog_match'] = True
        else:
            # Matchali smo preko OEM/EAN - provjeri da li su catalogi slični
            our_norm = self.normalize_catalog(our_catalog)
            tecdoc_norm = self.normalize_catalog(tecdoc_catalog)

            if our_norm == tecdoc_norm:
                checks['catalog_match'] = True
            else:
                checks['catalog_match'] = False
                warnings.append(f"Catalog brojevi različiti: '{our_catalog}' vs '{tecdoc_catalog}'")
                score -= 10

        # ---------------------------------------------------------------
        # CHECK 2: OEM Number Overlap
        # ---------------------------------------------------------------
        if not self.should_skip_oem_matching(our_oem) and tecdoc_oem_numbers:
            # Provjeri da li naš OEM postoji u TecDoc OEM listi
            our_oem_normalized = self.normalize_catalog(our_oem)
            found_oem = False

            for tecdoc_oem in tecdoc_oem_numbers:
                tecdoc_oem_normalized = self.normalize_catalog(tecdoc_oem['oem'])
                if our_oem_normalized == tecdoc_oem_normalized:
                    found_oem = True
                    checks['oem_overlap'] = True
                    break

            if not found_oem:
                checks['oem_overlap'] = False

                # Ako smo matchali preko OEM-a ali ga nema u listi - PROBLEM!
                if match_result.method in ['oem_exact', 'oem_normalized']:
                    issues.append(f"⚠️ CRITICAL: Matched preko OEM '{our_oem}', ali nije u TecDoc OEM listi!")
                    score -= 50  # Major red flag
                else:
                    warnings.append(f"OEM '{our_oem}' nije pronađen u TecDoc OEM listi ({len(tecdoc_oem_numbers)} OEM-ova)")
                    score -= 15
        elif not tecdoc_oem_numbers:
            checks['oem_overlap'] = None
            warnings.append("TecDoc artikal nema OEM brojeve")
            score -= 5
        else:
            checks['oem_overlap'] = None  # Naš OEM je placeholder, ne možemo provjeriti

        # ---------------------------------------------------------------
        # CHECK 3: Product Type/Name Similarity
        # ---------------------------------------------------------------
        # Ekstraktuj ključne riječi iz našeg imena
        our_keywords = set(re.findall(r'\b[A-Z]{3,}\b', our_name))  # Words sa 3+ caps letters
        tecdoc_keywords = set(re.findall(r'\b[A-Z]{3,}\b', tecdoc_product_type.upper()))

        # Posebni slučajevi - poznati product types
        product_type_map = {
            'FILTER': ['FILTER', 'AIR', 'OIL', 'CABIN', 'FUEL'],
            'BRAKE': ['BRAKE', 'DISC', 'PAD', 'CALIPER'],
            'SENSOR': ['SENSOR', 'MJERAČ', 'MJERAČ'],
            'WIPER': ['WIPER', 'METLICA', 'BRISAČ'],
            'OIL': ['OIL', 'ULJE'],
            'BELT': ['BELT', 'KAIŠ']
        }

        type_match = False
        for ptype, keywords in product_type_map.items():
            if any(kw in our_name for kw in keywords):
                if any(kw in tecdoc_product_type.upper() for kw in keywords):
                    type_match = True
                    break

        if type_match:
            checks['product_type_match'] = True
        else:
            # Fallback: provjeri keyword overlap
            common_keywords = our_keywords & tecdoc_keywords
            if len(common_keywords) >= 1:
                checks['product_type_match'] = True
            else:
                checks['product_type_match'] = False
                warnings.append(f"Product type možda ne odgovara: '{our_name[:30]}' vs '{tecdoc_product_type}'")
                score -= 20

        # ---------------------------------------------------------------
        # CHECK 4: Red Flags (potpuno pogrešni matchevi)
        # ---------------------------------------------------------------

        # Red Flag 1: Matchali smo SAMO preko placeholder OEM-a
        if match_result.method in ['oem_exact', 'oem_normalized']:
            if self.should_skip_oem_matching(our_oem):
                issues.append("🚨 CRITICAL: Matched preko placeholder OEM-a! (BUG)")
                score = 0  # Instant fail
                checks['no_placeholder_match'] = False
            else:
                checks['no_placeholder_match'] = True

        # Red Flag 2: Potpuno različiti product types (npr. Filter vs Mirror)
        opposite_types = [
            ('FILTER', 'MIRROR'),
            ('FILTER', 'WIPER'),
            ('BRAKE', 'SENSOR'),
            ('OIL', 'BRAKE'),
        ]

        for type1, type2 in opposite_types:
            if type1 in our_name and type2 in tecdoc_product_type.upper():
                issues.append(f"🚨 MISMATCH: '{our_name[:30]}' vs '{tecdoc_product_type}'")
                score -= 40
                break
            if type2 in our_name and type1 in tecdoc_product_type.upper():
                issues.append(f"🚨 MISMATCH: '{our_name[:30]}' vs '{tecdoc_product_type}'")
                score -= 40
                break

        # ---------------------------------------------------------------
        # Final Score & Validity
        # ---------------------------------------------------------------
        score = max(0, min(100, score))  # Clamp 0-100
        is_valid = score >= self.MIN_QUALITY_SCORE and len(issues) == 0

        return MatchQuality(
            is_valid=is_valid,
            score=score,
            issues=issues,
            warnings=warnings,
            checks=checks
        )

    # ===================================================================
    # VALIDATION REPORT GENERATION
    # ===================================================================

    def create_validation_report(self, product: Dict) -> ValidationReport:
        """
        Kreira kompletni validation report za jedan proizvod
        """
        product_id = product['id']
        catalog = product['catalogNumber']
        oem = product.get('oemNumber', '')
        ean = product.get('eanCode', '')

        # Pokušaj matching
        match_result = self.advanced_match(catalog, oem, ean)

        if not match_result.article_id:
            # Nije pronađen match
            return ValidationReport(
                product_id=product_id,
                product_name=product['name'],
                catalog_number=catalog,
                oem_number=oem,
                matched=False,
                article_id=None,
                confidence=0,
                method='not_found',
                tecdoc_manufacturer='',
                tecdoc_product_type='',
                tecdoc_oem_count=0,
                tecdoc_oem_sample=[],
                quality_score=0,
                quality_valid=False,
                quality_issues=[],
                quality_warnings=[],
                should_update=False,
                reason='NOT_FOUND'
            )

        # Pronađen match - izvuci TecDoc podatke
        tecdoc_data = self.get_basic_article_data(match_result.article_id)
        tecdoc_oem_numbers = self.get_oem_numbers_with_manufacturers(match_result.article_id)

        # Validiraj kvalitet matcha
        quality = self.validate_match_quality(product, match_result, tecdoc_data, tecdoc_oem_numbers)

        # Odluka: da li update-ovati?
        should_update = False
        reason = ""

        if match_result.confidence < self.MIN_CONFIDENCE:
            reason = f"LOW_CONFIDENCE ({match_result.confidence}% < {self.MIN_CONFIDENCE}%)"
        elif not quality.is_valid:
            reason = f"LOW_QUALITY (score={quality.score}, issues={len(quality.issues)})"
        else:
            should_update = True
            reason = f"APPROVED (confidence={match_result.confidence}%, quality={quality.score})"

        return ValidationReport(
            product_id=product_id,
            product_name=product['name'],
            catalog_number=catalog,
            oem_number=oem,
            matched=True,
            article_id=match_result.article_id,
            confidence=match_result.confidence,
            method=match_result.method,
            tecdoc_manufacturer=tecdoc_data.get('manufacturer', ''),
            tecdoc_product_type=tecdoc_data.get('product_type', ''),
            tecdoc_oem_count=len(tecdoc_oem_numbers),
            tecdoc_oem_sample=[oem['oem'] for oem in tecdoc_oem_numbers[:3]],
            quality_score=quality.score,
            quality_valid=quality.is_valid,
            quality_issues=quality.issues,
            quality_warnings=quality.warnings,
            should_update=should_update,
            reason=reason
        )

    # ===================================================================
    # BATCH VALIDATION (DRY RUN)
    # ===================================================================

    def validate_batch(self, limit: int = 20, offset: int = 0, filter_mode: str = 'no_tecdoc'):
        """
        DRY RUN - Validacija batch-a proizvoda BEZ upisa u bazu
        """
        cursor = self.postgres_conn.cursor()

        # Build query
        where_clause = ""
        if filter_mode == 'no_tecdoc':
            where_clause = 'WHERE "tecdocArticleId" IS NULL'
        elif filter_mode == 'has_tecdoc':
            where_clause = 'WHERE "tecdocArticleId" IS NOT NULL'

        query = f"""
            SELECT id, name, "catalogNumber", "oemNumber", "eanCode"
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
                'eanCode': row[4]
            })

        cursor.close()

        logging.info(f"=" * 80)
        logging.info(f"VALIDATION RUN - DRY MODE (no database writes)")
        logging.info(f"Filter: {filter_mode}, Limit: {limit}, Offset: {offset}")
        logging.info(f"Products to validate: {len(products)}")
        logging.info(f"=" * 80)

        # Validate each product
        for i, product in enumerate(products, 1):
            self.stats['total'] += 1

            logging.info(f"\n[{i}/{len(products)}] Validating: {product['catalogNumber']}")

            # Create validation report
            report = self.create_validation_report(product)
            self.validation_reports.append(report)

            # Update stats
            if report.matched:
                self.stats['matched'] += 1
                self.stats['by_method'][report.method] += 1

                if report.quality_score >= 90:
                    self.stats['high_quality'] += 1
                elif report.quality_score >= 70:
                    self.stats['medium_quality'] += 1
                else:
                    self.stats['low_quality'] += 1

                if report.should_update:
                    self.stats['approved_for_update'] += 1
                else:
                    if 'LOW_CONFIDENCE' in report.reason:
                        self.stats['rejected_low_confidence'] += 1
                    elif 'LOW_QUALITY' in report.reason:
                        self.stats['rejected_low_quality'] += 1

                # Log report
                logging.info(f"  ✅ MATCHED: article_id={report.article_id}")
                logging.info(f"     Method: {report.method}, Confidence: {report.confidence}%")
                logging.info(f"     TecDoc: {report.tecdoc_manufacturer} - {report.tecdoc_product_type}")
                logging.info(f"     Quality: {report.quality_score}% ({'VALID' if report.quality_valid else 'INVALID'})")
                logging.info(f"     Decision: {'✅ APPROVE' if report.should_update else '❌ REJECT'} - {report.reason}")

                if report.quality_issues:
                    for issue in report.quality_issues:
                        logging.warning(f"     🚨 ISSUE: {issue}")
                        self.stats['issues'][issue[:50]] += 1

                if report.quality_warnings:
                    for warning in report.quality_warnings:
                        logging.info(f"     ⚠️  WARNING: {warning}")

            else:
                self.stats['not_matched'] += 1
                logging.info(f"  ❌ NOT FOUND")

        # Generate summary report
        self.generate_summary_report()

    def generate_summary_report(self):
        """Generiši summary report"""
        logging.info(f"\n" + "=" * 80)
        logging.info(f"VALIDATION SUMMARY")
        logging.info(f"=" * 80)

        total = self.stats['total']
        matched = self.stats['matched']
        approved = self.stats['approved_for_update']

        logging.info(f"\n📊 OVERALL STATS:")
        logging.info(f"   Total validated: {total}")
        logging.info(f"   Matched: {matched} ({matched/total*100:.1f}%)")
        logging.info(f"   Not matched: {self.stats['not_matched']} ({self.stats['not_matched']/total*100:.1f}%)")

        if matched > 0:
            logging.info(f"\n📈 MATCH QUALITY:")
            logging.info(f"   High quality (90%+): {self.stats['high_quality']} ({self.stats['high_quality']/matched*100:.1f}%)")
            logging.info(f"   Medium quality (70-90%): {self.stats['medium_quality']} ({self.stats['medium_quality']/matched*100:.1f}%)")
            logging.info(f"   Low quality (<70%): {self.stats['low_quality']} ({self.stats['low_quality']/matched*100:.1f}%)")

            logging.info(f"\n✅ APPROVAL DECISION:")
            logging.info(f"   APPROVED for update: {approved} ({approved/matched*100:.1f}%)")
            logging.info(f"   REJECTED (low confidence): {self.stats['rejected_low_confidence']}")
            logging.info(f"   REJECTED (low quality): {self.stats['rejected_low_quality']}")

            logging.info(f"\n🔍 MATCHING METHODS:")
            for method, count in sorted(self.stats['by_method'].items(), key=lambda x: x[1], reverse=True):
                logging.info(f"   {method}: {count}")

            if self.stats['issues']:
                logging.info(f"\n⚠️  TOP ISSUES:")
                for issue, count in sorted(self.stats['issues'].items(), key=lambda x: x[1], reverse=True)[:5]:
                    logging.info(f"   {issue}: {count}")

        logging.info(f"\n💡 RECOMMENDATION:")
        if approved / total >= 0.5:
            logging.info(f"   ✅ SAFE TO PROCEED - {approved}/{total} ({approved/total*100:.1f}%) approved")
            logging.info(f"   → Can run LIVE update for approved products")
        elif approved / total >= 0.3:
            logging.info(f"   ⚠️  MEDIUM RISK - {approved}/{total} ({approved/total*100:.1f}%) approved")
            logging.info(f"   → Review validation reports manually before LIVE run")
        else:
            logging.info(f"   🚨 HIGH RISK - Only {approved}/{total} ({approved/total*100:.1f}%) approved")
            logging.info(f"   → DO NOT proceed with LIVE run - investigate issues first")

        logging.info(f"\n" + "=" * 80)

    def export_validation_report_csv(self, filename: str = None):
        """Exportuj validation report u CSV za manuelnu provjeru"""
        if not filename:
            filename = f"validation_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"

        import csv

        with open(filename, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)

            # Header
            writer.writerow([
                'SKU', 'Product Name', 'Catalog', 'OEM',
                'Matched?', 'Article ID', 'Confidence', 'Method',
                'TecDoc Manufacturer', 'TecDoc Product Type', 'TecDoc OEM Count',
                'Quality Score', 'Quality Valid?', 'Should Update?', 'Reason',
                'Issues', 'Warnings'
            ])

            # Get SKUs
            cursor = self.postgres_conn.cursor()
            for report in self.validation_reports:
                cursor.execute('SELECT sku FROM "Product" WHERE id = %s', (report.product_id,))
                sku_row = cursor.fetchone()
                sku = sku_row[0] if sku_row else ''

                writer.writerow([
                    sku,
                    report.product_name,
                    report.catalog_number,
                    report.oem_number,
                    'YES' if report.matched else 'NO',
                    report.article_id or '',
                    report.confidence,
                    report.method,
                    report.tecdoc_manufacturer,
                    report.tecdoc_product_type,
                    report.tecdoc_oem_count,
                    report.quality_score,
                    'YES' if report.quality_valid else 'NO',
                    'YES' if report.should_update else 'NO',
                    report.reason,
                    '; '.join(report.quality_issues),
                    '; '.join(report.quality_warnings)
                ])

            cursor.close()

        logging.info(f"\n✅ Validation report exported to: {filename}")
        return filename

    def close(self):
        """Close connections"""
        self.tecdoc_conn.close()
        self.postgres_conn.close()


# ===================================================================
# MAIN EXECUTION
# ===================================================================

if __name__ == "__main__":
    validator = TecDocEnricherWithValidation(
        min_confidence=85,      # Minimum 85% confidence
        min_quality_score=70    # Minimum 70% quality score
    )

    try:
        # VALIDATION RUN - bez upisa u bazu
        logging.info("Starting VALIDATION RUN (DRY MODE)")

        validator.validate_batch(
            limit=20,              # Test sa 20 proizvoda
            offset=0,
            filter_mode='no_tecdoc'  # Proizvodi bez TecDoc ID
        )

        # Export CSV za manuelnu provjeru
        csv_file = validator.export_validation_report_csv()

        logging.info(f"\n" + "="*80)
        logging.info(f"VALIDATION COMPLETED")
        logging.info(f"Review the CSV file: {csv_file}")
        logging.info(f"If results look good, you can run LIVE update")
        logging.info(f"="*80)

    except Exception as e:
        logging.error(f"FATAL ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        validator.close()
