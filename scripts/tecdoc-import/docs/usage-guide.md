# TecDoc Import System - Usage Guide

**Datum**: 2025-12-22
**Verzija**: 2.0

---

## 📚 Pregled Sistema

Sistem se sastoji od **2 glavne komponente**:

1. **Product Enrichment** (`tecdoc_advanced_enrichment.py`)
   - Matchuje proizvode sa TecDoc artiklima
   - Izvlači EAN kodove, OEM brojeve, tehničke specifikacije
   - Ažurira Product tabelu

2. **Vehicle Linking** (`tecdoc_smart_vehicle_linking.py`)
   - Linkuje proizvode sa vozilima
   - Koristi OEM filtering za preciznost
   - Kreira ProductVehicleFitment zapise

---

## 🔧 Setup & Instalacija

### Prerequisiti

```bash
# Python 3.8+
python3 --version

# MySQL TecDoc database
mysql -u root tecdoc1q2019 -e "SELECT COUNT(*) FROM articles;"

# PostgreSQL user database
psql -U emir_mw -d omerbasicdb -c "SELECT COUNT(*) FROM \"Product\";"
```

### Instalacija Dependencies

```bash
cd /Users/emir_mw/omerbasic/tecdoc-import-plan
python3 -m venv venv
source venv/bin/activate
pip install psycopg2-binary mysql-connector-python
```

---

## 📖 Korištenje

### 1. Product Enrichment

#### Osnovni Test (50 proizvoda)

```bash
cd /Users/emir_mw/omerbasic/tecdoc-import-plan
source venv/bin/activate
python tecdoc_advanced_enrichment.py
```

**Podrazumevano**: Matchuje 50 proizvoda **bez** tecdocArticleId

#### Napredna Upotreba

```python
# U tecdoc_advanced_enrichment.py - main()

# A) Matchuj nove proizvode (bez tecdocArticleId)
enricher.run_batch(limit=100, offset=0, filter_mode='no_tecdoc')

# B) Dopuni postojeće (sa tecdocArticleId - dodaj OEM, EAN, Specs)
enricher.run_batch(limit=500, offset=0, filter_mode='has_tecdoc')

# C) Samo sa EAN kodom
enricher.run_batch(limit=50, offset=0, filter_mode='has_ean')

# D) Sve proizvode
enricher.run_batch(limit=10000, offset=0, filter_mode='all')
```

#### Filter Modes

| Mode | Opis | Use Case |
|------|------|----------|
| `no_tecdoc` | Proizvodi bez tecdocArticleId | Matchovanje novih proizvoda |
| `has_tecdoc` | Proizvodi SA tecdocArticleId | Dodavanje OEM/EAN podataka |
| `has_ean` | Proizvodi sa eanCode | Validacija EAN matchovanja |
| `all` | Svi proizvodi | Full re-sync |

#### Output Primjer

```
[1/100] Progress: 1.0%
Processing: 157331 (ID: cmhqilidt06soomc3dkq73l3u)
  → MATCHED: article_id=202560, confidence=80%, method=oem_exact
  → Found 500 vehicles
  ✅ SUCCESS: EAN=0, OEM=2, Specs=2, Vehicles=500

--- STATS @ 10/100 ---
Newly matched: 0
Already matched: 10
Not found: 0
EAN updated: 7
OEM updated: 8
Specs updated: 8
Errors: 0
```

---

### 2. Vehicle Linking

#### Test Mode (DRY RUN)

```bash
cd /Users/emir_mw/omerbasic/tecdoc-import-plan
source venv/bin/activate
python tecdoc_smart_vehicle_linking.py
```

**Podrazumevano**:
- DRY RUN mode (ne upisuje u bazu)
- 20 proizvoda sa tecdocArticleId
- OEM filtering enabled

#### Konfiguracija

U `tecdoc_smart_vehicle_linking.py`:

```python
class SmartVehicleLinker:
    def __init__(self):
        # Validation Limits
        self.MAX_VEHICLES_PER_PRODUCT = 200
        self.MAX_MODELS = 25
        self.MAX_GENERATIONS = 200
        self.MAX_BRANDS = 3
        self.MAX_ENGINES_PER_GENERATION = 15
        self.REQUIRE_ENGINE_SPEC = True
```

#### Test sa Specifičnim Proizvodima

