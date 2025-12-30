# Spareto Vehicle Enrichment - Kompletna Dokumentacija

## 📋 Pregled

Spareto enrichment skripta automatski:
- ✅ Prikuplja **OEM brojeve** sa spareto.com
- ✅ Prikuplja **vozila koja odgovaraju proizvodu**
- ✅ Kreira **ProductVehicleFitment** linkove za postojeća vozila
- ✅ Čuva **unmatchovana vozila** za kasniji import

---

## 🚀 Quick Start

```bash
# Pokreni enrichment za 100 proizvoda
python spareto_vehicle_enrichment.py 100 -o spareto_enrichment.sql

# Import u bazu
psql omerbasicdb < spareto_enrichment.sql
psql omerbasicdb < spareto_enrichment_unmatched_table.sql

# Proveri rezultate
psql omerbasicdb -c "SELECT COUNT(*) FROM \"ArticleOENumber\" WHERE \"createdAt\" > NOW() - INTERVAL '1 hour';"
```

---

## 📂 Generisani Fajlovi

Skripta generiše **5 fajlova**:

### 1. `spareto_enrichment.sql` ⭐ **GLAVNI FAJL**
- OEM brojevi za sve proizvode
- ProductVehicleFitment za matchovana vozila
- UPDATE Product SET sparetoEnrichedAt

**Izvršavanje:**
```bash
psql omerbasicdb < spareto_enrichment.sql
```

### 2. `spareto_enrichment_unmatched_table.sql` 📊 **TEMP TABELA**
- Kreira `Spareto_UnmatchedVehicles` tabelu
- Insertuje sva vozila koja nisu pronađena u bazi
- **MOŽE IMATI DUPLIKATE** (isto vozilo za više proizvoda)

**Izvršavanje:**
```bash
psql omerbasicdb < spareto_enrichment_unmatched_table.sql
```

**Struktura tabele:**
```sql
CREATE TABLE "Spareto_UnmatchedVehicles" (
  id TEXT PRIMARY KEY,
  "productId" TEXT NOT NULL,        -- Proizvod koji ima ovo vozilo
  "catalogNumber" TEXT,
  brand TEXT NOT NULL,               -- BMW, Mercedes, itd.
  model TEXT NOT NULL,               -- 3 Series, C-Class
  "genCodes" TEXT[] NOT NULL,        -- ["F30", "F31", "F34"]
  "vehicleString" TEXT NOT NULL,     -- Full string sa Spareto
  "engineDesc" TEXT,                 -- "320d", "2.0 TDI"
  "yearFrom" INTEGER,                -- 2012
  "yearTo" INTEGER,                  -- 2018
  "powerKW" INTEGER,                 -- 135
  "capacityCCM" INTEGER,             -- 1995
  "scrapedAt" TIMESTAMP,
  "createdAt" TIMESTAMP
);
```

### 3. `spareto_enrichment_missing_vehicles_template.sql` 🔧 **TEMPLATE**
- **COMMENTED OUT** SQL statements za dodavanje novih vozila
- VehicleBrand, VehicleModel, VehicleGeneration, VehicleEngine
- Ručno odkomentuj šta želiš da dodaš

**Koraci:**
1. Otvori fajl: `vim spareto_enrichment_missing_vehicles_template.sql`
2. Nađi vozila koja želiš da dodaš
3. Odkomentuj INSERT statements (ukloni `-- ` ispred)
4. Edituj ako treba (npr. tip vozila PASSENGER/COMMERCIAL)
5. Izvršavanje:
```bash
psql omerbasicdb < spareto_enrichment_missing_vehicles_template.sql
```

### 4. `spareto_enrichment_link_products.sql` 🔗 **LINKING**
- ProductVehicleFitment INSERT statements
- Linkuje proizvode sa **novododatim** vozilima
- **Izvršava se NAKON dodavanja vozila!**

**Izvršavanje:**
```bash
# PRVO dodaj vozila iz template-a, PA ONDA:
psql omerbasicdb < spareto_enrichment_link_products.sql
```

