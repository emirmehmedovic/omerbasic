#!/bin/bash
#
# TecDoc Database Export Script
# ==============================
# Exports TecDoc MySQL database and compresses it for transfer to production
#
# Usage: ./export-tecdoc-db.sh [gzip|xz]
#   gzip - Faster compression, larger file (~3-4 GB)
#   xz   - Slower compression, smaller file (~1-2 GB)
#

set -e  # Exit on error

COMPRESSION="${1:-gzip}"  # Default to gzip
OUTPUT_DIR="${HOME}/Downloads"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="tecdoc1q2019"

echo "============================================================"
echo "TecDoc Database Export"
echo "============================================================"
echo "Database: $DB_NAME"
echo "Compression: $COMPRESSION"
echo "Output: $OUTPUT_DIR"
echo "============================================================"

# Check disk space
echo ""
echo "Checking disk space..."
df -h "$OUTPUT_DIR"

# Step 1: Export MySQL dump
echo ""
echo "[1/3] Exporting MySQL dump..."
echo "⏱️  This will take 30-60 minutes for 12 GB database..."

mysqldump -u root \
  --single-transaction \
  --quick \
  --lock-tables=false \
  --skip-comments \
  "$DB_NAME" > "${OUTPUT_DIR}/tecdoc1q2019_export_${TIMESTAMP}.sql"

DUMP_SIZE=$(du -h "${OUTPUT_DIR}/tecdoc1q2019_export_${TIMESTAMP}.sql" | cut -f1)
echo "✅ Export complete: $DUMP_SIZE"

# Step 2: Compress
echo ""
echo "[2/3] Compressing dump file..."

if [ "$COMPRESSION" = "xz" ]; then
    echo "⏱️  XZ compression will take 30-60 minutes..."
    xz -9 -T0 "${OUTPUT_DIR}/tecdoc1q2019_export_${TIMESTAMP}.sql"
    COMPRESSED_FILE="${OUTPUT_DIR}/tecdoc1q2019_export_${TIMESTAMP}.sql.xz"
elif [ "$COMPRESSION" = "gzip" ]; then
    echo "⏱️  GZIP compression will take 10-20 minutes..."
    gzip -9 "${OUTPUT_DIR}/tecdoc1q2019_export_${TIMESTAMP}.sql"
    COMPRESSED_FILE="${OUTPUT_DIR}/tecdoc1q2019_export_${TIMESTAMP}.sql.gz"
else
    echo "❌ Invalid compression type. Use 'gzip' or 'xz'"
    exit 1
fi

COMPRESSED_SIZE=$(du -h "$COMPRESSED_FILE" | cut -f1)
echo "✅ Compression complete: $COMPRESSED_SIZE"

# Step 3: Generate checksum
echo ""
echo "[3/3] Generating checksum..."
shasum -a 256 "$COMPRESSED_FILE" > "${COMPRESSED_FILE}.sha256"
echo "✅ Checksum generated"

# Summary
echo ""
echo "============================================================"
echo "✅ EXPORT COMPLETE"
echo "============================================================"
echo "File: $COMPRESSED_FILE"
echo "Size: $COMPRESSED_SIZE"
echo "Checksum: ${COMPRESSED_FILE}.sha256"
echo ""
echo "Next steps:"
echo "1. Transfer to production:"
echo "   scp $COMPRESSED_FILE user@production-vm:/tmp/"
echo ""
echo "2. Or upload to cloud storage:"
echo "   gsutil cp $COMPRESSED_FILE gs://your-bucket/"
echo ""
echo "3. On production, import:"
echo "   gunzip tecdoc1q2019_export_*.sql.gz"
echo "   mysql -u root -p tecdoc1q2019 < tecdoc1q2019_export_*.sql"
echo "============================================================"
