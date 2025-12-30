#!/usr/bin/env python3
"""
Spareto.com Image Scraper

Preuzima slike proizvoda sa spareto.com po article numberu.
Respektuje robots.txt (1 sekunda delay između zahtjeva).
"""

import requests
from bs4 import BeautifulSoup
import time
import os
from pathlib import Path
from typing import Optional, List
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

class SparetoImageScraper:
    def __init__(self, output_dir: str = "spareto_images"):
        self.base_url = "https://spareto.com"
        self.search_url = f"{self.base_url}/products"
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)

        # Respektuj robots.txt - 1 second crawl delay
        self.crawl_delay = 1.5  # Malo više za sigurnost

        # User-Agent - identifikuj se
        self.headers = {
            'User-Agent': 'Product Image Scraper (Contact: your-email@example.com)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
        }

    def search_product(self, article_number: str) -> Optional[str]:
        """
        Traži proizvod po article numberu i vraća URL stranice proizvoda.
        """
        search_params = {'keywords': article_number}

        try:
            logging.info(f"Searching for: {article_number}")
            response = requests.get(
                self.search_url,
                params=search_params,
                headers=self.headers,
                timeout=10
            )
            response.raise_for_status()

            soup = BeautifulSoup(response.content, 'html.parser')

            # Pronađi prvi rezultat (product link)
            # Ovo zavisi od strukture HTML-a - možda treba prilagoditi
            product_link = soup.find('a', class_='product-item__title')

            if not product_link:
                # Pokušaj alternative selektore
                product_link = soup.find('a', href=lambda x: x and '/products/' in x)

            if product_link:
                product_url = product_link.get('href')
                if not product_url.startswith('http'):
                    product_url = self.base_url + product_url
                logging.info(f"  Found product: {product_url}")
                return product_url
            else:
                logging.warning(f"  No product found for: {article_number}")
                return None

        except requests.RequestException as e:
            logging.error(f"  Error searching for {article_number}: {e}")
            return None

    def get_product_images(self, product_url: str) -> List[str]:
        """
        IzvlačiURLove slika sa stranice proizvoda.
        """
        try:
            # Respektuj crawl delay
            time.sleep(self.crawl_delay)

            logging.info(f"Fetching product page: {product_url}")
            response = requests.get(product_url, headers=self.headers, timeout=10)
            response.raise_for_status()

            soup = BeautifulSoup(response.content, 'html.parser')

            image_urls = []

            # Pronađi sve img tagove na stranici
            all_imgs = soup.find_all('img')

            for img in all_imgs:
                img_url = img.get('src') or img.get('data-src')
                if img_url:
                    # Filter za CDN slike sa spareto.com
                    if 'cdn.spareto.com' in img_url and '/variants/images/' in img_url:
                        # Filtriraj male slike (thumbnails, icons)
                        if 'icon' not in img_url.lower() and '/thumb/' not in img_url and '/small/' not in img_url:
                            # Ensure full URL
                            if not img_url.startswith('http'):
                                img_url = 'https:' + img_url if img_url.startswith('//') else self.base_url + img_url

                            # Prefer medium or large size
                            if img_url not in image_urls:  # Avoid duplicates
                                image_urls.append(img_url)

            logging.info(f"  Found {len(image_urls)} images")
            return image_urls

        except requests.RequestException as e:
            logging.error(f"  Error fetching product page: {e}")
            return []

    def download_image(self, image_url: str, article_number: str, index: int = 1) -> Optional[str]:
        """
        Downloaduje sliku i sprema je lokalno.
        """
        try:
            # Respektuj crawl delay
            time.sleep(self.crawl_delay)

            logging.info(f"Downloading image {index}: {image_url}")
            response = requests.get(image_url, headers=self.headers, timeout=15)
            response.raise_for_status()

            # Odredi ekstenziju
            ext = '.jpg'
            if 'png' in image_url.lower():
                ext = '.png'
            elif 'webp' in image_url.lower():
                ext = '.webp'

            # Ime fajla
            filename = f"{article_number}_{index}{ext}"
            filepath = self.output_dir / filename

            # Spremi sliku
            with open(filepath, 'wb') as f:
                f.write(response.content)

            logging.info(f"  ✅ Saved: {filename}")
            return str(filepath)

        except requests.RequestException as e:
            logging.error(f"  ❌ Error downloading image: {e}")
            return None

    def scrape_product(self, article_number: str) -> List[str]:
        """
        Kompletni flow: search → get images → download.
        """
        return self.scrape_product_with_sku(article_number, article_number)

    def scrape_product_with_sku(self, article_number: str, sku: str) -> List[str]:
        """
        Kompletni flow sa custom SKU za imenovanje fajlova.
        """
        logging.info(f"Scraping: {article_number} (SKU: {sku})")

        # 1. Search
        product_url = self.search_product(article_number)
        if not product_url:
            return []

        # 2. Get image URLs
        image_urls = self.get_product_images(product_url)
        if not image_urls:
            return []

        # 3. Download images sa SKU imenom
        downloaded = []
        for i, img_url in enumerate(image_urls[:3], 1):  # Max 3 slike
            filepath = self.download_image(img_url, sku, i)
            if filepath:
                downloaded.append(filepath)

        return downloaded


