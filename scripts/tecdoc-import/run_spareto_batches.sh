#!/bin/bash

################################################################################
# Spareto Enrichment - Batch Processing Script
#
# Usage:
#   ./run_spareto_batches.sh [batch_size] [num_batches] [pause_seconds]
#
# Examples:
#   ./run_spareto_batches.sh 500 48 30    # 24,000 products, 30s pause
#   ./run_spareto_batches.sh 1000 24 60   # 24,000 products, 60s pause
#
################################################################################

# Configuration
BATCH_SIZE=${1:-500}           # Default: 500 products per batch
NUM_BATCHES=${2:-48}           # Default: 48 batches (24,000 total)
PAUSE_SECONDS=${3:-30}         # Default: 30 seconds between batches
OUTPUT_DIR="spareto_output"
LOG_DIR="spareto_logs"
SCRIPT_NAME="spareto_vehicle_enrichment.py"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create directories
mkdir -p "$OUTPUT_DIR"
mkdir -p "$LOG_DIR"

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${YELLOW}⚠️  DATABASE_URL not set. Using default...${NC}"
    export DATABASE_URL='postgresql://emir_mw@localhost:5432/omerbasicdb'
fi

# Print configuration
echo "========================================================================"
echo -e "${BLUE}🚀 Spareto Enrichment - Batch Processing${NC}"
echo "========================================================================"
echo "Configuration:"
echo "  - Batch size:        $BATCH_SIZE products"
echo "  - Number of batches: $NUM_BATCHES"
echo "  - Total products:    $((BATCH_SIZE * NUM_BATCHES))"
echo "  - Pause between:     ${PAUSE_SECONDS}s"
echo "  - Output directory:  $OUTPUT_DIR/"
echo "  - Log directory:     $LOG_DIR/"
echo "  - Database:          $DATABASE_URL"
echo "========================================================================"
echo ""

# Confirm before starting
read -p "Start processing? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 1
fi

# Record start time
START_TIME=$(date +%s)

# Counters
SUCCESSFUL_BATCHES=0
FAILED_BATCHES=0
TOTAL_PRODUCTS_PROCESSED=0

