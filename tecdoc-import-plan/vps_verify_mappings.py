#!/usr/bin/env python3
"""
VPS Script - Provjeri koliko proizvoda ima tecdoc slika nakon primjene mapiranja.
"""

import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

db_url = os.environ.get('DATABASE_URL', 'postgresql://emiir:emirMehmedovic123456789omerbasic@localhost:5432/omerbasicdb')

try:
    conn = psycopg2.connect(db_url)
    print("✓ Konekcija na PostgreSQL OK")

    cursor = conn.cursor()

    # Total products
    cursor.execute('SELECT COUNT(*) FROM "Product"')
    total = cursor.fetchone()[0]
    print(f"✓ Ukupno proizvoda: {total}")

    # Products with tecdoc images
    cursor.execute('SELECT COUNT(*) FROM "Product" WHERE "imageUrl" LIKE \'%tecdoc%\'')
    tecdoc_count = cursor.fetchone()[0]
    print(f"✓ Proizvodi sa tecdoc slikom: {tecdoc_count}")

    # Show samples
    cursor.execute('SELECT id, name, "imageUrl" FROM "Product" WHERE "imageUrl" LIKE \'%tecdoc%\' LIMIT 3')
    samples = cursor.fetchall()

    if samples:
        print("\nPrimjeri mapiranja:")
        for product_id, name, image_url in samples:
            print(f"  {product_id}: {name}")
            print(f"    → {image_url}")

    cursor.close()
    conn.close()

    print("\n✓ Verifikacija završena!")

except Exception as e:
    print(f"✗ Greška: {e}")
    import traceback
    traceback.print_exc()
