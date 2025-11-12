# TecDoc VPS Setup - Checklist

Korak po korak checklist za setup TecDoc slika na VPS-u.

---

## Pre-Setup Planning

### 1. Informacije koje trebate
- [ ] VPS IP adresa: `_____________________`
- [ ] VPS korisničko ime: `_____________________`
- [ ] VPS SSH ključ ili lozinka
- [ ] MySQL root lozinka (ili kreiraj novu)
- [ ] PostgreSQL connection string (Neon URL)
- [ ] Available disk space na VPS-u: minimum 100GB

### 2. Lokalne datoteke priprema
- [ ] Testiraj skriptu lokalno: `python3 scripts/tecdoc_image_linker.py --test`
- [ ] CSV datoteke na lokalnom računalu: `/Users/emir_mw/tecdoc/tecdocdatabase1Q2019/article*.csv`
- [ ] Slike na lokalnom računalu: `/Users/emir_mw/tecdoc/tecdocdatabase1Q2019/images/`
- [ ] SQL schema datoteka: `/Users/emir_mw/tecdoc/tecdocdatabase1Q2019/install_database/db.sql`

---

## Faza 1: Priprema VPS-a (30 minuta)

### 3. SSH konekcija
```bash
# U terminalu
export VPS_HOST="user@vps.ip"
export VPS_PATH="/home/your_user"

# Test konekcije
ssh $VPS_HOST "echo 'Konekcija OK'"
```
- [ ] SSH konekcija radi
- [ ] Stvoreni su $VPS_HOST i $VPS_PATH environment varijable

### 4. Instalacija potrebnih paketa
```bash
ssh $VPS_HOST << 'EOF'
sudo apt-get update
sudo apt-get install -y mysql-server mysql-client
sudo apt-get install -y python3 python3-pip python3-venv
sudo service mysql start
EOF
```
- [ ] MySQL instaliran i pokrenut
- [ ] Python3 i pip installirani

### 5. Kreiranje foldera strukture
```bash
ssh $VPS_HOST << 'EOF'
mkdir -p $VPS_PATH/tecdoc_data
mkdir -p $VPS_PATH/scripts
mkdir -p $VPS_PATH/images
EOF
```
- [ ] Folderi kreirani na VPS-u

---

## Faza 2: Upload datoteka (1-2 sata ovisno o brzini)

### 6. Upload CSV datoteka (mali, brz)
```bash
scp /Users/emir_mw/tecdoc/tecdocdatabase1Q2019/articles.csv \
    $VPS_HOST:$VPS_PATH/tecdoc_data/

scp /Users/emir_mw/tecdoc/tecdocdatabase1Q2019/article_mediainformation.csv \
    $VPS_HOST:$VPS_PATH/tecdoc_data/

# Provjera
ssh $VPS_HOST "ls -lh $VPS_PATH/tecdoc_data/"
```
- [ ] articles.csv uploadovan
- [ ] article_mediainformation.csv uploadovan
- [ ] Veličine ispravne (> 100MB)

### 7. Upload slika (velik, dugotrajan)
**NAPOMENA**: Ovo može potrajati nekoliko sati!

```bash
# Opcija A: rsync (preporučeno - može se nastaviti ako prekinete)
rsync -avz --progress \
  /Users/emir_mw/tecdoc/tecdocdatabase1Q2019/images/ \
  $VPS_HOST:$VPS_PATH/images/

# Provjera
ssh $VPS_HOST "du -sh $VPS_PATH/images"

# Trebalo bi vratiti ~95GB
```
- [ ] Slike počele uploadavati
- [ ] Transferwt završen (provjerite sa `du -sh`)
- [ ] Veličina je ~95GB

### 8. Upload SQL schema
```bash
scp /Users/emir_mw/tecdoc/tecdocdatabase1Q2019/install_database/db.sql \
    $VPS_HOST:/tmp/
```
- [ ] db.sql uploadovan

---

## Faza 3: MySQL Setup (20 minuta)

### 9. Kreiraj MySQL bazu
```bash
ssh $VPS_HOST

# Spojite se na MySQL
mysql -u root -p

# Izvršite u MySQL shell-u:
CREATE DATABASE tecdoc1q2019 CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
EXIT;
```
- [ ] Baza `tecdoc1q2019` kreirana

### 10. Učitaj SQL schema
```bash
ssh $VPS_HOST "mysql -u root -p < /tmp/db.sql"
```
- [ ] Schema učitana
- [ ] Sve tablice kreirane

