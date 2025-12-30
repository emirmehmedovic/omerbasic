# Spareto Slike - Procedura Linkovanja

## 📋 Proces Linkovanja Novih Slika

### 1️⃣ **Priprema - Lokalno**

Nakon što završi scraping slika, imaš folder sa slikama:
```bash
/Users/emir_mw/omerbasic/spareto_images_fresh/
```

**Provjera broja slika:**
```bash
cd /Users/emir_mw/omerbasic
ls spareto_images_fresh/*.jpg | wc -l
ls spareto_images_fresh/*_1.jpg | wc -l  # Primarne slike
```

---

### 2️⃣ **Kopiranje na Produkciju (VPS)**

**Kopiraj cijeli folder u public/uploads:**
```bash
# Iz lokalne mašine (Mac)
rsync -avz --progress \
  /Users/emir_mw/omerbasic/spareto_images_fresh/ \
  emir_mw@5.161.185.23:/var/www/omerbasic/public/uploads/spareto_images_fresh/
```

**Provjera na VPS-u:**
```bash
# SSH u VPS
ssh emir_mw@5.161.185.23

# Provjeri broj slika
ls /var/www/omerbasic/public/uploads/spareto_images_fresh/*.jpg | wc -l
```

---

### 3️⃣ **Modifikacija Link Skripte**

Ažuriraj `scripts/link-spareto-images.ts` da pokazuje na novi folder:

```typescript
// Promijeni SOURCE_DIR da pokazuje na fresh folder
const SOURCE_DIR = path.join(process.cwd(), 'public', 'uploads', 'spareto_images_fresh');
```

**Ili kreiraj novu skriptu:**
```bash
# Na VPS-u
cp scripts/link-spareto-images.ts scripts/link-spareto-images-fresh.ts
```

Edituj `link-spareto-images-fresh.ts`:
```typescript
const SOURCE_DIR = path.join(process.cwd(), 'public', 'uploads', 'spareto_images_fresh');
const TARGET_DIR = path.join(process.cwd(), 'public', 'uploads', 'products');
```

---

### 4️⃣ **Pokretanje Link Skripte**

```bash
# SSH u VPS
ssh emir_mw@5.161.185.23

# Idi u projekat
cd /var/www/omerbasic

# Pokreni skriptu
npx tsx scripts/link-spareto-images-fresh.ts
```

**Output će biti:**
```
🖼️  Spareto Image Linker

Source: /var/www/omerbasic/public/uploads/spareto_images_fresh
Target: /var/www/omerbasic/public/uploads/products
──────────────────────────────────────────────────────────────────────

🔍 Reading images...
   Found 1159 total images
   Found 386 primary images (_1.jpg/png/webp)

📦 Processing images...

✅ [29524] FILTER KABINE... -> /uploads/products/29524_1.jpg
✅ [29563] FILTER KABINE... -> /uploads/products/29563_1.jpg
...

══════════════════════════════════════════════════════════════════════
SUMMARY
══════════════════════════════════════════════════════════════════════
Total images found:     386
✅ Images copied:        320
✅ Products linked:      320
⏭️  Skipped:              66
❌ Errors:               0
══════════════════════════════════════════════════════════════════════
```

---

### 5️⃣ **Provjera Rezultata**

**SQL provjera:**
```bash
# Na VPS-u
PGPASSWORD='123456789EmIna!' psql -h localhost -U postgres -d omerbasicdb -c "
SELECT COUNT(*) as \"Proizvodi sa slikama\"
FROM \"Product\"
WHERE \"imageUrl\" IS NOT NULL AND \"imageUrl\" != '';
"
```

**Provjera foldera:**
```bash
# Broj slika u products folderu
ls /var/www/omerbasic/public/uploads/products/*.jpg | wc -l
```

---

### 6️⃣ **Čišćenje - Brisanje Temp Foldera**

Nakon što je sve linkano i provjereno:

