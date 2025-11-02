# Vehicle Linking & Cleanup Playbook

This document explains the full workflow for linking products to vehicles, cleaning up model/generation data, and preventing bad data from being created again. It covers original linking, detection, cleanup, merging, and re-import steps.

- **Repo paths**
  - Importer: `scripts/import-products-linking.ts`
  - Legacy linker (initial phase): `scripts/link-products-to-vehicles.ts`
  - Preview bad models: `scripts/preview-bad-models.ts`
  - Merge embedded-generation models: `scripts/merge-models-into-base.ts`

- **Key DB relations (Prisma)**
  - `VehicleBrand` → `VehicleModel` → `VehicleGeneration` → `VehicleEngine`
  - `ProductVehicleFitment` links `Product` to a `VehicleGeneration` (and optionally a `VehicleEngine`)

---

## 1) Initial Linking (legacy)

- Script: `scripts/link-products-to-vehicles.ts`
- Purpose: Original approach to link `Product` to vehicles based on CSV/attributes.
- Usage example:
```bash
npx tsx scripts/link-products-to-vehicles.ts --report initial-link.csv
```
- Outcome: Creates `ProductVehicleFitment` links and any missing `Brand/Model/Generation` as needed.

Notes:
- This was your starting point before we introduced the improved importer and cleanup tooling.

---

## 2) Improved Importer (current)

- Script: `scripts/import-products-linking.ts`
- Purpose: Robustly create/link brands, models, generations, and engines from JSON source files under `products-linking/`.
- Data model highlights:
  - Supports `models[].generations[].engines[]` including `engineCodes`.
  - Saves `partDescription` from input into `ProductVehicleFitment.fitmentNotes`.
  - Upserts engines by `generationId + engineCode` and fills missing fields (`description`, `engineType`, `engineCapacity`, `enginePowerKW/HP`).

### 2.1 Engine upsert improvements
- Function: `upsertEngine()` in `scripts/import-products-linking.ts`
- Behavior:
  - If engine exists, updates only missing fields (does not overwrite non-null values).
  - Accepts power values in `kW` and `HP` (array or single) and picks the first if array.

### 2.2 Model name parsing → generations
- Function: `decomposeModelAndGenerations()` in `scripts/import-products-linking.ts`
- Behavior:
  - Extracts embedded generation tokens from model names like `Passat B3/B4`, `Golf Mk4`, `Polo 9N`.
  - Supported tokens: `B\d`, `Mk\d`, Roman numerals (`I/II/III/IV/V/X`), VAG/other platform codes like `8L`, `8P`, `9N`, `6N2`, `W203`, `T5`.
  - Combined tokens with `/` are split into multiple generations.
  - Falls back to base model with a `General` generation only if no gens are provided and there are model-level engines.

### 2.3 Typical usage
```bash
# Full import
npx tsx scripts/import-products-linking.ts --create-missing --report final-import.csv
```
- Output includes processed files, linked fitments, created entities, skipped counts.

---

## 3) Detecting Bad Models (preview)

- Script: `scripts/preview-bad-models.ts`
- Purpose: Identify `VehicleModel` rows with embedded generation info in the model name (e.g., `Passat B3/B4`, `Golf Mk4`, `Brera / Spider`).
- Detection rules:
  - Contains `/` (e.g., `B5/B5.5`, `Mk2/Mk3`).
  - Space + token (`B\d`, `Mk\d`, Roman numerals) or platform codes (`8L`, `8P`, `9N`, `W203`, `T5`).

### 3.1 Usage
```bash
# Preview all brands
npx tsx scripts/preview-bad-models.ts --report bad-models.csv

# Preview by brand
npx tsx scripts/preview-bad-models.ts --brand Volkswagen --report vw-bad-models.csv

# Delete matched (after preview)
npx tsx scripts/preview-bad-models.ts --delete --report deleted.csv
```
- Deleting a `VehicleModel` cascades to its `VehicleGeneration`, `VehicleEngine`, and `ProductVehicleFitment`.

---

## 4) Merging Embedded-Generation Models into Base