### 11. Učitaj CSV podatke
```bash
ssh $VPS_HOST << 'EOF'
# Za articles.csv
mysql -u root -p tecdoc1q2019 -e "LOAD DATA LOCAL INFILE '$VPS_PATH/tecdoc_data/articles.csv' INTO TABLE articles FIELDS TERMINATED BY '\t' LINES TERMINATED BY '\r\n';"

# Za article_mediainformation.csv
mysql -u root -p tecdoc1q2019 -e "LOAD DATA LOCAL INFILE '$VPS_PATH/tecdoc_data/article_mediainformation.csv' INTO TABLE article_mediainformation FIELDS TERMINATED BY '\t' LINES TERMINATED BY '\r\n';"
EOF
```
- [ ] articles.csv učitano
- [ ] article_mediainformation.csv učitano

### 12. Provjera MySQL podataka
```bash
ssh $VPS_HOST << 'EOF'
mysql -u root -p tecdoc1q2019 -e "SELECT COUNT(*) FROM articles;"
mysql -u root -p tecdoc1q2019 -e "SELECT COUNT(*) FROM article_mediainformation;"
EOF
```
- [ ] Oba COUNT trebala bi vratiti milione
- [ ] articles: ~6.8M
- [ ] article_mediainformation: ~5M

---

## Faza 4: Python Setup (10 minuta)

### 13. Kreiraj Python virtual environment
```bash
ssh $VPS_HOST << 'EOF'
cd $VPS_PATH
python3 -m venv venv_tecdoc
source venv_tecdoc/bin/activate
pip install mysql-connector-python psycopg2-binary
EOF
```
- [ ] venv kreiran
- [ ] Dependencies instalirani

### 14. Upload Python skripte
```bash
scp /Users/emir_mw/omerbasic/scripts/tecdoc_image_linker.py \
    $VPS_HOST:$VPS_PATH/scripts/

# Provjera
ssh $VPS_HOST "ls -lh $VPS_PATH/scripts/"
```
- [ ] tecdoc_image_linker.py uploadovan

### 15. Ažuriranje skripte za VPS
```bash
ssh $VPS_HOST

# Ažuriraj skriptu:
nano $VPS_PATH/scripts/tecdoc_image_linker.py

# Promijeni:
# TECDOC_IMAGES_PATH = "/home/your_user/images"
# MYSQL_CONFIG = { 'password': 'your_mysql_password', ... }
# PG_CONNECTION_STRING = "postgresql://..."
```
- [ ] Skripta ažurirana sa ispravnim putanjama
- [ ] MySQL lozinka postavljena
- [ ] PostgreSQL connection string postavljen

---

## Faza 5: Testiranje (10 minuta)

### 16. Test Python okruženja
```bash
ssh $VPS_HOST << 'EOF'
cd $VPS_PATH/scripts
source ../venv_tecdoc/bin/activate
python3 tecdoc_image_linker.py --test
EOF
```
- [ ] Test završen bez grešaka
- [ ] "✓ Spojena MySQL baza" - vidljivo
- [ ] "✓ Spojena PostgreSQL baza" - vidljivo
- [ ] Slike pronađene

### 17. Provjera spajanja baza
```bash
ssh $VPS_HOST << 'EOF'
# MySQL
mysql -u root -p tecdoc1q2019 -e "SELECT COUNT(*) as articles FROM articles; SELECT COUNT(*) as images FROM article_mediainformation;"

# PostgreSQL
psql 'postgresql://...' -c "SELECT COUNT(*) FROM \"Product\";"
EOF
```
- [ ] MySQL vraća brojeve
- [ ] PostgreSQL vraća brojeve

---

## Faza 6: Import (30 minuta - 2 sata ovisno o količini)

### 18. Pokreni full import
```bash
ssh $VPS_HOST << 'EOF'
cd $VPS_PATH/scripts
source ../venv_tecdoc/bin/activate
python3 tecdoc_image_linker.py --all
EOF
```
- [ ] Import počeo
- [ ] Vidljiv je progress
- [ ] Nema grešaka

### 19. Monitor import
```bash
# U drugoj terminal sesiji, monitoriraj progress
ssh $VPS_HOST << 'EOF'
watch -n 5 'psql "postgresql://..." -c "SELECT COUNT(*) FROM \"Product\" WHERE \"imageUrl\" IS NOT NULL;"'
EOF
```
- [ ] Broj proizvoda sa slikama raste
- [ ] Import se nastavlja bez greške