```bash
# SSH u VPS
ssh emir_mw@5.161.185.23

# Obriši temporary folder
rm -rf /var/www/omerbasic/public/uploads/spareto_images_fresh

# Ili arhiviraj ako želiš backup
tar -czf spareto_images_fresh_backup.tar.gz \
  /var/www/omerbasic/public/uploads/spareto_images_fresh/

# Pa obriši
rm -rf /var/www/omerbasic/public/uploads/spareto_images_fresh
```

---

## 🔄 Cijeli Proces - Brzi Pregled

```bash
# 1. Lokalno - Kopiraj na VPS
rsync -avz --progress \
  /Users/emir_mw/omerbasic/spareto_images_fresh/ \
  emir_mw@5.161.185.23:/var/www/omerbasic/public/uploads/spareto_images_fresh/

# 2. SSH u VPS
ssh emir_mw@5.161.185.23

# 3. Kreiraj/modifikuj skriptu
cd /var/www/omerbasic
nano scripts/link-spareto-images-fresh.ts
# Promijeni SOURCE_DIR na 'spareto_images_fresh'

# 4. Pokreni linkovanje
npx tsx scripts/link-spareto-images-fresh.ts

# 5. Provjeri rezultate
PGPASSWORD='123456789EmIna!' psql -h localhost -U postgres -d omerbasicdb -c "
SELECT COUNT(*) FROM \"Product\" WHERE \"imageUrl\" IS NOT NULL;
"

# 6. Obriši temp folder
rm -rf /var/www/omerbasic/public/uploads/spareto_images_fresh
```

---

## 📊 Batch History

| Batch | Datum | Ukupno Slika | Linkano | Folder |
|-------|-------|--------------|---------|--------|
| 1     | Dec 27 | 663         | 221     | spareto_images |
| 2     | Dec 28 | 1159        | ?       | spareto_images_fresh |

---

## ⚠️ Napomene

1. **Ne briši `spareto_images_fresh` folder odmah** - sačekaj da provjeriš da su slike linkane
2. **Skripta kopira samo `_1.jpg` slike** - primarnu sliku za svaki proizvod
3. **Preskače proizvode koji već imaju sliku** - neće prepisivati postojeće
4. **Loguje sve akcije** - možeš vidjeti šta je urađeno
5. **Transakciono sigurno** - updateuje bazu samo ako je slika uspješno kopirana

---

## 🐛 Troubleshooting

**Problem: "Permission denied" pri kopiranju**
```bash
# Na VPS-u, daj permissions
sudo chown -R emir_mw:emir_mw /var/www/omerbasic/public/uploads
sudo chmod -R 755 /var/www/omerbasic/public/uploads
```

**Problem: "Product not found"**
```bash
# Proizvod ne postoji u bazi ili catalogNumber ne odgovara
# Provjeri SKU u fajlu vs catalogNumber u bazi
```

**Problem: Skripta je preskoči sve**
```bash
# Vjerovatno svi proizvodi već imaju imageUrl
# Provjeri: SELECT sku, imageUrl FROM "Product" WHERE sku = '29524';
```

---

## ✅ Checklist

Prije pokretanja:
- [ ] Slike su na lokalnoj mašini u `spareto_images_fresh/`
- [ ] rsync je instaliran
- [ ] Imaš SSH pristup na VPS
- [ ] Folder `/var/www/omerbasic/public/uploads` postoji
- [ ] Skripta `link-spareto-images-fresh.ts` je kreirana/modifikovana

Za vrijeme izvršavanja:
- [ ] rsync pokazuje progress kopiranja
- [ ] Na VPS-u su sve slike prisutne
- [ ] Skripta loguje akcije
- [ ] Nijedna greška u outputu

Nakon izvršavanja:
- [ ] Provjereno u bazi: COUNT proizvoda sa imageUrl
- [ ] Provjereno u folderu: slike u `public/uploads/products/`
- [ ] Temp folder `spareto_images_fresh` obrisan
- [ ] Batch dodat u tabelu gore (Batch History)
