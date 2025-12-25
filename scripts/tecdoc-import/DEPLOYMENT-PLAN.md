# TecDoc Import - Deployment na Produkciju

**Datum**: 2025-12-25
**TecDoc Baza**: 12.15 GB (bez slika)

---

## 📋 PREGLED

### Šta prebacujemo:
1. **TecDoc MySQL baza** (12.15 GB) - tar.gz export
2. **Python skripte** za enrichment i matching
3. **Dokumentacija** za siguran deployment

### Zašto na produkciji:
- Enrichment će trajati **nekoliko dana** (14,443+ proizvoda)
- Lokalni Mac ne može biti uključen toliko vremena
- Produkcijski VM može raditi non-stop

---

## 📊 TecDoc BAZA - Detalji

### Veličina
**Ukupno: 12.15 GB** (samo baza, bez slika)

### Top 5 Tabela:
| Tabela | Size | Redova | Namjena |
|--------|------|--------|---------|
| tree_node_products | 3.6 GB | 42.8M | Vehicle linking |
| article_oe_numbers | 3.5 GB | 22.0M | OEM matching |
| article_attributes | 2.2 GB | 23.0M | Technical specs |
| articles | 1.2 GB | 6.5M | Glavni artikli |
| article_mediainformation | 0.6 GB | 6.4M | Slike (metadata) |

### Važne Tabele za Enrichment:
- ✅ `articles` - glavni artikli
- ✅ `article_oe_numbers` - OEM brojevi (KLJUČNO!)
- ✅ `article_ea_numbers` - EAN kodovi
- ✅ `article_attributes` - tehničke specifikacije
- ✅ `suppliers` - proizvođači
- ✅ `manufacturers` - OEM proizvođači
- ✅ `tree_node_products` - vehicle linkage
- ✅ `passengercars` - vozila
- ✅ `engines` - motori
- ✅ `models` - modeli

---

## 🚀 DEPLOYMENT KORACI

### **KORAK 1: Export TecDoc Baze (Lokalno)**

```bash
# Export MySQL dump
mysqldump -u root \
  --single-transaction \
  --quick \
  --lock-tables=false \
  tecdoc1q2019 > tecdoc1q2019_export.sql

# Provjer veličinu dump-a
ls -lh tecdoc1q2019_export.sql

# Kompresuj (GZIP - brže, manja kompresija)
gzip tecdoc1q2019_export.sql
# Result: ~3-4 GB

# ILI Kompresuj (XZ - sporije, bolja kompresija)
xz -9 -T0 tecdoc1q2019_export.sql
# Result: ~1-2 GB
```

**Očekivano vrijeme**:
- Export: 30-60 min
- Kompresija (gzip): 10-20 min
- Kompresija (xz): 30-60 min

**Očekivana veličina kompresovano**:
- GZIP: ~3-4 GB
- XZ: ~1-2 GB

---

### **KORAK 2: Pripremi Skripte za Deploy**

```bash
cd /Users/emir_mw/omerbasic/scripts/tecdoc-import

# Kopiraj Python skripte
cp /Users/emir_mw/omerbasic/tecdoc-import-plan/tecdoc_advanced_enrichment.py .
cp /Users/emir_mw/omerbasic/tecdoc-import-plan/tecdoc_enrichment_with_validation.py .
cp /Users/emir_mw/omerbasic/tecdoc-import-plan/tecdoc_smart_vehicle_linking.py .
cp /Users/emir_mw/omerbasic/tecdoc-import-plan/analyze_oem_data_quality.py .
cp /Users/emir_mw/omerbasic/tecdoc-import-plan/test_*.py .

# Kopiraj dokumentaciju
cp /Users/emir_mw/omerbasic/tecdoc-import-plan/docs/*.md ./docs/
cp /Users/emir_mw/omerbasic/tecdoc-import-plan/*.md .

# Kreiraj requirements.txt
cat > requirements.txt << 'EOF'
psycopg2-binary>=2.9.9
mysql-connector-python>=8.2.0
EOF

# Kreiraj .env.example
cat > .env.example << 'EOF'
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
EOF
```

---

### **KORAK 3: Git Commit & Push**

```bash
cd /Users/emir_mw/omerbasic

# Add skripte
git add scripts/tecdoc-import/

# Commit
git commit -m "Add TecDoc enrichment scripts for production deployment

- tecdoc_advanced_enrichment.py: Multi-level product matching
- tecdoc_enrichment_with_validation.py: QA system with quality checks
- tecdoc_smart_vehicle_linking.py: OEM-based vehicle linking
- OEM validation fix: Prevents false positive matches on placeholder values
- Quality scoring system: Automatic validation of match quality
- Comprehensive documentation and deployment plan

Fixes:
- OEM placeholder detection (prevents matching on '0', 'N/A', etc.)
- Match quality validation (catalog, OEM, product type checks)
- Approval thresholds (min 85% confidence, 70% quality)

Ready for production deployment on VM.
TecDoc database: 12.15 GB (export required)"

# Push
git push origin main
```