def main():
    """Scrape slike za proizvode iz CSV fajla"""
    import csv
    import sys

    # Putanja do CSV fajla
    csv_path = sys.argv[1] if len(sys.argv) > 1 else "products_without_images.csv"
    output_dir = sys.argv[2] if len(sys.argv) > 2 else "spareto_images"

    if not os.path.exists(csv_path):
        print(f"❌ CSV file not found: {csv_path}")
        print(f"Usage: python {sys.argv[0]} <csv_file> [output_dir]")
        return

    scraper = SparetoImageScraper(output_dir=output_dir)

    print("\n🔍 Spareto Image Scraper\n")
    print(f"CSV: {csv_path}")
    print(f"Output: {output_dir}")
    print(f"Crawl delay: {scraper.crawl_delay}s")
    print(f"{'='*70}\n")

    # Učitaj CSV
    products = []
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            products.append({
                'id': row['id'],
                'catalogNumber': row['catalogNumber'],
                'name': row['name'],
                'sku': row.get('sku', row['catalogNumber'])  # Fallback na catalogNumber
            })

    print(f"Loaded {len(products)} products without images\n")

    # Pitaj korisnika koliko proizvoda da procesira
    try:
        limit = input(f"How many products to scrape? (max {len(products)}, press Enter for 10): ").strip()
        limit = int(limit) if limit else 10
        limit = min(limit, len(products))
    except ValueError:
        limit = 10

    print(f"\nProcessing {limit} products...\n")

    # Scrape
    results = {
        'success': 0,
        'not_found': 0,
        'errors': 0
    }

    for i, product in enumerate(products[:limit], 1):
        catalog = product['catalogNumber']
        sku = product['sku']

        print(f"\n[{i}/{limit}] {catalog} ({product['name'][:50]}...)")

        try:
            # Scrape sa SKU kao filename prefix
            downloaded = scraper.scrape_product_with_sku(catalog, sku)

            if downloaded:
                results['success'] += 1
            else:
                results['not_found'] += 1

        except Exception as e:
            logging.error(f"  ❌ Error: {e}")
            results['errors'] += 1

        # Progress
        if i % 10 == 0:
            print(f"\n--- Progress: {i}/{limit} ({i/limit*100:.1f}%) ---")
            print(f"Success: {results['success']}, Not found: {results['not_found']}, Errors: {results['errors']}")

    # Final summary
    print(f"\n{'='*70}")
    print("FINAL SUMMARY")
    print(f"{'='*70}")
    print(f"Total processed: {limit}")
    print(f"✅ Success: {results['success']}")
    print(f"❌ Not found: {results['not_found']}")
    print(f"⚠️  Errors: {results['errors']}")
    print(f"\nImages saved to: {scraper.output_dir}")

    # Estimate for remaining
    if limit < len(products):
        remaining = len(products) - limit
        avg_time = limit * (scraper.crawl_delay * 3)  # Rough estimate
        est_hours = (remaining * (scraper.crawl_delay * 3)) / 3600
        print(f"\nRemaining: {remaining} products (~{est_hours:.1f}h)")


if __name__ == "__main__":
    main()
