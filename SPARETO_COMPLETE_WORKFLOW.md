# Spareto Slike - Kompletan Workflow (Scraping → Linking)

**Kompletan proces od identifikacije proizvoda bez slika do uspješnog linkovanja na produkciji.**

---

## 📋 Pregled Procesa

```
1. Export proizvoda bez slika (VPS → CSV)
2. Copy CSV na Mac
3. Scraping Spareto slika (Mac)
4. Copy slika na VPS
5. Linking slika sa proizvodima (VPS)
6. Cache busting za Next.js (VPS)
7. Verifikacija
8. Cleanup
```

**Trajanje:** ~1-2 sata za 300-600 proizvoda (zavisno od brzine scraping-a)

---

## 1️⃣ EXPORT PROIZVODA BEZ SLIKA

### Na VPS-u

```bash
# SSH u VPS
ssh deploy@188.245.74.57

cd ~/app/omerbasic

# Exportuj proizvode bez slika u CSV
PGPASSWORD='123456789EmIna!' psql -h localhost -U postgres -d omerbasicdb -c "
COPY (
  SELECT id, \"catalogNumber\", name, sku
  FROM \"Product\"
  WHERE \"imageUrl\" IS NULL OR \"imageUrl\" = ''
  ORDER BY id ASC
) TO STDOUT WITH CSV HEADER;" > products_without_images_batch_X.csv
```

**Output:** `products_without_images_batch_X.csv` (zamijeni X sa brojem batcha)

### Provjera CSV-a

```bash
# Provjeri koliko ima proizvoda
wc -l products_without_images_batch_X.csv

# Pogledaj prvih 5 redova
head -5 products_without_images_batch_X.csv
```

---

## 2️⃣ COPY CSV NA MAC

```bash
# Sa Mac-a
scp deploy@188.245.74.57:~/app/omerbasic/products_without_images_batch_X.csv /Users/emir_mw/omerbasic/
```

**Verifikacija:**
```bash
# Na Mac-u
ls -lh /Users/emir_mw/omerbasic/products_without_images_batch_X.csv
```

---

## 3️⃣ SCRAPING SPARETO SLIKA (MAC)

### Pokreni Scraper

```bash
cd /Users/emir_mw/omerbasic

# Pokreni scraper sa custom output folderom
python3 scripts/spareto_image_scraper.py \
  products_without_images_batch_X.csv \
  spareto_images_batch_X
```

**VAŽNO:** Kada skripta pita:
```
How many products to scrape? (max XXX, press Enter for 10):
```

Upiši **broj proizvoda iz CSV-a** (npr. 613) ili samo `Enter` za test sa 10 proizvoda.

### Skripta Output

```
🔍 Spareto Image Scraper

CSV: products_without_images_batch_X.csv
Output: spareto_images_batch_X
Crawl delay: 1.5s
======================================================================

[1/613] 12002 (STANGICA STABILIZATORA)
Searching for: 12002
  Found product: https://spareto.com/products/...
Downloading image 1: https://cdn.spareto.com/...
  ✅ Saved: 40573_1.jpg

... (proces se nastavlja)

======================================================================
FINAL SUMMARY
======================================================================
Total processed: 613
✅ Success: 321
❌ Not found: 292
⚠️  Errors: 0
```

### Trajanje

- **~1.5s po proizvodu** (crawl delay)
- **~3 zahtjeva po proizvodu** (search + page + image)
- **Približno:** 600 proizvoda = ~45-60 minuta

### Provjera Rezultata

```bash
# Provjeri broj slika
ls spareto_images_batch_X/*.jpg | wc -l

# Provjeri broj primarnih slika (_1.jpg)
ls spareto_images_batch_X/*_1.jpg | wc -l
```

---

## 4️⃣ COPY SLIKA NA VPS

### Sa Mac-a

```bash
# Kopiraj cijeli folder sa slikama
scp -r /Users/emir_mw/omerbasic/spareto_images_batch_X \
  deploy@188.245.74.57:~/app/omerbasic/
```

**Output:**
```
30007_1.jpg         100% 108KB   1.2MB/s   00:00
31371_1.jpg         100%  25KB   850KB/s   00:00
...
```

### Verifikacija na VPS-u

```bash
# SSH u VPS
ssh deploy@188.245.74.57

# Provjeri da li je folder kopiran
ls ~/app/omerbasic/ | grep spareto

# Trebao bi vidjeti:
# spareto_images_batch_X
```

---

## 5️⃣ RENAME I LINKING (VPS)

### Rename Folder

**VAŽNO:** `link-spareto-images.ts` skripta očekuje folder sa imenom `spareto_images` (hardcoded).

