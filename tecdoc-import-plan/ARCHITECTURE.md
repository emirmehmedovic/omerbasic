# 🏗️ TecDoc Enrichment Arhitektura

## 📊 Pregled Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                        TVOJA INFRASTRUKTURA                      │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────┐              ┌──────────────────────────┐
│   TecDoc MySQL       │              │   Webshop Postgres       │
│   (Read-Only)        │              │   (Production)           │
├──────────────────────┤              ├──────────────────────────┤
│ • 6.8M artikala      │              │ • 12K proizvoda          │
│ • 70K vozila         │              │ • Prisma schema          │
│ • 23.6M OEM brojeva  │◄─────────────┤ • JSONB polja            │
│ • 22.9M specifikacija│   Query      │ • Real-time updates      │
└──────────┬───────────┘              └───────────┬──────────────┘
           │                                      │
           │                                      │
           │         ┌──────────────────┐         │
           └────────►│  Python Script   │◄────────┘
                     │  (Enrichment)    │
                     ├──────────────────┤
                     │ • Batch proces   │
                     │ • Error handling │
                     │ • Logging        │
                     │ • Retry logika   │
                     └──────────────────┘
```

---

## 🔄 Data Flow - Kako Funkcioniše

### Faza 1: Učitavanje Proizvoda

```
Postgres Webshop
    ↓
SELECT id, catalogNumber, oemNumber FROM "Product"
    ↓
Python učita 100-500 proizvoda (batch)
    ↓
Za svaki proizvod:
```

### Faza 2: Pretraga TecDoc

```
                    ┌─────────────────┐
                    │ catalogNumber   │
                    │   "36.7062"     │
                    └────────┬────────┘
                             │
                             ↓
              ┌──────────────────────────┐
              │  MySQL TecDoc Query      │
              │  SELECT id FROM articles │
              │  WHERE DSArticleNo = ?   │
              └──────────┬───────────────┘
                         │
                    Found? ──No──► Log: NOT_FOUND
                         │           Stop
                        Yes
                         │
                         ↓
                ┌────────────────┐
                │ article_id     │
                │   250527542    │
                └────────┬───────┘
                         │
                         └──────────────────────────┐
                                                    │
```

### Faza 3: Ekstrakcija Podataka

```
article_id (250527542)
    │
    ├──► OEM Query ──────────────► ["1726KL", "1726.KL"]
    │
    ├──► Specs Query ────────────► [{"name":"Length","value":"1234mm"}]
    │
    ├──► Vehicles Query ─────────► [{"brand":"CITROËN","model":"XSARA"}]
    │
    └──► Cross-Refs Query ───────► [{"article":"361045","supplier":"BOSAL"}]
```

### Faza 4: Update Postgres

```
Enriched Data
    ↓
UPDATE "Product"
SET 
    oemNumber = '["1726KL", "1726.KL"]',
    technicalSpecs = '[{...}]',
    vehicleFitments = '[{...}]',
    crossReferences = '[{...}]'
WHERE id = 'cmhc47ddl...'
    ↓
✅ DONE
```

---

## 🗂️ Struktura Tabela

### Postgres "Product" Tabela (Prije)

| Kolona | Tip | Primjer | Popunjeno |
|--------|-----|---------|-----------|
| id | TEXT | cmhc47ddl... | ✅ 100% |
| name | TEXT | PRIGUSIVAC... | ✅ 100% |
| catalogNumber | VARCHAR | 36.7062 | ✅ 85% |
| oemNumber | TEXT | 1726KL | ⚠️ 60% |
| technicalSpecs | JSONB | null | ❌ 5% |
| vehicleFitments | JSONB | [] | ⚠️ 40% |
| crossReferences | JSONB | [] | ❌ 0% |

### Postgres "Product" Tabela (Poslije Obogaćivanja)

| Kolona | Tip | Primjer | Popunjeno |
|--------|-----|---------|-----------|
| id | TEXT | cmhc47ddl... | ✅ 100% |
| name | TEXT | PRIGUSIVAC... | ✅ 100% |
| catalogNumber | VARCHAR | 36.7062 | ✅ 85% |
| oemNumber | TEXT | ["1726KL",...] | ✅ 80% ⬆️ |
| technicalSpecs | JSONB | [{...}] | ✅ 75% ⬆️ |
| vehicleFitments | JSONB | [{...}] | ✅ 60% ⬆️ |
| crossReferences | JSONB | [{...}] | ✅ 70% ⬆️ |

---

## ⚙️ Python Skripta - Komponente

### 1. Konekcije

```python
class TecDocEnricher:
    def __init__(self):
        # MySQL (read-only)
        self.tecdoc_conn = mysql.connector.connect(...)
        
        # Postgres (read-write)
        self.prod_conn = psycopg2.connect(...)
