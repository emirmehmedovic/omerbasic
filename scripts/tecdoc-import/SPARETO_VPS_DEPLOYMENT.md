# Spareto Enrichment - VPS Deployment Guide

## Nove Funkcionalnosti

### 1. **Automatski Retry sa Exponential Backoff**
- HTTP zahtjevi se automatski retry-uju do 3 puta
- Delay između retry-a: 2s → 4s → 8s
- Sprječava timeout greške

### 2. **Checkpoint Sistem za Resume**
- Automatski čuva napredak svakih 10 proizvoda
- Ako skripta pukne, može nastaviti odakle je stala
- Checkpoint fajl: `spareto_enrichment_checkpoint.json`
- Čuva:
  - Uspješno obrađene proizvode
  - Proizvode koji su failali (sa error porukama)
  - Statistiku

### 3. **Povećani Timeout**
- HTTP timeout povećan sa 30s na 60s
- Smanjuje timeout greške na sporijim konekcijama

### 4. **Skip Already Enriched**
- SQL query AUTOMATSKI preskače proizvode gdje je `sparetoEnrichedAt` već popunjen
- Ne moraš brinuti o duplikatima

---

## Komande

### Osnovno korištenje
```bash
python spareto_vehicle_enrichment.py 1000 -o output.sql
```

### Novi Parametri

#### `--clear-checkpoint`
Briše checkpoint i kreće ispočetka
```bash
python spareto_vehicle_enrichment.py 1000 -o output.sql --clear-checkpoint
```

#### `--no-checkpoint`
Isključuje checkpoint sistem (NE preporučujem za velike batch-eve)
```bash
python spareto_vehicle_enrichment.py 1000 -o output.sql --no-checkpoint
```

---

## VPS Setup - Korak po Korak

### 1. **Priprema Okruženja**

```bash
# SSH na VPS
ssh user@your-vps-ip

# Idi u folder projekta
cd /path/to/project/scripts/tecdoc-import

# Postavi DATABASE_URL env varijablu
export DATABASE_URL='postgresql://user:password@localhost:5432/production_db'

# Kreiraj folder za outpute
mkdir -p spareto_output
mkdir -p spareto_logs
```

### 2. **Test Run (mali batch)**

```bash
# Test sa 10 proizvoda
python spareto_vehicle_enrichment.py 10 \
  -o spareto_output/test.sql \
  > spareto_logs/test.log 2>&1

# Provjeri output
cat spareto_logs/test.log
cat spareto_output/test.sql
```

### 3. **Production Run - Batch Processing**

#### Opcija A: Ručno sa screen/tmux (preporučujem za prvi put)

```bash
# Pokreni screen session
screen -S spareto-enrichment

# Pokreni skriptu (npr. 2000 proizvoda)
python spareto_vehicle_enrichment.py 2000 \
  -o spareto_output/batch_2000.sql \
  > spareto_logs/batch_2000.log 2>&1

# Detach: pritisni Ctrl+A, pa D

# Later, reconnect:
screen -r spareto-enrichment

# Prati progress u realnom vremenu (drugi terminal):
tail -f spareto_logs/batch_2000.log
```

#### Opcija B: nohup (jednostavnije, ali bez interaktivnosti)

```bash
nohup python spareto_vehicle_enrichment.py 2000 \
  -o spareto_output/batch_2000.sql \
  > spareto_logs/batch_2000.log 2>&1 &

# Prati progress:
tail -f spareto_logs/batch_2000.log

# Provjeri da li radi:
ps aux | grep spareto
```

#### Opcija C: Automatski Bash Script sa batch-evima

```bash
#!/bin/bash
# run_spareto_batches.sh

export DATABASE_URL='postgresql://user:pass@localhost:5432/production_db'

# 24000 proizvoda / 500 po batch = 48 batches
for i in {1..48}; do
  echo "=========================================="
  echo "Starting Batch $i/48"
  echo "=========================================="

  python spareto_vehicle_enrichment.py 500 \
    -o "spareto_output/batch_${i}.sql" \
    > "spareto_logs/batch_${i}.log" 2>&1

  EXIT_CODE=$?

  if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ Batch $i completed successfully"
  else
    echo "❌ Batch $i failed with code $EXIT_CODE"
    echo "Check logs: spareto_logs/batch_${i}.log"
    # NASTAVLJA DALJE! Checkpoint će to skipovati sljedeći put
  fi

  # Pauza između batčeva (respekt prema Spareto serveru)
  echo "Sleeping 30 seconds before next batch..."
  sleep 30

done

echo "=========================================="
echo "All batches completed!"
echo "=========================================="
```