```bash
cd ~/app/omerbasic

# Rename batch folder u spareto_images
mv spareto_images_batch_X spareto_images

# Provjeri broj slika
ls spareto_images/*_1.jpg | wc -l
```

### Pokreni Link Skriptu

```bash
npx tsx scripts/link-spareto-images.ts
```

**Output:**
```
🖼️  Spareto Image Linker

Source: /home/deploy/app/omerbasic/spareto_images
Target: /home/deploy/app/omerbasic/public/uploads/products
──────────────────────────────────────────────────────────────────────

🔍 Reading images...
   Found 893 total images
   Found 321 primary images (_1.jpg/png/webp)

📦 Processing images...

✅ [30007] DISK PLOCICE... -> /uploads/products/30007_1.jpg
✅ [31371] FILTER KLIME... -> /uploads/products/31371_1.jpg
...

══════════════════════════════════════════════════════════════════════
SUMMARY
══════════════════════════════════════════════════════════════════════
Total images found:     321
✅ Images copied:        321
✅ Products linked:      321
⏭️  Skipped:              0
❌ Errors:               0
══════════════════════════════════════════════════════════════════════
```

### Što Skripta Radi

1. **Čita slike** iz `spareto_images/` foldera
2. **Filtrira primarne slike** (`_1.jpg`, `_1.png`, `_1.webp`)
3. **Ekstraktuje SKU** iz imena fajla (npr. `30007_1.jpg` → SKU `30007`)
4. **Traži proizvod** u bazi po SKU-u
5. **Preskače** ako proizvod već ima `imageUrl`
6. **Kopira sliku** u `public/uploads/products/`
7. **Updateuje bazu** sa novim `imageUrl`-om

---

## 6️⃣ CACHE BUSTING (VPS)

### Problem

Kada zamijenjaš slike sa **istim imenom** (npr. `30007_1.jpg`), Next.js i browser će prikazati **staru cachiranu sliku**.

### Rješenje: Timestamp Query Parameter

```bash
PGPASSWORD='123456789EmIna!' psql -h localhost -U postgres -d omerbasicdb -c "
UPDATE \"Product\"
SET \"imageUrl\" = \"imageUrl\" || '?v=' || EXTRACT(EPOCH FROM NOW())::bigint
WHERE \"imageUrl\" LIKE '/uploads/products/%_1.jpg'
  AND \"imageUrl\" NOT LIKE '%?v=%';
"
```

**Prije:**
```
/uploads/products/30007_1.jpg
```

**Nakon:**
```
/uploads/products/30007_1.jpg?v=1767003978
```

Query parameter `?v=timestamp` forsira browser i Next.js da tretiraju sliku kao **novu**.

**Output:**
```
UPDATE 321
```

---

## 7️⃣ VERIFIKACIJA

### Provjeri Database Stats

```bash
PGPASSWORD='123456789EmIna!' psql -h localhost -U postgres -d omerbasicdb -c "
SELECT
  COUNT(*) as total_products,
  COUNT(CASE WHEN \"imageUrl\" IS NOT NULL AND \"imageUrl\" != '' THEN 1 END) as with_images,
  COUNT(CASE WHEN \"imageUrl\" IS NULL OR \"imageUrl\" = '' THEN 1 END) as without_images
FROM \"Product\";
"
```

**Expected Output:**
```
 total_products | with_images | without_images
----------------+-------------+----------------
          24617 |       24317 |            300
```

### Provjeri Nasumične Proizvode

```bash
PGPASSWORD='123456789EmIna!' psql -h localhost -U postgres -d omerbasicdb -c "
SELECT sku, \"catalogNumber\", name, \"imageUrl\"
FROM \"Product\"
WHERE \"imageUrl\" LIKE '/uploads/products/%?v=%'
ORDER BY \"updatedAt\" DESC
LIMIT 5;
"
```

**Expected Output:**
```
  sku  | catalogNumber |          name          |                  imageUrl
-------+---------------+------------------------+--------------------------------------------
 40573 | 12002         | STANGICA STABILIZATORA | /uploads/products/40573_1.jpg?v=1767003978
 40583 | 00019         | ŠELNA 12-20/9          | /uploads/products/40583_1.jpg?v=1767003978
```

### Provjeri u Browseru

**Direktan link:**
```
https://tpomerbasic.ba/uploads/products/30007_1.jpg
```

Trebala bi se prikazati nova slika.

**Product page:**
```
https://tpomerbasic.ba/products/...
```

Otvori u **Incognito/Private mode** da izbjegneš browser cache.

Ako se slika ne prikazuje, uradi **Hard Refresh:**
- Chrome/Edge: `Ctrl + Shift + R` (ili `Cmd + Shift + R` na Mac-u)
- Firefox: `Ctrl + F5`

