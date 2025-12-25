# Kako Sigurno Pokrenuti Enrichment

**GARANTOVAN SIGURAN PROCES** - nema iznenađenja!

---

## 🎯 Problem koji rješava

**Tvoje Pitanje**: "Kako sad da budemo sigurni kad pokrenemo skriptu, da će matching biti kako treba? Teško mi je poslije provjeriti sve proizvode."

**Rješenje**: **Automatska validacija kvaliteta matcheva** + CSV izvještaj za manuelnu provjeru + **3-faze proces** (validation → approval → live update)

---

## ✅ Sistem Garantija

### Što sistem AUTOMATSKI provjerava:

1. **OEM Validation** ✅
   - Skipuje placeholder vrijednosti ("0", "N/A", etc.)
   - Sprječava false positive matches

2. **Match Quality Scoring** (0-100%) ✅
   - Provjera catalog number sličnosti
   - Provjera da li OEM brojevi odgovaraju
   - Provjera product type sličnosti
   - Detektovanje red flags (npr. Filter vs Mirror)

3. **Confidence Thresholds** ✅
   - Minimalni confidence: 85% (configurable)
   - Minimalni quality score: 70% (configurable)

4. **Approval Decision** ✅
   - APPROVE: Visok confidence + visok quality + nema issues
   - REJECT: Nizak confidence ili nizak quality ili ima issues

5. **Detaljni Izvještaji** ✅
   - CSV file za manuelnu provjeru
   - Log file sa svim detaljima
   - Summary statistics

---

## 📋 3-FAZE SIGURAN PROCES

### **FAZA 1: VALIDATION RUN (DRY MODE)** - Bez upisa u bazu!

```bash
cd /Users/emir_mw/omerbasic/tecdoc-import-plan
source venv/bin/activate

# Test sa 20 proizvoda
python tecdoc_enrichment_with_validation.py
```

**Šta radi**:
- Pronalazi TecDoc matcheve
- Validira kvalitet matcheva
- **NE UPISUJE NIŠTA U BAZU**
- Kreira CSV izvještaj
- Daje preporuku (SAFE/MEDIUM RISK/HIGH RISK)

**Output**:
```
📊 OVERALL STATS:
   Total validated: 20
   Matched: 10 (50.0%)
   Not matched: 10 (50.0%)

📈 MATCH QUALITY:
   High quality (90%+): 1 (10.0%)
   Medium quality (70-90%): 7 (70.0%)
   Low quality (<70%): 2 (20.0%)

✅ APPROVAL DECISION:
   APPROVED for update: 5 (50.0%)
   REJECTED (low confidence): 3
   REJECTED (low quality): 2

💡 RECOMMENDATION:
   🚨 HIGH RISK - Only 5/20 (25.0%) approved
   → DO NOT proceed with LIVE run - investigate issues first
```

**CSV File**: `validation_report_YYYYMMDD_HHMMSS.csv`

---

### **FAZA 2: MANUELNA PROVJERA** - Otvori CSV i provjeri

```bash
# Otvori CSV file u Excel/LibreOffice
open validation_report_20251225_230432.csv
```

**CSV Kolone**:
```
SKU | Product Name | Catalog | OEM | Matched? | Article ID | Confidence | Method |
TecDoc Manufacturer | TecDoc Product Type | TecDoc OEM Count |
Quality Score | Quality Valid? | Should Update? | Reason | Issues | Warnings
```

**Što provjeriti**:

1. **Proizvodi sa "Should Update? = YES"** ✅
   - Da li TecDoc Product Type ima smisla?
   - Da li TecDoc Manufacturer odgovara?
   - Da li ima red flags u Issues koloni?

2. **Proizvodi sa "Should Update? = NO"** ❌
   - Pročitaj Reason (LOW_CONFIDENCE, LOW_QUALITY)
   - Pročitaj Issues i Warnings
   - Odluči: da li ipak treba update-ovati?

3. **Random Sample Check** 🎲
   - Uzmi 5-10 random proizvoda sa "Should Update? = YES"
   - Manuelno provjeri u TecDoc bazi da li matchevi imaju smisla

---

### **FAZA 3: LIVE UPDATE** - Samo odobrene proizvode!

**OPCIJA A: Update samo high-confidence proizvode**

