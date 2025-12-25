#!/usr/bin/env python3
"""
Skripta za povezivanje proizvoda sa slikama u bazi podataka.

Ažurira Product.imageUrl polje na osnovu SKU-a i dostupnih slika.
Slike su već kopirane u public/uploads/products/ folder.

Nazivi slika: {SKU}_{broj}.{ext} (npr. 29446_1.jpg)
"""

import os
import re
import sys
from pathlib import Path
from typing import Dict, List, Optional
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

# Učitaj environment varijable
load_dotenv()

# Putanje
IMAGES_DIR = Path("public/uploads/images_compressed")  # Koristi compressed jer tu su slike sa SKU imenima

def parse_image_filename(filename: str) -> tuple[str, int, str] | None:
    """
    Parsira naziv slike i vraća (SKU, broj_slike, ekstenzija)

    Primjer: "29446_1.jpg" -> ("29446", 1, "jpg")
    """
    pattern = r'^(\d+)_(\d+)\.(jpg|jpeg|png)$'
    match = re.match(pattern, filename, re.IGNORECASE)

    if match:
        sku = match.group(1)
        image_num = int(match.group(2))
        ext = match.group(3).lower()
        return (sku, image_num, ext)

    return None

def get_images_by_sku(images_dir: Path) -> Dict[str, List[str]]:
    """
    Skenira folder sa slikama i grupira ih po SKU-u.

    Returns:
        Dict sa SKU kao ključem i listom putanja slika (sortirane po broju)
    """
    images_by_sku = {}

    if not images_dir.exists():
        print(f"⚠️  Folder sa slikama ne postoji: {images_dir}")
        return images_by_sku

    for image_file in images_dir.glob('*'):
        if not image_file.is_file():
            continue

        parsed = parse_image_filename(image_file.name)
        if not parsed:
            continue

        sku, image_num, ext = parsed

        # Putanja relativna od public/ foldera (kako Next.js očekuje)
        image_path = f"/uploads/products/{image_file.name}"

        if sku not in images_by_sku:
            images_by_sku[sku] = []

        images_by_sku[sku].append((image_num, image_path))

    # Sortiraj slike po broju (1, 2, 3, ...)
    for sku in images_by_sku:
        images_by_sku[sku].sort(key=lambda x: x[0])
        # Zadrži samo putanje
        images_by_sku[sku] = [path for _, path in images_by_sku[sku]]

    return images_by_sku

def get_db_connection():
    """
    Kreira konekciju sa bazom podataka.
    """
    database_url = os.getenv('DATABASE_URL')

    if not database_url:
        raise Exception("DATABASE_URL nije postavljena u .env fajlu")

    return psycopg2.connect(database_url)