---

## 8️⃣ CLEANUP

### Obriši Temporary Foldere

```bash
# Na VPS-u
cd ~/app/omerbasic

# Obriši spareto_images folder
rm -rf spareto_images

# Obriši Next.js image cache
rm -rf .next/cache/images

# Restart aplikacije (cache će se automatski regenerisati)
pm2 restart omerbasic
```

**NAPOMENA:** **Ne treba raditi `npm run build`** nakon brisanja image cache-a. Next.js će automatski regenerisati optimizovane slike kada budu zatražene.

### Obriši CSV na VPS-u (Opcionalno)

```bash
rm ~/app/omerbasic/products_without_images_batch_X.csv
```

### Arhiviraj Batch Folder na Mac-u (Opcionalno)

```bash
# Na Mac-u
cd /Users/emir_mw/omerbasic

# Arhiviraj scraping results
tar -czf spareto_images_batch_X_backup.tar.gz spareto_images_batch_X/

# Obriši original folder
rm -rf spareto_images_batch_X/
```

---

## 🔄 BATCH HISTORY

| Batch | Datum | CSV Proizvoda | Scrape Success | Linkano | Preostalo | Napomene |
|-------|-------|---------------|----------------|---------|-----------|----------|
| 1 | 2024-12-27 | 663 | 221 | 221 | ~24,000 | Initial batch |
| 2 | 2024-12-28 | 1,159 | 433 | 433 | 613 | Cache issue riješen sa `?v=timestamp` |
| 3 | 2024-12-29 | 613 | 321 | 322 | 300 | Smooth run, 98.8% pokriveno |

**Ukupno pokriveno:** 24,317 / 24,617 = **98.8%** ✅

---

## ⚠️ TROUBLESHOOTING

### Problem 1: Slike se ne prikazuju na Product Pages

**Simptom:** Direktan link (`/uploads/products/30007_1.jpg`) radi, ali product page prikazuje staru sliku.

**Uzrok:** Next.js Image cache.

**Rješenje:**
```bash
# 1. Dodaj cache busting timestamp (PREPORUČENO)
PGPASSWORD='123456789EmIna!' psql -h localhost -U postgres -d omerbasicdb -c "
UPDATE \"Product\"
SET \"imageUrl\" = \"imageUrl\" || '?v=' || EXTRACT(EPOCH FROM NOW())::bigint
WHERE \"imageUrl\" LIKE '/uploads/products/%_1.jpg'
  AND \"imageUrl\" NOT LIKE '%?v=%';
"

# 2. Obriši Next.js image cache
rm -rf ~/app/omerbasic/.next/cache/images
pm2 restart omerbasic

# 3. Hard refresh u browseru (Ctrl+Shift+R)
```

---

### Problem 2: "Permission denied" pri kopiranju

**Uzrok:** Permissions na VPS folderu.

**Rješenje:**
```bash
# Na VPS-u
sudo chown -R deploy:deploy ~/app/omerbasic/public/uploads
sudo chmod -R 755 ~/app/omerbasic/public/uploads
```

---

### Problem 3: Link Skripta Preskače Sve Proizvode

**Simptom:**
```
⏭️  Skipped: 321
✅ Images copied: 0
```

**Uzrok:** Proizvodi već imaju `imageUrl` u bazi.

**Provjera:**
```bash
PGPASSWORD='123456789EmIna!' psql -h localhost -U postgres -d omerbasicdb -c "
SELECT sku, \"imageUrl\"
FROM \"Product\"
WHERE sku = '30007';
"
```

**Rješenje:** Ako želiš **zamijeniti postojeće slike**, moraš prvo resetovati `imageUrl`:
```bash
# OPASNO - Prvo napravi backup!
PGPASSWORD='123456789EmIna!' psql -h localhost -U postgres -d omerbasicdb -c "
UPDATE \"Product\"
SET \"imageUrl\" = NULL
WHERE sku IN ('30007', '31371', ...);  -- Stavi listu SKU-ova
"
```

---

### Problem 4: Scraper Ne Pronalazi Proizvode

**Simptom:**
```
❌ Not found: 292
✅ Success: 321
```

**Uzroci:**
1. **Article number ne postoji na Spareto.com** - Proizvod stvarno ne postoji
2. **Article number format** - Različit format (npr. sa/bez crtice)
3. **Spareto stranica promijenila strukturu** - HTML selektori nisu validni

**Provjera:**
```bash
# Ručno provjeri na Spareto
https://spareto.com/products?keywords=12002
```

**Rješenje:** Ako proizvod postoji ali scraper ne nalazi, možda treba ažurirati selektore u `spareto_image_scraper.py`:
```python
# Linija 60-64
product_link = soup.find('a', class_='product-item__title')
```