Pokreni:
```bash
chmod +x run_spareto_batches.sh
nohup ./run_spareto_batches.sh > master_log.txt 2>&1 &
```

---

## Resume After Crash

### Scenario: Skripta se prekinula nakon 467 proizvoda

**Što se desilo:**
- Checkpoint fajl je sačuvan: `spareto_enrichment_checkpoint.json`
- Sadrži 467 uspješno obrađenih proizvoda
- Možda ima i failed proizvode

**Kako nastaviti:**

```bash
# Jednostavno pokreni ISTU komandu ponovo
python spareto_vehicle_enrichment.py 2000 -o spareto_output/batch_2000.sql

# Skripta će:
# 1. Učitati checkpoint
# 2. Skipovati prvih 467 proizvoda (već obrađeni)
# 3. Nastaviti od 468. proizvoda
# 4. Dodati nove proizvode u ISTI SQL fajl (appenda)
```

**Output:**
```
📋 Checkpoint loaded: 467 products already processed
[1/2000] XYZ123 - Some Product...
  ⏭️  Skipping (already processed in previous run)
[2/2000] ABC456 - Another Product...
  ⏭️  Skipping (already processed in previous run)
...
[468/2000] DEF789 - New Product...
Processing: DEF789 (ID: abc123xyz)
...
```

### Započni ispočetka (ignoriši checkpoint)

```bash
# Opcija 1: Obriši checkpoint fajl ručno
rm spareto_enrichment_checkpoint.json

# Opcija 2: Koristi --clear-checkpoint flag
python spareto_vehicle_enrichment.py 2000 \
  -o spareto_output/new_batch.sql \
  --clear-checkpoint
```

---

## Monitoring & Troubleshooting

### Provjeri Checkpoint Status

```bash
# Pogledaj checkpoint fajl
cat spareto_enrichment_checkpoint.json

# Prebrooj obrađene proizvode
cat spareto_enrichment_checkpoint.json | jq '.processed_products | length'

# Vidi failed proizvode
cat spareto_enrichment_checkpoint.json | jq '.failed_products'
```

### Live Progress Monitoring

```bash
# Terminal 1: Pokreni skriptu
python spareto_vehicle_enrichment.py 2000 -o output.sql

# Terminal 2: Prati log
tail -f spareto_enrichment.log

# Terminal 3: Prati checkpoint
watch -n 5 'cat spareto_enrichment_checkpoint.json | jq ".processed_products | length"'
```

### Provjeri Koliko Proizvoda Još Treba Obogatiti

```bash
psql $DATABASE_URL -c "
SELECT COUNT(*) as remaining
FROM \"Product\"
WHERE \"sparetoEnrichedAt\" IS NULL
  AND \"catalogNumber\" IS NOT NULL
  AND (\"categoryId\" IS NULL OR \"categoryId\" NOT IN (
    'cmhqgvuez0002jr04nydfazr6',  -- ADR oprema
    'cmhqgvz2g0003jr04gcf2yd1f',  -- Autopraonice
    'cmhqgw8ru0005jr04ablp4il8',  -- Gume
    'cmhqhe4xx001rom7fhgeu9oet',  -- Točkovi / gume
    'cmhqhe6mz0033om7fq18qr151',  -- Točkovi / gume
    'cmhqgw3d20004jr04pzjgsfur'   -- Ulja i maziva
  ));
"
```

### Provjeri Koliko je Obogateno

```bash
psql $DATABASE_URL -c "
SELECT
  COUNT(*) FILTER (WHERE \"sparetoEnrichedAt\" IS NOT NULL) as enriched,
  COUNT(*) FILTER (WHERE \"sparetoEnrichedAt\" IS NULL) as not_enriched,
  COUNT(*) as total
FROM \"Product\"
WHERE \"catalogNumber\" IS NOT NULL;
"
```

---

## Import SQL Fajlova

### Batch po Batch

```bash
# Nakon svakog uspješnog batch-a
psql $DATABASE_URL < spareto_output/batch_1.sql
psql $DATABASE_URL < spareto_output/batch_2.sql
# ...
```

### Sve odjednom (oprezno!)