### 5. `spareto_enrichment_unmatched_vehicles.json` + `.txt` 📄 **REPORTOVI**
- JSON: Strukturirani podaci za programski pristup
- TXT: Human-readable report sa statistikama
- Koristi za pregled šta treba dodati

---

## 🔄 Kompletan Workflow

### Korak 1: Pokreni Enrichment

```bash
cd /Users/emir_mw/omerbasic/scripts/tecdoc-import

# Za testing (10-100 proizvoda)
python spareto_vehicle_enrichment.py 100 -o test_enrichment.sql

# Za production (svi proizvodi)
python spareto_vehicle_enrichment.py 24000 -o full_enrichment.sql
```

**Parametri:**
- `limit` - broj proizvoda (default: 10)
- `-o, --output` - output SQL fajl (opciono)
- `--test` - test sa specifičnim catalog brojem

**Napomene:**
- ⏱️ **Brzina:** ~1.5s po proizvodu (crawl delay)
- 📊 **24,000 proizvoda:** ~10 sati
- 💾 **Logovanje:** `spareto_enrichment.log`

### Korak 2: Import OEM Brojeva i Matchovanih Fitments

```bash
# Import glavnog SQL fajla
psql omerbasicdb < full_enrichment.sql

# Proveri rezultate
psql omerbasicdb -c "
  SELECT
    COUNT(DISTINCT \"productId\") as proizvoda,
    COUNT(*) as ukupno_oem
  FROM \"ArticleOENumber\"
  WHERE \"createdAt\" > NOW() - INTERVAL '1 hour';
"

psql omerbasicdb -c "
  SELECT COUNT(*) as fitments
  FROM \"ProductVehicleFitment\"
  WHERE \"createdAt\" > NOW() - INTERVAL '1 hour';
"
```

### Korak 3: Analiza Unmatchovanih Vozila

```bash
# Import temp tabele
psql omerbasicdb < full_enrichment_unmatched_table.sql

# Proveri koliko ima unmatchovanih
psql omerbasicdb -c "
  SELECT COUNT(*) FROM \"Spareto_UnmatchedVehicles\";
"

# Pregledaj po brendovima
psql omerbasicdb -c "
  SELECT
    brand,
    COUNT(DISTINCT model) as modela,
    COUNT(*) as ukupno_zapisa
  FROM \"Spareto_UnmatchedVehicles\"
  GROUP BY brand
  ORDER BY ukupno_zapisa DESC;
"

# Pregledaj UNIQUE vozila (bez duplikata)
psql omerbasicdb -c "
  SELECT
    brand,
    model,
    \"genCodes\",
    \"engineDesc\",
    COUNT(DISTINCT \"productId\") as broj_proizvoda,
    MIN(\"yearFrom\") as od_godine,
    MAX(\"yearTo\") as do_godine
  FROM \"Spareto_UnmatchedVehicles\"
  GROUP BY brand, model, \"genCodes\", \"engineDesc\"
  ORDER BY broj_proizvoda DESC
  LIMIT 20;
"
```

### Korak 4: Dodavanje Novih Vozila

#### Opcija A: Ručno iz Template-a (Preporučeno za Mali Broj)

```bash
# 1. Otvori template
vim full_enrichment_missing_vehicles_template.sql

# 2. Pronađi vozila koje želiš da dodaš
# Npr. pretraži: /BMW 2

# 3. Odkomentuj INSERT statements
# Izmeni tip vozila ako treba (PASSENGER/COMMERCIAL)

# 4. Izvršavanje
psql omerbasicdb < full_enrichment_missing_vehicles_template.sql
```

#### Opcija B: Bulk Import (Za Veliki Broj Vozila)

Kreiraj helper skriptu koja automatski generiše vozila iz `Spareto_UnmatchedVehicles`:

