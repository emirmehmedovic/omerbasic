# Smart Cross-Link Products by Engine Code

## Opis

**Smart Cross-Link** skriptu automatski povezuje proizvode sa **svim markama koje dijele isti engine kod**, čak i ako su dostupne samo u jednoj marki.

### Primjer Rada

Proizvod **"FILT.ZRAKA BMW 320D 98-"** (F205701) je već bio povezan sa:
- **BMW** sa motorima (20 vozila, uključujući B37 C15 A, M54 B25, itd.)

Skriptu je:
1. Pronašla sveEngine kodove sa kojima je povezan (B37 C15 A, M20 B20, M54 B25, itd.)
2. Za svaki engine kod pronašla druge brendove koji imaju isti motor
3. Automatski kreirala veze sa **Mini** brendom (jer Mini ima motor B37 C15 A):
   - Mini MINI (F55)
   - Mini MINI (F56)
   - Mini MINI CLUBMAN (F54)
   - Mini MINI COUNTRYMAN (F60)
   - Mini MINI Convertible (F57)

## Kako Funkcionira

```
1. Pronađi proizvod
   ↓
2. Pogledaj sve vehicle fitments (već povezana vozila)
   ↓
3. Skupi sve engine kodove iz tih vozila
   ↓
4. Za svaki engine kod:
   - Pronađi sve brendove koji imaju taj kod
   - Isključi brendove koji su već povezani
   ↓
5. Kreiraj nove ProductVehicleFitment veze
```

## Instalacija

Skriptu je u `/Users/emir_mw/omerbasic/tecdoc-import-plan/` direktorijumu:

```bash
cd /Users/emir_mw/omerbasic/tecdoc-import-plan
source venv/bin/activate  # Aktiviraj Python okruženje
```

## Korištenje

### Dry-Run (Pregled bez Promjena)
Test sa specifičnim proizvodom:

```bash
python3 cross_link_products_smart.py --dry-run --product-id cmhqilidi06g6omc32vumxxun --report test.csv
```

### Stvarno Povezivanje sa Report-om

```bash
python3 cross_link_products_smart.py --product-id cmhqilidi06g6omc32vumxxun --report report.csv
```

### Obrada Više Proizvoda (sa Limitom)

```bash
python3 cross_link_products_smart.py --limit 100 --report bulk_report.csv
```

### Obrada Svih Proizvoda sa Fitmentima

```bash
python3 cross_link_products_smart.py --report all_products_report.csv
```

## Opcije

| Opcija | Opis | Primjer |
|--------|------|---------|
| `--dry-run` | Pregled bez promjena u bazi | `--dry-run` |
| `--product-id ID` | Obradi samo jedan proizvod | `--product-id cmhqilidi06g6omc32vumxxun` |
| `--limit N` | Ograniči na N proizvoda | `--limit 50` |
| `--report FILE` | Upiši CSV report | `--report output.csv` |

## Output Primjer

```
================================================================================
🔗 SMART CROSS-LINK PRODUCTS BY ENGINE CODE
================================================================================

📋 Obrađujem 1 proizvod(a)

📦 Proizvod: FILT.ZRAKA BMW 320D 98- (F205701)
================================================================================
  ✓ Pronađeno 20 povezanih vozila
  ✓ Engine kodovi: B37 C15 A, M20 B20 (206KA), ...
  ✓ Brendovi: Bmw

  🔍 Tražim engine kod: B37 C15 A
    ✓ Pronađeno 5 generacija u drugim brendovima
      ✓ Kreirano: Mini MINI MINI (F55)
      ✓ Kreirano: Mini MINI MINI (F56)
      ✓ Kreirano: Mini MINI CLUBMAN MINI CLUBMAN (F54)
      ✓ Kreirano: Mini MINI COUNTRYMAN MINI COUNTRYMAN (F60)
      ✓ Kreirano: Mini MINI Convertible MINI Convertible (F57)

  🔍 Tražim engine kod: M20 B20 (206KA)
    ℹ Nema drugih brendova sa engine kodom M20 B20 (206KA)

  🔍 Tražim engine kod: ...

================================================================================
📊 STATISTIKA
================================================================================
Proizvoda obrađeno: 1
Matching generacija pronađeno: 5
Novih fitmenta kreiranog: 5
Fitmenta preskočeno (duplikata): 0
Greške: 0
================================================================================

📄 Report upisano: actual_report2.csv (5 redaka)
```

## CSV Report Format

Report datoteka sadrži sve kreirane veze sa detaljima:

```csv
timestamp,product_id,product_name,catalog_number,action,original_brand,engine_code,new_brand,new_model,new_generation,notes
2025-11-13T13:45:12.339553,cmhqilidi06g6omc32vumxxun,FILT.ZRAKA BMW 320D 98-,F205701,created,Bmw,B37 C15 A,Mini,MINI,MINI (F55),Auto-linked by engine code B37 C15 A
2025-11-13T13:45:12.405475,cmhqilidi06g6omc32vumxxun,FILT.ZRAKA BMW 320D 98-,F205701,created,Bmw,B37 C15 A,Mini,MINI,MINI (F56),Auto-linked by engine code B37 C15 A
```

