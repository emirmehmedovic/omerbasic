# Cross-Link Engines by TecDoc ID - Upustva

## Opis

Ova skriptu automatski povezuje proizvode sa motorima u drugim markama koje imaju **isti TecDoc ID**.

Primjer: Ako je proizvod već povezan sa VW Golf sa motorom `1.4 TSI` (TecDoc ID: 12345), skriptu će automatski pronaći i poveza taj proizvod sa Audi, Skoda i drugim markama koje dijele **isti motor sa istim TecDoc ID-om**.

## Kako Funkcionira

1. **Pregledá proizvodé** - pronalazi sve proizvode koji su već povezani sa motorima
2. **Skuplja TecDoc ID-eve** - izvlači ID motora iz postojećih veza
3. **Pretraživanja motora** - u bazi pronalazi sve ostale motore sa istim TecDoc ID
4. **Automatsko povezivanje** - kreira nove `ProductVehicleFitment` veze za nove marke/modele

## Instalacija

Skriptu koristi `asyncpg` za direktnu konekciju na PostgreSQL:

```bash
pip install asyncpg python-dotenv
```

## Korištenje

### Osnovni Primjer (Dry-Run)
Pregled šta bi se promijenilo BEZ stvarnih promjena:

```bash
python scripts/cross_link_engines_by_tecdoc.py --dry-run
```

### Stvarno Povezivanje sa Reportom
Kreira nove veze i sprema detaljne log u CSV:

```bash
python scripts/cross_link_engines_by_tecdoc.py --report cross-link-report.csv
```

### Test sa Jednim Proizvodom
Testiraj sa specifičnim proizvodom (koristi product ID iz baze):

```bash
python scripts/cross_link_engines_by_tecdoc.py --dry-run --product-id clu2abc123def456 --report test-report.csv
```

## Opcije

| Opcija | Opis | Primjer |
|--------|------|---------|
| `--dry-run` | Pregled bez promjena | `--dry-run` |
| `--report FILE` | Upiši CSV report | `--report output.csv` |
| `--product-id ID` | Samo ovaj proizvod | `--product-id clu2abc123def456` |

## Primjer Outputa

```
======================================================================
🚀 CROSS-LINK ENGINES BY TECDOC ID
======================================================================

📋 Pronađen 156 proizvod(a) sa fitmentima

📦 Obrađujem proizvod: Filtera Zraka (KAT-FL-001)
   ✓ Fitment: Volkswagen Golf B5 - Motor: 1.4 TSI (TecDoc: 45678)
   ✓ Fitment: Volkswagen Passat B6 - Motor: 2.0 TDI (TecDoc: 45679)

   🔍 Tražim motore sa TecDoc ID: 45678
      ✓ Kreirano: Audi A3 8L - Motor: 1.4 TSI
      ✓ Kreirano: Skoda Octavia I - Motor: 1.4 TSI
      ⊘ Već povezano: Seat Ibiza 6L - Motor: 1.4 TSI

   🔍 Tražim motore sa TecDoc ID: 45679
      ✓ Kreirano: Audi A4 B7 - Motor: 2.0 TDI

======================================================================
📊 STATISTIKA
======================================================================
Ukupno proizvoda u bazi: 156
Proizvoda sa fitmentima: 156
Pronađenih TecDoc motora: 287
Matching motora u drugim markama: 542
Novih fitmenta kreiranog: 438
Preskočenih (duplikata): 104
======================================================================

📄 Report upisano: cross-link-report.csv (438 redaka)
```

## CSV Report Format

Report datoteka sadrži sljedeće kolone:

```csv
timestamp,product_id,product_name,catalog_number,action,tecdoc_engine_id,brand,model,generation,engine_code,notes
2024-11-13T14:23:45.123456,clu2abc...,Filtera Zraka,KAT-FL-001,created,45678,Audi,A3,8L,1.4 TSI,Auto-linked by TecDoc ID
```

## Sigurnost

- **Dry-Run Mode**: Pregleda sve bez stvarnih promjena - idealno za testiranje
- **Unique Constraint**: Baza sprječava duplikate zahvaljujući `UNIQUE(productId, generationId, engineId)` ograničenju
- **Transaction Safety**: Svaka operacija je atomska

## Primjer Scenarija

### Scenario: Povezivanje VAG grupe motora

Pretpostavimo da imamo proizvod "Filtera Zraka" koji je:
- Povezan sa Volkswagen Golf (1.4 TSI, TecDoc ID: 1234)

Skriptu će:
1. Pronaći sve motore sa TecDoc ID 1234
2. Automatski povezati proizvod sa:
   - Audi A3 (1.4 TSI, TecDoc ID: 1234) ✓ Kreirano
   - Skoda Octavia (1.4 TSI, TecDoc ID: 1234) ✓ Kreirano
   - SEAT Leon (1.4 TSI, TecDoc ID: 1234) ✓ Kreirano

## Česti Problemi

### "DATABASE_URL environment variable not set"
Povjeri `.env` datoteku:
```bash
echo $DATABASE_URL
```

### "No matching engines found"
To znači da motori nemaju TecDoc ID ili nema motora sa istim ID-om u drugim markama.

### Sporija Obrada
Za veće setove podataka, preporuka je:
- Prvo testiraj sa `--dry-run`
- Koristi `--product-id` za pojedinačne proizvode

## Napredne Opcije

### Direktna SQL Provjera
Ako želiš vidjeti TecDoc ID-eve motora:

```sql
SELECT DISTINCT ve."externalId" as tecdoc_id, COUNT(*)
FROM "VehicleEngine" ve
WHERE ve."externalId" IS NOT NULL
GROUP BY ve."externalId"
ORDER BY COUNT(*) DESC;
```

### Pronalaženje Proizvoda bez Motora
```sql
SELECT p.id, p.name
FROM "Product" p
INNER JOIN "ProductVehicleFitment" pvf ON p.id = pvf."productId"
WHERE pvf."engineId" IS NULL;
```

## Pitanja i Odgovori

**P: Što ako proizvod već ima fitment sa tom markom?**
O: Skriptu će preskočiti (vidjet ćeš "⊘ Već povezano") - UNIQUE constraint sprječava duplikate.

**P: Mogu li izvršiti za sve proizvode odjednom?**
O: Da! Samo izostavi `--product-id` opciju. Za prvi put preporuka je `--dry-run`.

**P: Što ako greške isprintam?**
O: Sve greške su zalogane i vidljive u outputu. CSV report sadrži samo uspješne akcije.

## Autor
Skriptu je kreirani za automatsku sinhronizaciju vehicle fitments-a unutar VAG grupe proizvođača i sličnih grupa gdje su motori zajednički.
