# TecDoc Import Scripts

Skripte za enrichment proizvoda sa TecDoc podacima (OEM brojevi, technical specs, vehicle fitments).

---

## 📋 Pregled

### Šta ove skripte rade:

1. **Product Enrichment** - Dodaju TecDoc podatke proizvodima (OEM, EAN, specs)
2. **Quality Validation** - Automatska validacija kvaliteta matcheva
3. **Vehicle Linking** - OEM-based vehicle fitment linkovanje

### Ključne Features:

- ✅ Multi-level matching (EAN, Catalog, OEM)
- ✅ OEM validation (sprječava false positives na placeholder vrijednostima)
- ✅ Quality scoring (automatska validacija match kvaliteta)
- ✅ Dry run mode (validation bez upisa u bazu)
- ✅ CSV izvještaji za manuelnu provjeru

---

## 🚀 Quick Start

### Lokalno (Development)

```bash
# Setup
cd scripts/tecdoc-import
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Configure
cp .env.example .env
nano .env  # Popuni credentials

# Test validation (DRY RUN - bez upisa u bazu)
python3 tecdoc_enrichment_with_validation.py
```

### Produkcija (Deployment)

Pročitaj **[DEPLOYMENT-PLAN.md](DEPLOYMENT-PLAN.md)** za kompletne instrukcije.

---

## 📁 Fajlovi

### Python Skripte

| Fajl | Namjena |
|------|---------|
| `tecdoc_advanced_enrichment.py` | Multi-level product matching (EAN, Catalog, OEM) |
| `tecdoc_enrichment_with_validation.py` | QA sistem sa quality checks i validation |
| `tecdoc_smart_vehicle_linking.py` | OEM-based vehicle fitment linking |
| `analyze_oem_data_quality.py` | Analiza OEM data quality |

### Shell Skripte

| Fajl | Namjena |
|------|---------|
| `export-tecdoc-db.sh` | Export TecDoc baze za transfer na produkciju |

### Dokumentacija

| Fajl | Namjena |
|------|---------|
| `DEPLOYMENT-PLAN.md` | Kompletni plan za deployment na produkciju |
| `docs/OEM-MATCHING-FIX.md` | OEM matching fix dokumentacija |
| `docs/KAKO-SIGURNO-POKRENUTI-ENRICHMENT.md` | Safety guide za enrichment |
| `docs/SUMMARY.md` | Brzi pregled sistema |

---

## 🛡️ Safety Features

### OEM Validation
- Automatski skipuje placeholder vrijednosti: "0", "N/A", "-", etc.
- Sprječava false positive matches

### Quality Scoring (0-100%)
- Catalog number similarity check
- OEM number overlap check
- Product type matching
- Red flags detection

### Approval Thresholds
- Minimalni confidence: 85%
- Minimalni quality score: 70%
- Samo approved proizvodi se update-uju

---

## 📊 Workflow

### 3-faze siguran proces:

```
FAZA 1: VALIDATION (DRY RUN)
   ↓
   → CSV izvještaj za manuelnu provjeru
   ↓
FAZA 2: MANUAL CHECK
   ↓
   → Provjeri quality scores, issues, warnings
   ↓
FAZA 3: LIVE UPDATE
   ↓
   → Samo approved proizvodi
```

---

## 💡 Upotreba

### 1. Validation Run (DRY MODE)

```bash
# Test sa 20 proizvoda
python3 tecdoc_enrichment_with_validation.py

# Provjeri CSV izvještaj
open validation_report_*.csv
```

**CSV Kolone:**
- SKU, Product Name, Catalog, OEM
- Matched?, Article ID, Confidence, Method
- Quality Score, Should Update?, Reason, Issues, Warnings

### 2. Decision Based on Results

**Approval rate >= 50%** → ✅ SAFE TO PROCEED
**Approval rate 30-50%** → ⚠️ MEDIUM RISK - manual review
**Approval rate < 30%** → 🚨 HIGH RISK - investigate

### 3. Live Update (Production)

```bash
# Backup prvo!
pg_dump -U postgres -t '"Product"' omerbasicdb > backup_product_$(date +%Y%m%d).sql

# Live enrichment
python3 tecdoc_advanced_enrichment.py
```

---

## ⚙️ Konfiguracija

### Environment Variables (.env)

```bash
# PostgreSQL (User DB)
POSTGRES_HOST=localhost
POSTGRES_DB=omerbasicdb
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password

# MySQL (TecDoc DB)
MYSQL_HOST=localhost
MYSQL_DB=tecdoc1q2019
MYSQL_USER=root
MYSQL_PASSWORD=
```

### Thresholds (u Python kodu)

```python
# Stroži matching (manje false positives)
validator = TecDocEnricherWithValidation(
    min_confidence=90,
    min_quality_score=80
)

# Blaži matching (više matcheva)
validator = TecDocEnricherWithValidation(
    min_confidence=75,
    min_quality_score=60
)
```

---

## 📈 TecDoc Baza

### Veličina
**12.15 GB** (6.5M articles, 42M tree nodes)

### Top Tabele
- `tree_node_products`: 3.6 GB (42M rows) - vehicle linking
- `article_oe_numbers`: 3.5 GB (22M rows) - OEM matching
- `article_attributes`: 2.2 GB (23M rows) - technical specs

### Export & Import

```bash
# Export (lokalno)
./export-tecdoc-db.sh gzip

# Import (produkcija)
gunzip tecdoc1q2019_export_*.sql.gz
mysql -u root -p tecdoc1q2019 < tecdoc1q2019_export_*.sql
```

---

## 🚨 Troubleshooting

### Problem: Svi proizvodi rejected

**Check CSV** - koje su issues?
- LOW_CONFIDENCE → smanji `min_confidence`
- LOW_QUALITY → smanji `min_quality_score`
- RED FLAGS → provjeri product type mismatches

### Problem: OEM matchevi ne rade

**Check**:
1. Da li OEM vrijednost je placeholder? ("0", "N/A")
2. Da li OEM postoji u TecDoc `article_oe_numbers` tabeli?
3. Da li normalizacija radi? (spaces, dashes, etc.)

### Problem: Database connection fails

**Check**:
1. `.env` file sa ispravnim credentials
2. MySQL/PostgreSQL serveri running
3. Firewall rules ako je remote connection

---

## 📞 Support

### Dokumentacija
- [DEPLOYMENT-PLAN.md](DEPLOYMENT-PLAN.md) - Production deployment
- [docs/OEM-MATCHING-FIX.md](docs/OEM-MATCHING-FIX.md) - OEM matching details
- [docs/KAKO-SIGURNO-POKRENUTI-ENRICHMENT.md](docs/KAKO-SIGURNO-POKRENUTI-ENRICHMENT.md) - Safety guide

### Za Pitanja
- OEM matching strategije
- Quality validation issues
- Deployment pomoć
- Performance optimizacije

---

## ✅ Pre-Deployment Checklist

```
□ TecDoc baza exportovana i kompresovana
□ Skripte kopirane u scripts/tecdoc-import/
□ requirements.txt instaliran
□ .env file konfigurisan
□ Validation run testiran (20-100 proizvoda)
□ CSV izvještaj provjeren
□ Backup strategy pripremljena
□ Git commit & push
```

---

**Verzija**: 1.0
**Datum**: 2025-12-25
**Status**: READY FOR PRODUCTION