### 20. Provjera rezultata
```bash
ssh $VPS_HOST << 'EOF'
psql 'postgresql://...' -c "SELECT COUNT(*) FROM \"Product\" WHERE \"imageUrl\" IS NOT NULL;"
EOF
```
- [ ] Broj > 0 (trebalo bi 100+)
- [ ] Prikaži primjer: `SELECT "name", "imageUrl" FROM "Product" WHERE "imageUrl" IS NOT NULL LIMIT 5;`

---

## Faza 7: Setup Next.js (15 minuta)

### 21. Symlink ili copy slika u public folder
```bash
ssh $VPS_HOST

# Opcija A: Symlink (bolje za disk space)
ln -s $VPS_PATH/images /path/to/nextjs/public/images

# Opcija B: Copy (ako trebate)
cp -r $VPS_PATH/images /path/to/nextjs/public/
```
- [ ] Slike dostupne iz Next.js

### 22. Build Next.js aplikacije
```bash
ssh $VPS_HOST "cd /path/to/nextjs && npm run build"
```
- [ ] Build završen bez grešaka
- [ ] Slike uključene u build

### 23. Restart aplikacije
```bash
ssh $VPS_HOST "cd /path/to/nextjs && npm run start"
# Ili ako koristite pm2:
ssh $VPS_HOST "pm2 restart nextjs-app"
```
- [ ] Aplikacija pokrenuta
- [ ] Nema grešaka u logima

---

## Faza 8: Finalna provjera (10 minuta)

### 24. Test u pregledniku
```
http://your_vps_ip:3000/products
```
- [ ] Stranica učitana
- [ ] Slike se prikazuju (ako su dostupne)
- [ ] Nema 404 grešaka za slike

### 25. Direktan test datoteke
```bash
# Direktan HTTP request
curl http://your_vps_ip:3000/images/1/1/9/190130.JPG -I

# Trebalo bi vratiti: 200 OK
```
- [ ] HTTP 200 OK
- [ ] Content-Type: image/jpeg
- [ ] Content-Length > 0

### 26. Provjera baze
```bash
# Direktan query
psql 'postgresql://...' << 'EOF'
SELECT COUNT(*) as total,
       COUNT(CASE WHEN "imageUrl" IS NOT NULL THEN 1 END) as with_images
FROM "Product";
EOF
```
- [ ] with_images > 100

---

## Post-Setup (Maintenance)

### 27. Backup setup
```bash
# Kreiraj backup skriptu
ssh $VPS_HOST << 'EOF'
cat > $VPS_PATH/backup.sh << 'BACKUP'
#!/bin/bash
mysqldump -u root -p tecdoc1q2019 > /tmp/tecdoc_backup_$(date +%Y%m%d).sql
tar -czf /tmp/tecdoc_backup_$(date +%Y%m%d).tar.gz /tmp/tecdoc_backup_$(date +%Y%m%d).sql
BACKUP
chmod +x $VPS_PATH/backup.sh
EOF
```
- [ ] Backup skripta kreirana
- [ ] Dodana u cron za dnevni backup

### 28. Monitoring
```bash
# Kreiraj monitoring skriptu
ssh $VPS_HOST << 'EOF'
# Check disk space regularly
df -h | grep images

# Check MySQL
mysql -u root -p -e "SHOW PROCESSLIST;"
EOF
```
- [ ] Disk space monitorirano
- [ ] MySQL performanse OK

### 29. Dokumentacija
- [ ] Kopiraj ove čekliste na VPS za kasnije reference
- [ ] Spremi connection stringove na sigurnom mjestu
- [ ] Dokumentiraj custom konfiguracije

---

## ✅ Setup Završen!

Čestitam! TecDoc slike su uspješno integrirane sa vašom aplikacijom.

### Što je sada dostupno:
- ✓ PostgreSQL baza sa `imageUrl` poljima
- ✓ MySQL baza sa TecDoc podacima
- ✓ Slike dostupne preko `/images` foldera
- ✓ Python skripta za održavanje i updates

### Sljedeće korake:
1. Monitor aplikaciju na production-u
2. Postavi cron job za dnevni backup
3. Pravilno ažuriraj MySQL bazu ako trebate nove podatke
4. Skript može biti pokrenut periodički za nove slike

---

## Emergency Contacts

- PostgreSQL Neon: support@neon.tech
- Vlastita IT podrška: [vaš kontakt]

---

**Checklist verzija**: 1.0
**Zadnja ažuriranja**: 2025-11-12
**Status**: ✓ Ready to use
