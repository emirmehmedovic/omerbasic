# 🚀 TecDoc Enrichment - Quick Start Guide

**Datum:** 8. novembar 2025.  
**Status:** ✅ Ready for Implementation

---

## 📋 Pregled

Imate **KOMPLETAN** sistem za obogaćivanje proizvoda:

1. ✅ **Python skripta** - `tecdoc_enrichment_updated.py`
2. ✅ **Prisma schema** - Ažurirana sa TecDoc poljima
3. ✅ **Test skripta** - `test_enrichment.py`
4. ✅ **SQL migracija** - `add_tecdoc_fields.sql`

---

## 🎯 Što Ćete Dobiti

Za svaki proizvod:
- ✅ **ROOT kategorija** - Automatski mapirana (npr. "Filteri", "Motor")
- ✅ **OEM brojevi** - Ako nedostaju, uvozi ih
- ✅ **Tehničke specifikacije** - Svi atributi iz TecDoc-a
- ✅ **Kompatibilna vozila** - Lista vozila koja koriste taj dio
- ✅ **Cross-references** - Ekvivalentni dijelovi od drugih dobavljača

---

## ⚡ Quick Start (15 minuta)

### Korak 1: Edituj Konekcije (2 min)

Otvori `tecdoc_enrichment_updated.py` i edituj:

```python
# Linija 46-50: MySQL TecDoc
self.tecdoc_conn = mysql.connector.connect(
    host="localhost",
    user="root",
    password="TVOJ_MYSQL_PASSWORD",  # ← EDITUJ
    database="tecdoc1q2019"
)

# Linija 53-57: Postgres
self.prod_conn = psycopg2.connect(
    host="localhost",
    database="omerbasic",  # ← EDITUJ ime baze
    user="postgres",
    password="TVOJ_POSTGRES_PASSWORD"  # ← EDITUJ
)
```

Isto edituj u `test_enrichment.py` (linije 17, 34, 41).

---

### Korak 2: Instaliraj Biblioteke (1 min)

```bash
pip install psycopg2-binary mysql-connector-python
```

---

### Korak 3: Pokreni Prisma Migraciju (2 min)

```bash
# Dodaj TecDoc polja u Product tabelu
npx prisma migrate dev --name add_tecdoc_tracking_fields

# Generiši Prisma client
npx prisma generate
```

---

### Korak 4: Test Konekcije (2 min)

```bash
cd tecdoc-import-plan
python test_enrichment.py
```

**Očekivani output:**
```
🔌 Testing database connections...
✅ TecDoc MySQL: Connected
   Articles count: 6,722,202
✅ Postgres: Connected
   Products count: 12,000

🏷️  Testing category mapping...
✅ Found 37 categories with externalId:
   100001 → Karoserija vozila
   100002 → Motor
   100005 → Filteri
   ...

📦 Testing with sample products...
Product: PRIGUSIVAC IZDUVNOG SISTEMA
Catalog: 36.7062
✅ Found in TecDoc: article_id=250527542
   ROOT: Exhaust System (node_id: 100004)
   ✅ Mapped to: Izduvni sistem

✅ All tests passed! Ready for enrichment.
```

---

### Korak 5: Test Run (5 min)

```bash
# Pokreni sa prvih 50 proizvoda
python tecdoc_enrichment_updated.py
```

**Prati napredak:**
```bash
# U drugom terminalu
tail -f tecdoc_enrichment.log
```

---

### Korak 6: Provjeri Rezultate (3 min)

```sql
-- U Postgres bazi
SELECT 
    p.name,
    p."catalogNumber",
    c.name as category_name,
    c."externalId" as tecdoc_node_id,
    p."tecdocArticleId",
    p."tecdocProductId",
    p."oemNumber",
    jsonb_array_length(p."technicalSpecs") as specs_count
FROM "Product" p
LEFT JOIN "Category" c ON p."categoryId" = c.id
WHERE p."tecdocArticleId" IS NOT NULL
LIMIT 10;
```

**Očekivani rezultat:**
```
name                          | category_name    | tecdoc_node_id | specs_count
------------------------------|------------------|----------------|------------
PRIGUSIVAC IZDUVNOG SISTEMA   | Izduvni sistem   | 100004         | 5
FILTER ULJA                   | Filteri          | 100005         | 8
...
```

---

## 🚀 Full Run (3-4 sata)

