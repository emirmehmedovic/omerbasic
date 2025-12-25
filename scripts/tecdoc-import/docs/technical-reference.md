# TecDoc Import System - Technical Reference

**Datum**: 2025-12-22
**Verzija**: 2.0

---

## 🗄️ Database Schema

### TecDoc Database (MySQL)

**Database**: `tecdoc1q2019`
**Version**: TecDoc 1Q2019
**Tables**: 35 tabela, 155M redova

#### Ključne Tabele

| Tabela | Redova | Opis |
|--------|--------|------|
| `articles` | ~5M | Artikli (proizvodi) |
| `tree_node_products` | 45M | **Veze artikli-vozila** ⭐ |
| `passengercars` | ~250K | Putnička vozila |
| `models` | ~15K | Modeli vozila |
| `manufacturers` | ~200 | Proizvođači vozila |
| `engines` | ~50K | Motori |
| `article_oe_numbers` | ~10M | OEM brojevi |
| `article_ea_numbers` | ~3M | EAN kodovi |
| `article_attributes` | ~20M | Tehničke specifikacije |

#### Schema Relationships

```
articles (id, DataSupplierArticleNumber, CurrentProduct, NormalizedDescription, Supplier)
    └─→ suppliers (id, Description)
    ├─→ article_oe_numbers (article_id, OENbr, Manufacturer)
    │       └─→ manufacturers (id, Description)
    ├─→ article_ea_numbers (article_id, EAN)
    └─→ article_attributes (article_id, DisplayTitle, DisplayValue, AttributeType)

tree_node_products (product_id, itemId, tree_id, valid_state)
    ├─→ articles.CurrentProduct = product_id
    └─→ passengercars.internalID = itemId (WHERE tree_id = 1)

passengercars (id, internalID, Model, Description, From, To)
    ├─→ models (id, Description, ManufacturerId)
    │       └─→ manufacturers (id, Description)
    └─→ passengercars_link_engines (car_id, engine_id)
            └─→ engines (id, Description, SalesDescription)
```

#### Ključni Pojmovi

**article_id**
- ID artikla u `articles` tabeli
- Primjer: `83001806`, `167588132`

**CurrentProduct**
- ID kategorije proizvoda
- Koristi se kao `product_id` u `tree_node_products`
- Primjer: `251` (Mounting), `557` (Gasket Set)

**NormalizedDescription**
- Generički opis proizvoda
- Primjer: "Mounting", "Gasket Set", "Hose Line"
- ⚠️ **Ne koristiti** za vehicle lookup (4.6M vozila!)

**internalID**
- Jedinstveni ID vozila u TecDoc-u
- Koristi se za linkovanje passengercars ↔ tree_node_products

**valid_state**
- Status validnosti veze
- `1` = validna veza, `0` = nevalidna
- **Uvijek filtrirati** `WHERE valid_state = 1`

---

### User Database (PostgreSQL)

**Database**: `omerbasicdb`
**Version**: PostgreSQL 14+
**Tables**: Prisma schema

#### Ključne Tabele

| Tabela | Opis | ExternalId Mapping |
|--------|------|-------------------|
| `Product` | Proizvodi | `tecdocArticleId` → articles.id |
| `ArticleOENumber` | OEM brojevi | - |
| `VehicleBrand` | Marke vozila | `externalId` → manufacturers.id |
| `VehicleModel` | Modeli vozila | `externalId` → models.id |
| `VehicleGeneration` | Generacije | `externalId` → passengercars.internalID |
| `VehicleEngine` | Motori | `externalId` → engines.id |
| `ProductVehicleFitment` | Veze proizvod-vozilo | - |

#### Schema

