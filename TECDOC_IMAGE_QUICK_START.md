# TecDoc Slike - Quick Start Guide

## 🚀 Brz početak

### Lokalno testiranje (5 minuta)

```bash
cd /Users/emir_mw/omerbasic

# Aktiviraj venv
source venv_tecdoc/bin/activate

# Testiraj
python3 scripts/tecdoc_image_linker.py --test
```

Trebali bi vidjeti output s pronađenim slikama.

---

## 📦 Što trebate na VPS-u

1. **MySQL baza** sa TecDoc podacima
2. **Python skripta** - `tecdoc_image_linker.py`
3. **Slike** - `/images` folder
4. **PostgreSQL baza** - već imate, trebat će dodati `imageUrl` polja

---

## ⚡ VPS Setup (5 koraka)

### 1. Upload datoteka na VPS

```bash
export VPS="your_user@your_vps_ip"

# CSV datoteke (mali, brz)
scp /Users/emir_mw/tecdoc/tecdocdatabase1Q2019/article*.csv \
    $VPS:/home/your_user/tecdoc_data/

# Slike (velik, dugotrajan - ako trebate)
rsync -avz --progress \
  /Users/emir_mw/tecdoc/tecdocdatabase1Q2019/images/ \
  $VPS:/home/your_user/images/
```

### 2. MySQL Setup na VPS-u

```bash
ssh $VPS

# Kreiraj bazu
mysql -u root -p -e "CREATE DATABASE tecdoc1q2019 CHARACTER SET utf8mb4;"

# Import skripte trebate iz lokalnog računala
scp /Users/emir_mw/tecdoc/tecdocdatabase1Q2019/install_database/db.sql $VPS:/tmp/

# Na VPS-u:
mysql -u root -p < /tmp/db.sql

# Import podataka
mysql -u root -p tecdoc1q2019 < /home/your_user/tecdoc_data/articles.csv
```

### 3. Python Setup na VPS-u

```bash
ssh $VPS

python3 -m venv /home/your_user/venv_tecdoc
source /home/your_user/venv_tecdoc/bin/activate
pip install mysql-connector-python psycopg2-binary

# Kopira skriptu
scp /Users/emir_mw/omerbasic/scripts/tecdoc_image_linker.py \
    $VPS:/home/your_user/scripts/
```

### 4. Konfiguracija skripte

Na VPS-u, ažuriraj `/home/your_user/scripts/tecdoc_image_linker.py`:

```python
# Promijeni ove linije:

TECDOC_IMAGES_PATH = "/home/your_user/images"  # ← Vaš path

MYSQL_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': 'your_mysql_password',  # ← Vaša lozinka
    'database': 'tecdoc1q2019'
}

PG_CONNECTION_STRING = "postgresql://..."  # ← Vaš connection string
```

### 5. Pokreni import

```bash
ssh $VPS

cd /home/your_user/scripts
source /home/your_user/venv_tecdoc/bin/activate

# Test
python3 tecdoc_image_linker.py --test

# Import sve
python3 tecdoc_image_linker.py --all
```

---

## ✅ Provjera

```bash
# PostgreSQL trebala bi imati imageUrl
psql 'postgresql://...' \
  -c "SELECT COUNT(*) FROM \"Product\" WHERE \"imageUrl\" IS NOT NULL;"

# Trebalo bi vratiti broj > 0
```

---

## 📸 Korištenje u aplikaciji

U vašim komponenti trebate samo prikazati sliku:

```tsx
<Image
  src={product.imageUrl}
  alt={product.name}
  width={300}
  height={300}
/>
```

Ako je `imageUrl` popunjeno, slika će biti prikazana.

---

## 🔧 Komande

```bash
# Testiraj prvi proizvod
python3 scripts/tecdoc_image_linker.py --test

# Testiraj specifičan article
python3 scripts/tecdoc_image_linker.py --article-id 249893382

# Testiraj specifičan proizvod
python3 scripts/tecdoc_image_linker.py --product-id cmhqilg7q029xomc3ddnaikcj

# Import sve
python3 scripts/tecdoc_image_linker.py --all
```

---

## ❓ Često pitanja

**P: Koliko vremena trebat će import?**
A: Za 150 proizvoda sa slikama - ~2-5 minuta.

**P: Trebam li uploadati sve slike (95GB)?**
A: Samo ako trebate sve. U početku možete testirati sa dijelom.

**P: Mogu li koristiti bez MySQL?**
A: Ne, trebat će MySQL jer su samo tamo informacije o slikama.

**P: Što ako nema slika za proizvod?**
A: `imageUrl` ostane NULL, može se koristiti placeholder.

---

## 📚 Detaljno Uputstvo

Za detaljnije informacije vidi: [TECDOC_IMAGE_SETUP.md](./TECDOC_IMAGE_SETUP.md)

---

**Status**: ✓ Production-Ready
**Last Updated**: 2025-11-12