```bash
# Spoji sve SQL fajlove
cat spareto_output/batch_*.sql > spareto_output/all_batches.sql

# Importuj
psql $DATABASE_URL < spareto_output/all_batches.sql
```

### Import Unmatched Vehicles

```bash
# Import unmatched tabelu
psql $DATABASE_URL < spareto_output/batch_1_unmatched_table.sql

# Kreiraj missing vozila
psql $DATABASE_URL < bulk_add_missing_vehicles.sql

# Linkuj proizvode
psql $DATABASE_URL < spareto_output/batch_1_link_products.sql
```

---

## Konflikt sa TecDoc Skriptom

**Nema konflikta!**

```
TecDoc:
├─ READ:  TecDoc MySQL
└─ WRITE: PostgreSQL (direktno)

Spareto (SQL mode):
├─ READ:  PostgreSQL (proizvodi, vozila)
├─ READ:  Spareto website
└─ WRITE: SQL fajl (NE u bazu!)
```

Mogu raditi istovremeno bez problema.

---

## Best Practices

### 1. **Batch veličina**
- **500-1000 proizvoda** po batch-u
- Balans između:
  - Previše mali batch = previše SQL fajlova
  - Previše veliki batch = ako pukne, izgubio si dosta vremena

### 2. **Checkpoint**
- **UVIJEK** koristi checkpoint za batch > 100 proizvoda
- Checkpoint se automatski čuva svakih 10 proizvoda
- Backup checkpoint fajl povremeno:
  ```bash
  cp spareto_enrichment_checkpoint.json checkpoint_backup_$(date +%Y%m%d_%H%M%S).json
  ```

### 3. **Rate Limiting**
- Crawl delay: 1.5s (već podešeno)
- Pauza između batch-eva: 30-60s
- Spareto može rate-limitovati ako ideš prebrzo

### 4. **Logovanje**
- Čuvaj sve logove
- Pomažu za debugging
- Koristi rotation ako postane preveliko

### 5. **Test na dev bazi prvo**
- Testiraj batch od 50-100 proizvoda
- Verifikuj rezultate ručno
- Tek onda idi na produkciju

---

## Očekivani Rezultati za 24,000 Proizvoda

### Vrijeme
- **Spareto scraping**: ~1.5-2s po proizvodu
- **24,000 proizvoda** = 10-12 sati
- Sa pause-ovima: 12-15 sati

### Checkpoint Fajl
- Veličina: ~5-10 MB za 24k proizvoda
- Sadrži sve product ID-ove

### SQL Fajlovi (48 batčeva x 500)
- Batch SQL: ~100-500 KB po fajlu
- Unmatched SQL: ~50-200 KB po fajlu
- Ukupno: ~10-30 MB za sve

### Očekivani Podaci
- **OEM brojevi**: 100,000-200,000 novih
- **Vehicle fitments**: 150,000-300,000 novih
- **Unmatched vozila**: 5,000-15,000

---

## Troubleshooting

### Problem: Timeout greške

**Rješenje:**
- Retry logika se automatski aktivira
- Ako nastavlja, povećaj timeout u kodu:
  ```python
  self.timeout = 90  # povećaj sa 60 na 90
  ```

### Problem: Rate limiting od Spareto

**Simptomi:**
- HTTP 429 greške
- HTTP 503 greške
- Sporiji odgovori

**Rješenje:**
```python
self.crawl_delay = 3.0  # povećaj sa 1.5 na 3.0
```

### Problem: Checkpoint fajl corrputed

**Rješenje:**
```bash
# Obriši i kreni ispočetka
rm spareto_enrichment_checkpoint.json

# ILI restauruj backup
cp checkpoint_backup_20250129_153000.json spareto_enrichment_checkpoint.json
```

### Problem: Previše failed proizvoda u checkpointu

**Analiza:**
```bash
# Vidi razloge
cat spareto_enrichment_checkpoint.json | jq '.failed_products'

# Ako je većina "Product not found":
# - Normalno, neki proizvodi ne postoje na Spareto
# - Može ih skipovati

# Ako je većina timeout/connection errors:
# - Povećaj timeout
# - Smanji batch veličinu
# - Dodaj duže pauze
```

---

## Kontakt za Pitanja

- Email: info@omerbasic.com
- Check logs: `spareto_enrichment.log`
- Check checkpoint: `spareto_enrichment_checkpoint.json`
