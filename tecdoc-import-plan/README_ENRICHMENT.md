# TecDoc Product Enrichment - Uputstva

## 📋 Pregled

Imaš:
- ✅ **TecDoc MySQL baza** (localhost) - 6.8M proizvoda, read-only
- ✅ **Webshop Postgres baza** - 12,000 tvojih proizvoda
- 🎯 **Cilj**: Obogatiti tvoje proizvode sa TecDoc podacima

## 🔧 Dva Pristupa

### Pristup 1: Python Skripta (PREPORUČENO) ⭐

**Prednosti:**
- Batch procesiranje (100-500 proizvoda odjednom)
- Error handling i retry logika
- Detaljno logovanje
- Lakše testiranje
- Kontrola nad transakcijama

**Nedostaci:**
- Potreban Python + biblioteke

### Pristup 2: SQL Direktno

**Prednosti:**
- Brže (direktno u bazi)
- Ne treba programiranje

**Nedostaci:**
- Kompleksnije za error handling
- Teže za debugging

---

## 🚀 Quick Start - Python Skripta

### Korak 1: Instalacija

```bash
# Instaliraj potrebne biblioteke
pip install psycopg2-binary mysql-connector-python

# Ili ako koristiš requirements.txt:
pip install -r requirements.txt
```

**requirements.txt:**
```
psycopg2-binary==2.9.9
mysql-connector-python==8.2.0
```

### Korak 2: Konfiguracija

Otvori `tecdoc_enrichment.py` i edituj konekcije:

```python
# TecDoc MySQL (linija 48)
self.tecdoc_conn = mysql.connector.connect(
    host="localhost",
    user="root",           # ← tvoj MySQL user
    password="tvoj_pass",  # ← tvoj MySQL password
    database="tecdoc1q2019"
)

# Produkcijska Postgres (linija 55)
self.prod_conn = psycopg2.connect(
    host="localhost",       # ← tvoj Postgres host
    database="webshop",     # ← ime tvoje baze
    user="postgres",        # ← tvoj Postgres user
    password="tvoj_pass"    # ← tvoj Postgres password
)
```

### Korak 3: Test Run (50 proizvoda)

```bash
# Pokreni test sa prvih 50 proizvoda
python tecdoc_enrichment.py

# Prati log fajl u real-time
tail -f tecdoc_enrichment.log
```

**Očekivan output:**
```
2025-11-08 10:00:00 - INFO - Starting batch enrichment (size: 50, from: 0)
2025-11-08 10:00:01 - INFO - Loaded 50 products
2025-11-08 10:00:05 - INFO - Processing: 36.7062
2025-11-08 10:00:06 - INFO - Processing: ZMD3S43
2025-11-08 10:00:10 - INFO - Progress: 10/50 (20.0%)
2025-11-08 10:00:10 - INFO - Stats: {'processed': 8, 'found_in_tecdoc': 8, ...}
...
2025-11-08 10:05:00 - INFO - BATCH COMPLETED
2025-11-08 10:05:00 - INFO - Final stats: {
    'processed': 45,
    'found_in_tecdoc': 42,
    'oem_found': 38,
    'specs_found': 40,
    'vehicles_found': 35,
    'cross_refs_found': 40,
    'errors': 5
}
```

### Korak 4: Provjera Rezultata

U Postgres:

```sql
-- Koliko proizvoda je obogaćeno?
SELECT 
    COUNT(*) as total,
    COUNT("oemNumber") as with_oem,
    COUNT("technicalSpecs") as with_specs,
    COUNT("vehicleFitments") as with_vehicles
FROM "Product";

-- Primjer obogaćenog proizvoda
SELECT 
    "catalogNumber",
    "oemNumber",
    "technicalSpecs"::TEXT,
    "vehicleFitments"::TEXT
FROM "Product"
WHERE "technicalSpecs" IS NOT NULL
LIMIT 1;
```

### Korak 5: Full Run (svih 12,000)

