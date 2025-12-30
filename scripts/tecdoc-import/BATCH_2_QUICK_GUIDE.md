# Batch 2 - Brzi Vodič

**Datum:** 30. Decembar 2025
**Status Batch 1:** ✅ Završen (519 proizvoda enriched)

---

## 📋 Koraci Za Batch 2

### 1️⃣ Pokreni Enrichment (3-4 sata)

**U prvom terminalu:**
```bash
cd /Users/emir_mw/omerbasic/scripts/tecdoc-import

caffeinate -i python3 spareto_vehicle_enrichment.py 5000 \
  -o spareto_output/batch_2.sql
```

**Što pratiti:**
- Progress će prikazivati koliko proizvoda je obrađeno
- Checkpoint se automatski čuva svakih 10 proizvoda
- Log fajl: `spareto_logs/batch_2.log`

**Ako se zaustavi:**
- Samo ponovo pokreni istu komandu - nastavit će gdje je stalo

---

### 2️⃣ Kreirati Cleanup Script

**Nakon što se Batch 2 završi:**

```bash
# Ekstraktuj product IDs iz batch_2.sql
grep "UPDATE \"Product\"" spareto_output/batch_2.sql | \
  grep -o "'cmhqilfi[^']*'" | \
  sort -u > /tmp/batch_2_product_ids.txt

# Kreiraj cleanup script
cat > spareto_output/batch_2_cleanup_fitments.sql << 'EOF'
-- Cleanup Vehicle Fitments for Batch 2
-- Deletes old fitments, keeps OEMs
-- Run BEFORE importing batch_2.sql

BEGIN;

DELETE FROM "ProductVehicleFitment"
WHERE "productId" IN (
EOF

# Dodaj product IDs
cat /tmp/batch_2_product_ids.txt | sed 's/^/  /' | sed 's/$/,/' >> spareto_output/batch_2_cleanup_fitments.sql

# Ukloni zadnji zarez
sed -i '' '$ s/,$//' spareto_output/batch_2_cleanup_fitments.sql

# Završi script
cat >> spareto_output/batch_2_cleanup_fitments.sql << 'EOF'
);

COMMIT;

-- Summary
SELECT 'Vehicle Fitments Deleted' as action, COUNT(*) as deleted_count
FROM "ProductVehicleFitment" WHERE 1=0;
EOF

echo "✅ Cleanup script kreiran: spareto_output/batch_2_cleanup_fitments.sql"
```

---

### 3️⃣ Izvršiti Cleanup

```bash
psql postgresql://emir_mw@localhost:5432/omerbasicdb < \
  spareto_output/batch_2_cleanup_fitments.sql
```

**Očekivani output:**
```
BEGIN
DELETE <broj>
COMMIT
```

---

### 4️⃣ Importovati Batch 2

```bash
psql postgresql://emir_mw@localhost:5432/omerbasicdb < \
  spareto_output/batch_2.sql
```

**Očekivani output:**
- `BEGIN`
- Mnogo `INSERT 0 1` redova (OEMs i fitments)
- `UPDATE <broj>` (proizvodi)
- `COMMIT`

---

### 5️⃣ Verifikacija

```bash
# Broj enriched proizvoda
psql postgresql://emir_mw@localhost:5432/omerbasicdb -c "
SELECT COUNT(*) as enriched_products
FROM \"Product\"
WHERE \"sparetoEnrichedAt\" IS NOT NULL;
"
```

**Očekivano:** ~5,500 proizvoda (519 + ~5,000 iz batch 2)

```bash
# Statistika
psql postgresql://emir_mw@localhost:5432/omerbasicdb -c "
SELECT
  COUNT(DISTINCT p.id) as products,
  COUNT(DISTINCT aoe.id) as oem_numbers,
  COUNT(DISTINCT pvf.id) as vehicle_fitments
FROM \"Product\" p
LEFT JOIN \"ArticleOENumber\" aoe ON aoe.\"productId\" = p.id
LEFT JOIN \"ProductVehicleFitment\" pvf ON pvf.\"productId\" = p.id
WHERE p.\"sparetoEnrichedAt\" IS NOT NULL;
"
```

```bash
# Sample proizvoda
psql postgresql://emir_mw@localhost:5432/omerbasicdb -c "
SELECT
  p.\"catalogNumber\",
  p.\"sparetoEnrichedAt\",
  COUNT(DISTINCT aoe.id) as oem_count,
  COUNT(DISTINCT pvf.id) as fitment_count
FROM \"Product\" p
LEFT JOIN \"ArticleOENumber\" aoe ON aoe.\"productId\" = p.id
LEFT JOIN \"ProductVehicleFitment\" pvf ON pvf.\"productId\" = p.id
WHERE p.\"sparetoEnrichedAt\" IS NOT NULL
GROUP BY p.id, p.\"catalogNumber\", p.\"sparetoEnrichedAt\"
ORDER BY p.\"sparetoEnrichedAt\" DESC
LIMIT 10;
"
```

---

## 📊 Output Fajlovi (Batch 2)

Nakon enrichmenta:
- ✅ `spareto_output/batch_2.sql` - Glavni SQL (OEMs + fitments)
- ✅ `spareto_output/batch_2_unmatched_table.sql` - Unmatched vozila
- ✅ `spareto_output/batch_2_link_products.sql` - Linkovi
- ✅ `spareto_logs/batch_2.log` - Processing log

Nakon cleanup:
- ✅ `spareto_output/batch_2_cleanup_fitments.sql` - Cleanup script

---

## 🔄 Zatim Batch 3

Ponoviti isti proces:

```bash
caffeinate -i python3 spareto_vehicle_enrichment.py 5000 \
  -o spareto_output/batch_3.sql
```

---

## 🚨 Troubleshooting

### Problem: "Already enriched"
**Rješenje:** Normalno - automatski preskače

### Problem: Timeout greške
**Rješenje:** Ponovo pokreni - checkpoint nastavlja

### Problem: Syntax error u cleanup
**Rješenje:** Provjeri trailing comma - ukloni zadnji zarez

### Problem: Duplicate key errors
**Rješenje:** Normalno - ON CONFLICT DO NOTHING skipuje duplikate

---

**Pripremio:** Claude Sonnet 4.5
**Za:** Batch 2 Processing (30. Dec 2025)
