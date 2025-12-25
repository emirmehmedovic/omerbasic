"""
Analiza OEM Data Quality
=========================
Provjeri koliko proizvoda ima placeholder/invalid OEM vrijednosti
"""

import sys
sys.path.insert(0, '/Users/emir_mw/omerbasic/tecdoc-import-plan')

from tecdoc_advanced_enrichment import TecDocAdvancedEnricher
import psycopg2

print("=" * 70)
print("ANALIZA: OEM DATA QUALITY")
print("=" * 70)

enricher = TecDocAdvancedEnricher()
cursor = enricher.postgres_conn.cursor()

# ===================================================================
# ANALIZA 1: Osnovne statistike
# ===================================================================
print("\n" + "=" * 70)
print("1. OSNOVNE STATISTIKE")
print("=" * 70)

# Total products
cursor.execute('SELECT COUNT(*) FROM "Product"')
total_products = cursor.fetchone()[0]

# Products with OEM
cursor.execute('SELECT COUNT(*) FROM "Product" WHERE "oemNumber" IS NOT NULL AND "oemNumber" != \'\'')
products_with_oem = cursor.fetchone()[0]

# Products without OEM
products_without_oem = total_products - products_with_oem

print(f"\n📊 Ukupno proizvoda: {total_products}")
print(f"   Sa OEM brojem: {products_with_oem} ({products_with_oem/total_products*100:.1f}%)")
print(f"   Bez OEM broja: {products_without_oem} ({products_without_oem/total_products*100:.1f}%)")

# ===================================================================
# ANALIZA 2: Placeholder OEM vrijednosti
# ===================================================================
print("\n" + "=" * 70)
print("2. PLACEHOLDER OEM VRIJEDNOSTI")
print("=" * 70)

# Definišemo placeholder vrijednosti
placeholder_patterns = [
    ("'0'", "Single zero"),
    ("'00'", "Double zero"),
    ("'000'", "Triple zero"),
    ("'N/A'", "N/A"),
    ("'NA'", "NA"),
    ("'-'", "Dash"),
    ("'/'", "Slash"),
    ("'X'", "X"),
    ("'XX'", "XX"),
    ("'XXX'", "XXX"),
]

print("\nOEM Value | Count | Percentage | Description")
print("-" * 70)

total_placeholder = 0
for pattern, description in placeholder_patterns:
    query = f'SELECT COUNT(*) FROM "Product" WHERE "oemNumber" = {pattern}'
    cursor.execute(query)
    count = cursor.fetchone()[0]
    total_placeholder += count

    if count > 0:
        pct = count / total_products * 100
        print(f"{pattern:10} | {count:5} | {pct:5.2f}%     | {description}")

# Check very short OEMs (< 3 chars)
cursor.execute('SELECT COUNT(*) FROM "Product" WHERE "oemNumber" IS NOT NULL AND LENGTH("oemNumber") < 3')
short_oem_count = cursor.fetchone()[0]

print(f"\n📊 Ukupno placeholder OEM: {total_placeholder} ({total_placeholder/total_products*100:.1f}%)")
print(f"   OEM kraći od 3 karaktera: {short_oem_count} ({short_oem_count/total_products*100:.1f}%)")

# ===================================================================
# ANALIZA 3: Valid OEM brojevi
# ===================================================================
print("\n" + "=" * 70)
print("3. VALID OEM BROJEVI")
print("=" * 70)

# Valid OEM brojevi (dužina >= 5, nisu placeholder)
query = """
SELECT COUNT(*)
FROM "Product"
WHERE "oemNumber" IS NOT NULL
  AND "oemNumber" != ''
  AND "oemNumber" NOT IN ('0', '00', '000', 'N/A', 'NA', '-', '/', 'X', 'XX', 'XXX')
  AND LENGTH("oemNumber") >= 5
"""
cursor.execute(query)
valid_oem_count = cursor.fetchone()[0]

print(f"\n📊 Proizvodi sa validnim OEM brojevima (len >= 5): {valid_oem_count}")
print(f"   Procenat od ukupno: {valid_oem_count/total_products*100:.1f}%")
print(f"   Procenat od onih sa OEM: {valid_oem_count/products_with_oem*100:.1f}%")

# ===================================================================
# ANALIZA 4: Top 20 najčešćih OEM vrijednosti
# ===================================================================
print("\n" + "=" * 70)
print("4. TOP 20 NAJČEŠĆIH OEM VRIJEDNOSTI")
print("=" * 70)

query = """
SELECT "oemNumber", COUNT(*) as count
FROM "Product"
WHERE "oemNumber" IS NOT NULL AND "oemNumber" != ''
GROUP BY "oemNumber"
ORDER BY count DESC
LIMIT 20
"""

cursor.execute(query)
top_oems = cursor.fetchall()

print("\nOEM Number          | Count | Placeholder?")
print("-" * 60)

for oem, count in top_oems:
    is_placeholder = enricher.should_skip_oem_matching(oem)
    placeholder_marker = "❌ YES" if is_placeholder else "✅ NO"
    print(f"{oem:19} | {count:5} | {placeholder_marker}")

# ===================================================================
# ANALIZA 5: Proizvodi sa TecDoc ID - koliko ima valid OEM
# ===================================================================
print("\n" + "=" * 70)
print("5. PROIZVODI SA TECDOC ID")
print("=" * 70)

# Total sa TecDoc ID
cursor.execute('SELECT COUNT(*) FROM "Product" WHERE "tecdocArticleId" IS NOT NULL')
products_with_tecdoc = cursor.fetchone()[0]