```sql
-- Product
CREATE TABLE "Product" (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    "catalogNumber" TEXT,
    "oemNumber" TEXT,
    "eanCode" TEXT,
    "tecdocArticleId" TEXT,  -- → TecDoc articles.id
    "technicalSpecs" JSONB,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- ArticleOENumber
CREATE TABLE "ArticleOENumber" (
    id TEXT PRIMARY KEY,
    "productId" TEXT REFERENCES "Product"(id),
    "oemNumber" TEXT NOT NULL,
    manufacturer TEXT,  -- ⭐ Ključno za OEM filtering!
    "referenceType" TEXT,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW(),
    UNIQUE ("productId", "oemNumber")
);

-- VehicleBrand
CREATE TABLE "VehicleBrand" (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    "externalId" TEXT,  -- → TecDoc manufacturers.id
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- VehicleModel
CREATE TABLE "VehicleModel" (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    "brandId" TEXT REFERENCES "VehicleBrand"(id),
    "externalId" TEXT,  -- → TecDoc models.id
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW(),
    UNIQUE ("brandId", slug)
);

-- VehicleGeneration
CREATE TABLE "VehicleGeneration" (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    "modelId" TEXT REFERENCES "VehicleModel"(id),
    "yearFrom" INTEGER,
    "yearTo" INTEGER,
    "externalId" TEXT,  -- → TecDoc passengercars.internalID
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- VehicleEngine
CREATE TABLE "VehicleEngine" (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    "generationId" TEXT REFERENCES "VehicleGeneration"(id),
    "externalId" TEXT,  -- → TecDoc engines.id
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- ProductVehicleFitment
CREATE TABLE "ProductVehicleFitment" (
    id TEXT PRIMARY KEY,
    "productId" TEXT REFERENCES "Product"(id),
    "engineId" TEXT REFERENCES "VehicleEngine"(id),
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW(),
    UNIQUE ("productId", "engineId")
);
```

#### Indexes

```sql
-- Product indexes
CREATE INDEX idx_product_tecdoc ON "Product"("tecdocArticleId");
CREATE INDEX idx_product_catalog ON "Product"("catalogNumber");
CREATE INDEX idx_product_ean ON "Product"("eanCode");

-- OEM indexes
CREATE INDEX idx_oem_product ON "ArticleOENumber"("productId");
CREATE INDEX idx_oem_manufacturer ON "ArticleOENumber"(manufacturer);

-- Vehicle indexes
CREATE INDEX idx_brand_external ON "VehicleBrand"("externalId");
CREATE INDEX idx_model_brand ON "VehicleModel"("brandId");
CREATE INDEX idx_model_external ON "VehicleModel"("externalId");
CREATE INDEX idx_generation_model ON "VehicleGeneration"("modelId");
CREATE INDEX idx_generation_external ON "VehicleGeneration"("externalId");
CREATE INDEX idx_engine_generation ON "VehicleEngine"("generationId");
CREATE INDEX idx_engine_external ON "VehicleEngine"("externalId");

-- Fitment indexes
CREATE INDEX idx_fitment_product ON "ProductVehicleFitment"("productId");
CREATE INDEX idx_fitment_engine ON "ProductVehicleFitment"("engineId");
CREATE INDEX idx_fitment_created ON "ProductVehicleFitment"("createdAt");
```

---

## 🔄 Data Flow

### 1. Product Enrichment Flow

```
User Product
    ↓
┌─────────────────────────────────────┐
│ 1. Product Matching                 │
│    - EAN exact match (100%)         │
│    - Catalog exact (95%)            │
│    - Catalog normalized (85%)       │
│    - OEM exact (80%)                │
│    - OEM normalized (70%)           │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ 2. Data Extraction (TecDoc)         │
│    - EAN codes                      │
│    - OEM numbers + manufacturers ⭐ │
│    - Technical specs (JSONB)        │
│    - Vehicles (via CurrentProduct)  │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ 3. Database Update (Postgres)       │
│    - Product.tecdocArticleId        │
│    - Product.eanCode                │
│    - Product.technicalSpecs         │
│    - ArticleOENumber records        │
└─────────────────────────────────────┘
```

### 2. Vehicle Linking Flow

