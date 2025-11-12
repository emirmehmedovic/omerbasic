# Scripts Folder

Ovdje se nalaze utility skripte za procesiranje podataka.

## 📋 Dostupne skripte

### `tecdoc_image_linker.py`

Script koji linkuje TecDoc slike sa PostgreSQL proizvodima.

#### Instalacija

```bash
# Iz root foldera projekta
cd /Users/emir_mw/omerbasic

# Kreiraj virtual environment
python3 -m venv venv_tecdoc

# Aktiviraj
source venv_tecdoc/bin/activate

# Instaliraj dependencies
pip install mysql-connector-python psycopg2-binary
```

#### Korištenje

```bash
# Aktiviraj venv
source /path/to/venv_tecdoc/bin/activate

# Test prvi proizvod
python3 scripts/tecdoc_image_linker.py --test

# Test specifičan article ID
python3 scripts/tecdoc_image_linker.py --article-id 249893382

# Test specifičan product ID
python3 scripts/tecdoc_image_linker.py --product-id cmhqilg7q029xomc3ddnaikcj

# Import sve proizvode
python3 scripts/tecdoc_image_linker.py --all
```

#### Konfiguracija

Script koristi hardkodirane konfiguracije:

```python
# .../scripts/tecdoc_image_linker.py

TECDOC_IMAGES_PATH = "/Users/emir_mw/tecdoc/tecdocdatabase1Q2019/images"

MYSQL_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '',
    'database': 'tecdoc1q2019'
}

PG_CONNECTION_STRING = "postgresql://..."  # iz .env datoteke
```

Za VPS, trebat će ažurirati ove vrijednosti.

#### Output

```
2025-11-12 14:14:46,258 - INFO - ✓ Spojena MySQL baza
2025-11-12 14:14:46,555 - INFO - ✓ Spojena PostgreSQL baza
2025-11-12 14:14:46,556 - INFO -
============================================================
2025-11-12 14:14:46,556 - INFO - TEST: Linkovanje slike za jedan proizvod
============================================================
2025-11-12 14:14:46,623 - INFO -
Proizvod: FILTER GORIVA ACTROS MP4
  PostgreSQL ID: cmhqilg7q029xomc3ddnaikcj
  TecDoc Article ID: 166535737
...
```

#### Što script radi

1. ✓ Pronalazi proizvode sa `tecdocArticleId` u PostgreSQL
2. ✓ Pronalazi slike iz MySQL `article_mediainformation` tablice
3. ✓ Pronalazi fizičke datoteke na file sistemu
4. ✓ Ažurira `imageUrl` polje u PostgreSQL

#### Limitations

- Trebat će MySQL i PostgreSQL konekcije
- Trebat će pristup `/images` folderu sa TecDoc bazom
- Za production trebat će prilagoditi konfiguracije

---

## 🔄 Workflow

```
PostgreSQL               MySQL                  File System
   ↓                      ↓                         ↓
Product                articles            /images/1/1/9/
  ├─ id                   ├─ id           190130.JPG
  ├─ name                 ├─ Supplier
  ├─ tecdocArticleId  ──→ ├─ ...
  └─ imageUrl ←────────── article_mediainformation
                          ├─ article_id
                          ├─ PictureName ────→ pronađi datoteku
                          └─ ...
```

---

## 📚 Dokumentacija

- Detaljno uputstvo: [TECDOC_IMAGE_SETUP.md](../TECDOC_IMAGE_SETUP.md)
- Quick start: [TECDOC_IMAGE_QUICK_START.md](../TECDOC_IMAGE_QUICK_START.md)

---

## 🐛 Troubleshooting

### MySQL konekcija ne radi

```bash
# Provjera da li je MySQL pokrenuta
brew services list | grep mysql

# Ako nije, pokrenite
brew services start mysql
```

### PostgreSQL konekcija ne radi

```bash
# Testirajte konekciju
psql 'postgresql://...' -c "SELECT 1;"

# Ako ne radi, provjerite .env datoteku
cat /Users/emir_mw/omerbasic/.env | grep DATABASE_URL
```

### Slike nisu pronađene

```bash
# Provjera da li folder postoji
ls -la /Users/emir_mw/tecdoc/tecdocdatabase1Q2019/images/

# Trebalo bi vidjeti foldere poput: 1, 10, 106
```

---

## 📝 Licence i Kredit

Ove skripte su kreirane za integraciju TecDoc baze sa omerbasic webshop aplikacijom.

**Verzija**: 1.0
**Zadnja ažuriranja**: 2025-11-12