Ako je test bio uspješan:

```python
# U tecdoc_enrichment.py promijeni (linija 337):
enricher.run_batch(batch_size=12000, start_from=0)

# Ili radi u batch -evima od po 500:
for i in range(0, 12000, 500):
    enricher.run_batch(batch_size=500, start_from=i)
    print(f"Completed batch {i}-{i+500}")
```

---

## 🗄️ SQL Pristup (Alternativa)

### Korak 1: Kreiraj Staging Tabelu

```sql
-- U Postgres:
CREATE TABLE staging_tecdoc_enrichment (
    id SERIAL PRIMARY KEY,
    catalog_number VARCHAR(100),
    tecdoc_article_id BIGINT,
    oem_numbers JSONB,
    technical_specs JSONB,
    vehicle_fitments JSONB,
    cross_references JSONB,
    processed_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_staging_catalog 
ON staging_tecdoc_enrichment(catalog_number);
```

### Korak 2: Export iz TecDoc MySQL

```bash
# U MySQL workbench ili terminalu:
mysql -u root -p tecdoc1q2019 < export_for_postgres.sql > /tmp/tecdoc_export.csv
```

**export_for_postgres.sql:**
```sql
SELECT 
    a.DataSupplierArticleNumber as catalog_number,
    a.id as tecdoc_article_id,
    JSON_ARRAYAGG(DISTINCT aon.OENbr) as oem_numbers
FROM articles a
LEFT JOIN article_oe_numbers aon ON a.id = aon.article_id
WHERE a.DataSupplierArticleNumber IN (
    '36.7062', 'ZMD3S43', '100121520', ...  -- lista tvojih katalošk ih brojeva
)
GROUP BY a.id, a.DataSupplierArticleNumber;
```

### Korak 3: Import u Postgres

```bash
# U Postgres terminalu:
\copy staging_tecdoc_enrichment(catalog_number, tecdoc_article_id, oem_numbers) 
FROM '/tmp/tecdoc_export.csv' 
DELIMITER ',' 
CSV HEADER;
```

### Korak 4: Update Produkcijske Baze

```sql
UPDATE "Product" p
SET 
    "oemNumber" = s.oem_numbers::TEXT,
    "updatedAt" = NOW()
FROM staging_tecdoc_enrichment s
WHERE p."catalogNumber" = s.catalog_number;
```

---

## 📊 Očekivani Rezultati

### Što Ćeš Dobiti:

| Podatak | Procenat | Broj (od 12K) |
|---------|----------|---------------|
| **Pronađeno u TecDoc** | ~85% | ~10,200 |
| **Sa OEM brojevima** | ~80% | ~9,600 |
| **Sa specifikacijama** | ~75% | ~9,000 |
| **Sa vozilima** | ~60% | ~7,200 |
| **Sa cross-references** | ~70% | ~8,400 |

### Primjer Obogaćenog Proizvoda:

```json
{
  "catalogNumber": "36.7062",
  "oemNumber": "[\"1726KL\", \"1726.KL\"]",
  "technicalSpecs": [
    {
      "name": "Length",
      "value": "1234",
      "unit": "mm"
    },
    {
      "name": "Weight",
      "value": "2.5",
      "unit": "kg"
    }
  ],
  "vehicleFitments": [
    {
      "brand": "CITROËN",
      "model": "XSARA",
      "variant": "1.4 i",
      "year_from": 1997,
      "year_to": 2005,
      "engine": "TU3JP (KFW)"
    }
  ],
  "crossReferences": [
    {
      "article_number": "361045",
      "supplier": "BOSAL",
      "quality": "Premium",
      "shared_oems": 2
    }
  ]
}
```

---

## 🔍 Troubleshooting

### Problem 1: Proizvod nije pronađen u TecDoc