---

### **KORAK 4: Transfer na Produkciju**

**OPCIJA A: SCP Transfer** (ako imaš direktan SSH pristup)

```bash
# Transfer kompresovanog dump-a
scp tecdoc1q2019_export.sql.gz user@production-vm:/tmp/

# ILI transfer preko rsync (resume support)
rsync -avz --progress tecdoc1q2019_export.sql.gz user@production-vm:/tmp/
```

**OPCIJA B: Upload na Cloud Storage** (ako nemaš direktan SSH)

```bash
# Google Cloud Storage
gsutil cp tecdoc1q2019_export.sql.gz gs://your-bucket/

# AWS S3
aws s3 cp tecdoc1q2019_export.sql.gz s3://your-bucket/

# Na produkciji:
gsutil cp gs://your-bucket/tecdoc1q2019_export.sql.gz /tmp/
# ili
aws s3 cp s3://your-bucket/tecdoc1q2019_export.sql.gz /tmp/
```

**Očekivano vrijeme transfera**:
- 3-4 GB preko 100 Mbps: ~5-10 min
- 3-4 GB preko 10 Mbps: ~50-90 min

---

### **KORAK 5: Setup na Produkciji**

```bash
# SSH na produkciju
ssh user@production-vm

# Pull najnoviji kod
cd /path/to/webshop
git pull origin main

# Idi u tecdoc-import folder
cd scripts/tecdoc-import

# Kreiraj Python virtual environment
python3 -m venv venv
source venv/bin/activate

# Instaliraj dependencies
pip install -r requirements.txt

# Kreiraj .env file
cp .env.example .env
nano .env
# Popuni sa production credentials
```

---

### **KORAK 6: Import TecDoc Baze**

```bash
# Decompress dump
gunzip /tmp/tecdoc1q2019_export.sql.gz
# ili
xz -d /tmp/tecdoc1q2019_export.sql.xz

# Kreiraj MySQL database
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS tecdoc1q2019 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Import dump (ovo će trajati 30-60 min za 12 GB)
mysql -u root -p tecdoc1q2019 < /tmp/tecdoc1q2019_export.sql

# Optimizuj tabele nakon import-a
mysql -u root -p tecdoc1q2019 -e "OPTIMIZE TABLE articles, article_oe_numbers, article_ea_numbers;"

# Očisti dump file da oslobodiš prostor
rm /tmp/tecdoc1q2019_export.sql
```

**Monitoring import progresa** (u drugom terminal-u):

```bash
# Provjeri koliko tabela je importovano
mysql -u root -p -e "SELECT COUNT(*) FROM information_schema.TABLES WHERE table_schema = 'tecdoc1q2019';"

# Provjeri broj redova u article tabeli
mysql -u root -p tecdoc1q2019 -e "SELECT COUNT(*) FROM articles;"
# Očekivano: 6,511,414 redova

# Provjeri prostor koji zauzima baza
mysql -u root -p -e "
SELECT
    table_schema AS 'Database',
    ROUND(SUM(data_length + index_length) / 1024 / 1024 / 1024, 2) AS 'Size (GB)'
FROM information_schema.TABLES
WHERE table_schema = 'tecdoc1q2019'
GROUP BY table_schema;
"
# Očekivano: ~12.15 GB
```

---

### **KORAK 7: Test Connection**

```bash
cd /path/to/webshop/scripts/tecdoc-import
source venv/bin/activate

# Test MySQL connection
python3 << 'EOF'
import mysql.connector

try:
    conn = mysql.connector.connect(
        host="localhost",
        user="root",
        password="YOUR_PASSWORD",
        database="tecdoc1q2019"
    )
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM articles")
    count = cursor.fetchone()[0]
    print(f"✅ TecDoc MySQL OK - {count:,} articles")
    cursor.close()
    conn.close()
except Exception as e:
    print(f"❌ TecDoc MySQL ERROR: {e}")
EOF

# Test PostgreSQL connection
python3 << 'EOF'
import psycopg2

try:
    conn = psycopg2.connect(
        host="localhost",
        database="omerbasicdb",
        user="postgres",
        password="YOUR_PASSWORD"
    )
    cursor = conn.cursor()
    cursor.execute('SELECT COUNT(*) FROM "Product"')
    count = cursor.fetchone()[0]
    print(f"✅ PostgreSQL OK - {count:,} products")
    cursor.close()
    conn.close()
except Exception as e:
    print(f"❌ PostgreSQL ERROR: {e}")
EOF
```