```python
# Modifikuj tecdoc_enrichment_with_validation.py
# Dodaj na kraju:

def update_approved_products(self, dry_run=True):
    """Update SAMO proizvoda koji su odobreni"""

    cursor = self.postgres_conn.cursor()

    for report in self.validation_reports:
        if not report.should_update:
            logging.info(f"SKIP: {report.catalog_number} - {report.reason}")
            continue

        if dry_run:
            logging.info(f"DRY RUN: Would update {report.catalog_number} with article_id={report.article_id}")
            continue

        # LIVE UPDATE
        logging.info(f"UPDATING: {report.catalog_number} → article_id={report.article_id}")

        query = """
            UPDATE "Product"
            SET "tecdocArticleId" = %s,
                "updatedAt" = NOW()
            WHERE id = %s
        """

        cursor.execute(query, (report.article_id, report.product_id))

    self.postgres_conn.commit()
    cursor.close()
```

**OPCIJA B: Batch Update sa Safety Checks**

```python
# U tecdoc_enrichment_with_validation.py main bloku:

if __name__ == "__main__":
    validator = TecDocEnricherWithValidation(
        min_confidence=85,      # Samo 85%+
        min_quality_score=70    # Samo 70%+
    )

    try:
        # VALIDATION
        validator.validate_batch(
            limit=100,              # Veći batch
            offset=0,
            filter_mode='no_tecdoc'
        )

        csv_file = validator.export_validation_report_csv()

        # APPROVAL CHECK
        approved_count = validator.stats['approved_for_update']
        total_count = validator.stats['total']
        approval_rate = approved_count / total_count if total_count > 0 else 0

        logging.info(f"\n{'='*80}")
        logging.info(f"APPROVAL RATE: {approved_count}/{total_count} = {approval_rate*100:.1f}%")

        if approval_rate >= 0.5:
            logging.info("✅ SAFE TO PROCEED - Approval rate >= 50%")

            # Pitaj korisnika
            response = input("\nProceed with LIVE update? (yes/no): ")

            if response.lower() == 'yes':
                validator.update_approved_products(dry_run=False)
                logging.info("✅ LIVE UPDATE COMPLETED")
            else:
                logging.info("❌ LIVE UPDATE CANCELLED")

        else:
            logging.info(f"🚨 NOT SAFE - Approval rate only {approval_rate*100:.1f}%")
            logging.info("Review CSV file and investigate issues before proceeding")

        logging.info(f"{'='*80}")

    finally:
        validator.close()
```

---

## 🛡️ Safety Checks u Sistemu

### 1. OEM Placeholder Detection

```python
# Automatski skipuje:
- "0", "00", "000", etc.
- "N/A", "NA", "NONE"
- "-", "/", "X", "XX"
- Kratke OEM-ove (< 3 chars)
```

### 2. Match Quality Scoring

**Scoring Logic**:
```
Starting score: 100

-10 points: Catalog brojevi različiti (ako nije catalog match)
-15 points: OEM nije u TecDoc OEM listi (non-critical)
-50 points: Matched preko OEM ali OEM nije u TecDoc listi (CRITICAL!)
-20 points: Product type ne odgovara
-40 points: Opposite product types (Filter vs Mirror)

Final score: max(0, min(100, score))
Valid: score >= 70 AND no CRITICAL issues
```

**Primjeri**:

| Scenario | Score | Valid? |
|----------|-------|--------|
| Catalog exact match, OEM match, type match | 100 | ✅ YES |
| Catalog normalized, OEM not in list, type match | 85 | ✅ YES |
| OEM exact match, catalog different, type match | 80 | ✅ YES |
| OEM match, different catalogs, different types | 50 | ❌ NO |
| Placeholder OEM match | 0 | ❌ NO |

### 3. Approval Thresholds

```python
APPROVED if:
  - Confidence >= 85% (default)
  - Quality Score >= 70% (default)
  - No CRITICAL issues

REJECTED if:
  - Confidence < 85%
  - Quality Score < 70%
  - Has CRITICAL issues
```

**Možeš prilagoditi thresholds**:
```python
validator = TecDocEnricherWithValidation(
    min_confidence=90,      # Stroži (90%+)
    min_quality_score=80    # Stroži (80%+)
)
```

### 4. Red Flags Detection

**CRITICAL Red Flags** (instant rejection):
- Matched preko placeholder OEM-a
- Matched preko OEM-a koji ne postoji u TecDoc OEM listi
- Opposite product types (Filter vs Mirror Glass)