```python
# U log fajlu:
WARNING - Not found in TecDoc: ABC123

# Razlozi:
# 1. Kataloški broj je različit (npr. razmaci, crtice)
# 2. Proizvod nije u TecDoc bazi
# 3. Greška u upisu

# Rješenje:
# Provjeri u MySQL direktno:
SELECT * FROM articles WHERE DataSupplierArticleNumber LIKE '%ABC123%';
```

### Problem 2: OEM broj je zapravo naziv dobavljača

```python
# Primjer greške:
oemNumber: "ZIMMERMANN GMBH"  # ← Ovo nije OEM broj!

# Rješenje u Python skripti:
# Već je implementiran filter - ignoriše ako ima više od 20 karaktera
# ili sadrži riječi kao "GMBH", "LTD", "INC"
```

### Problem 3: Sporo izvršavanje

```python
# Ako traje predugo (>1 minuta po proizvodu):

# 1. Provjeri MySQL indexe:
CREATE INDEX idx_articles_supplier ON articles(DataSupplierArticleNumber);
CREATE INDEX idx_oe_article ON article_oe_numbers(article_id);

# 2. Smanji batch size:
enricher.run_batch(batch_size=50, start_from=0)  # umjesto 500

# 3. Koristi paralelizaciju:
from concurrent.futures import ThreadPoolExecutor

with ThreadPoolExecutor(max_workers=4) as executor:
    executor.map(enrich_product, products)
```

---

## ⏱️ Procjena Vremena

| Batch | Proizvoda | Vrijeme | Opis |
|-------|-----------|---------|------|
| **Test** | 50 | 5-10 min | Prva provjera |
| **Batch 1** | 500 | 30-60 min | Prvi batch |
| **Batch 2** | 2,000 | 2-4 sata | OEM lookup |
| **Full Run** | 12,000 | 8-12 sati | Sve zajedno |

**Preporuka:** Radi u batch-evima preko noći (500 po batch-u).

---

## 📈 Monitoring

### Real-time Monitoring:

```bash
# Terminal 1: Pokreni skriptu
python tecdoc_enrichment.py

# Terminal 2: Prati log
tail -f tecdoc_enrichment.log | grep "Stats:"

# Terminal 3: Provjeri bazu
watch -n 10 'psql -c "SELECT COUNT(*) FROM Product WHERE oemNumber IS NOT NULL"'
```

### Dashboard Query:

```sql
-- Kreiraj view za monitoring
CREATE OR REPLACE VIEW enrichment_dashboard AS
SELECT 
    COUNT(*) as total_products,
    COUNT("oemNumber") as with_oem,
    ROUND(100.0 * COUNT("oemNumber") / COUNT(*), 2) as oem_pct,
    COUNT("technicalSpecs") as with_specs,
    ROUND(100.0 * COUNT("technicalSpecs") / COUNT(*), 2) as specs_pct,
    COUNT("vehicleFitments") as with_vehicles,
    ROUND(100.0 * COUNT("vehicleFitments") / COUNT(*), 2) as vehicles_pct,
    MAX("updatedAt") as last_update
FROM "Product";

-- Provjeri napredak:
SELECT * FROM enrichment_dashboard;
```

---

## 🎯 Sljedeći Koraci

1. ✅ **Testiraj sa 50 proizvoda**
   ```bash
   python tecdoc_enrichment.py
   ```

2. ✅ **Provjeri rezultate**
   ```sql
   SELECT * FROM "Product" WHERE "technicalSpecs" IS NOT NULL LIMIT 5;
   ```

3. ✅ **Ako je dobro, pokreni full batch**
   ```python
   # Promijeni u kodu na 12000
   enricher.run_batch(batch_size=12000)
   ```

4. ✅ **Monitoruj napredak**
   ```bash
   tail -f tecdoc_enrichment.log
   ```

---

## ❓ Pitanja?

- Trebam li dodati retry logiku?
- Trebam li email notifikacije?
- Trebam li dashboard za monitoring?
- Kako da ručno mapujem one koji nisu pronađeni?

Javi šta ti treba! 🚀