---

### **KORAK 8: Validation Run** (prije LIVE!)

```bash
# Prvo: Test sa 20 proizvoda (DRY RUN)
python3 tecdoc_enrichment_with_validation.py

# Provjeri rezultate
cat validation_report_*.csv

# Ako je OK, test sa 100
# Edituj main() u tecdoc_enrichment_with_validation.py
# limit=100
python3 tecdoc_enrichment_with_validation.py
```

**Decision Point**:
- Ako approval rate >= 50% → SAFE TO PROCEED
- Ako approval rate 30-50% → MEDIUM RISK - manual review
- Ako approval rate < 30% → HIGH RISK - investigate

---

### **KORAK 9: LIVE Run (Production Enrichment)**

**PRIJE LIVE RUN-A**:

```bash
# BACKUP PostgreSQL Product tabele
pg_dump -U postgres -t '"Product"' omerbasicdb > backup_product_$(date +%Y%m%d).sql

# BACKUP ArticleOENumber tabele
pg_dump -U postgres -t '"ArticleOENumber"' omerbasicdb > backup_oem_$(date +%Y%m%d).sql
```

**LIVE Run - Batch Approach**:

```bash
# Screen session (da ne prekineš ako se disconnectuješ)
screen -S tecdoc-enrichment

cd /path/to/webshop/scripts/tecdoc-import
source venv/bin/activate

# LIVE enrichment za proizvode SA TecDoc ID (popuni OEM brojeve)
# Edituj main() u tecdoc_advanced_enrichment.py:
#   filter_mode='has_tecdoc'
#   limit=14443 (ili batch po 1000)
python3 tecdoc_advanced_enrichment.py

# Detach screen: Ctrl+A, D
# Reattach: screen -r tecdoc-enrichment
```

**Monitoring LIVE Run**:

```bash
# U drugom terminal-u, prati logove
tail -f tecdoc_advanced_enrichment.log

# Provjeri progres u bazi
psql -U postgres omerbasicdb

# Koliko proizvoda je dobilo tecdocArticleId danas?
SELECT COUNT(*) FROM "Product"
WHERE "tecdocArticleId" IS NOT NULL
  AND "updatedAt"::date = CURRENT_DATE;

# Koliko OEM brojeva je dodato danas?
SELECT COUNT(*) FROM "ArticleOENumber"
WHERE "createdAt"::date = CURRENT_DATE;
```

---

## ⏱️ OČEKIVANO VRIJEME

### Export & Transfer (Lokalno → Produkcija)
| Korak | Vrijeme |
|-------|---------|
| MySQL dump export | 30-60 min |
| Kompresija (gzip) | 10-20 min |
| Transfer (100 Mbps) | 5-10 min |
| **Ukupno Export & Transfer** | **45-90 min** |

### Import & Setup (Produkcija)
| Korak | Vrijeme |
|-------|---------|
| Dekompresija | 5-10 min |
| MySQL import | 30-60 min |
| Table optimization | 10-20 min |
| Python setup | 5 min |
| **Ukupno Import & Setup** | **50-95 min** |

### Enrichment Run (Produkcija)
| Korak | Vrijeme | Proizvoda |
|-------|---------|-----------|
| Validation (test) | 5-10 min | 20-100 |
| Enrichment batch | ~5-10 min | 100 |
| Full enrichment (14,443) | **12-24h** | 14,443 |

**Ukupno za setup**: 2-3 sata
**Ukupno za enrichment**: 12-24 sata (overnight run)

---

## 🛡️ SAFETY MEASURES

### 1. Pre-Deployment Checklist

```
□ Git commit & push svih skripti
□ Export TecDoc baze uspješan
□ Kompresija uspješna
□ Transfer na produkciju uspješan
□ Import u MySQL uspješan
□ Test connections OK
□ Backup PostgreSQL tabela
```

### 2. Rollback Plan

**Ako nešto pođe loše**:

```sql
-- Vrati Product tabelu
psql -U postgres omerbasicdb < backup_product_20251225.sql

-- Vrati ArticleOENumber tabelu
psql -U postgres omerbasicdb < backup_oem_20251225.sql

-- Ili selektivni rollback (samo danas update-ovane)
UPDATE "Product"
SET "tecdocArticleId" = NULL
WHERE "updatedAt"::date = CURRENT_DATE;

DELETE FROM "ArticleOENumber"
WHERE "createdAt"::date = CURRENT_DATE;
```