```sql
-- bulk_add_missing_vehicles.sql

-- 1. Dodaj brendove (ako ne postoje)
INSERT INTO "VehicleBrand" (id, name, type, source)
SELECT
  gen_random_uuid(),
  brand,
  CASE
    WHEN brand ILIKE '%truck%' OR brand ILIKE '%bus%' THEN 'COMMERCIAL'
    ELSE 'PASSENGER'
  END,
  'SPARETO'
FROM (
  SELECT DISTINCT brand
  FROM "Spareto_UnmatchedVehicles"
) u
WHERE NOT EXISTS (
  SELECT 1 FROM "VehicleBrand" vb
  WHERE LOWER(vb.name) = LOWER(u.brand)
)
ON CONFLICT (name) DO NOTHING;

-- 2. Dodaj modele (ako ne postoje)
INSERT INTO "VehicleModel" (id, name, "brandId")
SELECT
  gen_random_uuid(),
  u.model,
  vb.id
FROM (
  SELECT DISTINCT brand, model
  FROM "Spareto_UnmatchedVehicles"
) u
JOIN "VehicleBrand" vb ON LOWER(vb.name) = LOWER(u.brand)
WHERE NOT EXISTS (
  SELECT 1 FROM "VehicleModel" vm
  WHERE LOWER(vm.name) = LOWER(u.model)
    AND vm."brandId" = vb.id
)
ON CONFLICT DO NOTHING;

-- 3. Dodaj generacije (UNIQUE po brand+model+genCodes)
INSERT INTO "VehicleGeneration" (
  id, name, "modelId", "productionStart", "productionEnd"
)
SELECT DISTINCT ON (vb.name, vm.name, u."genCodes")
  gen_random_uuid(),
  array_to_string(u."genCodes", ', '),  -- "F30, F31"
  vm.id,
  u."yearFrom"::TEXT,
  u."yearTo"::TEXT
FROM "Spareto_UnmatchedVehicles" u
JOIN "VehicleBrand" vb ON LOWER(vb.name) = LOWER(u.brand)
JOIN "VehicleModel" vm ON LOWER(vm.name) = LOWER(u.model) AND vm."brandId" = vb.id
WHERE NOT EXISTS (
  SELECT 1 FROM "VehicleGeneration" vg
  WHERE vg."modelId" = vm.id
    AND LOWER(vg.name) = LOWER(array_to_string(u."genCodes", ', '))
)
ON CONFLICT DO NOTHING;

-- 4. Dodaj engine-e (UNIQUE po generation+engineDesc+powerKW)
INSERT INTO "VehicleEngine" (
  id, "engineCode", "enginePowerKW", "engineCapacity",
  "engineType", "generationId", source
)
SELECT DISTINCT ON (vg.id, u."engineDesc", u."powerKW")
  gen_random_uuid(),
  u."engineDesc",
  u."powerKW",
  u."capacityCCM",
  CASE
    WHEN u."engineDesc" ILIKE '%tdi%' OR u."engineDesc" ILIKE '%d%' THEN 'DIESEL'
    WHEN u."engineDesc" ILIKE '%electric%' THEN 'ELECTRIC'
    WHEN u."engineDesc" ILIKE '%hybrid%' THEN 'HYBRID'
    ELSE 'PETROL'
  END,
  vg.id,
  'SPARETO'
FROM "Spareto_UnmatchedVehicles" u
JOIN "VehicleBrand" vb ON LOWER(vb.name) = LOWER(u.brand)
JOIN "VehicleModel" vm ON LOWER(vm.name) = LOWER(u.model) AND vm."brandId" = vb.id
JOIN "VehicleGeneration" vg ON vg."modelId" = vm.id
  AND LOWER(vg.name) = LOWER(array_to_string(u."genCodes", ', '))
WHERE u."engineDesc" IS NOT NULL
ON CONFLICT DO NOTHING;
```

### Korak 5: Linkovanje Proizvoda sa Novim Vozilima

```bash
# NAKON što si dodao vozila, izvrši linking SQL
psql omerbasicdb < full_enrichment_link_products.sql

# Proveri da li su povezani
psql omerbasicdb -c "
  SELECT
    p.\"catalogNumber\",
    p.name,
    COUNT(pvf.id) as broj_vozila
  FROM \"Product\" p
  JOIN \"ProductVehicleFitment\" pvf ON pvf.\"productId\" = p.id
  WHERE pvf.\"createdAt\" > NOW() - INTERVAL '1 hour'
  GROUP BY p.id, p.\"catalogNumber\", p.name
  ORDER BY broj_vozila DESC
  LIMIT 20;
"
```