```python
# Custom test script
from tecdoc_smart_vehicle_linking import SmartVehicleLinker
import logging

linker = SmartVehicleLinker()

try:
    # Test sa određenim tecdoc ID-ovima
    tecdoc_ids = ['83001806', '167588132', '83435053']

    cursor = linker.postgres_conn.cursor()
    products = []

    for tecdoc_id in tecdoc_ids:
        query = '''
        SELECT id, name, "catalogNumber", "tecdocArticleId"
        FROM "Product"
        WHERE "tecdocArticleId" = %s
        '''
        cursor.execute(query, (tecdoc_id,))
        result = cursor.fetchone()

        if result:
            products.append({
                'id': result[0],
                'name': result[1],
                'catalogNumber': result[2],
                'tecdocArticleId': result[3]
            })

    cursor.close()

    for product in products:
        linker.process_product(product)

    logging.info(f"Processed: {linker.stats['products_processed']}")

finally:
    linker.close()
```

#### Output Primjer

```
[1/20] Progress: 5.0%
======================================================================
Processing: [506248] YACCO MULTIP PLUS GR MAST ŽUTA 1/1
TecDoc Article ID: 83001806
  → OEM Manufacturers: MERCEDES-BENZ
  → Allowed vehicle brands: SMART, MAYBACH, MERCEDES-BENZ, MERCEDES
  ✅ Found 200 vehicles matching OEM brands
  📊 Summary: 200 vehicles, 191 gen, 19 models, 2 brands (max 2 engines/gen)
  📋 Top generations:
     - Mercedes-Benz C-Class (W204) C 220 CDI: 5 variants
     - Mercedes-Benz E-Class (W212) E 250 CDI: 4 variants
     ...
  ✅ Validation PASSED
  → Linking 200 vehicles...
  ✅ SUCCESS
```

---

### 3. Live Run (Production)

#### Priprema

```bash
# 1. Backup baze
pg_dump -U emir_mw omerbasicdb > backup_$(date +%Y%m%d).sql

# 2. Backup ProductVehicleFitment tabele
psql -U emir_mw -d omerbasicdb -c "
CREATE TABLE \"ProductVehicleFitment_backup_$(date +%Y%m%d)\" AS
SELECT * FROM \"ProductVehicleFitment\";
"
```

#### Kreiranje Run Skripte

Kreiraj `run_vehicle_linking.py`:

```python
#!/usr/bin/env python3
from tecdoc_smart_vehicle_linking import SmartVehicleLinker
import logging
import sys

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f'vehicle_linking_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'),
        logging.StreamHandler()
    ]
)

def run_batch(limit=100, offset=0, dry_run=True, cleanup=False):
    """
    Run vehicle linking batch

    Args:
        limit: Number of products to process
        offset: Starting offset
        dry_run: If True, don't write to database
        cleanup: If True, delete existing fitments before linking
    """
    linker = SmartVehicleLinker()

    try:
        cursor = linker.postgres_conn.cursor()

        # Get products with tecdocArticleId
        query = """
            SELECT id, name, "catalogNumber", "tecdocArticleId"
            FROM "Product"
            WHERE "tecdocArticleId" IS NOT NULL
            ORDER BY "updatedAt" DESC
            LIMIT %s OFFSET %s
        """

        cursor.execute(query, (limit, offset))
        products = [
            {
                'id': row[0],
                'name': row[1],
                'catalogNumber': row[2],
                'tecdocArticleId': row[3]
            }
            for row in cursor.fetchall()
        ]
        cursor.close()

        logging.info(f"=" * 70)
        logging.info(f"BATCH START")
        logging.info(f"Mode: {'DRY RUN' if dry_run else 'LIVE'}")
        logging.info(f"Cleanup: {'YES' if cleanup else 'NO'}")
        logging.info(f"Products: {len(products)}")
        logging.info(f"Offset: {offset}")
        logging.info(f"=" * 70)

        for i, product in enumerate(products, 1):
            logging.info(f"\n[{i}/{len(products)}] Progress: {i/len(products)*100:.1f}%")

            if not dry_run:
                linker.process_product(product, cleanup=cleanup)
            else:
                linker.process_product(product, cleanup=False)

        logging.info(f"\n" + "=" * 70)
        logging.info(f"BATCH COMPLETED")
        logging.info(f"Stats: {linker.stats}")
        logging.info(f"=" * 70)

        return linker.stats

    except Exception as e:
        logging.error(f"ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

    finally:
        linker.close()

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description='TecDoc Vehicle Linking')
    parser.add_argument('--limit', type=int, default=100, help='Number of products')
    parser.add_argument('--offset', type=int, default=0, help='Starting offset')
    parser.add_argument('--live', action='store_true', help='Live mode (write to DB)')
    parser.add_argument('--cleanup', action='store_true', help='Cleanup existing fitments')

    args = parser.parse_args()

    run_batch(
        limit=args.limit,
        offset=args.offset,
        dry_run=not args.live,
        cleanup=args.cleanup
    )
```

