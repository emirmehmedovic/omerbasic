# TecDoc Image Linker - Production Setup

Skripta za linkovanje TecDoc slika sa PostgreSQL bazom na produkciji.

---

## 📦 Što ste dobili

- `tecdoc_image_linker.py` - Glavna Python skripta
- Konfiguracija čita iz `.env` datoteke

---

## 🚀 Production Setup

### 1. Struktura foldara na VPS-u

```bash
/home/omerbasic/
├── omerbasic/                    # Vaš Next.js projekt
│   ├── .env                      # DATABASE_URL + nove varijable
│   └── tecdoc-import-plan/
│       └── tecdoc_image_linker.py
│
├── tecdoc_images/
│   └── images/                   # Uploadovane slike (500MB - 95GB)
│       ├── 1/
│       ├── 10/
│       ├── 106/
│       └── ...
│
└── tecdoc_data/
    ├── articles.csv             # ~500MB
    └── article_mediainformation.csv  # ~200MB
```

### 2. Konfiguracija .env

Trebate dodati ove linije u `/home/omerbasic/omerbasic/.env`:

```bash
# Postoji već:
DATABASE_URL="postgresql://emiir:emirMehmedovic123456789omerbasic@localhost:5432/omerbasicdb"

# Dodajte:
TECDOC_IMAGES_PATH="/home/omerbasic/tecdoc_images/images"
MYSQL_PASSWORD=""  # Ako trebate password za MySQL root
```

### 3. Instalacija zavisnosti

Ako Python okruženje već postoji u `tecdoc-import-plan`, trebate sigurirati da ima sve zavisnosti:

```bash
cd /home/omerbasic/omerbasic/tecdoc-import-plan

# Ako postoji venv
source venv/bin/activate

# Instalirajte zavisnosti
pip install mysql-connector-python psycopg2-binary python-dotenv
```

---

## 🧪 Testiranje

### Test 1: Konekcije na obje baze

```bash
cd /home/omerbasic/omerbasic/tecdoc-import-plan
source venv/bin/activate  # Ili gdje god je venv

python3 tecdoc_image_linker.py --test

# Trebali bi vidjeti:
# ✓ Spojena MySQL baza
# ✓ Spojena PostgreSQL baza
# [test output...]
```

### Test 2: Specifičan artikel

```bash
python3 tecdoc_image_linker.py --article-id 249893382

# Trebali bi vidjeti slike za taj artikel ako postoje
```

### Test 3: Specifičan proizvod

```bash
python3 tecdoc_image_linker.py --product-id your_product_id_here

# Trebali bi vidjeti proizvod sa pronađenom slikom
```

---

## ⚙️ Pokretanje Importa

### Pokrenite import SVIH proizvoda sa slikama

```bash
source venv/bin/activate
python3 tecdoc_image_linker.py --all

# Čekajte da se završi
# Trebalo bi da ispisu:
# ✓ Pronađeno proizvoda: 14396
# ✓ Ažurirano proizvoda: XXX/14396
```

**Vremenska procjena**: 30 minuta - 1 sat (ovisno o brzini diska)

---

## 📡 Rezultati

Nakon što import završi, PostgreSQL baza će imati popunjeno `imageUrl` polje za proizvode koji imaju dostupne slike.

Primjer:
```sql
SELECT name, "imageUrl" FROM "Product"
WHERE "imageUrl" IS NOT NULL
LIMIT 5;
```

Trebalo bi vratiti nešto kao:
```
name                  | imageUrl
----------------------+-------------------------------------
PROIZVOD 1            | /images/tecdoc/1/1/9/190130.JPG
PROIZVOD 2            | /images/tecdoc/106/0/0/000000_1.JPG
...
```

---

## 🔗 Integracija sa Next.js

### 1. Symlink slike u public folder

```bash
# Na VPS-u
ln -s /home/omerbasic/tecdoc_images/images \
      /home/omerbasic/omerbasic/public/images/tecdoc
```

### 2. Build i restart aplikacije

```bash
cd /home/omerbasic/omerbasic
npm run build
pm2 restart all  # Ili kako god pokrenete Next.js
```

### 3. Koristi u React komponentama

```tsx
import Image from 'next/image'

export function ProductCard({ product }) {
  return (
    <div>
      {product.imageUrl ? (
        <Image
          src={product.imageUrl}
          alt={product.name}
          width={300}
          height={300}
        />
      ) : (
        <div className="bg-gray-200">Nema slike</div>
      )}
      <h3>{product.name}</h3>
    </div>
  )
}
```