```
Product (with tecdocArticleId)
    ↓
┌─────────────────────────────────────┐
│ 1. Get OEM Manufacturers            │
│    FROM ArticleOENumber             │
│    WHERE productId = ?              │
│    → ['BMW'], ['VAG'], etc.         │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ 2. Map to Allowed Brands            │
│    BMW → [BMW, MINI, ROLLS-ROYCE]  │
│    VAG → [VW, AUDI, SEAT, SKODA...] │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ 3. Get Vehicles (TecDoc)            │
│    WITH OEM FILTER IN SQL:          │
│    WHERE mf.Description IN (...)    │
│    LIMIT 200                        │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ 4. Validate Vehicle Count           │
│    - Total vehicles <= 200          │
│    - Brands <= 3                    │
│    - Models <= 25                   │
│    - Generations <= 200             │
│    - Engines/gen <= 15              │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ 5. Create/Update Entities           │
│    - VehicleBrand (get or create)   │
│    - VehicleModel (get or create)   │
│    - VehicleGeneration (get or...)  │
│    - VehicleEngine (get or create)  │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ 6. Create Fitments                  │
│    INSERT INTO ProductVehicleFitment│
│    (productId, engineId)            │
│    ON CONFLICT DO NOTHING           │
└─────────────────────────────────────┘
```

---

## 🧩 Key Algorithms

### 1. Multi-Level Matching Algorithm

```python
def advanced_match(catalog: str, oem: str, ean: str) -> MatchResult:
    """
    5-level matching strategy sa confidence scores
    """

    # Level 0: EAN Exact (100% confidence)
    if ean:
        article_id = find_by_ean_exact(ean)
        if article_id:
            return MatchResult(article_id, 100, "ean_exact")

    # Level 1: Catalog Exact (95% confidence)
    article_id = find_by_catalog_exact(catalog)
    if article_id:
        return MatchResult(article_id, 95, "catalog_exact")

    # Level 2: Catalog Normalized (85% confidence)
    normalized = normalize_catalog(catalog)  # Remove spaces, dashes, etc.
    article_id = find_by_catalog_normalized(normalized)
    if article_id:
        return MatchResult(article_id, 85, "catalog_normalized")

    # Level 3: OEM Exact (80% confidence)
    if oem:
        article_id = find_by_oem_exact(oem)
        if article_id:
            return MatchResult(article_id, 80, "oem_exact")

    # Level 4: OEM Normalized (70% confidence)
    if oem:
        variants = normalize_oem(oem)  # Handle 'A' prefix variants
        for variant in variants:
            article_id = find_by_oem_normalized(variant)
            if article_id:
                return MatchResult(article_id, 70, "oem_normalized")

    # Not found
    return MatchResult(None, 0, "not_found")
```

### 2. OEM Filtering Algorithm

```python
def get_allowed_vehicle_brands(oem_manufacturers: List[str]) -> List[str]:
    """
    Mapira OEM manufacturers na dozvoljene vehicle brands
    """

    MANUFACTURER_GROUPS = {
        'VW': ['VOLKSWAGEN', 'VW', 'AUDI', 'SEAT', 'SKODA', ...],
        'BMW': ['BMW', 'MINI', 'ROLLS-ROYCE'],
        'DAIMLER': ['MERCEDES-BENZ', 'MERCEDES', 'SMART', 'MAYBACH'],
        ...
    }

    allowed_brands = set()

    for oem_mfr in oem_manufacturers:
        oem_upper = oem_mfr.upper()

        # Nađi grupu kojoj pripada
        for group_name, brands in MANUFACTURER_GROUPS.items():
            if oem_upper in brands:
                # Dodaj SVE brendove iz iste grupe
                allowed_brands.update([b.upper() for b in brands])
                break
        else:
            # Ako nije u grupi, dodaj samo tog proizvođača
            allowed_brands.add(oem_upper)

    return list(allowed_brands)
```