#### Pokretanje

```bash
# Test run (DRY RUN)
python run_vehicle_linking.py --limit=20 --offset=0

# Live run - first batch
python run_vehicle_linking.py --limit=100 --offset=0 --live

# Live run - next batches
python run_vehicle_linking.py --limit=100 --offset=100 --live
python run_vehicle_linking.py --limit=100 --offset=200 --live

# Live run with cleanup (briše stare fitments)
python run_vehicle_linking.py --limit=100 --offset=0 --live --cleanup
```

#### Batch Processing Script

Za sve proizvode u batches:

```bash
#!/bin/bash
# run_all_batches.sh

TOTAL_PRODUCTS=500
BATCH_SIZE=100

for (( offset=0; offset<$TOTAL_PRODUCTS; offset+=$BATCH_SIZE )); do
    echo "Processing batch: offset=$offset, limit=$BATCH_SIZE"

    python run_vehicle_linking.py \
        --limit=$BATCH_SIZE \
        --offset=$offset \
        --live

    # Check exit code
    if [ $? -ne 0 ]; then
        echo "ERROR: Batch failed at offset $offset"
        exit 1
    fi

    # Pauza između batches
    echo "Waiting 5 seconds..."
    sleep 5
done

echo "All batches completed!"
```

Pokretanje:
```bash
chmod +x run_all_batches.sh
./run_all_batches.sh
```

---

## 🔍 Monitoring & Debugging

### Provjera Logova

```bash
# Real-time monitoring
tail -f vehicle_linking_*.log

# Grep za greške
grep ERROR vehicle_linking_*.log

# Grep za uspješne linkove
grep "SUCCESS" vehicle_linking_*.log | wc -l
```

### Database Queries

#### Provjeri Created Fitments

```sql
-- Count fitments kreiran danas
SELECT COUNT(*)
FROM "ProductVehicleFitment"
WHERE "createdAt"::date = CURRENT_DATE;

-- Top proizvodi po broju fitments
SELECT p.name, COUNT(f.id) as fitment_count
FROM "Product" p
JOIN "ProductVehicleFitment" f ON f."productId" = p.id
WHERE f."createdAt"::date = CURRENT_DATE
GROUP BY p.id, p.name
ORDER BY fitment_count DESC
LIMIT 20;

-- Proizvodi sa previše fitments (> 200)
SELECT p.name, COUNT(f.id) as fitment_count
FROM "Product" p
JOIN "ProductVehicleFitment" f ON f."productId" = p.id
GROUP BY p.id, p.name
HAVING COUNT(f.id) > 200
ORDER BY fitment_count DESC;
```

#### Provjeri OEM Data

```sql
-- Proizvodi sa tecdocArticleId ali bez OEM podataka
SELECT p.id, p.name, p."tecdocArticleId"
FROM "Product" p
WHERE p."tecdocArticleId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "ArticleOENumber" oem
    WHERE oem."productId" = p.id
      AND oem.manufacturer IS NOT NULL
  )
LIMIT 20;

-- OEM coverage statistics
SELECT
    COUNT(DISTINCT p.id) as products_with_tecdoc,
    COUNT(DISTINCT CASE WHEN oem.id IS NOT NULL THEN p.id END) as products_with_oem,
    ROUND(100.0 * COUNT(DISTINCT CASE WHEN oem.id IS NOT NULL THEN p.id END) /
          COUNT(DISTINCT p.id), 2) as coverage_percent
FROM "Product" p
LEFT JOIN "ArticleOENumber" oem ON oem."productId" = p.id
    AND oem.manufacturer IS NOT NULL
WHERE p."tecdocArticleId" IS NOT NULL;
```

#### Provjeri Vehicle Linking Quality