---

## 🔄 Periodički Update

Ako trebate periodički ažurirati slike (npr. svakodnevno):

```bash
# Kreiraj script
cat > /home/omerbasic/update_images.sh << 'EOF'
#!/bin/bash
cd /home/omerbasic/omerbasic/tecdoc-import-plan
source venv/bin/activate
python3 tecdoc_image_linker.py --all >> /var/log/tecdoc_import.log 2>&1
EOF

chmod +x /home/omerbasic/update_images.sh

# Dodaj u crontab (2 AM svaki dan)
(crontab -l 2>/dev/null; echo "0 2 * * * /home/omerbasic/update_images.sh") | crontab -
```

---

## 🐛 Troubleshooting

### Problem: "Greška pri spajanju PostgreSQL"

```bash
# Provjerite .env
cat /home/omerbasic/omerbasic/.env | grep DATABASE_URL

# Testirajte konekciju direktno
psql "postgresql://emiir:emirMehmedovic123456789omerbasic@localhost:5432/omerbasicdb" -c "SELECT 1;"
```

### Problem: "Greška pri spajanju MySQL"

```bash
# Testirajte MySQL
mysql -u root -e "SELECT 1;"

# Provjerite bazu postoji
mysql -u root -e "SHOW DATABASES LIKE 'tecdoc%';"
```

### Problem: "Nisu pronađene fizičke datoteke"

```bash
# Provjerite da su slike uploadovane
ls -la /home/omerbasic/tecdoc_images/images/ | head

# Trebali bi vidjeti folderе: 1, 10, 106, itd.

# Provjerite TECDOC_IMAGES_PATH u .env
grep TECDOC_IMAGES_PATH /home/omerbasic/omerbasic/.env

# Trebalo bi biti: /home/omerbasic/tecdoc_images/images
```

### Problem: Malo slika pronađeno (< 500)

**Ovo je normalno!** Demo verzija slika ima samo Supplier 1, 10, 106. Ako uploadujete kompletan folder (95GB), trebat će vam više slika.

```bash
# Koliko slika je pronađeno
psql -U emiir -d omerbasicdb -c "SELECT COUNT(*) FROM \"Product\" WHERE \"imageUrl\" IS NOT NULL;"
```

---

## 📊 Monitoring

Pratite progress:

```bash
# Real-time progress
watch -n 5 'psql -U emiir -d omerbasicdb -c "SELECT COUNT(*) FROM \"Product\" WHERE \"imageUrl\" IS NOT NULL;"'

# Logovi
tail -f /var/log/tecdoc_import.log
```

---

## 🔐 Sigurnost

1. **Zaštita .env datoteke**:
   ```bash
   chmod 600 /home/omerbasic/omerbasic/.env
   ```

2. **Nikada ne commitujte .env u Git**:
   ```bash
   # Već bi trebalo biti u .gitignore
   echo ".env" >> /home/omerbasic/omerbasic/.gitignore
   ```

3. **Backup baza**:
   ```bash
   # PostgreSQL
   pg_dump -U emiir omerbasicdb > /backups/omerbasicdb_backup.sql

   # MySQL
   mysqldump -u root tecdoc1q2019 > /backups/tecdoc1q2019_backup.sql
   ```

---

## 📋 Checklist

- [ ] .env konfiguriran sa `TECDOC_IMAGES_PATH`
- [ ] MySQL baza `tecdoc1q2019` kreirana
- [ ] CSV datoteke uploadovane
- [ ] Slike uploadovane u `/home/omerbasic/tecdoc_images/images/`
- [ ] Python zavisnosti instalirane (`pip install ...`)
- [ ] Test skripta pokrenuta - OK
- [ ] Full import pokrenuta - OK
- [ ] Symlink slike u `public/images/tecdoc`
- [ ] Next.js buildana i pokrenuta
- [ ] Slike dostupne u pregledniku
- [ ] Cron job postavljen (ako trebate periodički update)

---

## 📞 Brz kontakt

**Ako nešto ne radi:**

1. Pokrenite test:
   ```bash
   python3 tecdoc_image_linker.py --test
   ```

2. Provjerite .env:
   ```bash
   cat .env
   ```

3. Provjerite logove:
   ```bash
   tail /var/log/tecdoc_import.log
   ```

---

**Verzija**: 1.0 Production
**Zadnja ažuriranja**: 2025-11-12
**Status**: ✅ Ready for Production