---

### Problem 5: scp Transfer je Spor

**Uzrok:** Veliki broj fajlova, spor internet.

**Rješenje:** Kompresiraj prije transfera:
```bash
# Na Mac-u
cd /Users/emir_mw/omerbasic
tar -czf spareto_images_batch_X.tar.gz spareto_images_batch_X/

# Transfer compressed file
scp spareto_images_batch_X.tar.gz deploy@188.245.74.57:~/app/omerbasic/

# Na VPS-u, ekstraktuj
ssh deploy@188.245.74.57
cd ~/app/omerbasic
tar -xzf spareto_images_batch_X.tar.gz
rm spareto_images_batch_X.tar.gz
```

---

## 📝 BEST PRACTICES

### 1. Uvijek Koristi Batch Folders

```bash
# DOBRO
spareto_images_batch_1/
spareto_images_batch_2/
spareto_images_batch_3/

# LOŠE (miješanje različitih batch-eva)
spareto_images/
```

### 2. Testiraj Sa Malim Brojem Prvo

Kada pokreneš scraper, testiraj sa **10-20 proizvoda** prije nego što pokreneš cijeli batch:
```
How many products to scrape? (max 613, press Enter for 10): 20
```

### 3. Backup Prije Masovnih UPDATE-a

```bash
# Backup cijele baze prije velikih izmjena
PGPASSWORD='123456789EmIna!' pg_dump -h localhost -U postgres omerbasicdb > backup_before_batch_X.sql
```

### 4. Dokumentuj Svaki Batch

Dodaj red u **Batch History** tabelu gore nakon svakog batch-a.

### 5. Provjeri Cache Busting

Uvijek dodaj `?v=timestamp` nakon linkovanja da izbjegneš cache probleme.

### 6. Očisti Temp Foldere

Ne ostavljaj `spareto_images` folder na VPS-u nakon što završiš - zauzima prostor.

---

## 🎯 QUICK REFERENCE - Kompletna Sekvenca Komandi

```bash
# ===== VPS: Export CSV =====
ssh deploy@188.245.74.57
cd ~/app/omerbasic
PGPASSWORD='123456789EmIna!' psql -h localhost -U postgres -d omerbasicdb -c "COPY (...) TO STDOUT WITH CSV HEADER;" > products_without_images_batch_X.csv
exit

# ===== MAC: Copy CSV =====
scp deploy@188.245.74.57:~/app/omerbasic/products_without_images_batch_X.csv /Users/emir_mw/omerbasic/

# ===== MAC: Scrape Images =====
cd /Users/emir_mw/omerbasic
python3 scripts/spareto_image_scraper.py products_without_images_batch_X.csv spareto_images_batch_X
# Kada pita, upiši broj proizvoda (npr. 613)

# ===== MAC: Copy Images to VPS =====
scp -r /Users/emir_mw/omerbasic/spareto_images_batch_X deploy@188.245.74.57:~/app/omerbasic/

# ===== VPS: Link Images =====
ssh deploy@188.245.74.57
cd ~/app/omerbasic
mv spareto_images_batch_X spareto_images
npx tsx scripts/link-spareto-images.ts

# ===== VPS: Cache Busting =====
PGPASSWORD='123456789EmIna!' psql -h localhost -U postgres -d omerbasicdb -c "UPDATE \"Product\" SET \"imageUrl\" = \"imageUrl\" || '?v=' || EXTRACT(EPOCH FROM NOW())::bigint WHERE \"imageUrl\" LIKE '/uploads/products/%_1.jpg' AND \"imageUrl\" NOT LIKE '%?v=%';"

# ===== VPS: Verify =====
PGPASSWORD='123456789EmIna!' psql -h localhost -U postgres -d omerbasicdb -c "SELECT COUNT(*) as total, COUNT(CASE WHEN \"imageUrl\" IS NOT NULL THEN 1 END) as with_images FROM \"Product\";"

# ===== VPS: Cleanup =====
rm -rf spareto_images
rm -rf .next/cache/images
pm2 restart omerbasic
exit

# ===== MAC: Archive (Optional) =====
cd /Users/emir_mw/omerbasic
tar -czf spareto_images_batch_X_backup.tar.gz spareto_images_batch_X/
rm -rf spareto_images_batch_X/
```

---

## 📧 Support

Ako imaš problema, provjeri:
1. **Troubleshooting sekciju** gore
2. **Logove na VPS-u:** `pm2 logs omerbasic`
3. **Scraper logove:** `spareto_enrichment.log` (ako koristi enrichment skriptu)

---

**Autor:** Claude Code
**Zadnja izmjena:** 2024-12-29
**Verzija:** 1.0 (nakon Batch 3)
