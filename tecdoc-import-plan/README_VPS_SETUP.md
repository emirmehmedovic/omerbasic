# 🚀 Pokretanje Batch Skripte na VPS-u

## Preduslovi

1. **PostgreSQL** - Radi na VPS-u (localhost:5432) ✅
2. **TecDoc MySQL** - Radi na tvom Mac-u (treba SSH tunel)

## Setup SSH Tunel (sa tvog Mac-a)

### Korak 1: Otvori SSH tunel za MySQL

```bash
# U jednom terminalu na Mac-u, drži ovo otvoreno
ssh -R 3307:localhost:3306 omerbasic@188.245.74.57
```

Ovo će:
- Forwadovati **VPS port 3307** → **Mac localhost:3306** (TecDoc MySQL)
- VPS može pristupiti TecDoc bazi preko `localhost:3307`

### Korak 2: Prebaci skriptu na VPS

```bash
# Sa Mac-a
cd ~/omerbasic
git add -A
git commit -m "Update batch script for VPS production database"
git push

# Na VPS-u
ssh omerbasic@188.245.74.57
cd ~/omerbasic
git pull
```

### Korak 3: Instaliraj Python dependencies (ako treba)

```bash
# Na VPS-u
cd ~/omerbasic/tecdoc-import-plan
python3 -m venv venv
source venv/bin/activate
pip install psycopg2-binary mysql-connector-python
```

### Korak 4: Pokreni skriptu

```bash
# Na VPS-u (sa aktivnim SSH tunelom!)
cd ~/omerbasic/tecdoc-import-plan
source venv/bin/activate

# Test sa 5 proizvoda
python phase2_enrich_products_batch.py --tecdoc-port 3307 --limit 5 --force

# Puni run (svi proizvodi)
python phase2_enrich_products_batch.py --tecdoc-port 3307 --force
```

## Argumenti Skripte

- `--force` - Ponovo obradi SVE proizvode od početka
- `--limit N` - Obradi samo N proizvoda (za testiranje)
- `--tecdoc-host HOST` - TecDoc MySQL host (default: localhost)
- `--tecdoc-port PORT` - TecDoc MySQL port (default: 3306, **koristi 3307 za SSH tunel**)

## Troubleshooting

### "Connection refused" na port 3307
- Provjeri da li je SSH tunel aktivan na Mac-u
- Pokreni: `ssh -R 3307:localhost:3306 omerbasic@188.245.74.57`

### "Access denied" za PostgreSQL
- Provjeri credentials u skripti
- Test: `psql -U emiir -d omerbasicdb -h localhost`

### MySQL root password
- Ako TecDoc MySQL na Mac-u ima password, ažuriraj skriptu (linija 42)

## Alternativa: TecDoc na VPS-u

Ako želiš da TecDoc baza bude na VPS-u (bez SSH tunela):

1. Exportuj TecDoc sa Mac-a:
```bash
mysqldump -u root tecdoc1q2019 > tecdoc_backup.sql
```

2. Prebaci na VPS:
```bash
scp tecdoc_backup.sql omerbasic@188.245.74.57:~/
```

3. Importuj na VPS:
```bash
mysql -u root -p tecdoc1q2019 < ~/tecdoc_backup.sql
```

4. Pokreni skriptu bez `--tecdoc-port`:
```bash
python phase2_enrich_products_batch.py --force
```