### Korak 6: Cleanup (Opciono)

```bash
# Obriši temp tabelu nakon što si završio
psql omerbasicdb -c 'DROP TABLE IF EXISTS "Spareto_UnmatchedVehicles";'

# Arhiviraj SQL fajlove
mkdir -p archive/$(date +%Y-%m-%d)
mv full_enrichment*.sql archive/$(date +%Y-%m-%d)/
mv full_enrichment*.json archive/$(date +%Y-%m-%d)/
```

---

## 🔍 Korisni Query-ji

### Provera Duplikata Vozila

```sql
-- Pronađi vozila koja su duplicirana (isto vozilo, više zapisa)
SELECT
  brand, model, "genCodes", "engineDesc",
  COUNT(*) as broj_duplikata,
  array_agg(DISTINCT "productId") as proizvodi
FROM "Spareto_UnmatchedVehicles"
GROUP BY brand, model, "genCodes", "engineDesc"
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;
```

### Top Proizvoda sa Najviše Unmatchovanih Vozila

```sql
SELECT
  p."catalogNumber",
  p.name,
  COUNT(DISTINCT s.brand || s.model || array_to_string(s."genCodes", '')) as unique_vozila,
  COUNT(*) as ukupno_zapisa
FROM "Spareto_UnmatchedVehicles" s
JOIN "Product" p ON p.id = s."productId"
GROUP BY p.id, p."catalogNumber", p.name
ORDER BY unique_vozila DESC
LIMIT 20;
```

### Pregled Po Godinama

```sql
SELECT
  brand,
  "yearFrom" as godina,
  COUNT(DISTINCT model) as modela
FROM "Spareto_UnmatchedVehicles"
GROUP BY brand, "yearFrom"
ORDER BY brand, "yearFrom" DESC;
```

### Export za Pregled u Excel

```bash
# Export unmatchovanih u CSV
psql omerbasicdb -c "
  COPY (
    SELECT DISTINCT
      brand, model, array_to_string(\"genCodes\", ', ') as generation,
      \"engineDesc\", \"powerKW\", \"capacityCCM\",
      \"yearFrom\", \"yearTo\",
      COUNT(DISTINCT \"productId\") as broj_proizvoda
    FROM \"Spareto_UnmatchedVehicles\"
    GROUP BY brand, model, \"genCodes\", \"engineDesc\",
             \"powerKW\", \"capacityCCM\", \"yearFrom\", \"yearTo\"
    ORDER BY brand, model, \"yearFrom\"
  ) TO STDOUT WITH CSV HEADER
" > unmatched_vehicles.csv
```

---

## ⚠️ Važne Napomene

### Deduplication Vozila

**Problem:** Ista vozila se mogu pojaviti više puta u `Spareto_UnmatchedVehicles` tabeli jer više proizvoda imaju isto vozilo.

**Rešenje:**
1. Koristi `DISTINCT ON` pri dodavanju vozila
2. Koristi `ON CONFLICT DO NOTHING` u INSERT statements
3. Ili koristi bulk import query iz Koraka 4B

### Validacija Engine Type

Automatska detekcija gorivnog tipa se bazira na nazivu:
- `TDI`, `DTI`, `DCI`, `D`, `DIESEL` → DIESEL
- `HYBRID`, `ELECTRIC`, `EV` → ELECTRIC/HYBRID
- `CNG`, `LPG` → GAS
- Sve ostalo → PETROL

**Ručno proveri:**
```sql
SELECT DISTINCT "engineDesc",
  CASE
    WHEN "engineDesc" ILIKE '%tdi%' THEN 'DIESEL'
    ELSE 'PETROL'
  END as detected_type
FROM "Spareto_UnmatchedVehicles"
WHERE "engineDesc" IS NOT NULL
LIMIT 50;
```

### Vehicle Type (PASSENGER vs COMMERCIAL)

Automatska detekcija:
- Ako brand sadrži: `truck`, `bus`, `van`, `commercial` → COMMERCIAL
- Sve ostalo → PASSENGER

