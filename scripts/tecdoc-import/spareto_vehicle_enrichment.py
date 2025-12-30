#!/usr/bin/env python3
"""
Spareto Vehicle Enrichment Script

Enriches products with OEM numbers and vehicle fitments from spareto.com
"""

import requests
from bs4 import BeautifulSoup
import time
import psycopg2
import logging
import re
import html
import json
from typing import List, Dict, Optional, Tuple
from datetime import datetime
from urllib.parse import urlparse
from functools import wraps

# Setup logging
logging.basicConfig(
    level=logging.DEBUG,  # Changed to DEBUG for detailed vehicle matching
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('spareto_enrichment.log'),
        logging.StreamHandler()
    ]
)

# Security: Maximum allowed lengths to prevent buffer overflow attacks
MAX_OEM_NUMBER_LENGTH = 50
MAX_MANUFACTURER_LENGTH = 100
MAX_VEHICLE_STRING_LENGTH = 500
MAX_ENGINE_DESC_LENGTH = 200

def sanitize_string(value: str, max_length: int = 255) -> Optional[str]:
    """
    Sanitize and validate string input to prevent injection attacks

    Security measures:
    - Unescape HTML entities
    - Remove null bytes
    - Strip dangerous characters
    - Enforce max length
    - Return None if invalid
    """
    if not value or not isinstance(value, str):
        return None

    # Unescape HTML entities
    value = html.unescape(value)

    # Remove null bytes (can cause SQL injection)
    value = value.replace('\x00', '')

    # Remove control characters except newline/tab
    value = ''.join(char for char in value if char == '\n' or char == '\t' or not char.isspace() and ord(char) >= 32 or char.isspace() and char in ' \n\t')

    # Strip and truncate
    value = value.strip()
    if len(value) > max_length:
        logging.warning(f"String truncated from {len(value)} to {max_length} chars: {value[:50]}...")
        value = value[:max_length]

    return value if value else None

def validate_oem_number(oem_number: str) -> bool:
    """
    Validate OEM number format

    Security: Only allow alphanumeric, spaces, dashes, and common separators
    Prevents SQL injection and XSS
    """
    if not oem_number or len(oem_number) > MAX_OEM_NUMBER_LENGTH:
        return False

    # Only allow: letters, numbers, spaces, dashes, slashes, dots
    pattern = r'^[A-Za-z0-9\s\-/\.]+$'
    if not re.match(pattern, oem_number):
        logging.warning(f"Invalid OEM number format rejected: {oem_number}")
        return False

    return True

def validate_manufacturer(manufacturer: str) -> bool:
    """
    Validate manufacturer name

    Security: Only allow letters, numbers, spaces, and common punctuation
    """
    if not manufacturer or len(manufacturer) > MAX_MANUFACTURER_LENGTH:
        return False

    # Only allow: letters, numbers, spaces, dashes, ampersand, dots
    pattern = r'^[A-Za-z0-9\s\-&\.]+$'
    if not re.match(pattern, manufacturer):
        logging.warning(f"Invalid manufacturer name rejected: {manufacturer}")
        return False

    return True