- Script: `scripts/merge-models-into-base.ts`
- Purpose: Normalize models like `A3 8L` → base `A3` with generation `8L`.
- What it does:
  - Decomposes model into base + generation tokens.
  - Upserts target generations under the base model.
  - Moves `VehicleEngine` and `ProductVehicleFitment` to the correct generation.
  - Avoids duplicate fitments by checking `(productId, generationId, engineId)`.
  - Deletes the old, now-empty model.

### 4.1 Usage
```bash
# All brands (dry-run then apply)
npx tsx scripts/merge-models-into-base.ts --dry-run --report merge-all.csv
npx tsx scripts/merge-models-into-base.ts --report merge-all.csv

# Per brand
npx tsx scripts/merge-models-into-base.ts --dry-run --brand Audi --report audi-merge.csv
npx tsx scripts/merge-models-into-base.ts --brand Audi --report audi-merge.csv
```

---

## 5) Recommended End-to-End Flow

When onboarding new data or after schema changes, run this sequence:

```bash
# 1) Detect and remove obviously bad models (with slash or explicit tokens)
npx tsx scripts/preview-bad-models.ts --report bad-models.csv
npx tsx scripts/preview-bad-models.ts --delete --report deleted.csv

# 2) Merge remaining embedded-generation models into base across all brands
npx tsx scripts/merge-models-into-base.ts --dry-run --report merge-check.csv
npx tsx scripts/merge-models-into-base.ts --report merge-apply.csv

# 3) Run the importer (idempotent, fills missing fields/engines, links fitments)
npx tsx scripts/import-products-linking.ts --create-missing --report final-import.csv

# 4) Verify that no bad models remain
npx tsx scripts/preview-bad-models.ts --report bad-models-after.csv
```

---

## 6) Safety & Troubleshooting

- **Backups**: Before deletes or large merges, snapshot the DB.
- **Dry-run first**: All cleanup scripts support dry-run modes.
- **Duplicates**: The merge script prevents duplicate fitments; importer avoids duplicate engines via upsert by `(generationId, engineCode)`.
- **Tokenizer coverage**: If a specific embedded pattern slips through, extend `decomposeModelAndGenerations()` or the merge script token regex and re-run.
- **Partial brand runs**: Use `--brand BrandName` to narrow scope when testing.
- **Skips in importer**: Check the generated CSV report for reasons (e.g., missing brand/model when `--create-missing` is not set).

---

## 7) Changelog of Key Improvements

- `scripts/import-products-linking.ts`
  - Added `decomposeModelAndGenerations()` with broader token detection (`B\d`, `Mk\d`, Roman, `8L/8P/9N/6N2/W203/T5`, and slash variants).
  - Merged extracted generations with explicit JSON generations.
  - `upsertEngine()` now updates missing fields on existing engines instead of duplicating.
  - Writes `partDescription` to `ProductVehicleFitment.fitmentNotes`.

- New scripts:
  - `scripts/preview-bad-models.ts`: Preview and optional delete of models with embedded generation tokens.
  - `scripts/merge-models-into-base.ts`: Migrate models like `Golf Mk4` into base `Golf` with generation `Mk4`, moving engines/fitments and removing the bad model.

---

## 8) Quick Reference Commands

```bash
# Detect → Delete bad models
npx tsx scripts/preview-bad-models.ts --report bad-models.csv
npx tsx scripts/preview-bad-models.ts --delete --report deleted.csv

# Merge all brands (dry-run then apply)
npx tsx scripts/merge-models-into-base.ts --dry-run --report merge-all.csv
npx tsx scripts/merge-models-into-base.ts --report merge-all.csv

# Import (create/link brands/models/generations/engines, fill engine fields)
npx tsx scripts/import-products-linking.ts --create-missing --report final-import.csv

# Verify
npx tsx scripts/preview-bad-models.ts --report bad-models-after.csv
```

---

## 9) Expected Outcomes

- Base `VehicleModel` names only (e.g., `Passat`, `A6`, `Polo`).
- Per-model `VehicleGeneration` names for codes (`B6`, `B7`, `C4`, `C6`, `Mk4`, `9N`, `W203`, etc.).
- `VehicleEngine` upserted and enriched where codes exist.
- `ProductVehicleFitment` linked to the appropriate generation (and engine when present), with notes populated from source `partDescription`.