**Primjer**:
```python
oem_manufacturers = ['BMW']
allowed_brands = get_allowed_vehicle_brands(oem_manufacturers)
# → ['BMW', 'MINI', 'ROLLS-ROYCE']

oem_manufacturers = ['VAG']
allowed_brands = get_allowed_vehicle_brands(oem_manufacturers)
# → ['VOLKSWAGEN', 'VW', 'AUDI', 'SEAT', 'SKODA', 'ŠKODA',
#    'PORSCHE', 'BENTLEY', 'LAMBORGHINI', 'BUGATTI', 'VAG']
```

### 3. Vehicle Filtering in SQL

```python
def get_vehicles_from_tecdoc(tecdoc_article_id: int,
                             limit: int = 200,
                             allowed_brands: List[str] = None):
    """
    Izvuci vozila sa OEM filteringom U SQL upitu (PRE LIMIT-a!)
    """

    # Get CurrentProduct
    product_id = get_current_product(tecdoc_article_id)

    # Build WHERE clause
    manufacturer_filter = ""
    params = [product_id]

    if allowed_brands:
        placeholders = ', '.join(['%s'] * len(allowed_brands))
        manufacturer_filter = f" AND mf.Description IN ({placeholders})"
        params.extend(allowed_brands)

    params.append(limit)

    # Query sa filteringom PRE LIMIT-a
    query = f"""
        SELECT DISTINCT
            mf.Description as manufacturer_name,
            m.Description as model_name,
            pc.Description as vehicle_name,
            e.Description as engine_desc,
            ...
        FROM tree_node_products tnp
        JOIN passengercars pc ON tnp.itemId = pc.internalID
        JOIN models m ON pc.Model = m.id
        JOIN manufacturers mf ON m.ManufacturerId = mf.id
        JOIN passengercars_link_engines ple ON pc.id = ple.car_id
        JOIN engines e ON ple.engine_id = e.id
        WHERE tnp.product_id = %s
          AND tnp.valid_state = 1
          AND e.id IS NOT NULL
          {manufacturer_filter}  ← FILTRIRANJE PRE LIMIT-a!
        ORDER BY mf.Description, m.Description, year_from
        LIMIT %s
    """

    cursor.execute(query, tuple(params))
    return cursor.fetchall()
```

**Ključ**: Filtriranje u SQL PRE LIMIT-a osigurava da dobijamo prvih 200 vozila **IZ DOZVOLJENIH MARKI**, a ne prvih 200 abecedno (što bi bilo ABARTH, ACURA, ALFA ROMEO...).

### 4. Get-or-Create Pattern

```python
def get_or_create_model(brand_id: str,
                        tecdoc_model_name: str,
                        tecdoc_model_id: int) -> str:
    """
    Get ili create model sa caching
    """

    # 1. Check cache
    cache_key = f"{brand_id}_{tecdoc_model_id}"
    if cache_key in self.model_cache:
        return self.model_cache[cache_key]

    # 2. Try to find by externalId (TecDoc ID)
    cursor.execute("""
        SELECT id FROM "VehicleModel"
        WHERE "brandId" = %s AND "externalId" = %s
    """, (brand_id, str(tecdoc_model_id)))

    result = cursor.fetchone()
    if result:
        model_id = result[0]
        self.model_cache[cache_key] = model_id
        return model_id

    # 3. Try to find by name
    cursor.execute("""
        SELECT id FROM "VehicleModel"
        WHERE "brandId" = %s AND LOWER(name) = LOWER(%s)
    """, (brand_id, tecdoc_model_name))

    result = cursor.fetchone()
    if result:
        model_id = result[0]

        # Update externalId if missing
        cursor.execute("""
            UPDATE "VehicleModel"
            SET "externalId" = %s
            WHERE id = %s
        """, (str(tecdoc_model_id), model_id))

        self.model_cache[cache_key] = model_id
        return model_id

    # 4. Create new model
    slug = create_slug(tecdoc_model_name)

    cursor.execute("""
        INSERT INTO "VehicleModel"
        (id, name, slug, "brandId", "externalId", "createdAt", "updatedAt")
        VALUES
        (gen_random_uuid()::text, %s, %s, %s, %s, NOW(), NOW())
        ON CONFLICT ("brandId", slug) DO UPDATE
        SET "externalId" = EXCLUDED."externalId"
        RETURNING id
    """, (tecdoc_model_name, slug, brand_id, str(tecdoc_model_id)))

    model_id = cursor.fetchone()[0]
    self.model_cache[cache_key] = model_id

    return model_id
```

