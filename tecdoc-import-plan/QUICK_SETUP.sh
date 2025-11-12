#!/bin/bash

# TecDoc Image Linker - Quick Setup Script
# Koristite ovaj script za brz setup na VPS-u

set -e  # Exit on error

echo "================================================"
echo "TecDoc Image Linker - Production Setup"
echo "================================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if running as omerbasic user
if [ "$USER" != "omerbasic" ]; then
    echo -e "${RED}✗ Trebate pokrenuti kao omerbasic korisnik${NC}"
    echo "Koristite: su - omerbasic"
    exit 1
fi

# Step 1: Check .env
echo -e "${YELLOW}Step 1: Provjera .env datoteke${NC}"
if [ ! -f ~/omerbasic/.env ]; then
    echo -e "${RED}✗ .env datoteka ne postoji!${NC}"
    exit 1
fi

# Check if TECDOC_IMAGES_PATH exists in .env
if grep -q "TECDOC_IMAGES_PATH" ~/omerbasic/.env; then
    echo -e "${GREEN}✓ TECDOC_IMAGES_PATH je postavljen${NC}"
else
    echo -e "${YELLOW}⚠ TECDOC_IMAGES_PATH nije u .env, dodaj:${NC}"
    echo 'TECDOC_IMAGES_PATH="/home/omerbasic/tecdoc_images/images"'
    echo ""
    read -p "Dodaj sada? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo 'TECDOC_IMAGES_PATH="/home/omerbasic/tecdoc_images/images"' >> ~/omerbasic/.env
        echo -e "${GREEN}✓ Dodano u .env${NC}"
    fi
fi

# Step 2: Check MySQL
echo ""
echo -e "${YELLOW}Step 2: Provjera MySQL baze${NC}"
if mysql -u root -e "SELECT 1" >/dev/null 2>&1; then
    echo -e "${GREEN}✓ MySQL je dostupan${NC}"

    if mysql -u root -e "USE tecdoc1q2019" >/dev/null 2>&1; then
        echo -e "${GREEN}✓ Baza tecdoc1q2019 postoji${NC}"
        ARTICLE_COUNT=$(mysql -u root tecdoc1q2019 -se "SELECT COUNT(*) FROM articles;")
        echo "  Broj artikala: $ARTICLE_COUNT"
    else
        echo -e "${RED}✗ Baza tecdoc1q2019 ne postoji!${NC}"
        echo "  Trebate je kreirati i učitati CSV podatke"
        exit 1
    fi
else
    echo -e "${RED}✗ MySQL nije dostupan${NC}"
    exit 1
fi

# Step 3: Check PostgreSQL
echo ""
echo -e "${YELLOW}Step 3: Provjera PostgreSQL baze${NC}"
if psql "postgresql://emiir:emirMehmedovic123456789omerbasic@localhost:5432/omerbasicdb" -c "SELECT 1" >/dev/null 2>&1; then
    echo -e "${GREEN}✓ PostgreSQL je dostupan${NC}"
    PRODUCT_COUNT=$(psql -U emiir -d omerbasicdb -t -c "SELECT COUNT(*) FROM \"Product\";")
    echo "  Broj proizvoda: $PRODUCT_COUNT"
else
    echo -e "${RED}✗ PostgreSQL nije dostupan${NC}"
    exit 1
fi

# Step 4: Check Python environment
echo ""
echo -e "${YELLOW}Step 4: Provjera Python okruženja${NC}"
cd ~/omerbasic/tecdoc-import-plan

if [ -d "venv" ]; then
    source venv/bin/activate
    echo -e "${GREEN}✓ venv je aktiviran${NC}"

    # Check dependencies
    if python3 -c "import mysql.connector, psycopg2, dotenv" 2>/dev/null; then
        echo -e "${GREEN}✓ Sve zavisnosti su instalirane${NC}"
    else
        echo -e "${YELLOW}⚠ Nedostaju zavisnosti, instaliram...${NC}"
        pip install mysql-connector-python psycopg2-binary python-dotenv
        echo -e "${GREEN}✓ Zavisnosti su instalirane${NC}"
    fi
else
    echo -e "${RED}✗ venv ne postoji!${NC}"
    echo "Kreirajte venv: python3 -m venv venv"
    exit 1
fi

# Step 5: Check images folder
echo ""
echo -e "${YELLOW}Step 5: Provjera slika foldera${NC}"
IMAGES_PATH=$(grep TECDOC_IMAGES_PATH ~/omerbasic/.env | cut -d'=' -f2)
if [ -d "$IMAGES_PATH" ]; then
    IMAGE_COUNT=$(find "$IMAGES_PATH" -type f -name "*.JPG" -o -name "*.jpg" | wc -l)
    echo -e "${GREEN}✓ Folder postoji${NC}"
    echo "  Broj slika: $IMAGE_COUNT"

    if [ "$IMAGE_COUNT" -lt 1000 ]; then
        echo -e "${YELLOW}⚠ Malo slika pronađeno. Trebate uploadovati više.${NC}"
    fi
else
    echo -e "${RED}✗ Folder sa slikama ne postoji!${NC}"
    echo "  Trebate uploadovati slike na: $IMAGES_PATH"
    exit 1
fi

# Step 6: Run test
echo ""
echo -e "${YELLOW}Step 6: Pokretanje test skripte${NC}"
read -p "Trebate li pokrenuti test? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    python3 tecdoc_image_linker.py --test
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Test je prošao!${NC}"
    else
        echo -e "${RED}✗ Test je neuspješan${NC}"
        exit 1
    fi
fi

# Step 7: Ask to run full import
echo ""
echo -e "${YELLOW}Step 7: Full Import${NC}"
read -p "Trebate li pokrenuti full import? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Pokretanje importa (ovo može potrajati...)${NC}"
    python3 tecdoc_image_linker.py --all

    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✓ Import je uspješan!${NC}"

        # Show results
        UPDATED=$(psql -U emiir -d omerbasicdb -t -c "SELECT COUNT(*) FROM \"Product\" WHERE \"imageUrl\" IS NOT NULL;")
        echo "  Broj proizvoda sa slikama: $UPDATED"
    else
        echo -e "${RED}✗ Import je neuspješan${NC}"
        exit 1
    fi
fi

echo ""
echo "================================================"
echo -e "${GREEN}✓ Setup je završen!${NC}"
echo "================================================"
echo ""
echo "Sljedeći koraci:"
echo "1. Symlink slike u public folder:"
echo "   ln -s $IMAGES_PATH ~/omerbasic/public/images/tecdoc"
echo ""
echo "2. Build i restart aplikacije:"
echo "   cd ~/omerbasic && npm run build && pm2 restart all"
echo ""
echo "3. Testirajte u pregledniku:"
echo "   http://localhost:3000/products"
echo ""