def retry_with_backoff(max_retries=3, initial_delay=2, backoff_factor=2, exceptions=(Exception,)):
    """
    Decorator for retrying functions with exponential backoff

    Args:
        max_retries: Maximum number of retry attempts
        initial_delay: Initial delay in seconds before first retry
        backoff_factor: Multiplier for delay after each retry
        exceptions: Tuple of exceptions to catch and retry
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            delay = initial_delay
            last_exception = None

            for attempt in range(max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    last_exception = e
                    if attempt < max_retries:
                        logging.warning(f"  Attempt {attempt + 1}/{max_retries + 1} failed: {e}")
                        logging.warning(f"  Retrying in {delay}s...")
                        time.sleep(delay)
                        delay *= backoff_factor
                    else:
                        logging.error(f"  All {max_retries + 1} attempts failed")

            # If all retries failed, raise the last exception
            raise last_exception

        return wrapper
    return decorator

class CheckpointManager:
    """Manages checkpoints for resume functionality"""

    def __init__(self, checkpoint_file: str = 'spareto_enrichment_checkpoint.json'):
        self.checkpoint_file = checkpoint_file
        self.processed_products = set()
        self.failed_products = {}
        self.stats = {}
        self.load()

    def load(self):
        """Load checkpoint from file"""
        try:
            with open(self.checkpoint_file, 'r') as f:
                data = json.load(f)
                self.processed_products = set(data.get('processed_products', []))
                self.failed_products = data.get('failed_products', {})
                self.stats = data.get('stats', {})
                logging.info(f"📋 Checkpoint loaded: {len(self.processed_products)} products already processed")
        except FileNotFoundError:
            logging.info(f"📋 No checkpoint found, starting fresh")
        except Exception as e:
            logging.error(f"Error loading checkpoint: {e}")

    def save(self):
        """Save checkpoint to file"""
        try:
            data = {
                'processed_products': list(self.processed_products),
                'failed_products': self.failed_products,
                'stats': self.stats,
                'last_updated': datetime.now().isoformat()
            }
            with open(self.checkpoint_file, 'w') as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            logging.error(f"Error saving checkpoint: {e}")

    def mark_processed(self, product_id: str):
        """Mark product as successfully processed"""
        self.processed_products.add(product_id)

    def mark_failed(self, product_id: str, error: str):
        """Mark product as failed with error message"""
        self.failed_products[product_id] = {
            'error': str(error),
            'timestamp': datetime.now().isoformat()
        }

    def is_processed(self, product_id: str) -> bool:
        """Check if product was already processed (successfully or failed)"""
        return (product_id in self.processed_products or
                product_id in self.failed_products)

    def update_stats(self, stats: dict):
        """Update stats in checkpoint"""
        self.stats = stats

    def clear(self):
        """Clear checkpoint (start fresh)"""
        self.processed_products = set()
        self.failed_products = {}
        self.stats = {}
        try:
            import os
            if os.path.exists(self.checkpoint_file):
                os.remove(self.checkpoint_file)
                logging.info(f"✅ Checkpoint cleared")
        except Exception as e:
            logging.error(f"Error clearing checkpoint: {e}")

def validate_url(url: str, allowed_domain: str = "spareto.com") -> bool:
    """
    Validate URL to prevent SSRF attacks

    Security: Only allow requests to spareto.com domain
    """
    try:
        parsed = urlparse(url)
        if parsed.netloc != allowed_domain:
            logging.error(f"SECURITY: Blocked request to unauthorized domain: {parsed.netloc}")
            return False
        return True
    except Exception as e:
        logging.error(f"SECURITY: Invalid URL format: {url}")
        return False

def sql_escape(value: str) -> str:
    """Escape single quotes for SQL string literals"""
    if value is None:
        return 'NULL'
    return value.replace("'", "''")

class SparetoEnricher:
    def __init__(self, db_conn_string: str, output_file: Optional[str] = None, enable_checkpoint: bool = True):
        """
        Initialize with database connection

        Args:
            db_conn_string: PostgreSQL connection string
            output_file: If provided, writes SQL to file instead of executing
            enable_checkpoint: Enable checkpoint for resume functionality
        """
        self.base_url = "https://spareto.com"
        self.search_url = f"{self.base_url}/products"
        self.crawl_delay = 1.5  # Respect robots.txt (1s + margin)

        # SQL output mode
        self.sql_mode = output_file is not None
        self.output_file = output_file
        self.sql_statements = []
        self.enriched_product_ids = []

        # Checkpoint manager for resume functionality
        self.enable_checkpoint = enable_checkpoint
        self.checkpoint = CheckpointManager() if enable_checkpoint else None

        # Headers
        self.headers = {
            'User-Agent': 'Spareto Vehicle Enrichment Bot (Contact: info@omerbasic.com)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
        }

        # Security: SSL verification enabled
        self.verify_ssl = True
        self.timeout = 60  # Request timeout to prevent hanging (increased from 30s)

        # Database connection
        self.conn = psycopg2.connect(db_conn_string)
        self.conn.autocommit = False if not self.sql_mode else True

        # Load brand aliases from database
        self.brand_aliases = self._load_brand_aliases()

        # Statistics
        self.stats = {
            'products_processed': 0,
            'products_found': 0,
            'oem_numbers_added': 0,
            'fitments_added': 0,
            'errors': 0,
            'skipped_no_vehicle': 0,
            'skipped_no_match': 0
        }

        # Track unmatched vehicles for later review
        self.unmatched_vehicles = []

        if self.sql_mode:
            logging.info(f"🔧 SQL MODE: Will write statements to {output_file}")
        else:
            logging.info(f"💾 DATABASE MODE: Will write directly to database")

    def _load_brand_aliases(self) -> Dict[str, str]:
        """
        Load vehicle brands from database and create comprehensive alias mapping
        Returns: {alias: canonical_brand_name}
        """
        aliases = {}
        try:
            cursor = self.conn.cursor()
            cursor.execute('SELECT DISTINCT name FROM "VehicleBrand" ORDER BY name')
            brands = [row[0] for row in cursor.fetchall()]

            for brand in brands:
                # Add original name (lowercase)
                aliases[brand.lower()] = brand

                # Brand-specific aliases
                if brand == "Volkswagen":
                    aliases["vw"] = brand
                    aliases["volkswagen"] = brand

                elif brand == "Mercedes Benz":  # Note: space, no hyphen in DB
                    aliases["mercedes"] = brand
                    aliases["mb"] = brand
                    aliases["mercedes-benz"] = brand
                    aliases["mercedes benz"] = brand
                    aliases["merc"] = brand

                elif brand == "Mercedes-Benz Trucks":
                    aliases["mercedes trucks"] = brand
                    aliases["mb trucks"] = brand
                    aliases["mercedes-benz trucks"] = brand

                elif brand == "Bmw":
                    aliases["bmw"] = brand

                elif brand == "Mini":
                    aliases["mini"] = brand

                elif brand == "Skoda":
                    aliases["škoda"] = brand  # With special character
                    aliases["skoda"] = brand

                elif brand == "Citroen":
                    aliases["citroën"] = brand  # With special character
                    aliases["citroen"] = brand

                elif brand == "Alfa Romeo":
                    aliases["alfa"] = brand
                    aliases["alfa romeo"] = brand
                    aliases["alfaromeo"] = brand

                elif brand == "Land Rover":
                    aliases["land rover"] = brand
                    aliases["landrover"] = brand
                    aliases["lr"] = brand

                elif brand == "Chevrolet":
                    aliases["chevrolet"] = brand
                    aliases["chevy"] = brand

                elif brand == "Jaguar":
                    aliases["jaguar"] = brand
                    aliases["jag"] = brand

                elif brand == "Mitsubishi":
                    aliases["mitsubishi"] = brand
                    aliases["mitsu"] = brand

                elif brand == "Renault Trucks":
                    aliases["renault trucks"] = brand

                elif brand == "Volvo Trucks":
                    aliases["volvo trucks"] = brand

                # Generic handling for other brands with spaces
                elif " " in brand:
                    first_word = brand.split()[0].lower()
                    if first_word not in aliases:
                        aliases[first_word] = brand
                    # Add version without space
                    aliases[brand.replace(" ", "").lower()] = brand

            logging.info(f"📋 Loaded {len(brands)} brands with {len(aliases)} aliases")
            return aliases

        except Exception as e:
            logging.error(f"Error loading brand aliases: {e}")
            return {}

    @retry_with_backoff(max_retries=3, initial_delay=2, exceptions=(requests.exceptions.RequestException, requests.exceptions.Timeout))
    def search_product(self, catalog_number: str) -> Optional[str]:
        """Search for product and return product URL (with automatic retry)"""
        try:
            time.sleep(self.crawl_delay)

            # Security: Sanitize catalog number
            catalog_number = sanitize_string(catalog_number, max_length=100)
            if not catalog_number:
                logging.error("Invalid catalog number")
                return None

            logging.info(f"Searching for: {catalog_number}")
            response = requests.get(
                self.search_url,
                params={'keywords': catalog_number},
                headers=self.headers,
                timeout=self.timeout,
                verify=self.verify_ssl  # Security: Verify SSL certificates
            )
            response.raise_for_status()

            soup = BeautifulSoup(response.content, 'html.parser')

            # Find product link
            product_link = soup.find('a', href=lambda x: x and '/products/' in x)

            if product_link:
                product_url = product_link.get('href')
                if not product_url.startswith('http'):
                    product_url = self.base_url + product_url

                # Security: Validate URL before returning
                if not validate_url(product_url, allowed_domain="spareto.com"):
                    logging.error(f"SECURITY: Invalid product URL rejected: {product_url}")
                    return None

                logging.info(f"  Found: {product_url}")
                return product_url
            else:
                logging.warning(f"  Not found on spareto.com")
                return None

        except Exception as e:
            logging.error(f"  Error searching: {e}")
            return None

    def extract_oem_numbers(self, soup: BeautifulSoup) -> List[Dict[str, str]]:
        """Extract OEM numbers from product page (Spareto specific format)"""
        oem_numbers = []

        try:
            # Spareto format: Look for h3 with "OE Numbers" text
            oe_heading = None
            for h3 in soup.find_all('h3'):
                if 'OE Numbers' in h3.get_text() or 'OE Number' in h3.get_text():
                    oe_heading = h3
                    break

            if not oe_heading:
                logging.debug("  No OE Numbers section found")
                return []

            # Find all manufacturer divs (class="row py-2") after the h3
            element = oe_heading.find_next_sibling()

            while element and element.name not in ['h2', 'h3', 'h4']:
                # Look for div with classes "row" and "py-2"
                if element.name == 'div' and element.get('class'):
                    classes = element.get('class', [])
                    if 'row' in classes and 'py-2' in classes:
                        # Extract manufacturer name from first nested div
                        manufacturer_name = None
                        all_divs = element.find_all('div', recursive=False)
                        if all_divs and len(all_divs) >= 1:
                            first_div = all_divs[0]
                            raw_manufacturer = first_div.get_text(strip=True)

                            # Security: Sanitize and validate manufacturer
                            manufacturer_name = sanitize_string(raw_manufacturer, MAX_MANUFACTURER_LENGTH)
                            if manufacturer_name and not validate_manufacturer(manufacturer_name):
                                logging.warning(f"Invalid manufacturer rejected: {raw_manufacturer}")
                                manufacturer_name = None

                        # Find all OE number links in this div
                        oe_links = element.find_all('a', href=lambda x: x and '/oe/' in x if x else False)
                        for link in oe_links:
                            oe_number = link.get_text(strip=True)
                            # Clean up spaces (e.g., "77 00 100 671" -> "7700100671")
                            oe_clean = oe_number.replace(' ', '').replace('-', '')

                            # Security: Sanitize and validate OEM number
                            oe_clean = sanitize_string(oe_clean, MAX_OEM_NUMBER_LENGTH)
                            if oe_clean and validate_oem_number(oe_clean) and len(oe_clean) > 3:
                                oem_numbers.append({
                                    'oemNumber': oe_clean,
                                    'manufacturer': manufacturer_name
                                })
                            elif oe_clean:
                                logging.warning(f"Invalid OEM number rejected: {oe_clean}")

                element = element.find_next_sibling()

            # Remove duplicates
            seen = set()
            unique_oem = []
            for oem in oem_numbers:
                if oem['oemNumber'] not in seen:
                    seen.add(oem['oemNumber'])
                    unique_oem.append(oem)

            logging.info(f"  Found {len(unique_oem)} OEM numbers")
            return unique_oem

        except Exception as e:
            logging.error(f"  Error extracting OEM numbers: {e}")
            return []

    def extract_vehicles(self, soup: BeautifulSoup) -> List[str]:
        """Extract vehicle compatibility list from Spareto table format"""
        vehicles = []

        try:
            # Look for h2 "Fit Vehicles"
            fit_heading = None
            for h2 in soup.find_all('h2'):
                h2_text = h2.get_text()
                if 'Fit' in h2_text and 'Vehicle' in h2_text:
                    fit_heading = h2
                    break

            if not fit_heading:
                logging.debug("  No Fit Vehicles section found")
                return []

            # Find container div (next sibling of h2)
            container_div = fit_heading.find_next_sibling('div')
            if not container_div:
                logging.debug("  No container div found after Fit Vehicles")
                return []

            # Find all brand sections (divs with data-controller="collapse")
            brand_sections = container_div.find_all('div', {'data-controller': 'collapse'}, recursive=False)

            for brand_section in brand_sections:
                # Extract brand name from first div in the section
                # Format: "OPEL\n39 vehicles"
                first_div = brand_section.find('div')
                if first_div:
                    brand_text = first_div.get_text().strip()
                    # Extract just the brand name (first line before \n)
                    brand_name = brand_text.split('\n')[0].strip().title()
                else:
                    brand_name = "Unknown"

                # Find all tables in this brand section
                tables = brand_section.find_all('table')
                for table in tables:
                    tbody = table.find('tbody')
                    if tbody:
                        for row in tbody.find_all('tr'):
                            cells = row.find_all('td')
                            # Skip empty rows
                            if len(cells) >= 6 and cells[1].get_text(strip=True):
                                # Table structure: Body | Model | Produced | KW | HP | CCM
                                body = cells[0].get_text(strip=True)
                                model_text = cells[1].get_text(strip=True)
                                produced = cells[2].get_text(strip=True)
                                kw = cells[3].get_text(strip=True)
                                hp = cells[4].get_text(strip=True)
                                ccm = cells[5].get_text(strip=True)

                                # Build vehicle string: "Brand Model | Produced | KW | HP | CCM"
                                vehicle_str = f"{brand_name} {model_text} | {produced} | {kw} KW | {hp} HP | {ccm} CCM"
                                vehicles.append(vehicle_str)

            # Remove duplicates
            vehicles = list(set(vehicles))

            logging.info(f"  Found {len(vehicles)} vehicle fitments")
            return vehicles[:100]  # Limit to 100 to avoid excessive processing

        except Exception as e:
            logging.error(f"  Error extracting vehicles: {e}")
            return []

    def parse_vehicle_string(self, vehicle_str: str) -> Optional[Dict]:
        """
        Parse Spareto table format with comprehensive pattern matching:
        Examples:
        - "Opel VECTRA B Hatchback (38_) 1.6 i (F68) | 1995-10 - 2000-09 | 55 KW | 75 HP | 1598 CCM"
        - "Vw GOLF IV Variant (1J5) 2.3 V5 4motion | 2000-05 - 2006-06 | 125 KW | 170 HP | 2324 CCM"
        - "Bmw 3 Gran Turismo (F34) 320 d | 2013-07 - 2019-08 | 140 KW | 190 HP | 1995 CCM"
        - "Audi A6 C5 Avant (4B5, 4B6) 2.5 TDI | 1997-02 - 2005-01 | 132 KW | 180 HP | 2496 CCM"
        - "Mercedes-Benz ACTROS MP4 / MP5 2443 LS | 2011-10 - 2018-09 | 315 KW | 428 HP | 12809 CCM"

        Returns: {brand, model, gen_codes, engine_desc, year_from, year_to, power_kw, capacity_ccm}
        """
        try:
            # Split by pipe to get main parts
            parts = vehicle_str.split('|')
            if len(parts) < 5:
                logging.debug(f"  Invalid format (not enough parts): {vehicle_str}")
                return None

            model_part = parts[0].strip()
            date_part = parts[1].strip()
            kw_part = parts[2].strip()
            hp_part = parts[3].strip()
            ccm_part = parts[4].strip()

            # Extract KW, HP, CCM values
            kw_match = re.search(r'(\d+)', kw_part)
            hp_match = re.search(r'(\d+)', hp_part)
            ccm_match = re.search(r'(\d+)', ccm_part)

            power_kw = int(kw_match.group(1)) if kw_match else None
            power_hp = int(hp_match.group(1)) if hp_match else None
            capacity_ccm = int(ccm_match.group(1)) if ccm_match else None

            # Parse model_part using flexible approach
            # Step 1: Extract generation code(s) from parentheses - this is the anchor point
            gen_code_match = re.search(r'\(([^\)]+)\)', model_part)
            if not gen_code_match:
                logging.debug(f"  No generation code found: {model_part}")
                return None

            gen_codes_str = gen_code_match.group(1)
            # Handle multiple codes: "4B5, 4B6" or "E92, E93" - split and take all
            gen_codes = [code.strip() for code in gen_codes_str.replace(',', ' ').split() if code.strip()]

            # Step 2: Get text before and after generation code
            before_gen = model_part[:gen_code_match.start()].strip()
            after_gen = model_part[gen_code_match.end():].strip()

            # Step 3: Parse before_gen: "Brand Model [GenName] [BodyType]"
            # Common body types to strip (case-insensitive)
            body_types = [
                'Variant', 'Avant', 'Coupe', 'Convertible', 'Cabrio', 'Cabriolet',
                'Touring', 'Gran Turismo', 'Gran Coupe', 'Sportback', 'Limousine',
                'Van', 'Combi', 'Estate', 'Hatchback', 'Sedan', 'Saloon', 'Roadster',
                'Pickup', 'SUV', 'Crossover', 'Wagon', 'Stationwagon'
            ]

            # Split before_gen into words
            words = before_gen.split()
            if len(words) < 2:
                logging.debug(f"  Not enough words before generation code: {before_gen}")
                return None

            # Step 4: Try to identify brand (could be 1-3 words)
            brand = None
            brand_word_count = 0

            # Try 3 words (e.g., "Mercedes-Benz Trucks")
            if len(words) >= 3:
                three_word = f"{words[0]} {words[1]} {words[2]}"
                if three_word.lower() in self.brand_aliases:
                    brand = self.brand_aliases[three_word.lower()]
                    brand_word_count = 3

            # Try 2 words (e.g., "Alfa Romeo", "Land Rover", "Mercedes-Benz")
            if not brand and len(words) >= 2:
                two_word = f"{words[0]} {words[1]}"
                if two_word.lower() in self.brand_aliases:
                    brand = self.brand_aliases[two_word.lower()]
                    brand_word_count = 2
                # Also try hyphenated version
                hyphenated = f"{words[0]}-{words[1]}"
                if not brand and hyphenated.lower() in self.brand_aliases:
                    brand = self.brand_aliases[hyphenated.lower()]
                    brand_word_count = 2

            # Try 1 word (most brands)
            if not brand and len(words) >= 1:
                if words[0].lower() in self.brand_aliases:
                    brand = self.brand_aliases[words[0].lower()]
                    brand_word_count = 1

            if not brand:
                logging.debug(f"  Brand not found in: {before_gen}")
                return None

            # Step 5: Everything after brand is model + optional gen name + optional body type
            model_words = words[brand_word_count:]

            # Remove body types from end (working backwards)
            while model_words:
                last_word = model_words[-1]
                # Check if last word (or last 2 words) match a body type
                is_body_type = False

                # Check multi-word body types (Gran Turismo, Gran Coupe)
                if len(model_words) >= 2:
                    last_two = f"{model_words[-2]} {model_words[-1]}"
                    if any(last_two.lower() == bt.lower() for bt in body_types):
                        model_words = model_words[:-2]
                        is_body_type = True
                        continue

                # Check single word body types
                if any(last_word.lower() == bt.lower() for bt in body_types):
                    model_words.pop()
                    is_body_type = True
                    continue

                # No more body types found
                if not is_body_type:
                    break

            if not model_words:
                logging.debug(f"  No model name found after removing body types: {before_gen}")
                return None

            model = ' '.join(model_words)

            # Step 6: Clean up engine description (remove trailing parentheses with engine codes)
            engine_desc = re.sub(r'\s*\([^\)]*\)$', '', after_gen).strip()

            # Step 7: Parse date range: "1995-10 - 2000-09" or "2011-10 - 2018-09"
            date_matches = re.findall(r'(\d{4})', date_part)
            year_from = int(date_matches[0]) if len(date_matches) > 0 else None
            year_to = int(date_matches[1]) if len(date_matches) > 1 else year_from

            return {
                'brand': brand,
                'model': model,
                'gen_codes': gen_codes,  # Can be multiple codes now
                'engine_desc': engine_desc,
                'year_from': year_from,
                'year_to': year_to,
                'power_kw': power_kw,
                'capacity_ccm': capacity_ccm
            }

        except Exception as e:
            logging.error(f"  Error parsing vehicle string '{vehicle_str}': {e}")
            return None

    def find_generation(self, brand: str, model: str, gen_codes: List[str]) -> Optional[str]:
        """Find matching generation ID in database (with brand alias support and fuzzy matching)"""
        try:
            cursor = self.conn.cursor()

            # Resolve brand alias
            brand_canonical = self.brand_aliases.get(brand.lower(), brand)
            if brand_canonical != brand:
                logging.debug(f"  Resolved brand alias: {brand} → {brand_canonical}")

            # Get ALL potential matches (exact + fuzzy) sorted by:
            # 1. Number of engines (more engines = more established generation) - PRIORITIZE THIS
            # 2. Exact model match as tiebreaker
            cursor.execute("""
                SELECT
                    vg.id,
                    vg.name,
                    vm.name as model_name,
                    CASE WHEN LOWER(vm.name) = LOWER(%s) THEN 1 ELSE 2 END as match_type,
                    COUNT(ve.id) as engine_count
                FROM "VehicleGeneration" vg
                JOIN "VehicleModel" vm ON vg."modelId" = vm.id
                JOIN "VehicleBrand" vb ON vm."brandId" = vb.id
                LEFT JOIN "VehicleEngine" ve ON ve."generationId" = vg.id
                WHERE LOWER(vb.name) = LOWER(%s)
                  AND (
                    LOWER(vm.name) = LOWER(%s)  -- Exact match
                    OR LOWER(vm.name) LIKE LOWER(%s) || ' %%'  -- Fuzzy: model starts with search
                    OR LOWER(%s) LIKE LOWER(vm.name) || ' %%'  -- Fuzzy: search starts with model
                    OR LOWER(vm.name) LIKE '%%' || LOWER(%s)   -- Fuzzy: model ends with search
                    OR LOWER(%s) LIKE '%%' || LOWER(vm.name)   -- Fuzzy: search ends with model
                  )
                GROUP BY vg.id, vg.name, vm.name
                ORDER BY engine_count DESC, match_type ASC
            """, (model, brand_canonical, model, model, model, model, model))

            all_generations = cursor.fetchall()

            # First pass: Try to match generation codes
            for gen_id, gen_name, model_name, match_type, engine_count in all_generations:
                gen_name_lower = gen_name.lower()
                for code in gen_codes:
                    code_lower = code.lower().strip()
                    if code_lower in gen_name_lower:
                        match_label = "exact model" if match_type == 1 else "fuzzy model"
                        logging.debug(f"  Matched generation ({match_label}): {model_name} - {gen_name} ({engine_count} engines)")
                        return gen_id

            # Second pass: No generation code match, return first result (best match by our sort order)
            if all_generations:
                gen_id, gen_name, model_name, match_type, engine_count = all_generations[0]
                match_label = "exact model" if match_type == 1 else "fuzzy model"
                logging.debug(f"  Using first generation ({match_label}): {model_name} - {gen_name} ({engine_count} engines)")
                return gen_id

            logging.debug(f"  No generation found for {brand_canonical} {model}")
            return None

        except Exception as e:
            logging.error(f"  Error finding generation: {e}")
            return None

    def find_engine(self, generation_id: str, engine_desc: str, power_kw: Optional[int] = None,
                   capacity_ccm: Optional[int] = None) -> Optional[str]:
        """Find matching engine ID in database"""
        try:
            cursor = self.conn.cursor()

            # Use provided power/capacity or extract from description
            if not power_kw:
                power_match = re.search(r'(\d+)\s*kW', engine_desc, re.IGNORECASE)
                power_kw = int(power_match.group(1)) if power_match else None

            if not capacity_ccm:
                capacity_match = re.search(r'(\d+\.?\d*)\s*[TL]?D?I?', engine_desc)
                if capacity_match:
                    capacity_liters = float(capacity_match.group(1))
                    capacity_ccm = int(capacity_liters * 1000)  # Convert to cc

            # Determine fuel type
            fuel_type = None
            if re.search(r'TDI|dTi|dCi|D|diesel', engine_desc, re.IGNORECASE):
                fuel_type = 'DIESEL'
            elif re.search(r'T|TFSI|TSI|FSI|petrol|gasoline', engine_desc, re.IGNORECASE):
                fuel_type = 'PETROL'

            # Build query
            query = """
                SELECT id, "engineCode", "enginePowerKW", "engineCapacity", "engineType"
                FROM "VehicleEngine"
                WHERE "generationId" = %s
            """
            params = [generation_id]

            if fuel_type:
                query += ' AND "engineType" = %s'
                params.append(fuel_type)

            cursor.execute(query, params)
            engines = cursor.fetchall()

            if not engines:
                logging.debug(f"  No engines found for generation")
                return None

            # Match by power (±5% tolerance)
            if power_kw:
                for eng_id, code, power, cap, etype in engines:
                    if power and abs(power - power_kw) / max(power, power_kw) <= 0.05:
                        logging.debug(f"  Matched engine by power: {code} ({power}kW)")
                        return eng_id

            # Match by capacity (±100cc tolerance)
            if capacity_ccm:
                for eng_id, code, power, cap, etype in engines:
                    if cap and abs(cap - capacity_ccm) <= 100:
                        logging.debug(f"  Matched engine by capacity: {code} ({cap}cc)")
                        return eng_id

            # Fallback: return first engine with matching fuel type
            if engines:
                logging.debug(f"  Using first engine: {engines[0][1]} ({engines[0][4]})")
                return engines[0][0]

            logging.debug(f"  No engine found for: {engine_desc}")
            return None

        except Exception as e:
            logging.error(f"  Error finding engine: {e}")
            return None

    def insert_oem_number(self, product_id: str, oem_number: str, manufacturer: Optional[str] = None):
        """Insert OEM number if not exists (or add to SQL statements)"""
        try:
            cursor = self.conn.cursor()

            # Check if exists
            cursor.execute("""
                SELECT id FROM "ArticleOENumber"
                WHERE "productId" = %s AND "oemNumber" = %s
            """, (product_id, oem_number))

            if cursor.fetchone():
                logging.debug(f"  OEM already exists: {oem_number}")
                return False

            if self.sql_mode:
                # Add to SQL statements
                manuf_sql = f"'{sql_escape(manufacturer)}'" if manufacturer else 'NULL'
                sql = f"INSERT INTO \"ArticleOENumber\" (id, \"productId\", \"oemNumber\", manufacturer, \"createdAt\", \"updatedAt\") VALUES (gen_random_uuid(), '{product_id}', '{sql_escape(oem_number)}', {manuf_sql}, NOW(), NOW());"
                self.sql_statements.append(sql)
            else:
                # Insert directly
                cursor.execute("""
                    INSERT INTO "ArticleOENumber"
                    ("id", "productId", "oemNumber", "manufacturer", "createdAt", "updatedAt")
                    VALUES (gen_random_uuid(), %s, %s, %s, NOW(), NOW())
                """, (product_id, oem_number, manufacturer))

            self.stats['oem_numbers_added'] += 1
            logging.info(f"  ✅ Added OEM: {oem_number}")
            return True

        except Exception as e:
            logging.error(f"  Error inserting OEM number: {e}")
            return False

    def insert_fitment(self, product_id: str, generation_id: str, engine_id: Optional[str],
                      year_from: Optional[int] = None, year_to: Optional[int] = None):
        """Insert vehicle fitment if not exists (or add to SQL statements)"""
        try:
            cursor = self.conn.cursor()

            # Check if exists
            if engine_id:
                cursor.execute("""
                    SELECT id FROM "ProductVehicleFitment"
                    WHERE "productId" = %s
                      AND "generationId" = %s
                      AND "engineId" = %s
                """, (product_id, generation_id, engine_id))
            else:
                cursor.execute("""
                    SELECT id FROM "ProductVehicleFitment"
                    WHERE "productId" = %s
                      AND "generationId" = %s
                      AND "engineId" IS NULL
                """, (product_id, generation_id))

            if cursor.fetchone():
                logging.debug(f"  Fitment already exists")
                return False

            if self.sql_mode:
                # Add to SQL statements
                engine_sql = f"'{engine_id}'" if engine_id else 'NULL'
                year_from_sql = str(year_from) if year_from else 'NULL'
                year_to_sql = str(year_to) if year_to else 'NULL'
                sql = f"INSERT INTO \"ProductVehicleFitment\" (id, \"productId\", \"generationId\", \"engineId\", \"yearFrom\", \"yearTo\", \"createdAt\", \"updatedAt\") VALUES (gen_random_uuid(), '{product_id}', '{generation_id}', {engine_sql}, {year_from_sql}, {year_to_sql}, NOW(), NOW());"
                self.sql_statements.append(sql)
            else:
                # Insert directly
                cursor.execute("""
                    INSERT INTO "ProductVehicleFitment"
                    ("id", "productId", "generationId", "engineId", "yearFrom", "yearTo",
                     "createdAt", "updatedAt")
                    VALUES (gen_random_uuid(), %s, %s, %s, %s, %s, NOW(), NOW())
                """, (product_id, generation_id, engine_id, year_from, year_to))

            self.stats['fitments_added'] += 1
            logging.info(f"  ✅ Added fitment: generation={generation_id}, engine={engine_id}")
            return True

        except Exception as e:
            logging.error(f"  Error inserting fitment: {e}")
            return False

    @retry_with_backoff(max_retries=3, initial_delay=2, exceptions=(requests.exceptions.RequestException, requests.exceptions.Timeout))
    def _fetch_product_page(self, product_url: str) -> BeautifulSoup:
        """Fetch and parse product page (with automatic retry)"""
        time.sleep(self.crawl_delay)
        response = requests.get(
            product_url,
            headers=self.headers,
            timeout=self.timeout,
            verify=self.verify_ssl  # Security: Verify SSL certificates
        )
        response.raise_for_status()
        return BeautifulSoup(response.content, 'html.parser')

    def enrich_product(self, product_id: str, catalog_number: str) -> bool:
        """Enrich single product with OEM numbers and vehicle fitments"""
        try:
            logging.info(f"\n{'='*70}")
            logging.info(f"Processing: {catalog_number} (ID: {product_id})")

            # Check if already processed (from checkpoint)
            if self.checkpoint and self.checkpoint.is_processed(product_id):
                logging.info(f"  ⏭️  Skipping (already processed in previous run)")
                return True

            # Search product
            product_url = self.search_product(catalog_number)
            if not product_url:
                if self.checkpoint:
                    self.checkpoint.mark_failed(product_id, "Product not found on Spareto")
                return False

            self.stats['products_found'] += 1

            # Fetch product page (with retry)
            soup = self._fetch_product_page(product_url)

            # Extract OEM numbers
            oem_numbers = self.extract_oem_numbers(soup)
            for oem in oem_numbers:
                self.insert_oem_number(product_id, oem['oemNumber'], oem['manufacturer'])

            # Extract vehicles
            vehicles = self.extract_vehicles(soup)
            if not vehicles:
                logging.info("  No vehicles found")
                self.stats['skipped_no_vehicle'] += 1

            for vehicle_str in vehicles:
                parsed = self.parse_vehicle_string(vehicle_str)
                if not parsed:
                    continue

                # Find generation
                generation_id = self.find_generation(
                    parsed['brand'],
                    parsed['model'],
                    parsed['gen_codes']
                )

                if not generation_id:
                    logging.debug(f"  Skipped (no match): {vehicle_str}")
                    self.stats['skipped_no_match'] += 1
                    # Track unmatched vehicle for later review
                    self.unmatched_vehicles.append({
                        'product_id': product_id,
                        'catalog_number': catalog_number,
                        'vehicle_string': vehicle_str,
                        'parsed': parsed
                    })
                    continue

                # Find engine
                engine_id = self.find_engine(generation_id, parsed['engine_desc'])

                # Insert fitment (even if engine not found - generation-level fitment)
                self.insert_fitment(
                    product_id,
                    generation_id,
                    engine_id,
                    parsed.get('year_from'),
                    parsed.get('year_to')
                )

            # Mark product for update
            if self.sql_mode:
                self.enriched_product_ids.append(product_id)
            else:
                # Mark as enriched in database
                cursor = self.conn.cursor()
                cursor.execute("""
                    UPDATE "Product"
                    SET "sparetoEnrichedAt" = NOW()
                    WHERE id = %s
                """, (product_id,))

                # Commit transaction
                self.conn.commit()

            self.stats['products_processed'] += 1

            # Mark as processed in checkpoint
            if self.checkpoint:
                self.checkpoint.mark_processed(product_id)

            return True

        except Exception as e:
            logging.error(f"  ❌ Error enriching product: {e}")
            if not self.sql_mode:
                self.conn.rollback()
            self.stats['errors'] += 1

            # Mark as failed in checkpoint
            if self.checkpoint:
                self.checkpoint.mark_failed(product_id, str(e))

            return False

    def write_unmatched_vehicles_report(self):
        """Write report of unmatched vehicles for later import"""
        if not self.unmatched_vehicles:
            logging.info("No unmatched vehicles to report")
            return

        import json
        from collections import defaultdict

        # Group by brand -> model -> generation codes
        grouped = defaultdict(lambda: defaultdict(lambda: defaultdict(list)))

        for entry in self.unmatched_vehicles:
            parsed = entry['parsed']
            brand = parsed['brand']
            model = parsed['model']
            gen_codes_key = ', '.join(parsed['gen_codes'])

            grouped[brand][model][gen_codes_key].append({
                'vehicle_string': entry['vehicle_string'],
                'engine_desc': parsed['engine_desc'],
                'year_range': f"{parsed['year_from']}-{parsed['year_to']}",
                'power_kw': parsed['power_kw'],
                'capacity_ccm': parsed['capacity_ccm'],
                'catalog_number': entry['catalog_number']
            })

        # Write JSON report with product IDs for later linking
        json_file = self.output_file.replace('.sql', '_unmatched_vehicles.json')

        # Enhanced JSON with product tracking
        enhanced_grouped = {}
        for entry in self.unmatched_vehicles:
            parsed = entry['parsed']
            brand = parsed['brand']
            model = parsed['model']
            gen_codes_key = ', '.join(parsed['gen_codes'])

            if brand not in enhanced_grouped:
                enhanced_grouped[brand] = {}
            if model not in enhanced_grouped[brand]:
                enhanced_grouped[brand][model] = {}
            if gen_codes_key not in enhanced_grouped[brand][model]:
                enhanced_grouped[brand][model][gen_codes_key] = {
                    'generation_info': {
                        'gen_codes': parsed['gen_codes'],
                        'year_range': f"{parsed['year_from']}-{parsed['year_to']}"
                    },
                    'products': [],
                    'engines': []
                }

            # Add product info
            enhanced_grouped[brand][model][gen_codes_key]['products'].append({
                'product_id': entry['product_id'],
                'catalog_number': entry['catalog_number'],
                'vehicle_string': entry['vehicle_string']
            })

            # Add unique engine info
            engine_key = f"{parsed['engine_desc']}_{parsed['power_kw']}_{parsed['capacity_ccm']}"
            engine_exists = any(
                e['engine_desc'] == parsed['engine_desc'] and
                e['power_kw'] == parsed['power_kw'] and
                e['capacity_ccm'] == parsed['capacity_ccm']
                for e in enhanced_grouped[brand][model][gen_codes_key]['engines']
            )
            if not engine_exists:
                enhanced_grouped[brand][model][gen_codes_key]['engines'].append({
                    'engine_desc': parsed['engine_desc'],
                    'year_from': parsed['year_from'],
                    'year_to': parsed['year_to'],
                    'power_kw': parsed['power_kw'],
                    'capacity_ccm': parsed['capacity_ccm']
                })

        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump(enhanced_grouped, f, indent=2, ensure_ascii=False)

        # Write human-readable report
        report_file = self.output_file.replace('.sql', '_unmatched_vehicles.txt')
        with open(report_file, 'w', encoding='utf-8') as f:
            f.write("=" * 80 + "\n")
            f.write("UNMATCHED VEHICLES REPORT\n")
            f.write(f"Total unmatched: {len(self.unmatched_vehicles)}\n")
            f.write("=" * 80 + "\n\n")

            for brand in sorted(grouped.keys()):
                f.write(f"\n{'='*80}\n")
                f.write(f"BRAND: {brand}\n")
                f.write(f"{'='*80}\n")

                for model in sorted(grouped[brand].keys()):
                    f.write(f"\n  MODEL: {model}\n")
                    f.write(f"  {'-'*76}\n")

                    for gen_codes in sorted(grouped[brand][model].keys()):
                        vehicles = grouped[brand][model][gen_codes]
                        f.write(f"    Generation codes: {gen_codes}\n")
                        f.write(f"    Count: {len(vehicles)} products affected\n")

                        # Show unique engine variants
                        engines = set()
                        for v in vehicles:
                            engines.add(f"{v['engine_desc']} ({v['power_kw']}kW, {v['capacity_ccm']}cc)")

                        f.write(f"    Engines:\n")
                        for engine in sorted(engines):
                            f.write(f"      - {engine}\n")

                        f.write(f"    Example: {vehicles[0]['vehicle_string']}\n")
                        f.write("\n")

        logging.info(f"\n{'='*70}")
        logging.info(f"📋 Unmatched vehicles report written:")
        logging.info(f"  JSON: {json_file}")
        logging.info(f"  TXT:  {report_file}")
        logging.info(f"  Total unmatched: {len(self.unmatched_vehicles)}")
        logging.info(f"  Unique brands: {len(grouped)}")
        logging.info(f"{'='*70}")

        # Write SQL template for creating missing vehicles
        self._write_vehicle_insert_template(grouped, enhanced_grouped)

    def _write_vehicle_insert_template(self, grouped, enhanced_grouped):
        """Generate SQL template for inserting missing vehicles"""
        sql_template_file = self.output_file.replace('.sql', '_missing_vehicles_template.sql')

        with open(sql_template_file, 'w', encoding='utf-8') as f:
            f.write("-- Template for inserting missing vehicles\n")
            f.write("-- Generated from Spareto enrichment unmatched vehicles\n")
            f.write("-- INSTRUCTIONS:\n")
            f.write("--   1. Review each section\n")
            f.write("--   2. Uncomment and edit the INSERT statements you want to add\n")
            f.write("--   3. Adjust 'type' field for VehicleBrand (PASSENGER or COMMERCIAL)\n")
            f.write("--   4. Ensure brandId, modelId references are correct\n")
            f.write("--   5. Run this SQL file to insert missing vehicles\n\n")
            f.write("BEGIN;\n\n")

            for brand in sorted(grouped.keys()):
                f.write(f"\n-- {'='*70}\n")
                f.write(f"-- BRAND: {brand}\n")
                f.write(f"-- {'='*70}\n\n")

                # Check if brand exists
                f.write(f"-- Check if brand exists:\n")
                f.write(f"-- SELECT id, name, type FROM \"VehicleBrand\" WHERE LOWER(name) = LOWER('{sql_escape(brand)}');\n\n")

                # Detect vehicle type (PASSENGER or COMMERCIAL)
                brand_lower = brand.lower()
                is_commercial = any(x in brand_lower for x in ['trucks', 'bus', 'van', 'commercial', 'iveco', 'man', 'scania', 'volvo trucks', 'mercedes-benz trucks', 'renault trucks'])
                vehicle_type = 'COMMERCIAL' if is_commercial else 'PASSENGER'

                # Brand insert (commented out)
                f.write(f"-- If brand doesn't exist, create it:\n")
                f.write(f"-- INSERT INTO \"VehicleBrand\" (id, name, type, source, \"createdAt\", \"updatedAt\")\n")
                f.write(f"-- VALUES (\n")
                f.write(f"--   gen_random_uuid(),\n")
                f.write(f"--   '{sql_escape(brand)}',\n")
                f.write(f"--   '{vehicle_type}',  -- EDIT: PASSENGER or COMMERCIAL\n")
                f.write(f"--   'SPARETO',\n")
                f.write(f"--   NOW(),\n")
                f.write(f"--   NOW()\n")
                f.write(f"-- ) ON CONFLICT (name) DO NOTHING;\n\n")

                for model in sorted(grouped[brand].keys()):
                    f.write(f"\n-- MODEL: {model}\n")
                    f.write(f"-- {'-'*68}\n\n")

                    for gen_codes in sorted(grouped[brand][model].keys()):
                        vehicles = grouped[brand][model][gen_codes]
                        example = vehicles[0]

                        # Parse year range
                        year_from_str, year_to_str = example['year_range'].split('-')
                        year_from = int(year_from_str)
                        year_to = int(year_to_str)

                        f.write(f"-- Generation: {gen_codes}\n")
                        f.write(f"-- Year range: {example['year_range']}\n")
                        f.write(f"-- Engines: {len(set(v['engine_desc'] for v in vehicles))} variants\n")
                        f.write(f"-- Example: {example['vehicle_string']}\n\n")

                        # Model insert (commented out)
                        f.write(f"-- INSERT INTO \"VehicleModel\" (id, name, \"brandId\", \"createdAt\", \"updatedAt\")\n")
                        f.write(f"-- VALUES (\n")
                        f.write(f"--   gen_random_uuid(),\n")
                        f.write(f"--   '{sql_escape(model)}',\n")
                        f.write(f"--   (SELECT id FROM \"VehicleBrand\" WHERE LOWER(name) = LOWER('{sql_escape(brand)}')),\n")
                        f.write(f"--   NOW(),\n")
                        f.write(f"--   NOW()\n")
                        f.write(f"-- ) ON CONFLICT DO NOTHING;\n\n")

                        # Generation insert (commented out) - FIXED: productionStart/End are String, not Int
                        f.write(f"-- INSERT INTO \"VehicleGeneration\" (id, name, \"modelId\", \"productionStart\", \"productionEnd\", \"createdAt\", \"updatedAt\")\n")
                        f.write(f"-- VALUES (\n")
                        f.write(f"--   gen_random_uuid(),\n")
                        f.write(f"--   '{sql_escape(gen_codes)}',  -- Edit this name as needed\n")
                        f.write(f"--   (SELECT id FROM \"VehicleModel\" WHERE LOWER(name) = LOWER('{sql_escape(model)}') AND \"brandId\" = (SELECT id FROM \"VehicleBrand\" WHERE LOWER(name) = LOWER('{sql_escape(brand)}'))),\n")
                        f.write(f"--   '{year_from}',  -- productionStart (String)\n")
                        f.write(f"--   '{year_to}',    -- productionEnd (String)\n")
                        f.write(f"--   NOW(),\n")
                        f.write(f"--   NOW()\n")
                        f.write(f"-- ) ON CONFLICT DO NOTHING;\n\n")

                        # Engine inserts (commented out)
                        unique_engines = {}
                        for v in vehicles:
                            key = (v['engine_desc'], v['power_kw'], v['capacity_ccm'])
                            if key not in unique_engines:
                                unique_engines[key] = v

                        for (engine_desc, power_kw, capacity_ccm), v in unique_engines.items():
                            # Determine fuel type
                            fuel_type = 'PETROL'
                            engine_upper = engine_desc.upper()
                            if any(x in engine_upper for x in ['TDI', 'DTI', 'DCI', 'DIESEL']):
                                fuel_type = 'DIESEL'
                            elif any(x in engine_upper for x in ['HYBRID', 'ELECTRIC', 'EV']):
                                fuel_type = 'ELECTRIC'
                            elif 'CNG' in engine_upper or 'LPG' in engine_upper:
                                fuel_type = 'GAS'

                            # Parse year range for this specific engine variant
                            engine_year_from = year_from
                            engine_year_to = year_to

                            f.write(f"-- INSERT INTO \"VehicleEngine\" (\n")
                            f.write(f"--   id, \"engineCode\", \"enginePowerKW\", \"engineCapacity\", \"engineType\",\n")
                            f.write(f"--   \"generationId\", source, \"createdAt\", \"updatedAt\"\n")
                            f.write(f"-- ) VALUES (\n")
                            f.write(f"--   gen_random_uuid(),\n")
                            f.write(f"--   '{sql_escape(engine_desc)}',\n")
                            f.write(f"--   {power_kw if power_kw else 'NULL'},\n")
                            f.write(f"--   {capacity_ccm if capacity_ccm else 'NULL'},\n")
                            f.write(f"--   '{fuel_type}',  -- EDIT: PETROL/DIESEL/ELECTRIC/GAS/HYBRID\n")
                            f.write(f"--   (SELECT id FROM \"VehicleGeneration\" WHERE name = '{sql_escape(gen_codes)}' AND \"modelId\" = (SELECT id FROM \"VehicleModel\" WHERE LOWER(name) = LOWER('{sql_escape(model)}') AND \"brandId\" = (SELECT id FROM \"VehicleBrand\" WHERE LOWER(name) = LOWER('{sql_escape(brand)}')))),\n")
                            f.write(f"--   'SPARETO',\n")
                            f.write(f"--   NOW(),\n")
                            f.write(f"--   NOW()\n")
                            f.write(f"-- ) ON CONFLICT DO NOTHING;\n\n")

                        f.write("\n")

            f.write("COMMIT;\n\n")
            f.write("-- ============================================================================\n")
            f.write("-- NOTES:\n")
            f.write("-- - VehicleBrand.type must be 'PASSENGER' or 'COMMERCIAL'\n")
            f.write("-- - VehicleGeneration.productionStart/End are String (e.g., '2010', '2015')\n")
            f.write("-- - VehicleEngine.engineType: PETROL, DIESEL, ELECTRIC, GAS, HYBRID\n")
            f.write("-- - All externalId fields can be used for TecDoc IDs if needed\n")
            f.write("-- ============================================================================\n")

        logging.info(f"  SQL Template: {sql_template_file}")
        logging.info(f"  ^ Review and uncomment lines to insert missing vehicles")

        # Generate linking SQL for products
        self._write_product_linking_sql(enhanced_grouped)

        # Generate PostgreSQL table SQL for unmatched vehicles
        self.write_unmatched_to_postgres_table(enhanced_grouped)

    def _write_product_linking_sql(self, grouped):
        """Generate SQL to link products with newly added vehicles"""
        linking_sql_file = self.output_file.replace('.sql', '_link_products.sql')

        with open(linking_sql_file, 'w', encoding='utf-8') as f:
            f.write("-- Product-Vehicle Linking SQL\n")
            f.write("-- Generated from Spareto enrichment unmatched vehicles\n")
            f.write("-- INSTRUCTIONS:\n")
            f.write("--   1. First, run the *_missing_vehicles_template.sql to add vehicles\n")
            f.write("--   2. Then run THIS file to link products with those vehicles\n")
            f.write("--   3. This will create ProductVehicleFitment records\n\n")
            f.write("BEGIN;\n\n")

            total_fitments = 0

            for brand in sorted(grouped.keys()):
                f.write(f"\n-- {'='*70}\n")
                f.write(f"-- BRAND: {brand}\n")
                f.write(f"-- {'='*70}\n\n")

                for model in sorted(grouped[brand].keys()):
                    for gen_codes in sorted(grouped[brand][model].keys()):
                        data = grouped[brand][model][gen_codes]
                        products = data['products']
                        engines = data['engines']
                        gen_info = data['generation_info']

                        f.write(f"-- Model: {model}, Generation: {gen_codes}\n")
                        f.write(f"-- Products: {len(products)}, Engines: {len(engines)}\n\n")

                        # For each product
                        for product in products:
                            product_id = product['product_id']
                            catalog_number = product['catalog_number']

                            # For each engine variant
                            for engine in engines:
                                year_range = f"{engine['year_from']}-{engine['year_to']}"

                                f.write(f"-- Product: {catalog_number}, Engine: {engine['engine_desc']}\n")
                                f.write(f"INSERT INTO \"ProductVehicleFitment\" (\n")
                                f.write(f"  id, \"productId\", \"generationId\", \"engineId\", \"yearFrom\", \"yearTo\",\n")
                                f.write(f"  \"createdAt\", \"updatedAt\"\n")
                                f.write(f") VALUES (\n")
                                f.write(f"  gen_random_uuid(),\n")
                                f.write(f"  '{product_id}',\n")
                                f.write(f"  (SELECT id FROM \"VehicleGeneration\" WHERE name = '{sql_escape(gen_codes)}' AND \"modelId\" = (SELECT id FROM \"VehicleModel\" WHERE LOWER(name) = LOWER('{sql_escape(model)}') AND \"brandId\" = (SELECT id FROM \"VehicleBrand\" WHERE LOWER(name) = LOWER('{sql_escape(brand)}')) LIMIT 1) LIMIT 1),\n")
                                f.write(f"  (SELECT id FROM \"VehicleEngine\" WHERE \"engineCode\" = '{sql_escape(engine['engine_desc'])}' AND \"generationId\" = (SELECT id FROM \"VehicleGeneration\" WHERE name = '{sql_escape(gen_codes)}' AND \"modelId\" = (SELECT id FROM \"VehicleModel\" WHERE LOWER(name) = LOWER('{sql_escape(model)}') AND \"brandId\" = (SELECT id FROM \"VehicleBrand\" WHERE LOWER(name) = LOWER('{sql_escape(brand)}')) LIMIT 1) LIMIT 1) LIMIT 1),\n")
                                f.write(f"  {engine['year_from']},\n")
                                f.write(f"  {engine['year_to']},\n")
                                f.write(f"  NOW(),\n")
                                f.write(f"  NOW()\n")
                                f.write(f") ON CONFLICT DO NOTHING;\n\n")
                                total_fitments += 1

            f.write("COMMIT;\n\n")
            f.write(f"-- Total fitments to create: {total_fitments}\n")
            f.write("-- ============================================================================\n")
            f.write("-- IMPORTANT: Run this AFTER adding vehicles from *_missing_vehicles_template.sql\n")
            f.write("-- ============================================================================\n")

        logging.info(f"  Linking SQL: {linking_sql_file}")
        logging.info(f"  ^ Run this AFTER adding vehicles to link products (estimated {total_fitments} fitments)")

    def write_unmatched_to_postgres_table(self, enhanced_grouped):
        """Generate SQL to create table and insert unmatched vehicles"""
        table_sql_file = self.output_file.replace('.sql', '_unmatched_table.sql')

        with open(table_sql_file, 'w', encoding='utf-8') as f:
            # Create table
            f.write("-- Spareto Unmatched Vehicles Table\n")
            f.write("-- This table stores vehicles found on Spareto that don't exist in our database\n\n")

            f.write("-- Drop table if exists (careful in production!)\n")
            f.write("-- DROP TABLE IF EXISTS \"Spareto_UnmatchedVehicles\";\n\n")

            f.write("CREATE TABLE IF NOT EXISTS \"Spareto_UnmatchedVehicles\" (\n")
            f.write("  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,\n")
            f.write("  \"productId\" TEXT NOT NULL,\n")
            f.write("  \"catalogNumber\" TEXT,\n")
            f.write("  brand TEXT NOT NULL,\n")
            f.write("  model TEXT NOT NULL,\n")
            f.write("  \"genCodes\" TEXT[] NOT NULL,\n")
            f.write("  \"vehicleString\" TEXT NOT NULL,\n")
            f.write("  \"engineDesc\" TEXT,\n")
            f.write("  \"yearFrom\" INTEGER,\n")
            f.write("  \"yearTo\" INTEGER,\n")
            f.write("  \"powerKW\" INTEGER,\n")
            f.write("  \"capacityCCM\" INTEGER,\n")
            f.write("  \"scrapedAt\" TIMESTAMP DEFAULT NOW(),\n")
            f.write("  \"createdAt\" TIMESTAMP DEFAULT NOW()\n")
            f.write(");\n\n")

            # Create indexes
            f.write("-- Indexes for faster querying\n")
            f.write("CREATE INDEX IF NOT EXISTS idx_unmatched_brand ON \"Spareto_UnmatchedVehicles\" (brand);\n")
            f.write("CREATE INDEX IF NOT EXISTS idx_unmatched_model ON \"Spareto_UnmatchedVehicles\" (brand, model);\n")
            f.write("CREATE INDEX IF NOT EXISTS idx_unmatched_product ON \"Spareto_UnmatchedVehicles\" (\"productId\");\n")
            f.write("CREATE INDEX IF NOT EXISTS idx_unmatched_catalog ON \"Spareto_UnmatchedVehicles\" (\"catalogNumber\");\n\n")

            f.write("BEGIN;\n\n")

            total_inserts = 0

            # Insert data
            for brand in sorted(enhanced_grouped.keys()):
                f.write(f"\n-- Brand: {brand}\n")

                for model in sorted(enhanced_grouped[brand].keys()):
                    for gen_codes_key in sorted(enhanced_grouped[brand][model].keys()):
                        data = enhanced_grouped[brand][model][gen_codes_key]
                        gen_codes = data['generation_info']['gen_codes']

                        # For each product
                        for product in data['products']:
                            product_id = product['product_id']
                            catalog_number = product['catalog_number']
                            vehicle_string = product['vehicle_string']

                            # For each unique engine
                            for engine in data['engines']:
                                # PostgreSQL ARRAY syntax: ARRAY['code1', 'code2']
                                gen_codes_array = '[' + ','.join(f"'{code}'" for code in gen_codes) + ']'

                                f.write(f"INSERT INTO \"Spareto_UnmatchedVehicles\" (\n")
                                f.write(f"  id, \"productId\", \"catalogNumber\", brand, model, \"genCodes\",\n")
                                f.write(f"  \"vehicleString\", \"engineDesc\", \"yearFrom\", \"yearTo\",\n")
                                f.write(f"  \"powerKW\", \"capacityCCM\"\n")
                                f.write(f") VALUES (\n")
                                f.write(f"  gen_random_uuid()::text,\n")
                                f.write(f"  '{product_id}',\n")
                                f.write(f"  '{sql_escape(catalog_number)}',\n")
                                f.write(f"  '{sql_escape(brand)}',\n")
                                f.write(f"  '{sql_escape(model)}',\n")
                                f.write(f"  ARRAY{gen_codes_array},\n")
                                f.write(f"  '{sql_escape(vehicle_string)}',\n")
                                f.write(f"  '{sql_escape(engine['engine_desc'])}',\n")
                                f.write(f"  {engine['year_from']},\n")
                                f.write(f"  {engine['year_to']},\n")
                                f.write(f"  {engine['power_kw'] if engine['power_kw'] else 'NULL'},\n")
                                f.write(f"  {engine['capacity_ccm'] if engine['capacity_ccm'] else 'NULL'}\n")
                                f.write(f") ON CONFLICT (id) DO NOTHING;\n\n")
                                total_inserts += 1

            f.write("COMMIT;\n\n")
            f.write(f"-- Total inserts: {total_inserts}\n")
            f.write(f"-- Check results: SELECT brand, model, COUNT(*) FROM \"Spareto_UnmatchedVehicles\" GROUP BY brand, model ORDER BY brand, model;\n")

        logging.info(f"  Table SQL: {table_sql_file}")
        logging.info(f"  ^ Creates table and inserts {total_inserts} unmatched vehicle records")

    def write_sql_file(self):
        """Write collected SQL statements to file"""
        try:
            with open(self.output_file, 'w', encoding='utf-8') as f:
                f.write("-- Spareto Enrichment SQL Import\n")
                f.write(f"-- Generated: {datetime.now().isoformat()}\n")
                f.write(f"-- Products processed: {self.stats['products_processed']}\n")
                f.write(f"-- OEM numbers: {self.stats['oem_numbers_added']}\n")
                f.write(f"-- Fitments: {self.stats['fitments_added']}\n")
                f.write("\n")
                f.write("BEGIN;\n\n")

                # Add all OEM and fitment statements
                if self.sql_statements:
                    f.write("-- OEM Numbers and Vehicle Fitments\n")
                    f.write("-- Using ON CONFLICT DO NOTHING to skip duplicates\n\n")

                    # Group statements for better readability
                    oem_statements = [s for s in self.sql_statements if 'ArticleOENumber' in s]
                    fitment_statements = [s for s in self.sql_statements if 'ProductVehicleFitment' in s]

                    if oem_statements:
                        f.write("-- OEM Numbers\n")
                        for stmt in oem_statements:
                            # Add ON CONFLICT DO NOTHING
                            stmt_with_conflict = stmt.replace(');', ') ON CONFLICT DO NOTHING;')
                            f.write(stmt_with_conflict + '\n')
                        f.write('\n')

                    if fitment_statements:
                        f.write("-- Vehicle Fitments\n")
                        for stmt in fitment_statements:
                            # Add ON CONFLICT DO NOTHING
                            stmt_with_conflict = stmt.replace(');', ') ON CONFLICT DO NOTHING;')
                            f.write(stmt_with_conflict + '\n')
                        f.write('\n')

                # Add product updates
                if self.enriched_product_ids:
                    f.write("-- Mark products as enriched\n")
                    f.write("UPDATE \"Product\" SET \"sparetoEnrichedAt\" = NOW()\n")
                    f.write("WHERE id IN (\n")
                    for i, prod_id in enumerate(self.enriched_product_ids):
                        comma = ',' if i < len(self.enriched_product_ids) - 1 else ''
                        f.write(f"  '{prod_id}'{comma}\n")
                    f.write(");\n\n")

                f.write("COMMIT;\n")

            logging.info(f"\n{'='*70}")
            logging.info(f"✅ SQL file written: {self.output_file}")
            logging.info(f"{'='*70}")
            logging.info(f"Total SQL statements: {len(self.sql_statements)}")
            logging.info(f"Products to update: {len(self.enriched_product_ids)}")
            logging.info(f"\nTo import:")
            logging.info(f"  psql -U postgres omerbasicdb < {self.output_file}")
            logging.info(f"{'='*70}")

        except Exception as e:
            logging.error(f"Error writing SQL file: {e}")

    def run(self, limit: int = 100):
        """Run enrichment for products without Spareto enrichment"""
        try:
            cursor = self.conn.cursor()

            # Categories to skip (no OEM numbers needed)
            excluded_categories = [
                'cmhqgvuez0002jr04nydfazr6',  # ADR oprema
                'cmhqgvz2g0003jr04gcf2yd1f',  # Autopraonice
                'cmhqgw8ru0005jr04ablp4il8',  # Gume
                'cmhqhe4xx001rom7fhgeu9oet',  # Točkovi / gume
                'cmhqhe6mz0033om7fq18qr151',  # Točkovi / gume
                'cmhqgw3d20004jr04pzjgsfur'   # Ulja i maziva
            ]

            # Get products without Spareto enrichment, excluding certain categories
            # Prioritize products without TecDoc ID (they need enrichment more)
            cursor.execute("""
                SELECT id, "catalogNumber", name
                FROM "Product"
                WHERE "sparetoEnrichedAt" IS NULL
                  AND "catalogNumber" IS NOT NULL
                  AND ("categoryId" IS NULL OR "categoryId" NOT IN %s)
                ORDER BY
                  CASE WHEN "tecdocArticleId" IS NULL THEN 0 ELSE 1 END,
                  id ASC
                LIMIT %s
            """, (tuple(excluded_categories), limit))

            products = cursor.fetchall()

            logging.info(f"\n{'='*70}")
            logging.info(f"SPARETO ENRICHMENT - Starting")
            logging.info(f"{'='*70}")
            logging.info(f"Products to process: {len(products)}")
            logging.info(f"Crawl delay: {self.crawl_delay}s")
            logging.info(f"Mode: {'SQL OUTPUT' if self.sql_mode else 'DATABASE'}")
            logging.info(f"{'='*70}\n")

            for i, (product_id, catalog_number, name) in enumerate(products, 1):
                logging.info(f"[{i}/{len(products)}] {catalog_number} - {name[:50]}...")
                self.enrich_product(product_id, catalog_number)

                # Progress report and checkpoint save every 10 products
                if i % 10 == 0:
                    self.print_stats()
                    # Save checkpoint every 10 products
                    if self.checkpoint:
                        self.checkpoint.update_stats(self.stats)
                        self.checkpoint.save()
                        logging.info(f"💾 Checkpoint saved ({len(self.checkpoint.processed_products)} products)")

            # Final stats
            logging.info(f"\n{'='*70}")
            logging.info("FINAL SUMMARY")
            logging.info(f"{'='*70}")
            self.print_stats()

            # Save final checkpoint
            if self.checkpoint:
                self.checkpoint.update_stats(self.stats)
                self.checkpoint.save()
                logging.info(f"💾 Final checkpoint saved")
                if self.checkpoint.failed_products:
                    logging.warning(f"⚠️  {len(self.checkpoint.failed_products)} products failed - check checkpoint file")

            # Write SQL file if in SQL mode
            if self.sql_mode:
                self.write_sql_file()
                self.write_unmatched_vehicles_report()

        except Exception as e:
            logging.error(f"Fatal error: {e}")
            # Save checkpoint on crash
            if self.checkpoint:
                self.checkpoint.update_stats(self.stats)
                self.checkpoint.save()
                logging.info(f"💾 Emergency checkpoint saved before exit")
        finally:
            self.conn.close()

    def print_stats(self):
        """Print current statistics"""
        logging.info(f"Products processed:    {self.stats['products_processed']}")
        logging.info(f"Products found:        {self.stats['products_found']}")
        logging.info(f"OEM numbers added:     {self.stats['oem_numbers_added']}")
        logging.info(f"Fitments added:        {self.stats['fitments_added']}")
        logging.info(f"Skipped (no vehicle):  {self.stats['skipped_no_vehicle']}")
        logging.info(f"Skipped (no match):    {self.stats['skipped_no_match']}")
        logging.info(f"Errors:                {self.stats['errors']}")
        logging.info(f"{'='*70}")


def test_catalog_number(catalog_number: str, output_file: Optional[str] = None):
    """Test enrichment for a specific catalog number"""
    import os
    db_conn = os.getenv('DATABASE_URL', 'postgresql://emir_mw@localhost:5432/omerbasicdb')

    enricher = SparetoEnricher(db_conn, output_file=output_file)
    cursor = enricher.conn.cursor()

    # Get product by catalog number
    cursor.execute("""
        SELECT id, "catalogNumber", name
        FROM "Product"
        WHERE "catalogNumber" = %s
    """, (catalog_number,))

    result = cursor.fetchone()
    if not result:
        logging.error(f"Product with catalogNumber {catalog_number} not found")
        return

    product_id, catalog_number, name = result

    logging.info(f"\n{'='*70}")
    logging.info(f"SPARETO ENRICHMENT - Testing Catalog Number")
    logging.info(f"{'='*70}")
    logging.info(f"Product: {catalog_number} - {name}")
    logging.info(f"{'='*70}\n")

    enricher.enrich_product(product_id, catalog_number)
    enricher.print_stats()

    if enricher.sql_mode:
        enricher.write_sql_file()
        enricher.write_unmatched_vehicles_report()


def main():
    """Main entry point"""
    import sys
    import os
    import argparse

    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Spareto Vehicle Enrichment Script')
    parser.add_argument('limit', type=int, nargs='?', default=10,
                       help='Number of products to process (default: 10)')
    parser.add_argument('--output', '-o', type=str, default=None,
                       help='Output SQL file (if specified, writes SQL instead of executing)')
    parser.add_argument('--test', type=str, default=None,
                       help='Test with specific catalog number')
    parser.add_argument('--clear-checkpoint', action='store_true',
                       help='Clear checkpoint and start fresh')
    parser.add_argument('--no-checkpoint', action='store_true',
                       help='Disable checkpoint system (not recommended for large batches)')

    args = parser.parse_args()

    # Database connection string - use environment variable or default
    db_conn = os.getenv('DATABASE_URL', 'postgresql://emir_mw@localhost:5432/omerbasicdb')

    # Clear checkpoint if requested
    if args.clear_checkpoint:
        checkpoint = CheckpointManager()
        checkpoint.clear()
        logging.info("Checkpoint cleared. Starting fresh...")

    # Test mode
    if args.test:
        test_catalog_number(args.test, output_file=args.output)
        return

    # Normal mode
    enable_checkpoint = not args.no_checkpoint
    enricher = SparetoEnricher(db_conn, output_file=args.output, enable_checkpoint=enable_checkpoint)
    enricher.run(limit=args.limit)


if __name__ == "__main__":
    main()