Ako je test bio uspješan:

### Opcija 1: Sve Odjednom

```python
# U tecdoc_enrichment_updated.py, linija 574:
enricher.run_batch(batch_size=12000, start_from=0)
```

### Opcija 2: U Batch-evima (PREPORUČENO)

```python
# U tecdoc_enrichment_updated.py, linija 574:
for i in range(0, 12000, 500):
    enricher.run_batch(batch_size=500, start_from=i)
    time.sleep(60)  # Pauza između batch-eva
```

Pokreni:
```bash
python tecdoc_enrichment_updated.py
```

---

## 📊 Monitoring

### Real-time Napredak

```bash
# Terminal 1: Pokreni skriptu
python tecdoc_enrichment_updated.py

# Terminal 2: Prati log
tail -f tecdoc_enrichment.log | grep "Progress:"

# Terminal 3: Provjeri bazu
watch -n 30 'psql -d omerbasic -c "SELECT COUNT(*) FROM \"Product\" WHERE \"tecdocArticleId\" IS NOT NULL"'
```

### Dashboard Query

```sql
-- Kreiraj view za monitoring
CREATE OR REPLACE VIEW tecdoc_enrichment_progress AS
SELECT 
    COUNT(*) as total_products,
    COUNT("tecdocArticleId") as enriched,
    ROUND(100.0 * COUNT("tecdocArticleId") / COUNT(*), 2) as enriched_pct,
    COUNT("categoryId") as with_category,
    COUNT("oemNumber") as with_oem,
    COUNT("technicalSpecs") as with_specs,
    MAX("updatedAt") as last_update
FROM "Product";

-- Provjeri napredak:
SELECT * FROM tecdoc_enrichment_progress;
```

---

## 📈 Očekivani Rezultati

| Metrika | Prije | Poslije | Improvement |
|---------|-------|---------|-------------|
| Sa kategorijom | 100% | 100% | - |
| Sa OEM brojevima | 60% | **80%** | **+33%** ⬆️ |
| Sa specifikacijama | 5% | **75%** | **+1400%** ⬆️⬆️⬆️ |
| Sa vozilima | 40% | **60%** | **+50%** ⬆️ |
| Sa cross-refs | 0% | **70%** | **NEW** ✨ |

---

## 🔍 Troubleshooting

### Problem: "Not found in TecDoc"

```bash
# Provjeri u TecDoc bazi direktno:
mysql -u root -p tecdoc1q2019 -e "
SELECT id, DataSupplierArticleNumber 
FROM articles 
WHERE DataSupplierArticleNumber LIKE '%36.7062%'
"
```

### Problem: "No local category found"

```sql
-- Provjeri da li su kategorije uvezene:
SELECT COUNT(*) FROM "Category" WHERE "externalId" IS NOT NULL;

-- Ako je 0, pokreni:
npm run import:tecdoc-categories
```

### Problem: "Connection timeout"

```python
# U skripti povećaj timeout:
connect_timeout=600  # 10 minuta
```

---

## ✅ Checklist

Prije pokretanja:
- [ ] Editovane konekcije u Python skripti
- [ ] Instalirane biblioteke (`pip install ...`)
- [ ] Pokrenuta Prisma migracija
- [ ] Test skripta prošla sve testove
- [ ] **BACKUP Postgres baze napravljen** 🔥

Za production:
- [ ] Test sa 50 proizvoda uspješan
- [ ] Rezultati provjereni u bazi
- [ ] Full run pokrenut
- [ ] Napredak monitoriran
- [ ] Rezultati verifikovani

---

## 📞 Support

Ako nešto ne radi:

1. Provjeri `tecdoc_enrichment.log`
2. Pokreni `test_enrichment.py`
3. Provjeri konekcije na baze
4. Provjeri da li su kategorije uvezene

---

## 🎉 Gotovo!

Imate sve što vam treba! 

**Sljedeći korak:**
```bash
python test_enrichment.py
```

Ako sve prođe, pokrenite:
```bash
python tecdoc_enrichment_updated.py
```

Sretno! 🚀

---

**Fajlovi:**
- `tecdoc_enrichment_updated.py` - Glavna skripta
- `test_enrichment.py` - Test skripta
- `add_tecdoc_fields.sql` - SQL migracija
- `QUICK_START.md` - Ovo uputstvo

**Status:** ✅ Production Ready