**Ručno proveri brendove:**
```sql
SELECT DISTINCT brand,
  CASE
    WHEN brand ILIKE '%truck%' THEN 'COMMERCIAL'
    ELSE 'PASSENGER'
  END as detected_type
FROM "Spareto_UnmatchedVehicles"
ORDER BY brand;
```

### Performance

Za **24,000 proizvoda:**
- ⏱️ Scraping: ~10 sati (1.5s delay po proizvodu)
- 💾 SQL fajl (main): ~50-100MB
- 💾 Unmatched table SQL: ~20-50MB
- 📊 Očekivani unmatch rate: 30-50% (7,200-12,000 proizvoda)
- 🚀 Import u bazu: ~2-5 minuta

**Optimizacija:**
- Pokreni u `screen` ili `tmux` sesiji
- Koristi `nohup` za background izvršavanje
- Split u više batch-eva (npr. 5x5000 proizvoda)

---

## 🐛 Troubleshooting

### "No generation code found"

**Problem:** Mnoga vozila (posebno kamioni) nemaju generation kodove u parentheses.

**Primer:**
```
Mercedes-Benz NG 1632 AS
Man F90 24.372 FVLS
```

**Razlog:** Stari modeli kamiona često nemaju kodove poput (F30, E90).

**Rešenje:** Ova vozila se trenutno skipuju. Moguće je dodati manual mapping ili fallback logiku.

### Rate Limiting

**Simptom:** HTTP 429 Too Many Requests

**Rešenje:**
- Crawl delay je postavljen na 1.5s (dovoljno za spareto.com)
- Ako i dalje ima problema, povećaj u skripti: `self.crawl_delay = 2.0`

### SSL/Connection Errors

**Rešenje:**
```bash
# Proveri internet konekciju
curl https://spareto.com

# Proveri SSL sertifikate
python -c "import requests; requests.get('https://spareto.com')"
```

### Memorija (za velike batch-eve)

**Problem:** Python može koristiti puno RAM-a sa 24k proizvoda.

**Rešenje:** Split u manje batch-eve:
```bash
for i in {0..23}; do
  python spareto_vehicle_enrichment.py 1000 -o batch_${i}_enrichment.sql
  sleep 10
done
```

---

## 📊 Očekivani Rezultati (za 24k proizvoda)

| Metrika | Procena |
|---------|---------|
| OEM brojevi | 150,000 - 250,000 |
| Matchovani fitments | 300,000 - 500,000 |
| Unmatchovani proizvodi | 7,000 - 12,000 |
| Unmatchovani zapisi vozila | 50,000 - 100,000 |
| Unique unmatchovana vozila | 2,000 - 5,000 |
| Novi brendovi | 5-20 |
| Novi modeli | 100-300 |
| Nove generacije | 500-1,500 |
| Novi engine-i | 2,000-5,000 |

---

## 📝 Best Practices

1. **Testiraj prvo sa malim batch-om** (50-100 proizvoda)
2. **Pregledaj unmatchovana vozila** pre bulk importa
3. **Backup bazu** pre velikih importa
4. **Koristi transakcije** - BEGIN/COMMIT su već uključeni
5. **Loguj sve** - proveri `spareto_enrichment.log`
6. **Arhiviraj stare SQL fajlove** - čuvaj 30 dana
7. **Monitoruj disk space** - SQL fajlovi mogu biti veliki

---

## 🔧 Maintenance

### Periodic Re-enrichment

```bash
# Re-enrich proizvode koji nisu enrichovani duže od 6 meseci
# (modifikuj skriptu da query-uje stare proizvode)
```

### Cleanup Starih Zapisa

```sql
-- Obriši temp tabelu stariju od 30 dana
DELETE FROM "Spareto_UnmatchedVehicles"
WHERE "scrapedAt" < NOW() - INTERVAL '30 days';
```

---

## 📞 Support

**Logovi:** `spareto_enrichment.log`
**Skripta:** `spareto_vehicle_enrichment.py`
**Dokumentacija:** ovaj fajl

Za pitanja ili probleme, proveri:
1. Log fajl
2. PostgreSQL error messages
3. Spareto.com dostupnost