# Sa TecDoc ID i valid OEM
query = """
SELECT COUNT(*)
FROM "Product"
WHERE "tecdocArticleId" IS NOT NULL
  AND "oemNumber" IS NOT NULL
  AND "oemNumber" NOT IN ('0', '00', '000', 'N/A', 'NA', '-', '/', 'X', 'XX', 'XXX')
  AND LENGTH("oemNumber") >= 5
"""
cursor.execute(query)
tecdoc_with_valid_oem = cursor.fetchone()[0]

# Sa TecDoc ID i placeholder OEM
query = """
SELECT COUNT(*)
FROM "Product"
WHERE "tecdocArticleId" IS NOT NULL
  AND (
    "oemNumber" IN ('0', '00', '000', 'N/A', 'NA', '-', '/', 'X', 'XX', 'XXX')
    OR LENGTH(COALESCE("oemNumber", '')) < 3
  )
"""
cursor.execute(query)
tecdoc_with_placeholder = cursor.fetchone()[0]

print(f"\n📊 Proizvodi sa TecDoc ID: {products_with_tecdoc}")
print(f"   Sa validnim OEM: {tecdoc_with_valid_oem} ({tecdoc_with_valid_oem/products_with_tecdoc*100:.1f}%)")
print(f"   Sa placeholder OEM: {tecdoc_with_placeholder} ({tecdoc_with_placeholder/products_with_tecdoc*100:.1f}%)")

# ===================================================================
# ANALIZA 6: Proizvodi BEZ TecDoc ID - matching potencijal
# ===================================================================
print("\n" + "=" * 70)
print("6. PROIZVODI BEZ TECDOC ID - MATCHING POTENCIJAL")
print("=" * 70)

# Total bez TecDoc ID
cursor.execute('SELECT COUNT(*) FROM "Product" WHERE "tecdocArticleId" IS NULL')
products_without_tecdoc = cursor.fetchone()[0]

# Bez TecDoc, sa validnim OEM (potencijal za OEM matching)
query = """
SELECT COUNT(*)
FROM "Product"
WHERE "tecdocArticleId" IS NULL
  AND "oemNumber" IS NOT NULL
  AND "oemNumber" NOT IN ('0', '00', '000', 'N/A', 'NA', '-', '/', 'X', 'XX', 'XXX')
  AND LENGTH("oemNumber") >= 5
"""
cursor.execute(query)
no_tecdoc_valid_oem = cursor.fetchone()[0]

# Bez TecDoc, sa EAN (potencijal za EAN matching)
query = """
SELECT COUNT(*)
FROM "Product"
WHERE "tecdocArticleId" IS NULL
  AND "eanCode" IS NOT NULL
  AND "eanCode" != ''
"""
cursor.execute(query)
no_tecdoc_with_ean = cursor.fetchone()[0]

# Bez TecDoc, bez valid podataka za matching
query = """
SELECT COUNT(*)
FROM "Product"
WHERE "tecdocArticleId" IS NULL
  AND (
    "oemNumber" IS NULL
    OR "oemNumber" IN ('0', '00', '000', 'N/A', 'NA', '-', '/', 'X', 'XX', 'XXX')
    OR LENGTH("oemNumber") < 5
  )
  AND ("eanCode" IS NULL OR "eanCode" = '')
"""
cursor.execute(query)
no_tecdoc_no_valid_data = cursor.fetchone()[0]

print(f"\n📊 Proizvodi BEZ TecDoc ID: {products_without_tecdoc}")
print(f"\n   ✅ Sa validnim OEM (matching potencijal): {no_tecdoc_valid_oem} ({no_tecdoc_valid_oem/products_without_tecdoc*100:.1f}%)")
print(f"   ✅ Sa EAN (matching potencijal): {no_tecdoc_with_ean} ({no_tecdoc_with_ean/products_without_tecdoc*100:.1f}%)")
print(f"   ❌ Bez validnih podataka: {no_tecdoc_no_valid_data} ({no_tecdoc_no_valid_data/products_without_tecdoc*100:.1f}%)")

# ===================================================================
# ZAKLJUČAK
# ===================================================================
print("\n" + "=" * 70)
print("ZAKLJUČAK I PREPORUKE")
print("=" * 70)

print(f"""
📊 KLJUČNE BROJKE:
   - Ukupno proizvoda: {total_products}
   - Sa TecDoc ID: {products_with_tecdoc} ({products_with_tecdoc/total_products*100:.1f}%)
   - Bez TecDoc ID: {products_without_tecdoc} ({products_without_tecdoc/total_products*100:.1f}%)

🔍 DATA QUALITY:
   - Proizvodi sa validnim OEM: {valid_oem_count} ({valid_oem_count/total_products*100:.1f}%)
   - Proizvodi sa placeholder OEM: {total_placeholder} ({total_placeholder/total_products*100:.1f}%)

💡 MATCHING POTENCIJAL (proizvodi BEZ TecDoc ID):
   - Moguće matchati preko validnog OEM: {no_tecdoc_valid_oem}
   - Moguće matchati preko EAN: {no_tecdoc_with_ean}
   - Teško matchati (nema validnih podataka): {no_tecdoc_no_valid_data}

✅ ŠTA RADI:
   - OEM validation fix sprječava false positive matches na placeholder vrijednosti
   - Catalog matching radi normalno
   - EAN matching radi normalno

⚠️  PREPORUKE:
   1. Pokreni enrichment za proizvode sa TecDoc ID da popuni OEM brojeve iz TecDoca
   2. Za proizvode sa validnim OEM brojevima, pokreni advanced matching
   3. Za proizvode sa EAN kodovima, pokreni EAN-based matching
   4. Za proizvode bez validnih podataka, razmotriti manuelni matching ili import iz drugih izvora
""")

cursor.close()
enricher.close()

print("\n" + "=" * 70)
print("ANALIZA ZAVRŠENA")
print("=" * 70)