**Warnings** (score penalty):
- Catalog brojevi različiti
- OEM nije u TecDoc listi (ali nije used za match)
- Product type name nije očigledan match

---

## 📊 Kako Interpretirati Rezultate

### Scenario 1: SAFE TO PROCEED ✅

```
📊 OVERALL STATS:
   Total validated: 100
   Matched: 70 (70.0%)
   Approved: 60 (60.0%)

💡 RECOMMENDATION:
   ✅ SAFE TO PROCEED - 60/100 (60.0%) approved
```

**Akcija**: Možeš pokrenuti LIVE update sa confidence!

### Scenario 2: MEDIUM RISK ⚠️

```
📊 OVERALL STATS:
   Total validated: 100
   Matched: 50 (50.0%)
   Approved: 35 (35.0%)

💡 RECOMMENDATION:
   ⚠️  MEDIUM RISK - 35/100 (35.0%) approved
   → Review validation reports manually before LIVE run
```

**Akcija**:
1. Otvori CSV file
2. Provjeri proizvode sa "Should Update? = NO"
3. Provjeri Warnings i Issues
4. Odluči koje proizvode manuelno odobravati

### Scenario 3: HIGH RISK 🚨

```
📊 OVERALL STATS:
   Total validated: 100
   Matched: 30 (30.0%)
   Approved: 15 (15.0%)

💡 RECOMMENDATION:
   🚨 HIGH RISK - Only 15/100 (15.0%) approved
   → DO NOT proceed with LIVE run - investigate issues first
```

**Akcija**:
1. **NE POKREĆI LIVE UPDATE!**
2. Analiziraj zašto je toliko rejected:
   - Provjeri TOP ISSUES u summary-u
   - Otvori CSV i sortiraj po Quality Score
   - Identificiraj pattern (npr. svi proizvodi istog tipa failed)
3. Možda treba:
   - Adjustovati thresholds
   - Dodati specifične validacije
   - Manuelni matching za neke proizvode

---

## 🔄 Batch Processing Strategy

### Za 10,000+ proizvoda:

**Ne pokreći sve odjednom!** Koristi batch approach:

```bash
# Batch 1: Test sa 100
python tecdoc_enrichment_with_validation.py --limit=100 --offset=0

# Provjeri rezultate
# Ako OK, nastavi:

# Batch 2: 100-200
python tecdoc_enrichment_with_validation.py --limit=100 --offset=100

# Batch 3: 200-300
python tecdoc_enrichment_with_validation.py --limit=100 --offset=200

# etc.
```

**Ili automated batch script**:

```bash
#!/bin/bash

for i in {0..10000..100}; do
    echo "Processing batch offset=$i"

    python tecdoc_enrichment_with_validation.py --limit=100 --offset=$i

    # Check approval rate
    approval_rate=$(grep "APPROVED for update" enrichment_validation_*.log | tail -1 | grep -oE '[0-9]+\.[0-9]+%')

    echo "Approval rate: $approval_rate"

    # Pauza između batches
    sleep 5
done
```

---

## 📁 Output Files

### 1. Log File
**Naziv**: `enrichment_validation_YYYYMMDD_HHMMSS.log`

**Sadržaj**:
- Detaljan log za svaki proizvod
- Match rezultati
- Quality checks
- Approval decisions
- Summary statistics

### 2. CSV Report
**Naziv**: `validation_report_YYYYMMDD_HHMMSS.csv`

**Sadržaj**:
- Tabela sa svim proizvodima
- Match details
- Quality scores
- Approval status
- Issues & Warnings

**Koristi ga za**:
- Manuelnu provjeru
- Filtriranje i sortiranje
- Identifikaciju problema
- Odluku o LIVE update-u

---

## 🎯 Best Practices

### 1. Uvijek Kreni sa Malim Sample-om

```python
# Start: 20 proizvoda
validator.validate_batch(limit=20, offset=0)

# Ako OK: 100 proizvoda
validator.validate_batch(limit=100, offset=0)

# Ako OK: 500 proizvoda
validator.validate_batch(limit=500, offset=0)

# Ako OK: Full batch
validator.validate_batch(limit=10000, offset=0)
```

### 2. Provjeri Random Sample

```python
# Iz CSV-a, uzmi random 10 proizvoda sa "Should Update? = YES"
# Manuelno provjeri u TecDoc bazi
# Ako 9/10 je OK → safe to proceed
# Ako < 7/10 je OK → investigate
```