## Sigurnost

- **Dry-Run Mode**: Pregleda sve bez stvarnih promjena (koristi za testiranje)
- **Unique Constraint**: Baza sprječava duplikate zahvaljujući `UNIQUE(productId, generationId, engineId)` ograničenju
- **Selective Linking**: Samo veza gdje je engine kod identičan će biti kreirana
- **Error Handling**: Sve greške su logirana i vidljive

## Primjer Scenarija

### Scenario 1: BMW Proizvod sa Mini Motorom
```
Proizvod je povezan sa BMW 318i (B37 C15 A motor)
    ↓
Skriptu pronalazi da Mini ima isti B37 C15 A motor
    ↓
Automatski povezuje proizvod sa Mini modelima
    ↓
Rezultat: +5 novih veza (Mini F55, F56, F54, F60, F57)
```

### Scenario 2: VAG Grupa (Volkswagen, Audi, Skoda, Seat)
```
Proizvod je povezan sa VW Golf sa motorom 1.9 TDI (kodom ABC123)
    ↓
Skriptu pronalazi da Audi, Skoda i Seat imaju isti kodar ABC123
    ↓
Automatski povezuje proizvod sa svim generacijama sa ABC123 motorom
    ↓
Rezultat: Proizvod je dostupan u cijeloj VAG grupi
```

## Česti Problemi i Rješenja

### "DATABASE_URL environment variable not set"
```bash
# Provjeri je li DATABASE_URL dostupan
echo $DATABASE_URL

# Trebat će te poставити u .env ili export
export DATABASE_URL="postgresql://..."
```

### "Nema drugih brendova sa engine kodom..."
To znači:
- Engine kod se koristi samo u jednoj marki
- Nema drugih brendova sa tim motorom
- To je OK - skriptu je radila, ali nije bilo što linkati

### Sporija Obrada
Za veće setove podataka:
```bash
# Prvo testiraj sa limitom
python3 cross_link_products_smart.py --limit 10 --dry-run --report test.csv

# Zatim radi sa većim limitom
python3 cross_link_products_smart.py --limit 100 --report batch1.csv
```

## Napredne SQL Upite

### Pronađi Engine Kodove sa Više Brendova
```sql
SELECT
    ve."engineCode",
    COUNT(DISTINCT vb.id) as brands_count,
    STRING_AGG(DISTINCT vb.name, ', ') as brands
FROM "VehicleEngine" ve
INNER JOIN "VehicleGeneration" vg ON ve."generationId" = vg.id
INNER JOIN "VehicleModel" vm ON vg."modelId" = vm.id
INNER JOIN "VehicleBrand" vb ON vm."brandId" = vb.id
GROUP BY ve."engineCode"
HAVING COUNT(DISTINCT vb.id) > 1
ORDER BY COUNT(DISTINCT vb.id) DESC;
```

### Pronađi Proizvode Koji su Kandidati za Cross-Linking
```sql
SELECT
    p.id,
    p.name,
    COUNT(DISTINCT ve."engineCode") as distinct_engine_codes,
    COUNT(DISTINCT vb.id) as brands_count
FROM "Product" p
INNER JOIN "ProductVehicleFitment" pvf ON p.id = pvf."productId"
INNER JOIN "VehicleGeneration" vg ON pvf."generationId" = vg.id
INNER JOIN "VehicleModel" vm ON vg."modelId" = vm.id
INNER JOIN "VehicleBrand" vb ON vm."brandId" = vb.id
INNER JOIN "VehicleEngine" ve ON pvf."engineId" = ve.id
GROUP BY p.id, p.name
HAVING COUNT(DISTINCT vb.id) = 1  -- Samo u jednoj marki
ORDER BY COUNT(DISTINCT ve."engineCode") DESC;
```

## Testiranje

Skriptu je testirana sa:
- **Produktom**: FILT.ZRAKA BMW 320D 98- (F205701)
- **Rezultat**: Pronašla 5 novih veza sa Mini brendom
- **Status**: ✓ Uspješno bez greške

## Autor i Verzija

- **Verzija**: 1.0
- **Datum**: November 13, 2025
- **Database**: PostgreSQL (Neon)
- **Python**: 3.9+

## Sljedeći Koraci

1. **Test na drugim proizvodima**:
   ```bash
   python3 cross_link_products_smart.py --limit 5 --dry-run
   ```

2. **Analiza Rezultata**: Pogledaj CSV report prije nego što pokrenete bez `--dry-run`

3. **Bulk Run**: Kada ste sigurni:
   ```bash
   python3 cross_link_products_smart.py --report final_report.csv
   ```

4. **Backup**: Prethodno naplaniraj backup baze podataka!

## Pitanja?

Skriptu je dokumentirana i testirana. Ako imaš pitanja:
- Pokreni sa `--dry-run` za pregled
- Provjeri CSV report za detalje
- Koristi `--product-id` za testiranje na specifičnom proizvodu
