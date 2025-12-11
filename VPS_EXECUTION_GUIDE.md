# VPS Execution Guide - Cross-Link Products Smart Script

## Commit Informacije

✅ **Commit**: `ecb4da6`
📝 **Poruka**: `feat: add smart cross-link engine code script for vehicle fitments`
🔗 **Branch**: `main`

## Kako Izvršiti na VPS-u

### 1. Pull Najnovih Izmjena

```bash
cd ~/omerbasic
git pull origin main
```

### 2. Aktiviraj Python Okruženje

```bash
cd ~/omerbasic/tecdoc-import-plan
source venv/bin/activate
```

### 3. Provjera DATABASE_URL

Skripta će automatski koristiti production DATABASE_URL iz `.env`:

```bash
# Trebalo bi biti:
# postgresql://emiir:emirMehmedovic123456789omerbasic@localhost:5432/omerbasicdb
echo $DATABASE_URL
```

## Korištenje Skripte

### Dry-Run Mode (SIGURNO - bez promjena)

**Test sa 10 proizvoda:**
```bash
python3 cross_link_products_smart.py --dry-run --limit 10 --report test_report.csv
```

**Test sa specifičnim proizvodom:**
```bash
python3 cross_link_products_smart.py --dry-run --product-id cmhqilidi06g6omc32vumxxun --report test.csv
```

**Test sa svim proizvodima:**
```bash
python3 cross_link_products_smart.py --dry-run --report full_test_report.csv
```

### Stvarno Linkanje (ODMAH IZVRSI)

**Sa specifičnim proizvodom:**
```bash
python3 cross_link_products_smart.py --product-id cmhqilidi06g6omc32vumxxun --report result_single.csv
```

**Sa limitom (npr. 100 proizvoda):**
```bash
python3 cross_link_products_smart.py --limit 100 --report result_100.csv
```

**Sa svim proizvodima (BULK):**
```bash
python3 cross_link_products_smart.py --report result_all.csv
```

## Primjer Izvršavanja

### Korak 1: Test sa Dry-Run

```bash
cd ~/omerbasic/tecdoc-import-plan
source venv/bin/activate

# Testiraj sa 10 proizvoda (bez promjena)
python3 cross_link_products_smart.py --dry-run --limit 10 --report test.csv

# Output trebalo bi biti:
# ✓ Povezan na bazu
# 🔗 SMART CROSS-LINK PRODUCTS BY ENGINE CODE
# ⚠️  DRY-RUN MODE - Bez stvarnih promjena u bazi
# 📋 Obrađujem X proizvod(a)
# ...
# 📊 STATISTIKA
# Proizvoda obrađeno: 10
# Matching generacija pronađeno: X
# Novih fitmenta kreiranog: X
# ...
# 📄 Report upisano: test.csv (X redaka)
```

### Korak 2: Analiza Report-a

```bash
# Pogledaj rezultate
cat test.csv | head -20

# Trebalo bi sadržavati:
# timestamp,product_id,product_name,catalog_number,action,original_brand,engine_code,new_brand,new_model,new_generation,notes
# 2025-11-13T13:45:12.339553,...,dry_run_created,...
```

### Korak 3: Stvarno Linkanje

```bash
# Ako je dry-run OK, pokreni bez --dry-run
python3 cross_link_products_smart.py --limit 100 --report result_100.csv

# Ili sve
python3 cross_link_products_smart.py --report result_all.csv
```

## Opcije Skripte

```
--dry-run              Pregled bez promjena (SIGURNO)
--product-id ID       Samo jedan proizvod
--limit N             Maksimalno N proizvoda
--report FILE         Upiši CSV report
```

## Primjer Rezultata

### Dry-Run sa 10 proizvoda

```
================================================================================
📊 STATISTIKA
================================================================================
Proizvoda obrađeno: 10
Engine kodova pronađeno: 0
Matching generacija pronađeno: 174
Novih fitmenta kreiranog: 174
Fitmenta preskočeno (duplikata): 0
Greške: 0
================================================================================

📄 Report upisano: test.csv (174 redaka)
```