**Prednosti**:
- Izbjegava duplikate
- Brzo (caching)
- Ažurira externalId ako postoji po imenu
- Thread-safe (u single-threaded kontekstu)

---

## 📊 Performance Characteristics

### Query Performance

| Operacija | Bez Indexa | Sa Indexom | Improvement |
|-----------|------------|------------|-------------|
| Find by tecdocArticleId | ~500ms | ~5ms | 100x |
| Find by catalogNumber | ~300ms | ~3ms | 100x |
| Find by externalId | ~200ms | ~2ms | 100x |
| Get OEM manufacturers | ~100ms | ~1ms | 100x |

### Batch Processing Performance

| Batch Size | Vrijeme (DRY RUN) | Vrijeme (LIVE) | DB Writes |
|-----------|-------------------|----------------|-----------|
| 10 products | ~30s | ~45s | ~500 |
| 50 products | ~2.5min | ~4min | ~2,500 |
| 100 products | ~5min | ~8min | ~5,000 |
| 500 products | ~25min | ~40min | ~25,000 |

**Bottleneck**: TecDoc MySQL queries (~80% vremena)

### Memory Usage

| Operacija | RAM Usage |
|-----------|-----------|
| Product Enrichment (100) | ~150MB |
| Vehicle Linking (100) | ~200MB |
| Full Batch (1000) | ~500MB |

**Cache Impact**: ~50MB per 1000 products (brand/model/generation cache)

---

## 🔒 Security & Data Integrity

### SQL Injection Protection

```python
# ✅ GOOD - Parametrizirani upiti
cursor.execute("SELECT * FROM articles WHERE id = %s", (article_id,))

# ❌ BAD - String interpolation
cursor.execute(f"SELECT * FROM articles WHERE id = {article_id}")
```

Svi upiti koriste **parametrizirane queries** (`%s` placeholders).

### Transaction Management

```python
# Enrichment - commit po proizvodu
for product in products:
    process_product(product)
    self.postgres_conn.commit()  # Commit ako uspije
    # Rollback ako padne

# Vehicle Linking - commit po fitment batch-u
for product in products:
    fitments = create_fitments(product)
    self.postgres_conn.commit()  # Sve ili ništa
```

### Data Validation

```python
# Validation prije insert-a
def validate_vehicle_count(vehicles: List[Dict], product_name: str) -> bool:
    vehicle_count = len(vehicles)
    unique_brands = len(set(v['manufacturer_name'] for v in vehicles))
    unique_models = len(set((v['manufacturer_name'], v['model_name']) for v in vehicles))
    unique_generations = len(set(v['vehicle_internal_id'] for v in vehicles))

    # Provjere
    if vehicle_count > MAX_VEHICLES_PER_PRODUCT:
        return False
    if unique_brands > MAX_BRANDS:
        return False
    if unique_models > MAX_MODELS:
        return False
    if unique_generations > MAX_GENERATIONS:
        return False

    return True
```

### Duplicate Prevention

```sql
-- Unique constraints
ALTER TABLE "ArticleOENumber"
ADD CONSTRAINT unique_product_oem
UNIQUE ("productId", "oemNumber");

ALTER TABLE "ProductVehicleFitment"
ADD CONSTRAINT unique_product_engine
UNIQUE ("productId", "engineId");

-- ON CONFLICT u insert-ima
INSERT INTO "ProductVehicleFitment" (...)
VALUES (...)
ON CONFLICT ("productId", "engineId") DO NOTHING;
```

---

## 🧪 Testing & Quality Assurance

### Unit Test Queries