def update_product_images(dry_run: bool = False) -> Dict:
    """
    Ažurira Product.imageUrl polja u bazi na osnovu SKU-a.

    Args:
        dry_run: Ako je True, samo prikazuje šta bi se ažuriralo
    """
    results = {
        'total_images': 0,
        'products_found': 0,
        'products_updated': 0,
        'products_not_found': 0,
        'errors': []
    }

    # Učitaj slike
    print("Skeniranje slika...")
    images_by_sku = get_images_by_sku(IMAGES_DIR)
    results['total_images'] = sum(len(imgs) for imgs in images_by_sku.values())

    print(f"Pronađeno {len(images_by_sku)} SKU-ova sa {results['total_images']} slika")

    if not images_by_sku:
        print("⚠️  Nema slika za obradu!")
        return results

    # Konektuj se na bazu
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        print(f"\n{'[DRY RUN] ' if dry_run else ''}Ažuriranje proizvoda...")

        for sku, image_paths in images_by_sku.items():
            # Prva slika je glavna slika
            main_image = image_paths[0]

            # Pronađi proizvod po SKU-u
            cursor.execute(
                "SELECT id, name, \"imageUrl\", sku FROM \"Product\" WHERE sku = %s",
                (sku,)
            )
            product = cursor.fetchone()

            if not product:
                results['products_not_found'] += 1
                if results['products_not_found'] <= 5:  # Prikaži prvih 5
                    results['errors'].append(f"Proizvod sa SKU {sku} nije pronađen")
                continue

            results['products_found'] += 1

            # Prikaži info
            current_image = product['imageUrl']
            if dry_run:
                print(f"\n[DRY RUN] SKU: {sku}")
                print(f"  Proizvod: {product['name'][:50]}")
                print(f"  Trenutna slika: {current_image or 'Nema'}")
                print(f"  Nova slika: {main_image}")
                if len(image_paths) > 1:
                    print(f"  Dodatne slike ({len(image_paths)-1}): {', '.join(image_paths[1:])}")
            else:
                # Ažuriraj imageUrl
                cursor.execute(
                    "UPDATE \"Product\" SET \"imageUrl\" = %s, \"updatedAt\" = NOW() WHERE id = %s",
                    (main_image, product['id'])
                )

            results['products_updated'] += 1

            # Prikaži progress svakih 100 proizvoda
            if results['products_updated'] % 100 == 0:
                print(f"  Obrađeno: {results['products_updated']}/{len(images_by_sku)}")

        if not dry_run:
            conn.commit()
            print("\n✅ Promjene sačuvane u bazi")

        cursor.close()
        conn.close()

    except Exception as e:
        results['errors'].append(f"Greška sa bazom: {str(e)}")
        print(f"\n❌ Greška: {str(e)}")
        if not dry_run:
            conn.rollback()

    return results

def main():
    import sys

    # Provjeri za -y flag (auto-confirm)
    auto_confirm = '-y' in sys.argv or '--yes' in sys.argv

    print("=" * 80)
    print("POVEZIVANJE PROIZVODA SA SLIKAMA")
    print("=" * 80)
    print(f"\nFolder sa slikama: {IMAGES_DIR}")
    print()

    # Dry run prvo
    print("=" * 80)
    print("DRY RUN - Provjera šta bi se ažuriralo")
    print("=" * 80)

    dry_results = update_product_images(dry_run=True)

    print(f"\n📊 Statistika:")
    print(f"  Ukupno slika: {dry_results['total_images']}")
    print(f"  SKU-ova sa slikama: {dry_results['products_found'] + dry_results['products_not_found']}")
    print(f"  Proizvoda pronađeno: {dry_results['products_found']}")
    print(f"  Proizvoda bi se ažuriralo: {dry_results['products_updated']}")
    print(f"  SKU-ova bez proizvoda: {dry_results['products_not_found']}")

    if dry_results['errors']:
        print(f"\n⚠️  Upozorenja:")
        for error in dry_results['errors'][:5]:
            print(f"  - {error}")
        if len(dry_results['errors']) > 5:
            print(f"  ... i još {len(dry_results['errors']) - 5} upozorenja")

    # Potvrda za ažuriranje
    print("\n" + "=" * 80)
    if auto_confirm:
        print("\n✅ Auto-confirm režim aktiviran, nastavljam sa ažuriranjem...")
        response = 'y'
    else:
        response = input("\n❓ Nastaviti sa ažuriranjem baze? (y/n): ")

    if response.lower() != 'y':
        print("❌ Ažuriranje otkazano.")
        return

    # Stvarno ažuriranje
    print("\n" + "=" * 80)
    print("AŽURIRANJE BAZE...")
    print("=" * 80)

    results = update_product_images(dry_run=False)

    print(f"\n✅ Ažuriranje završeno!")
    print(f"  Proizvoda ažurirano: {results['products_updated']}")
    print(f"  SKU-ova bez proizvoda: {results['products_not_found']}")

    if results['errors']:
        print(f"\n⚠️  Greške:")
        for error in results['errors'][:10]:
            print(f"  - {error}")
        if len(results['errors']) > 10:
            print(f"  ... i još {len(results['errors']) - 10} grešaka")

    print("\n" + "=" * 80)
    print("GOTOVO!")
    print("Proizvodi su povezani sa slikama.")
    print("Next.js će automatski optimizovati slike pri učitavanju.")
    print("=" * 80)

if __name__ == "__main__":
    main()