### 3. Backup Prije LIVE Update

```bash
# Backup Product tabele
pg_dump -U emir_mw -t '"Product"' omerbasicdb > backup_product_$(date +%Y%m%d).sql

# Backup ArticleOENumber tabele
pg_dump -U emir_mw -t '"ArticleOENumber"' omerbasicdb > backup_oem_$(date +%Y%m%d).sql
```

### 4. Rollback Plan

```sql
-- Ako nešto pođe loše, rollback LIVE update:

-- Vrati tecdocArticleId na NULL za proizvode update-ovane danas
UPDATE "Product"
SET "tecdocArticleId" = NULL
WHERE "updatedAt"::date = CURRENT_DATE
  AND "tecdocArticleId" IS NOT NULL;

-- Ili restore iz backup-a:
psql -U emir_mw omerbasicdb < backup_product_20251225.sql
```

### 5. Monitor LIVE Update

```python
# Kad pokreneš LIVE update, prati real-time:

tail -f enrichment_validation_*.log | grep -E "(UPDATING|ERROR|CRITICAL)"

# U drugom terminal-u, provjeri bazu:
psql -U emir_mw omerbasicdb

# Koliko je update-ovano u zadnjih 5 minuta?
SELECT COUNT(*) FROM "Product"
WHERE "updatedAt" > NOW() - INTERVAL '5 minutes'
  AND "tecdocArticleId" IS NOT NULL;
```

---

## ⚙️ Konfiguracija

### Thresholds

```python
# Stroži matching (manje false positives, više rejected)
validator = TecDocEnricherWithValidation(
    min_confidence=90,      # Default: 85
    min_quality_score=80    # Default: 70
)

# Blaži matching (manje rejected, više false positives)
validator = TecDocEnricherWithValidation(
    min_confidence=75,      # Default: 85
    min_quality_score=60    # Default: 70
)
```

### Filter Modes

```python
# Proizvodi BEZ TecDoc ID (za novi matching)
filter_mode='no_tecdoc'

# Proizvodi SA TecDoc ID (za enrichment OEM brojeva)
filter_mode='has_tecdoc'

# Svi proizvodi
filter_mode='all'
```

---

## 🚨 Troubleshooting

### Problem: Svi proizvodi rejected (LOW_CONFIDENCE)

**Razlog**: Matching metode daju < 85% confidence (npr. OEM exact = 80%)

**Rješenje**:
```python
# Smanji min_confidence
validator = TecDocEnricherWithValidation(min_confidence=75)
```

### Problem: Svi proizvodi rejected (LOW_QUALITY)

**Razlog**: Product type names ne odgovaraju

**Rješenje**:
- Provjeri CSV - da li su warnings validni?
- Ako su matchevi zapravo OK, smanji min_quality_score:
```python
validator = TecDocEnricherWithValidation(min_quality_score=60)
```

### Problem: Approval rate jako nizak (<20%)

**Razlog**: Možda proizvodi zaista nemaju dobre matcheve u TecDocu

**Rješenje**:
1. Provjeri CSV - koje su top issues?
2. Provjeri matching methods - koje metode rade najbolje?
3. Možda treba alternativna strategija (vehicle-based, manual, etc.)

---

## ✅ ZAKLJUČAK

**Sa ovim sistemom, GARANTOVANO** znaš:

1. ✅ Koji proizvodi će biti update-ovani PRIJE nego što upišeš u bazu
2. ✅ Zašto svaki proizvod je approved ili rejected
3. ✅ Koji matchevi su high quality a koji low quality
4. ✅ Da li postoje red flags ili problemi
5. ✅ CSV file za manuelnu provjeru bilo kojeg proizvoda

**Ne možeš slučajno upropastiti bazu** jer:
- Faza 1 (Validation) ne upisuje ništa
- Faza 2 (Manual Check) daje ti kontrolu
- Faza 3 (Live Update) update-uje SAMO odobrene proizvode

**Workflow**:
```
VALIDATION (dry run) → CSV Check → Decision → LIVE Update (samo approved)
```

---

**Pitanja? Testiraj sa 20 proizvoda prvo!** 🚀

```bash
python tecdoc_enrichment_with_validation.py
# Provjeri CSV
# Ako izgledaju OK, povećaj limit
```