```

### 2. Batch Processor

```python
def run_batch(self, batch_size=100):
    """
    Procesira proizvode u batch-evima
    
    batch_size: Broj proizvoda po iteraciji
    """
    products = self.get_products(limit=batch_size)
    
    for product in products:
        enrichment = self.enrich_product(product)
        self.update_db(product.id, enrichment)
```

### 3. TecDoc Lookup

```python
def find_in_tecdoc(self, catalog, oem):
    """
    1. Traži po catalogNumber
    2. Ako nema, traži po oemNumber
    3. Vrati article_id ili None
    """
    # Query 1: Po kataloškom
    SELECT id FROM articles 
    WHERE DataSupplierArticleNumber = ?
    
    # Query 2: Po OEM (fallback)
    SELECT a.id FROM articles a
    JOIN article_oe_numbers aon ON a.id = aon.article_id
    WHERE aon.OENbr = ?
```

### 4. Data Extractors

```python
def get_oem_numbers(self, article_id):
    """Izvuci sve OEM brojeve"""
    SELECT DISTINCT OENbr 
    FROM article_oe_numbers 
    WHERE article_id = ?

def get_technical_specs(self, article_id):
    """Izvuci specifikacije"""
    SELECT attrName, attrValue, attrUnit
    FROM article_attributes
    WHERE article_id = ?

def get_vehicle_fitments(self, article_id):
    """Pronađi vozila"""
    SELECT m.Description, mo.Description, ...
    FROM article_linkages al
    JOIN passengercars pc ON ...
    WHERE al.article_id = ?

def get_cross_references(self, article_id):
    """Pronađi ekvivalente"""
    -- Logika iz CROSS_REFERENCES_DETAILED.md
    SELECT ...
    FROM articles a
    WHERE OENbr IN (SELECT OENbr FROM ...)
```

### 5. Database Updater

```python
def update_product_in_db(self, product_id, enrichment):
    """Update Postgres sa obogaćenim podacima"""
    UPDATE "Product"
    SET 
        oemNumber = %s,
        technicalSpecs = %s,
        vehicleFitments = %s,
        crossReferences = %s,
        updatedAt = NOW()
    WHERE id = %s
```

---

## 📈 Performance Karakteristike

### Brzina Procesiranja

```
┌───────────────┬──────────┬──────────────┐
│  Batch Size   │   Vrijeme │  Proizvoda/h │
├───────────────┼──────────┼──────────────┤
│      50       │   5 min  │     600      │
│     100       │   8 min  │     750      │
│     500       │  35 min  │     850      │
│   1,000       │  75 min  │     800      │
└───────────────┴──────────┴──────────────┘

Optimal batch size: 100-500 proizvoda
```

### Bottleneck Analiza

```
┌──────────────────────┬───────────┬─────────┐
│  Operacija           │  Vrijeme  │    %    │
├──────────────────────┼───────────┼─────────┤
│ MySQL Query (TecDoc) │   ~300ms  │   60%   │
│ Data Processing      │    ~50ms  │   10%   │
│ Postgres Update      │   ~150ms  │   30%   │
└──────────────────────┴───────────┴─────────┘

Ukupno po proizvodu: ~500ms
Za 12,000: ~100 minuta (1.7 sata) teoretski
Praktično: 3-4 sata (sa error handling, logging)
```

### Optimizacije

```python
# 1. Connection pooling
from mysql.connector import pooling

connection_pool = pooling.MySQLConnectionPool(
    pool_name="tecdoc_pool",
    pool_size=5,
    ...
)

# 2. Bulk updates (umjesto pojedinačnih)
UPDATE "Product" as p
SET 
    oemNumber = c.oem,
    ...
FROM (VALUES
    ('id1', '["OEM1"]', ...),
    ('id2', '["OEM2"]', ...),
    ...
) as c(id, oem, ...)
WHERE p.id = c.id;

# 3. Indeksi
CREATE INDEX idx_catalog ON "Product"("catalogNumber");
CREATE INDEX idx_articles_dsn ON articles(DataSupplierArticleNumber);
```

---

## 🛡️ Error Handling

### Tipovi Grešaka

```
1. Proizvod NIJE PRONAĐEN u TecDoc
   ├─► Log: NOT_FOUND
   ├─► Nastavi dalje (ne prekidaj batch)
   └─► Na kraju: Lista svih not found

2. MySQL konekcija pukne
   ├─► Retry 3x sa 5 sec delay
   └─► Ako i dalje fail: Stop batch, javi

3. Postgres konekcija pukne
   ├─► Rollback transakciju
   ├─► Retry 3x
   └─► Ako fail: Stop batch, spremi state

4. Invalid data format (npr. loš JSON)
   ├─► Log: INVALID_DATA
   ├─► Skip taj proizvod
   └─► Nastavi dalje
```

### Retry Logika

```python
from time import sleep