```sql
-- Test 1: Provjeri externalId mapping coverage
SELECT
    'Brands' as entity,
    COUNT(*) as total,
    COUNT("externalId") as with_external,
    ROUND(100.0 * COUNT("externalId") / COUNT(*), 2) as coverage_pct
FROM "VehicleBrand"
UNION ALL
SELECT 'Models', COUNT(*), COUNT("externalId"),
       ROUND(100.0 * COUNT("externalId") / COUNT(*), 2)
FROM "VehicleModel"
UNION ALL
SELECT 'Generations', COUNT(*), COUNT("externalId"),
       ROUND(100.0 * COUNT("externalId") / COUNT(*), 2)
FROM "VehicleGeneration"
UNION ALL
SELECT 'Engines', COUNT(*), COUNT("externalId"),
       ROUND(100.0 * COUNT("externalId") / COUNT(*), 2)
FROM "VehicleEngine";

-- Očekivano: 95%+ coverage
```

```sql
-- Test 2: Provjeri OEM manufacturer data quality
SELECT
    COUNT(DISTINCT p.id) as products_with_tecdoc,
    COUNT(DISTINCT CASE
        WHEN oem.manufacturer IS NOT NULL
        THEN p.id
    END) as products_with_oem_mfr,
    ROUND(100.0 *
        COUNT(DISTINCT CASE WHEN oem.manufacturer IS NOT NULL THEN p.id END) /
        COUNT(DISTINCT p.id),
    2) as coverage_pct
FROM "Product" p
LEFT JOIN "ArticleOENumber" oem ON oem."productId" = p.id
WHERE p."tecdocArticleId" IS NOT NULL;

-- Očekivano: 80%+ coverage
```

```sql
-- Test 3: Provjeri fitment quality (nema universal products)
SELECT p.name, COUNT(f.id) as fitment_count
FROM "Product" p
JOIN "ProductVehicleFitment" f ON f."productId" = p.id
GROUP BY p.id, p.name
HAVING COUNT(f.id) > 500  -- Sumnjivo!
ORDER BY fitment_count DESC;

-- Očekivano: 0 results (max 200 fitments po proizvodu)
```

### Integration Tests

```bash
# Test full pipeline
./test_pipeline.sh
```

```bash
#!/bin/bash
# test_pipeline.sh

echo "=== Integration Test ==="

# 1. Enrichment Test
echo "1. Testing Product Enrichment..."
python -c "
from tecdoc_advanced_enrichment import TecDocAdvancedEnricher
enricher = TecDocAdvancedEnricher()
enricher.run_batch(limit=5, filter_mode='has_tecdoc')
enricher.close()
"
if [ $? -ne 0 ]; then echo "FAIL: Enrichment"; exit 1; fi

# 2. Check OEM data
echo "2. Checking OEM data..."
psql -U emir_mw -d omerbasicdb -t -c "
SELECT COUNT(*) FROM \"ArticleOENumber\"
WHERE manufacturer IS NOT NULL
" | grep -q '[1-9]'
if [ $? -ne 0 ]; then echo "FAIL: No OEM data"; exit 1; fi

# 3. Vehicle Linking Test
echo "3. Testing Vehicle Linking..."
python -c "
from tecdoc_smart_vehicle_linking import SmartVehicleLinker
linker = SmartVehicleLinker()
linker.run_batch(limit=5, dry_run=True)
linker.close()
"
if [ $? -ne 0 ]; then echo "FAIL: Vehicle Linking"; exit 1; fi

echo "=== All Tests Passed ==="
```

---

## 📚 References

### TecDoc Documentation
- TecDoc Catalogue Structure: https://www.tecdoc.net
- API Documentation: Confidential
- Schema Version: 1Q2019

### External Libraries
- `psycopg2-binary`: PostgreSQL adapter
- `mysql-connector-python`: MySQL adapter
- Python 3.8+

### Internal Documentation
- `vehicle-linking-oem-filtering.md` - OEM filtering implementation
- `usage-guide.md` - User guide
- `technical-reference.md` - This document

---

**Kraj Dokumenta**
*Generirano: 2025-12-22*
*Verzija: 2.0*