### CSV Report Sadržaj

```csv
timestamp,product_id,product_name,catalog_number,action,original_brand,engine_code,new_brand,new_model,new_generation,notes
2025-11-13T13:47:08.007639,cmhqilgki02vhomc3589khywh,3M POLIR PASTA...,76343,dry_run_created,Nissan,HR15DE,Mazda,FAMILIA VAN,FAMILIA VAN (Y12),Auto-linked by engine code HR15DE
2025-11-13T13:47:08.042103,cmhqilgki02vhomc3589khywh,3M POLIR PASTA...,76343,dry_run_created,Nissan,HR15DE,Mitsubishi,LANCER VIII Cargo,LANCER VIII Cargo (CV_),Auto-linked by engine code HR15DE
```

## Česti Scenariji

### Scenario 1: Testiranje sa 10 Proizvoda

```bash
# Dry-run (test)
python3 cross_link_products_smart.py --dry-run --limit 10 --report test.csv

# Pogledaj rezultate
head -20 test.csv

# Ako je OK, pokreni stvarno
python3 cross_link_products_smart.py --limit 10 --report result_10.csv
```

### Scenario 2: Bulk Linkanje sa 1000 Proizvoda

```bash
# Test
python3 cross_link_products_smart.py --dry-run --limit 100 --report test_100.csv

# Ako je OK, cijeli bulk
python3 cross_link_products_smart.py --limit 1000 --report result_1000.csv
```

### Scenario 3: Sve Proizvode

```bash
# Test na svima (dry-run)
python3 cross_link_products_smart.py --dry-run --report test_all.csv

# Ako je OK, cijeli bulk
python3 cross_link_products_smart.py --report result_all.csv
```

## Sigurnost

⚠️ **VAŽNO:**
- Uvijek testiraj sa `--dry-run` prvo!
- Proslijedi `--limit` pri početku (npr. `--limit 100`)
- Čitaj CSV report prije nego što pokreneš stvarno linkanje
- Baza ima UNIQUE constraint što sprječava duplikate

## Moguće Greške

### "DATABASE_URL not set"
```bash
# Provjeri je li dostupan
echo $DATABASE_URL

# Trebalo bi biti:
# postgresql://emiir:emirMehmedovic123456789omerbasic@localhost:5432/omerbasicdb
```

### "ModuleNotFoundError: asyncpg"
```bash
# Instaliraj zavisnosti
pip install asyncpg python-dotenv
```

### Skriptu je spora
- Koristi `--limit` da ograničiš broj proizvoda
- Pokreni u noći za bulk operacije

## Dokumentacija

Detaljnu dokumentaciju na engleskom vidi u:
- `tecdoc-import-plan/SMART_CROSS_LINK_README.md` - Kompletan uputnik
- `tecdoc-import-plan/SCRIPTS_INDEX.md` - Index svih skripti
- `VEHICLE_FITMENTS_CROSS_LINKING_SUMMARY.md` - Tehnički detalji

## Monitoring

Tijekom izvršavanja, skriptu ispisuje:
- ✓ Koje vozilo obrađuje
- 🔍 Koje engine kodove pronalazi
- ✓ (DRY) ili ✓ Za dry-run ili stvarne linkove
- ⊘ Preskočena vozila (već povezana)
- ✗ Greške (ako ih bude)

## Git Info

```bash
# Vidi commit
git log -1 --oneline
# ecb4da6 feat: add smart cross-link engine code script for vehicle fitments

# Vidi koji fajlovi su dodani
git show --name-only
```

## Kontakt

Za pitanja ili probleme, pogledaj dokumentaciju ili kontaktiraj tima.

---

**Verzija**: 1.0
**Datum**: 13. Listopada 2025
**Status**: ✅ Production Ready
