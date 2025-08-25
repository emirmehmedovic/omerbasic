 npx tsx scripts/import-vehicles.ts vozila/bmw4.json
 
 for f in vozila/*.json; do
  echo "\n=== Importing $f ==="
  npx tsx scripts/import-vehicles.ts "$f"
done