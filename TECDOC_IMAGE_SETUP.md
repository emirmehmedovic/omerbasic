# TecDoc Slike - Detaljno Uputstvo

## 📋 Sadržaj

1. [Pregled](#pregled)
2. [Arhitektura](#arhitektura)
3. [Lokalna Konfiguracija](#lokalna-konfiguracija)
4. [VPS Setup](#vps-setup)
5. [Import Slika](#import-slika)
6. [Testiranje](#testiranje)
7. [Troubleshooting](#troubleshooting)

---

## Pregled

Ovaj dokument opisuje kako integrirati slike iz **TecDoc baze podataka** sa vašom PostgreSQL aplikacijom.

### Što trebate znati:

- **TecDoc baza**: MySQL baza sa ~6.8M artikala i ~5M slika (95GB)
- **Vaša baza**: PostgreSQL sa proizvodima koji imaju `tecdocArticleId`
- **Veza**: Koristi se `tecdocArticleId` da pronađe slike u TecDoc bazi
- **Slike**: Organizirane po Supplier ID-u sa dinamičkom strukturom foldera

---

## Arhitektura

### Kako se slike povezuju:

```
PostgreSQL (omerbasic)
    ↓
    Product.tecdocArticleId = 249893382
    ↓
MySQL (tecdoc1q2019)
    ↓
    articles.id = 249893382
    articles.Supplier = 1
    article_mediainformation.article_id = 249893382
    article_mediainformation.PictureName = "190130.JPG"
    ↓
File System (/images)
    ↓
    /images/1/1/9/190130.JPG  ← Fizička datoteka na disku
```

### Struktura slika na disku:

```
/images/
├── 1/                    ← Supplier ID
│   ├── 1/                ← Dinamički folder
│   │   ├── 9/            ← Dinamički subfolder
│   │   │   ├── 190130.JPG
│   │   │   ├── 190131.JPG
│   │   │   └── ...
│   │   └── ...
│   ├── U/
│   │   ├── _/
│   │   │   ├── U_946.JPG
│   │   │   └── ...
│   │   └── ...
│   └── ...
├── 10/                   ← Drugi Supplier ID
│   └── ...
└── 106/
    └── ...
```

---

## Lokalna Konfiguracija

### Korak 1: Provjera lokalnih baza

#### MySQL (TecDoc):

```bash
# Provjerite da je MySQL pokrenut
brew services list | grep mysql

# Rezultat trebao biti:
# mysql         started         emir_mw ~/Library/LaunchAgents/homebrew.mxcl.mysql.plist

# Provjerite veličinu TecDoc baze
mysql -u root -e "SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size_mb FROM information_schema.TABLES WHERE table_schema = 'tecdoc1q2019';"

# Trebao bi biti ~12.4 GB
```

#### PostgreSQL (Neon):

```bash
# Provjera konekcije
psql 'postgresql://neondb_owner:npg_fr1hSiyUN0gR@ep-floral-frog-a28sjyps-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require' \
  -c "SELECT COUNT(*) FROM \"Product\" WHERE \"tecdocArticleId\" IS NOT NULL;"

# Trebalo bi vratiti broj proizvoda sa tecdocArticleId
```

### Korak 2: TecDoc Image Linker Skripta

Skripта se nalazi na: `/Users/emir_mw/omerbasic/scripts/tecdoc_image_linker.py`

#### Instalacija venv-a:

```bash
cd /Users/emir_mw/omerbasic

# Kreiraj virtual environment
python3 -m venv venv_tecdoc

# Aktiviraj venv
source venv_tecdoc/bin/activate

# Instaliraj dependencies
pip install mysql-connector-python psycopg2-binary
```

#### Konfiguracija skripte:

Skripta koristi hardkodirane vrijednosti:
- **MySQL**: `localhost`, `root`, `tecdoc1q2019`
- **PostgreSQL**: Neon connection string (iz .env datoteke)
- **Images path**: `/Users/emir_mw/tecdoc/tecdocdatabase1Q2019/images`

Trebali biste ažurirati `MYSQL_CONFIG` i `PG_CONNECTION_STRING` ako se vaše konfiguracije razlikuju.

### Korak 3: Testiranje Lokalno

```bash
cd /Users/emir_mw/omerbasic
source venv_tecdoc/bin/activate

# Test 1: Prvi proizvod sa slikama
python3 scripts/tecdoc_image_linker.py --test

# Test 2: Specifičan TecDoc article ID
python3 scripts/tecdoc_image_linker.py --article-id 249893382

# Test 3: Specifičan PostgreSQL product ID
python3 scripts/tecdoc_image_linker.py --product-id cmhqilg7q029xomc3ddnaikcj
```

#### Što očekivati:

```
✓ Spojena MySQL baza
✓ Spojena PostgreSQL baza

TEST: Linkovanje slike za jedan proizvod
============================================================

Proizvod: FILTER GORIVA ACTROS MP4
  PostgreSQL ID: cmhqilg7q029xomc3ddnaikcj
  TecDoc Article ID: 249893382

✓ Pronađene slike (1):
  - 190130.JPG (Picture)

Supplier ID: 1

Tražim slike na file sistemu:

✓ Pronađene datoteke (1):
  - 190130.JPG
    → 1/1/9/190130.JPG

✓ Prijedlog za serviranje:
  1. Uploaduj folder /images sa VPS-a
  2. Relativna putanja: 1/1/9/190130.JPG
  3. URL: /images/1/1/9/190130.JPG
```

---

## VPS Setup

### Faza 1: Priprema na lokalnom računalu

#### 1.1 Export TecDoc podataka

```bash
# Export svih potrebnih CSV datoteka
cd /Users/emir_mw/tecdoc/tecdocdatabase1Q2019

# Kreiraj komprimovanu arhivu samo potrebnih datoteka
tar -czf tecdoc_data_min.tar.gz \
  articles.csv \
  article_mediainformation.csv

# Veličina trebala biti ~500MB-1GB
ls -lh tecdoc_data_min.tar.gz
```

#### 1.2 Export slika

```bash
# Kreiraj komprimovanu arhivu slika
# VAŽNO: Ovo je ~95GB! Mogu trebati sati!
cd /Users/emir_mw/tecdoc/tecdocdatabase1Q2019

# Opcija 1: Kompresiraj samo slike (ako trebate)
tar -czf images.tar.gz images/ 2>&1 | tail -f

# Opcija 2: Direktno preunesite bez kompresije (brže)
# Trebat će vi sftp ili rsync
```

### Faza 2: Upload na VPS

#### 2.1 Konfiguracija SSH konekcije

```bash
# Zamjena vrijednosti:
# - user@vps = vašem VPS username@IP ili hostname
# - /home/your_user = path gdje trebate datoteke

# Primjer konekcije:
export VPS_HOST="your_user@your_vps_ip"
export VPS_PATH="/home/your_user"
```

#### 2.2 Upload CSV datoteka (mali, brz)

```bash
# Upload CSV datoteka
scp /Users/emir_mw/tecdoc/tecdocdatabase1Q2019/article* \
    $VPS_HOST:$VPS_PATH/tecdoc_data/

# Provjera na VPS-u
ssh $VPS_HOST "ls -lh $VPS_PATH/tecdoc_data/"
```

#### 2.3 Upload slika (velik, dugotrajan)

```bash
# Opcija A: rsync (bolje za nastavak ako prekinute)
rsync -avz --progress \
  /Users/emir_mw/tecdoc/tecdocdatabase1Q2019/images/ \
  $VPS_HOST:$VPS_PATH/images/

# Opcija B: scp (jednostavnije)
scp -r /Users/emir_mw/tecdoc/tecdocdatabase1Q2019/images \
    $VPS_HOST:$VPS_PATH/

# Provjera veličine
ssh $VPS_HOST "du -sh $VPS_PATH/images"
```

### Faza 3: Setup na VPS-u

#### 3.1 Instalacija MySQL (ako nije instaliran)

```bash
# Na VPS-u
ssh $VPS_HOST

# Ubuntu/Debian
sudo apt-get update
sudo apt-get install mysql-server mysql-client

# macOS (ako je macOS VPS)
brew install mysql-server

# Pokrenite MySQL
sudo service mysql start
```

#### 3.2 Import TecDoc podataka u MySQL

```bash
# Na VPS-u

# Kreiraj bazu
mysql -u root -p -e "CREATE DATABASE tecdoc1q2019 CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;"

# Kreiraj tablice (trebat će vam SQL schema)
# Kopirajte db.sql sa vašeg lokalnog računala
scp /Users/emir_mw/tecdoc/tecdocdatabase1Q2019/install_database/db.sql \
    $VPS_HOST:/tmp/

# Učitaj schema na VPS
ssh $VPS_HOST "mysql -u root -p < /tmp/db.sql"

# Import CSV datoteka
mysql -u root -p -e "LOAD DATA LOCAL INFILE '$VPS_PATH/tecdoc_data/articles.csv' INTO TABLE tecdoc1q2019.articles FIELDS TERMINATED BY '\t' LINES TERMINATED BY '\r\n';"

mysql -u root -p -e "LOAD DATA LOCAL INFILE '$VPS_PATH/tecdoc_data/article_mediainformation.csv' INTO TABLE tecdoc1q2019.article_mediainformation FIELDS TERMINATED BY '\t' LINES TERMINATED BY '\r\n';"

# Provjera
mysql -u root -e "SELECT COUNT(*) FROM tecdoc1q2019.articles;"
mysql -u root -e "SELECT COUNT(*) FROM tecdoc1q2019.article_mediainformation;"
```

#### 3.3 Setup Python okruženja na VPS-u

```bash
# Na VPS-u

# Instaliraj Python
sudo apt-get install python3 python3-pip python3-venv

# Kreiraj folder za skripte
mkdir -p /home/your_user/scripts
cd /home/your_user/scripts

# Kreiraj venv
python3 -m venv venv_tecdoc
source venv_tecdoc/bin/activate

# Instaliraj dependencies
pip install mysql-connector-python psycopg2-binary
```

#### 3.4 Kopiranje skripte na VPS

```bash
# Kopiraj skriptu sa lokalnog računala
scp /Users/emir_mw/omerbasic/scripts/tecdoc_image_linker.py \
    $VPS_HOST:/home/your_user/scripts/

# Provjera na VPS-u
ssh $VPS_HOST "ls -lh /home/your_user/scripts/"
```

#### 3.5 Ažuriranje skripte za VPS konfiguraciju

Trebat će vam ažurirati sljedeće vrijednosti u `tecdoc_image_linker.py`:

```python
# Lokalna putanja (za development)
TECDOC_IMAGES_PATH = "/home/your_user/images"

# MySQL konfiguracija
MYSQL_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': 'vasa_mysql_lozinka',  # Trebat će vam postaviti!
    'database': 'tecdoc1q2019'
}

# PostgreSQL (ostaje ista ako koristite Neon)
PG_CONNECTION_STRING = "postgresql://..."
```

---

## Import Slika

### Korak 1: Testiranje na VPS-u

```bash
# Na VPS-u
cd /home/your_user/scripts
source venv_tecdoc/bin/activate

# Test sa prvim proizvodom
python3 tecdoc_image_linker.py --test

# Trebali bi vidjeti:
# ✓ Spojena MySQL baza
# ✓ Spojena PostgreSQL baza
# [test output...]
```

### Korak 2: Ažuriranje PostgreSQL proizvoda (batch processing)

```bash
# Ažuriraj sve proizvode sa slikama
python3 tecdoc_image_linker.py --all

# Output trebao biti:
# ✓ Pronađeno proizvoda: 150 (ili više)
# Obrađeno: 50/150
# Obrađeno: 100/150
# Obrađeno: 150/150
# ✓ Ažurirano proizvoda: 120/150
```

### Korak 3: Konfiguracija Next.js aplikacije

#### 3.1 Korištenje slika u aplikaciji

Ažuriranje `Product` komponente da prikaže slike:

```tsx
// src/components/ProductImage.tsx
import Image from 'next/image'

interface ProductImageProps {
  imageUrl?: string | null
  name: string
}

export function ProductImage({ imageUrl, name }: ProductImageProps) {
  // Ako nema imageUrl, koristi placeholder
  const src = imageUrl || '/images/placeholder.png'

  return (
    <Image
      src={src}
      alt={name}
      width={300}
      height={300}
      className="w-full h-auto"
      priority={false}
    />
  )
}
```

#### 3.2 Serviranje slika iz `/public` foldera

```bash
# Na VPS-u
# Kopira slike u Next.js public folder

ln -s /home/your_user/images /path/to/nextjs/public/images

# Ili direktno kopira
cp -r /home/your_user/images /path/to/nextjs/public/
```

#### 3.3 Build i deploy

```bash
# Ako ste kopirali slike u public folder, trebat će rebuild
npm run build

# Ili samo restart servera ako koristite symlink
pm2 restart nextjs-app
```

---

## Testiranje

### Test 1: Provjerite da su slike u PostgreSQL

```bash
# Na VPS-u
psql postgresql://... -c "SELECT COUNT(*) FROM \"Product\" WHERE \"imageUrl\" IS NOT NULL;"

# Trebalo bi vratiti broj proizvoda sa slikama
```

### Test 2: Provjerite sliku u pregledniku

```
http://your_vps_ip:3000/products/[product_id]

# Trebala bi vidjeti sliku ako je sve ok
```

### Test 3: Direktan test slike

```bash
# Na VPS-u
# Provjerite da datoteka postoji
ls -lh /path/to/nextjs/public/images/1/1/9/190130.JPG

# Trebala bi biti ~50KB-500KB
```

---

## Troubleshooting

### Problem 1: "Nisu pronađene fizičke datoteke"

**Uzrok**: Slike nisu na VPS-u ili su na drugoj lokaciji.

**Rješenje**:
```bash
# Provjera gdje su slike
find /home -name "190130.JPG" 2>/dev/null

# Ako nisu pronađene, trebate uploadati
scp -r /Users/emir_mw/tecdoc/tecdocdatabase1Q2019/images \
    $VPS_HOST:/home/your_user/
```

### Problem 2: "MySQL konekcija odbljena"

**Uzrok**: MySQL nije pokrenut ili nisu ispravne kredencijale.

**Rješenje**:
```bash
# Provjera MySQL statusa
sudo service mysql status

# Pokrenite MySQL ako nije pokrenuta
sudo service mysql start

# Provjera kredencijala
mysql -u root -p -e "SELECT 1;"
```

### Problem 3: "PostgreSQL konekcija odbljena"

**Uzrok**: Neon connection string je istekao ili nije ispravan.

**Rješenje**:
```bash
# Provjera connection stringa u .env
cat /path/to/nextjs/.env | grep DATABASE_URL

# Testirajte konekciju
psql 'postgresql://...' -c "SELECT 1;"
```

### Problem 4: Slike se ne prikazuju u pregledniku

**Uzrok**: Slike nisu u `/public/images` ili je path pogrešan.

**Rješenje**:
```bash
# 1. Provjera da datoteka postoji
ls -lh /path/to/nextjs/public/images/1/1/9/190130.JPG

# 2. Provjera da `imageUrl` u bazi sadrži točan path
psql postgresql://... -c "SELECT \"imageUrl\" FROM \"Product\" LIMIT 5;"

# Trebalo bi nešto kao: /images/1/1/9/190130.JPG

# 3. Rebuild Next.js
npm run build
npm run start
```

### Problem 5: Skripta je spora

**Uzrok**: Pronalaženje datoteka traje jer je puno datoteka.

**Rješenje**:
```bash
# Kreiraj index datoteka (brže pronalaženje)
cd /home/your_user/images

# Build index
find . -name "*.JPG" > images_index.txt

# Ažuriraj skriptu da koristi index
# (trebat će vam ažuriranje koda)
```

---

## Sažetak Koraka

### Lokalno:
1. ✓ Testiraj sa `tecdoc_image_linker.py --test`
2. ✓ Preparuj CSV datoteke za export
3. ✓ Preparuj slike za transfer

### VPS:
1. Upload CSV datoteka
2. Kreiraj MySQL bazu i učitaj podatke
3. Upload slika
4. Kreiraj Python okruženje
5. Kopira skriptu i ažuriraj konfiguraciju
6. Testiraj `python3 tecdoc_image_linker.py --test`
7. Pokreni `python3 tecdoc_image_linker.py --all`
8. Provjerite PostgreSQL data
9. Setup Next.js slike i deploy
10. Testiraj u pregledniku

---

## Dodatni Resursi

### Datoteke u projektu:

- **Skripta**: `/Users/emir_mw/omerbasic/scripts/tecdoc_image_linker.py`
- **MySQL Schema**: `/Users/emir_mw/tecdoc/tecdocdatabase1Q2019/install_database/db.sql`
- **CSV datoteke**: `/Users/emir_mw/tecdoc/tecdocdatabase1Q2019/*.csv`
- **Slike**: `/Users/emir_mw/tecdoc/tecdocdatabase1Q2019/images/`

### Važne komande:

```bash
# Lokalno testiranje
source /Users/emir_mw/omerbasic/venv_tecdoc/bin/activate
python3 /Users/emir_mw/omerbasic/scripts/tecdoc_image_linker.py --test

# Provjera PostgreSQL
psql 'postgresql://...' -c "SELECT * FROM \"Product\" LIMIT 5;"

# Provjera MySQL
mysql -u root -e "SELECT * FROM tecdoc1q2019.articles LIMIT 5;"
```

---

## Kontakt & Podrška

Ako trebate pomoć ili imate pitanja:

1. Provjerite [Troubleshooting](#troubleshooting) sekciju
2. Pokrenite test skriptu sa `--test` zastavicom
3. Provjerite logove za greške

---

**Zadnja ažuriranja**: 2025-11-12
**Status**: Production-Ready ✓