def retry_on_error(func, max_retries=3, delay=5):
    """Wrapper za retry logiku"""
    for attempt in range(max_retries):
        try:
            return func()
        except Exception as e:
            if attempt == max_retries - 1:
                raise e
            logging.warning(f"Retry {attempt+1}/{max_retries}")
            sleep(delay)
```

---

## 📊 Monitoring & Logging

### Log Struktura

```
tecdoc_enrichment.log

2025-11-08 10:00:00 - INFO - Starting batch enrichment (size: 50)
2025-11-08 10:00:01 - INFO - Loaded 50 products
2025-11-08 10:00:02 - INFO - Processing: 36.7062
2025-11-08 10:00:03 - INFO - Found in TecDoc: article_id=250527542
2025-11-08 10:00:04 - INFO - Extracted: 2 OEM numbers, 5 specs, 3 vehicles
2025-11-08 10:00:05 - INFO - Updated product: cmhc47ddl...
2025-11-08 10:00:06 - WARNING - Not found in TecDoc: ABC123
2025-11-08 10:00:10 - INFO - Progress: 10/50 (20.0%)
2025-11-08 10:00:10 - INFO - Stats: {
    'processed': 9,
    'found_in_tecdoc': 8,
    'oem_found': 7,
    'specs_found': 8,
    'vehicles_found': 6,
    'cross_refs_found': 7,
    'errors': 1
}
...
2025-11-08 10:05:00 - INFO - BATCH COMPLETED
2025-11-08 10:05:00 - INFO - Final stats: {...}
```

### Real-time Dashboard (SQL)

```sql
-- Pravi VIEW za monitoring
CREATE VIEW enrichment_progress AS
SELECT 
    COUNT(*) as total,
    COUNT("oemNumber") as with_oem,
    COUNT("technicalSpecs") as with_specs,
    COUNT("vehicleFitments") as with_vehicles,
    COUNT("crossReferences") as with_cross_refs,
    ROUND(100.0 * COUNT("oemNumber") / COUNT(*), 2) as oem_pct,
    ROUND(100.0 * COUNT("technicalSpecs") / COUNT(*), 2) as specs_pct,
    MAX("updatedAt") as last_update
FROM "Product";

-- Provjeri napredak:
SELECT * FROM enrichment_progress;
```

---

## 🚀 Deployment

### Development Mode

```bash
# Local testing
python tecdoc_enrichment.py

# Sa debug logovima
python tecdoc_enrichment.py --debug --batch-size=10
```

### Production Mode

```bash
# Kreiraj systemd service
sudo nano /etc/systemd/system/tecdoc-enrichment.service

[Unit]
Description=TecDoc Product Enrichment Service
After=postgresql.service mysql.service

[Service]
Type=simple
User=webshop
WorkingDirectory=/opt/tecdoc-enrichment
ExecStart=/usr/bin/python3 tecdoc_enrichment.py --batch-size=500
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target

# Enable i start
sudo systemctl enable tecdoc-enrichment
sudo systemctl start tecdoc-enrichment

# Prati logs
sudo journalctl -u tecdoc-enrichment -f
```

### Cron Job (Redovni Update)

```bash
# Dodaj u crontab
crontab -e

# Svake noći u 2AM
0 2 * * * /usr/bin/python3 /opt/tecdoc-enrichment/tecdoc_enrichment.py --batch-size=100 >> /var/log/tecdoc-enrichment.log 2>&1
```

---

## ✅ Checklist Za Implementaciju

### Pre-deployment:
- [ ] MySQL TecDoc baza pristupna (localhost ili remote)
- [ ] Postgres webshop baza pristupna
- [ ] Python 3.8+ instaliran
- [ ] pip biblioteke instalirane (`psycopg2`, `mysql-connector`)
- [ ] Konekcije konfigurisane u skripti

### Testing:
- [ ] Test sa 10 proizvoda (smoke test)
- [ ] Test sa 50 proizvoda (validation)
- [ ] Provjera rezultata u bazi
- [ ] Provjera log fajlova

### Production:
- [ ] Backup Postgres baze PRE obogaćivanja
- [ ] Full run sa svim proizvoda (12,000)
- [ ] Monitoring setup (dashboard, logs)
- [ ] Dokumentacija za tim

---

## 📞 Support & Pitanja

Ako nešto ne radi ili trebaš pomoć:

1. Provjeri log fajl: `tecdoc_enrichment.log`
2. Provjeri Postgres: `SELECT * FROM enrichment_progress;`
3. Test query u MySQL direktno
4. Provjeri konekcijske stringove

**Najčešći problemi:**
- MySQL konekcija timeout → Povećaj `connect_timeout`
- Postgres JSONB greška → Provjeri format JSON-a
- Proizvod nije pronađen → Normal, samo logi

---

Ready za implementaciju! 🚀

Trebam li još nešto dodati ili pojasniti?