```sql
-- Sample fitments za ručnu provjeru
SELECT
    p.name as product_name,
    p."catalogNumber",
    vb.name as brand,
    vm.name as model,
    vg.name as generation,
    ve.name as engine
FROM "ProductVehicleFitment" f
JOIN "Product" p ON f."productId" = p.id
JOIN "VehicleEngine" ve ON f."engineId" = ve.id
JOIN "VehicleGeneration" vg ON ve."generationId" = vg.id
JOIN "VehicleModel" vm ON vg."modelId" = vm.id
JOIN "VehicleBrand" vb ON vm."brandId" = vb.id
WHERE f."createdAt"::date = CURRENT_DATE
ORDER BY RANDOM()
LIMIT 50;
```

---

## ⚠️ Troubleshooting

### Problem: Proizvodi se skipuju (Too Many Models)

**Uzrok**: Validation limits prestrogi

**Rješenje**: Povećaj limite u konfiguraciji
```python
self.MAX_MODELS = 30  # Bilo 25
self.MAX_BRANDS = 4   # Bilo 3
```

### Problem: Nema OEM filtriranja (0 → 0 vehicles)

**Uzrok**: Proizvodi nemaju manufacturer u ArticleOENumber

**Rješenje**: Pokreni enrichment
```bash
# U tecdoc_advanced_enrichment.py - main()
enricher.run_batch(limit=500, filter_mode='has_tecdoc')
```

**Provjera**:
```sql
SELECT COUNT(*) FROM "ArticleOENumber"
WHERE manufacturer IS NOT NULL;
```

### Problem: MySQL Connection Refused

**Uzrok**: MySQL server nije pokrenut

**Rješenje**:
```bash
# macOS
brew services start mysql

# Linux
sudo systemctl start mysql

# Provjera
mysql -u root tecdoc1q2019 -e "SELECT 1;"
```

### Problem: Postgres Permission Denied

**Uzrok**: User nema permissions

**Rješenje**:
```sql
-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE omerbasicdb TO emir_mw;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO emir_mw;
```

---

## 📊 Performance Tips

### Optimizacija za Velike Batches

```python
# 1. Povećaj batch size
linker.run_batch(limit=500, offset=0)  # Umjesto 100

# 2. Disable logging za produktivnost
import logging
logging.getLogger().setLevel(logging.WARNING)

# 3. Connection pooling
# U __init__():
self.postgres_conn = psycopg2.connect(...,
    connect_timeout=10,
    options='-c statement_timeout=30000'
)
```

### Database Indexes

```sql
-- Indexes za performance
CREATE INDEX IF NOT EXISTS idx_product_tecdoc
    ON "Product"("tecdocArticleId");

CREATE INDEX IF NOT EXISTS idx_oem_product
    ON "ArticleOENumber"("productId");

CREATE INDEX IF NOT EXISTS idx_fitment_product
    ON "ProductVehicleFitment"("productId");

CREATE INDEX IF NOT EXISTS idx_fitment_created
    ON "ProductVehicleFitment"("createdAt");

-- Analyze za optimizaciju
ANALYZE "Product";
ANALYZE "ArticleOENumber";
ANALYZE "ProductVehicleFitment";
```

---

## 🎯 Best Practices

### 1. Uvijek Prvo DRY RUN

```bash
# Test prvo
python run_vehicle_linking.py --limit=20

# Pa live
python run_vehicle_linking.py --limit=20 --live
```

### 2. Backup Prije Live Run-a

```bash
# Kreraj backup
pg_dump -U emir_mw omerbasicdb > backup_before_linking.sql

# Rollback ako treba
psql -U emir_mw -d omerbasicdb < backup_before_linking.sql
```

### 3. Procesuj u Malim Batches

```bash
# Bolje: 10x100 nego 1x1000
for i in {0..900..100}; do
    python run_vehicle_linking.py --limit=100 --offset=$i --live
    sleep 5
done
```

### 4. Monitor Logs i Stats

```bash
# Watch live
tail -f vehicle_linking_*.log | grep -E "(SUCCESS|ERROR|SKIP)"

# Stats summary
grep "STATS" vehicle_linking_*.log | tail -1
```

### 5. Validate Sample Manually

```sql
-- Random sample za ručnu provjeru
SELECT * FROM "ProductVehicleFitment"
WHERE "createdAt" > NOW() - INTERVAL '1 hour'
ORDER BY RANDOM() LIMIT 10;
```

---

**Kraj Dokumenta**
*Generirano: 2025-12-22*
*Verzija: 2.0*