### 3. Monitoring & Alerts

```bash
# Kreiraj monitoring script
cat > monitor_enrichment.sh << 'EOF'
#!/bin/bash

while true; do
    echo "=== $(date) ==="

    # Products updated today
    psql -U postgres omerbasicdb -t -c "
        SELECT COUNT(*) FROM \"Product\"
        WHERE \"updatedAt\"::date = CURRENT_DATE
          AND \"tecdocArticleId\" IS NOT NULL;
    "

    # OEM numbers added today
    psql -U postgres omerbasicdb -t -c "
        SELECT COUNT(*) FROM \"ArticleOENumber\"
        WHERE \"createdAt\"::date = CURRENT_DATE;
    "

    sleep 300  # Check every 5 min
done
EOF

chmod +x monitor_enrichment.sh
./monitor_enrichment.sh &
```

---

## 📁 FILE STRUCTURE NA PRODUKCIJI

```
/path/to/webshop/
├── scripts/
│   └── tecdoc-import/
│       ├── tecdoc_advanced_enrichment.py
│       ├── tecdoc_enrichment_with_validation.py
│       ├── tecdoc_smart_vehicle_linking.py
│       ├── analyze_oem_data_quality.py
│       ├── requirements.txt
│       ├── .env
│       ├── .env.example
│       ├── DEPLOYMENT-PLAN.md (ovaj fajl)
│       ├── docs/
│       │   ├── OEM-MATCHING-FIX.md
│       │   ├── KAKO-SIGURNO-POKRENUTI-ENRICHMENT.md
│       │   └── ...
│       ├── venv/
│       └── logs/
│           ├── tecdoc_advanced_enrichment.log
│           ├── enrichment_validation_*.log
│           └── validation_report_*.csv
```

---

## 🔐 SECURITY NOTES

### .env File

**NE COMMITAJ .env u Git!** Dodaj u `.gitignore`:

```bash
# U /Users/emir_mw/omerbasic/.gitignore
scripts/tecdoc-import/.env
scripts/tecdoc-import/venv/
scripts/tecdoc-import/logs/*.log
scripts/tecdoc-import/*.csv
```

### Credentials

```bash
# Na produkciji, koristi environment variables ili secrets manager
# Primjer za production .env:

POSTGRES_HOST=localhost
POSTGRES_DB=omerbasicdb
POSTGRES_USER=postgres
POSTGRES_PASSWORD=STRONG_PRODUCTION_PASSWORD

MYSQL_HOST=localhost
MYSQL_DB=tecdoc1q2019
MYSQL_USER=root
MYSQL_PASSWORD=STRONG_MYSQL_PASSWORD
```

---

## ✅ POST-DEPLOYMENT CHECKLIST

```
□ TecDoc baza importovana na produkciji (12.15 GB)
□ Python environment setup (venv + dependencies)
□ Connections tested (MySQL + PostgreSQL)
□ Validation run completed (20-100 proizvoda)
□ CSV report reviewed
□ Backup created
□ LIVE run started (screen session)
□ Monitoring setup
□ Logs tracked
□ Success rate > 50%
□ No critical errors
□ Random sample manually validated
```

---

## 📞 TROUBLESHOOTING

### Problem: MySQL import fails

```bash
# Check disk space
df -h

# Check MySQL max_allowed_packet
mysql -u root -p -e "SHOW VARIABLES LIKE 'max_allowed_packet';"

# Increase if needed
mysql -u root -p -e "SET GLOBAL max_allowed_packet=1073741824;"  # 1GB
```

### Problem: Import timeout

```bash
# Split dump into smaller files
split -l 100000 tecdoc1q2019_export.sql tecdoc_part_

# Import each part
for file in tecdoc_part_*; do
    mysql -u root -p tecdoc1q2019 < "$file"
done
```

### Problem: Out of memory

```bash
# Check RAM
free -h

# Add swap if needed (Linux)
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

---

## 📊 SUCCESS METRICS

Po završetku deployment-a, očekivani rezultati:

```
✅ TecDoc baza: 12.15 GB (6.5M articles)
✅ Products enriched: 14,443 (sa TecDoc ID)
✅ OEM numbers added: ~12,000+ (85-90% coverage)
✅ Success rate: 60-90%
✅ Time to complete: 12-24h
✅ No critical errors
✅ Backups created
```

---

**Kraj Deployment Plan-a**
*Generisano: 2025-12-25*
*Verzija: 1.0*
