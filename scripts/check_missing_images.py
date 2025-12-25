#!/usr/bin/env python3
"""
Skripta za provjeru proizvoda koji nemaju slike.

Prikazuje:
- Koliko proizvoda nema slike
- Koje SKU-ove nemaju slike
- Statistiku po kategorijama
"""

import os
import re
from pathlib import Path
from typing import Dict, Set
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

# Učitaj environment varijable
load_dotenv()

# Putanje
IMAGES_DIR = Path("public/uploads/images_compressed")

def parse_image_filename(filename: str) -> str | None:
    """
    Parsira naziv slike i vraća SKU.

    Primjer: "29446_1.jpg" -> "29446"
    """
    pattern = r'^(\d+)_\d+\.(jpg|jpeg|png)$'
    match = re.match(pattern, filename, re.IGNORECASE)

    if match:
        return match.group(1)

    return None

def get_available_skus(images_dir: Path) -> Set[str]:
    """
    Vraća set SKU-ova koji imaju slike.
    """
    skus = set()

    if not images_dir.exists():
        print(f"⚠️  Folder sa slikama ne postoji: {images_dir}")
        return skus

    for image_file in images_dir.glob('*'):
        if not image_file.is_file():
            continue

        sku = parse_image_filename(image_file.name)
        if sku:
            skus.add(sku)

    return skus

def get_db_connection():
    """
    Kreira konekciju sa bazom podataka.
    """
    database_url = os.getenv('DATABASE_URL')

    if not database_url:
        raise Exception("DATABASE_URL nije postavljena u .env fajlu")

    return psycopg2.connect(database_url)

def analyze_missing_images():
    """
    Analizira proizvode koji nemaju slike.
    """
    print("=" * 80)
    print("ANALIZA PROIZVODA BEZ SLIKA")
    print("=" * 80)

    # Učitaj dostupne SKU-ove
    print("\nSkeniranje slika...")
    available_skus = get_available_skus(IMAGES_DIR)
    print(f"Pronađeno {len(available_skus)} SKU-ova sa slikama")

    # Konektuj se na bazu
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Ukupan broj proizvoda
        cursor.execute('SELECT COUNT(*) as total FROM "Product" WHERE "isArchived" = false')
        total_products = cursor.fetchone()['total']

        # Proizvodi sa SKU
        cursor.execute('SELECT COUNT(*) as total FROM "Product" WHERE sku IS NOT NULL AND "isArchived" = false')
        products_with_sku = cursor.fetchone()['total']

        # Proizvodi bez SKU
        products_without_sku = total_products - products_with_sku

        print(f"\n📊 Statistika proizvoda:")
        print(f"  Ukupno proizvoda (aktivnih): {total_products}")
        print(f"  Proizvoda sa SKU: {products_with_sku}")
        print(f"  Proizvoda bez SKU: {products_without_sku}")

        # Proizvodi sa SKU koji nemaju slike
        cursor.execute('''
            SELECT sku, name, "categoryId"
            FROM "Product"
            WHERE sku IS NOT NULL
            AND "isArchived" = false
            ORDER BY sku
        ''')
        all_products = cursor.fetchall()

        missing_images = []
        has_images = []

        for product in all_products:
            if product['sku'] not in available_skus:
                missing_images.append(product)
            else:
                has_images.append(product)

        print(f"\n📸 Statistika slika:")
        print(f"  Proizvoda sa slikama: {len(has_images)}")
        print(f"  Proizvoda bez slika: {len(missing_images)}")
        print(f"  Procenat pokrivenosti: {len(has_images) / len(all_products) * 100:.1f}%")

        # Proizvodi bez slika po kategorijama
        if missing_images:
            print(f"\n❌ Proizvodi bez slika ({len(missing_images)}):")

            # Group by category
            category_stats = {}
            for product in missing_images:
                cat_id = product['categoryId']
                if cat_id not in category_stats:
                    category_stats[cat_id] = []
                category_stats[cat_id].append(product)

            # Get category names
            cursor.execute('''
                SELECT id, name
                FROM "Category"
                WHERE id = ANY(%s)
            ''', (list(category_stats.keys()),))

            categories = {cat['id']: cat['name'] for cat in cursor.fetchall()}

            # Print by category
            for cat_id, products in sorted(category_stats.items(), key=lambda x: len(x[1]), reverse=True)[:10]:
                cat_name = categories.get(cat_id, 'Nepoznata kategorija')
                print(f"\n  {cat_name} ({len(products)} proizvoda):")
                for product in products[:5]:
                    print(f"    - SKU {product['sku']}: {product['name'][:60]}")
                if len(products) > 5:
                    print(f"    ... i još {len(products) - 5} proizvoda")

        # Primjeri SKU sa slikama
        if has_images:
            print(f"\n✅ Primjeri SKU sa slikama:")
            for product in has_images[:5]:
                print(f"  - SKU {product['sku']}: {product['name'][:60]}")

        cursor.close()
        conn.close()

        # Export missing SKUs to file
        if missing_images:
            output_file = Path("scripts/missing_images_skus.txt")
            with open(output_file, 'w') as f:
                f.write("# SKU-ovi proizvoda bez slika\n")
                f.write(f"# Ukupno: {len(missing_images)}\n\n")
                for product in missing_images:
                    f.write(f"{product['sku']}\t{product['name']}\n")

            print(f"\n💾 Lista SKU-ova spremljena u: {output_file}")

    except Exception as e:
        print(f"\n❌ Greška: {str(e)}")

    print("\n" + "=" * 80)

if __name__ == "__main__":
    analyze_missing_images()
