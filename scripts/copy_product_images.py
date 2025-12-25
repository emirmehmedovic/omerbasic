#!/usr/bin/env python3
"""
Skripta za kopiranje slika proizvoda iz images_compressed u products folder.

Slike su imenovane kao {SKU}_{broj}.{ext} (npr. 29446_1.jpg)
- Prvi dio prije "_" je SKU artikla
- Drugi dio je broj slike (1, 2, itd.)

Skripta kopira sve slike u public/uploads/products/ folder radi optimalne
Next.js Image Optimization performanse.
"""

import os
import shutil
from pathlib import Path
import re
from typing import Dict, List, Tuple

# Putanje
SOURCE_DIR = Path("public/uploads/images_compressed")
DEST_DIR = Path("public/uploads/products")

def parse_image_filename(filename: str) -> Tuple[str, int, str] | None:
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

def get_image_stats(source_dir: Path) -> Dict:
    """
    Analizira slike i vraća statistiku.
    """
    stats = {
        'total_images': 0,
        'skus_with_images': set(),
        'multiple_images': set(),
        'extensions': {},
        'errors': []
    }

    if not source_dir.exists():
        stats['errors'].append(f"Source folder ne postoji: {source_dir}")
        return stats

    for image_file in source_dir.glob('*'):
        if not image_file.is_file():
            continue

        parsed = parse_image_filename(image_file.name)
        if parsed:
            sku, image_num, ext = parsed
            stats['total_images'] += 1
            stats['skus_with_images'].add(sku)

            if image_num > 1:
                stats['multiple_images'].add(sku)

            stats['extensions'][ext] = stats['extensions'].get(ext, 0) + 1
        else:
            stats['errors'].append(f"Nevalidan format naziva: {image_file.name}")

    return stats

def copy_images(source_dir: Path, dest_dir: Path, dry_run: bool = False) -> Dict:
    """
    Kopira slike iz source_dir u dest_dir.

    Args:
        source_dir: Izvorni folder sa slikama
        dest_dir: Odredišni folder
        dry_run: Ako je True, samo prikazuje šta bi se kopiralo bez kopiranja
    """
    results = {
        'copied': 0,
        'skipped': 0,
        'errors': []
    }

    if not source_dir.exists():
        results['errors'].append(f"Source folder ne postoji: {source_dir}")
        return results

    # Kreiraj destinacijski folder ako ne postoji
    if not dry_run:
        dest_dir.mkdir(parents=True, exist_ok=True)

    for image_file in sorted(source_dir.glob('*')):
        if not image_file.is_file():
            continue

        parsed = parse_image_filename(image_file.name)
        if not parsed:
            results['skipped'] += 1
            results['errors'].append(f"Preskočen nevalidan fajl: {image_file.name}")
            continue

        dest_file = dest_dir / image_file.name

        # Provjeri da li fajl već postoji
        if dest_file.exists():
            # Uporedi veličine fajlova
            if dest_file.stat().st_size == image_file.stat().st_size:
                results['skipped'] += 1
                continue

        # Kopiraj fajl
        if not dry_run:
            try:
                shutil.copy2(image_file, dest_file)
                results['copied'] += 1
            except Exception as e:
                results['errors'].append(f"Greška pri kopiranju {image_file.name}: {str(e)}")
        else:
            print(f"[DRY RUN] Bi kopirao: {image_file.name}")
            results['copied'] += 1

    return results

def main():
    import sys

    # Provjeri za -y flag (auto-confirm)
    auto_confirm = '-y' in sys.argv or '--yes' in sys.argv

    print("=" * 80)
    print("KOPIRANJE SLIKA PROIZVODA")
    print("=" * 80)
    print(f"\nIzvor: {SOURCE_DIR}")
    print(f"Destinacija: {DEST_DIR}")
    print()

    # Statistika slika
    print("Analiza slika...")
    stats = get_image_stats(SOURCE_DIR)

    if stats['errors']:
        print("\n⚠️  Greške pri analizi:")
        for error in stats['errors'][:5]:  # Prikaži prvih 5 grešaka
            print(f"  - {error}")
        if len(stats['errors']) > 5:
            print(f"  ... i još {len(stats['errors']) - 5} grešaka")

    print(f"\n📊 Statistika:")
    print(f"  Ukupno slika: {stats['total_images']}")
    print(f"  SKU-ova sa slikama: {len(stats['skus_with_images'])}")
    print(f"  SKU-ova sa više slika: {len(stats['multiple_images'])}")
    print(f"  Ekstenzije: {dict(stats['extensions'])}")

    # Dry run prvo
    print("\n" + "=" * 80)
    print("DRY RUN - Provjera šta bi se kopiralo")
    print("=" * 80)

    dry_results = copy_images(SOURCE_DIR, DEST_DIR, dry_run=True)
    print(f"\n📋 Rezultati dry run:")
    print(f"  Bi kopiralo: {dry_results['copied']}")
    print(f"  Bi preskočilo: {dry_results['skipped']}")

    if dry_results['errors']:
        print(f"\n⚠️  Greške:")
        for error in dry_results['errors'][:5]:
            print(f"  - {error}")
        if len(dry_results['errors']) > 5:
            print(f"  ... i još {len(dry_results['errors']) - 5} grešaka")

    # Potvrda za kopiranje
    print("\n" + "=" * 80)
    if auto_confirm:
        print("\n✅ Auto-confirm režim aktiviran, nastavljam sa kopiranjem...")
        response = 'y'
    else:
        response = input("\n❓ Nastaviti sa kopiranjem? (y/n): ")

    if response.lower() != 'y':
        print("❌ Kopiranje otkazano.")
        return

    # Stvarno kopiranje
    print("\n" + "=" * 80)
    print("KOPIRANJE SLIKA...")
    print("=" * 80)

    results = copy_images(SOURCE_DIR, DEST_DIR, dry_run=False)

    print(f"\n✅ Kopiranje završeno!")
    print(f"  Kopirano: {results['copied']}")
    print(f"  Preskočeno: {results['skipped']}")

    if results['errors']:
        print(f"\n⚠️  Greške:")
        for error in results['errors'][:10]:
            print(f"  - {error}")
        if len(results['errors']) > 10:
            print(f"  ... i još {len(results['errors']) - 10} grešaka")

    print("\n" + "=" * 80)
    print("Sljedeći korak: Pokrenite 'python scripts/link_product_images.py'")
    print("za povezivanje proizvoda sa slikama u bazi podataka.")
    print("=" * 80)

if __name__ == "__main__":
    main()