# Process batches
for i in $(seq 1 $NUM_BATCHES); do
    BATCH_START_TIME=$(date +%s)

    echo ""
    echo "========================================================================"
    echo -e "${BLUE}📦 Batch $i/$NUM_BATCHES${NC}"
    echo "========================================================================"

    # Run enrichment
    python3 "$SCRIPT_NAME" "$BATCH_SIZE" \
        -o "$OUTPUT_DIR/batch_${i}.sql" \
        > "$LOG_DIR/batch_${i}.log" 2>&1

    EXIT_CODE=$?
    BATCH_END_TIME=$(date +%s)
    BATCH_DURATION=$((BATCH_END_TIME - BATCH_START_TIME))

    # Check result
    if [ $EXIT_CODE -eq 0 ]; then
        echo -e "${GREEN}✅ Batch $i completed successfully${NC}"
        echo -e "   Duration: ${BATCH_DURATION}s"

        # Count processed products (from SQL file)
        if [ -f "$OUTPUT_DIR/batch_${i}.sql" ]; then
            PRODUCTS_IN_BATCH=$(grep -c "UPDATE \"Product\"" "$OUTPUT_DIR/batch_${i}.sql" 2>/dev/null || echo "0")
            # Remove any non-digit characters (newlines, spaces, etc.)
            PRODUCTS_IN_BATCH=${PRODUCTS_IN_BATCH//[^0-9]/}
            # Default to 0 if empty
            PRODUCTS_IN_BATCH=${PRODUCTS_IN_BATCH:-0}
            echo -e "   Products: $PRODUCTS_IN_BATCH"
            TOTAL_PRODUCTS_PROCESSED=$((TOTAL_PRODUCTS_PROCESSED + PRODUCTS_IN_BATCH))
        fi

        SUCCESSFUL_BATCHES=$((SUCCESSFUL_BATCHES + 1))
    else
        echo -e "${RED}❌ Batch $i failed with exit code $EXIT_CODE${NC}"
        echo -e "   Check log: $LOG_DIR/batch_${i}.log"
        FAILED_BATCHES=$((FAILED_BATCHES + 1))

        # Ask if should continue after failure
        read -p "Continue with next batch? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Stopping batch processing."
            break
        fi
    fi

    # Show checkpoint status
    if [ -f "spareto_enrichment_checkpoint.json" ]; then
        CHECKPOINT_COUNT=$(cat spareto_enrichment_checkpoint.json | jq '.processed_products | length' 2>/dev/null || echo "?")
        echo -e "   Checkpoint: $CHECKPOINT_COUNT products saved"
    fi

    # Pause before next batch (except for last one)
    if [ $i -lt $NUM_BATCHES ]; then
        echo ""
        echo -e "${YELLOW}⏸️  Pausing ${PAUSE_SECONDS}s before next batch...${NC}"

        # Show countdown
        for ((s=$PAUSE_SECONDS; s>0; s--)); do
            echo -ne "\r   Resuming in ${s}s...  "
            sleep 1
        done
        echo -e "\r   Resuming now!          "
    fi
done

# Record end time
END_TIME=$(date +%s)
TOTAL_DURATION=$((END_TIME - START_TIME))
HOURS=$((TOTAL_DURATION / 3600))
MINUTES=$(((TOTAL_DURATION % 3600) / 60))
SECONDS=$((TOTAL_DURATION % 60))

# Final summary
echo ""
echo "========================================================================"
echo -e "${GREEN}📊 FINAL SUMMARY${NC}"
echo "========================================================================"
echo "Batches:"
echo -e "  ${GREEN}✅ Successful: $SUCCESSFUL_BATCHES${NC}"
if [ $FAILED_BATCHES -gt 0 ]; then
    echo -e "  ${RED}❌ Failed:     $FAILED_BATCHES${NC}"
fi
echo ""
echo "Products:"
echo "  Total processed: $TOTAL_PRODUCTS_PROCESSED"
echo ""
echo "Time:"
echo "  Total duration:  ${HOURS}h ${MINUTES}m ${SECONDS}s"
echo "  Avg per batch:   $((TOTAL_DURATION / NUM_BATCHES))s"
echo ""
echo "Files generated:"
echo "  SQL files:  $OUTPUT_DIR/batch_*.sql"
echo "  Log files:  $LOG_DIR/batch_*.log"
echo "  Checkpoint: spareto_enrichment_checkpoint.json"
echo "========================================================================"
echo ""

# Next steps
echo "Next steps:"
echo ""
echo "1. Import SQL files:"
echo "   for f in $OUTPUT_DIR/batch_*.sql; do"
echo "     echo \"Importing \$f...\""
echo "     psql \$DATABASE_URL < \"\$f\""
echo "   done"
echo ""
echo "2. Import unmatched vehicles:"
echo "   psql \$DATABASE_URL < $OUTPUT_DIR/batch_1_unmatched_table.sql"
echo "   psql \$DATABASE_URL < bulk_add_missing_vehicles.sql"
echo ""
echo "3. Link products with new vehicles:"
echo "   for f in $OUTPUT_DIR/batch_*_link_products.sql; do"
echo "     psql \$DATABASE_URL < \"\$f\""
echo "   done"
echo ""

# Check for failed batches
if [ $FAILED_BATCHES -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Warning: Some batches failed. Check logs in $LOG_DIR/${NC}"
    echo ""
    echo "To retry failed batches, you can:"
    echo "  1. Keep the checkpoint file (automatic resume)"
    echo "  2. Run this script again"
    echo "  3. Already processed products will be skipped"
    echo ""
fi

echo "Done! 🎉"
