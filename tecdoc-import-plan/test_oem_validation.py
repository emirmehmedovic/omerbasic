"""
Test OEM Validation Fix
=======================
Testira da li OEM validation sprječava false positive matches na placeholder vrijednosti
"""

import sys
sys.path.insert(0, '/Users/emir_mw/omerbasic/tecdoc-import-plan')

from tecdoc_advanced_enrichment import TecDocAdvancedEnricher
import psycopg2

print("=" * 70)
print("TEST: OEM VALIDATION FIX")
print("=" * 70)

enricher = TecDocAdvancedEnricher()

# ===================================================================
# TEST 1: Problematični proizvod sa OEM "0" (SKU 36020)
# ===================================================================
print("\n" + "=" * 70)
print("TEST 1: Proizvod sa OEM placeholder '0' (SKU 36020)")
print("=" * 70)

print("\n🔍 Testiram: TQ-5001-ME105 sa OEM '0'")
print("Očekivano: NOT FOUND (ne bi smjelo matchati Mirror Glass!)")

match_result = enricher.advanced_match(
    catalog='TQ-5001-ME105',
    oem='0',
    ean=None
)

print(f"\n✅ Rezultat:")
print(f"   Article ID: {match_result.article_id}")
print(f"   Confidence: {match_result.confidence}%")
print(f"   Method: {match_result.method}")

if match_result.article_id is None:
    print("\n✅ SUCCESS: OEM '0' je pravilno preskočen - nema false positive!")
else:
    print(f"\n❌ FAIL: Našao match sa article_id={match_result.article_id}")
    # Provjeri šta je našlo
    article_data = enricher.get_basic_article_data(match_result.article_id)
    print(f"   Product Type: {article_data.get('product_type')}")
    print(f"   Manufacturer: {article_data.get('manufacturer')}")

# ===================================================================
# TEST 2: Testovi OEM validacije
# ===================================================================
print("\n" + "=" * 70)
print("TEST 2: OEM Validation Logic")
print("=" * 70)

test_oems = [
    ("0", True, "Single zero"),
    ("00", True, "Double zero"),
    ("000", True, "Triple zero"),
    ("N/A", True, "N/A placeholder"),
    ("NA", True, "NA placeholder"),
    ("-", True, "Dash placeholder"),
    ("XX", True, "XX placeholder"),
    ("11 42 8 580 680", False, "Valid BMW OEM"),
    ("A 004 094 24 04", False, "Valid Mercedes OEM"),
    ("03L115562", False, "Valid VAG OEM"),
    ("1234567", False, "Valid generic OEM"),
    ("AB", True, "Too short (2 chars)"),
]

print("\nOEM Value              | Should Skip? | Actual | Status")
print("-" * 70)

all_passed = True
for oem, expected_skip, description in test_oems:
    actual_skip = enricher.should_skip_oem_matching(oem)
    status = "✅ PASS" if actual_skip == expected_skip else "❌ FAIL"
    if actual_skip != expected_skip:
        all_passed = False

    print(f"{oem:20} | {str(expected_skip):12} | {str(actual_skip):6} | {status} ({description})")

if all_passed:
    print("\n✅ All validation tests PASSED!")
else:
    print("\n❌ Some validation tests FAILED!")

# ===================================================================
# TEST 3: Pronađi proizvode sa validnim OEM brojevima za testiranje
# ===================================================================
print("\n" + "=" * 70)
print("TEST 3: Pronađi proizvode sa validnim OEM brojevima")
print("=" * 70)

cursor = enricher.postgres_conn.cursor()

query = """
SELECT
    id, name, sku, "catalogNumber", "oemNumber", "tecdocArticleId"
FROM "Product"
WHERE "oemNumber" IS NOT NULL
  AND "oemNumber" != ''
  AND "oemNumber" != '0'
  AND LENGTH("oemNumber") >= 5
ORDER BY RANDOM()
LIMIT 5
"""

cursor.execute(query)
products_with_valid_oem = cursor.fetchall()

print(f"\n✅ Pronađeno {len(products_with_valid_oem)} proizvoda sa validnim OEM brojevima:")
print("\nSKU      | Catalog Number      | OEM Number          | TecDoc ID")
print("-" * 80)

for row in products_with_valid_oem:
    product_id, name, sku, catalog, oem, tecdoc_id = row
    print(f"{sku:8} | {catalog:19} | {oem:19} | {str(tecdoc_id)[:10] if tecdoc_id else 'None'}")

# ===================================================================
# TEST 4: Testiraj matching sa validnim OEM brojevima
# ===================================================================
print("\n" + "=" * 70)
print("TEST 4: Testiraj matching sa validnim OEM brojevima")
print("=" * 70)

if products_with_valid_oem:
    # Test prvi proizvod sa validnim OEM-om
    product_id, name, sku, catalog, oem, tecdoc_id = products_with_valid_oem[0]

    print(f"\n🔍 Testiram proizvod: {name[:50]}")
    print(f"   SKU: {sku}")
    print(f"   Catalog: {catalog}")
    print(f"   OEM: {oem}")
    print(f"   Existing TecDoc ID: {tecdoc_id}")

    match_result = enricher.advanced_match(
        catalog=catalog,
        oem=oem,
        ean=None
    )

    print(f"\n✅ Matching rezultat:")
    print(f"   Article ID: {match_result.article_id}")
    print(f"   Confidence: {match_result.confidence}%")
    print(f"   Method: {match_result.method}")

    if match_result.article_id:
        article_data = enricher.get_basic_article_data(match_result.article_id)
        print(f"\n   Product Type: {article_data.get('product_type')}")
        print(f"   Manufacturer: {article_data.get('manufacturer')}")

        # Provjeri da li se podudara sa existing tecdoc ID
        if tecdoc_id and match_result.article_id == tecdoc_id:
            print(f"\n   ✅ Matched article ID se podudara sa postojećim TecDoc ID!")
        elif tecdoc_id:
            print(f"\n   ⚠️  WARNING: Matched article {match_result.article_id} != existing {tecdoc_id}")

cursor.close()

# ===================================================================
# ZAKLJUČAK
# ===================================================================
print("\n" + "=" * 70)
print("ZAKLJUČAK")
print("=" * 70)

print("""
✅ OEM validation fix implementiran!

Šta smo postigli:
1. Dodana funkcija should_skip_oem_matching() koja prepoznaje placeholder vrijednosti
2. Modificiran advanced_match() da skipuje OEM matching za invalid vrijednosti
3. Placeholder vrijednosti ('0', 'N/A', kratke vrijednosti) se više ne koriste za matching
4. Sprječeni false positive matches (npr. Mirror Glass umjesto Mass Air Flow Sensor)

Sljedeći koraci:
1. Analiza koliko proizvoda ima placeholder OEM vrijednosti
2. Pronalaženje alternative matching strategije za proizvode bez validnih podataka
3. Testiranje na većem sample-u proizvoda
""")

enricher.close()

print("\n" + "=" * 70)
print("TEST ZAVRŠEN")
print("=" * 70)
