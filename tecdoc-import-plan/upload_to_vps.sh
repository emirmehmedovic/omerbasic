#!/bin/bash

# Script za uploadovanje JSON mapiranja i Python skripte na VPS

echo "=========================================="
echo "Upload na VPS"
echo "=========================================="
echo ""

VPS_USER="omerbasic"
VPS_HOST="188.245.74.57"
VPS_PATH="/home/omerbasic/omerbasic/tecdoc-import-plan"

# Check if files exist locally
if [ ! -f "vps_image_mappings.json" ]; then
    echo "✗ vps_image_mappings.json ne postoji lokalno"
    exit 1
fi

if [ ! -f "vps_apply_json_mappings.py" ]; then
    echo "✗ vps_apply_json_mappings.py ne postoji lokalno"
    exit 1
fi

echo "✓ Pronađeni lokalni fajlovi"
echo "  - vps_image_mappings.json (395 mapiranja)"
echo "  - vps_apply_json_mappings.py"
echo ""

# Try to upload with scp
echo "Pokušaj uploadovanja na VPS (ssh key autentifikacija)..."
scp -o ConnectTimeout=5 vps_image_mappings.json "${VPS_USER}@${VPS_HOST}:${VPS_PATH}/" 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✓ vps_image_mappings.json uploadovan"
    scp vps_apply_json_mappings.py "${VPS_USER}@${VPS_HOST}:${VPS_PATH}/"
    echo "✓ vps_apply_json_mappings.py uploadovan"
    echo ""
    echo "✓ Upload je uspješan!"
    echo ""
    echo "Sada na VPS-u pokreni:"
    echo "  cd ${VPS_PATH}"
    echo "  source venv/bin/activate"
    echo "  python3 vps_apply_json_mappings.py"
else
    echo "✗ scp ne radi (SSH key nije dostupan)"
    echo ""
    echo "Alternativa - kopiraj ručno na VPS:"
    echo ""
    echo "1. Otvori SSH konekciju:"
    echo "   ssh ${VPS_USER}@${VPS_HOST}"
    echo ""
    echo "2. Na lokalnom MacBook-u, otvori novi terminal i kopiraj JSON:"
    echo "   cat vps_image_mappings.json | ssh ${VPS_USER}@${VPS_HOST} 'cat > ${VPS_PATH}/vps_image_mappings.json'"
    echo ""
    echo "3. Kopiraj Python skriptu:"
    echo "   cat vps_apply_json_mappings.py | ssh ${VPS_USER}@${VPS_HOST} 'cat > ${VPS_PATH}/vps_apply_json_mappings.py'"
    echo ""
    echo "4. Na VPS-u pokreni:"
    echo "   cd ${VPS_PATH}"
    echo "   source venv/bin/activate"
    echo "   python3 vps_apply_json_mappings.py"
fi
