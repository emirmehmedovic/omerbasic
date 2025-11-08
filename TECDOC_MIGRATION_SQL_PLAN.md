# 🛠️ TECDOC MIGRATION - SQL PLAN I PRIMJERI

**Datum**: 8. novembar 2025.
**Cilj**: Detaljni SQL upiti i schema migrations za TecDoc integraciju

---

## 📋 SADRŽAJ

1. [Novi Prisma Schema](#novi-prisma-schema)
2. [Migration Upiti](#migration-upiti)
3. [Mapiranje Podataka](#mapiranje-podataka)
4. [Validacijske Provjere](#validacijske-provjere)
5. [Performance Optimization](#performance-optimization)

---

## 🔄 NOVI PRISMA SCHEMA

### 1. ArticleOENumber Model

```prisma
model ArticleOENumber {
  id                    String   @id @default(cuid())

  // Veza sa proizvodom
  productId             String
  product               Product  @relation(fields: [productId], references: [id], onDelete: Cascade)

  // OEM informacije
  oemNumber             String   // Primjer: "04E115561C"
  manufacturer          String?  // Primjer: "Audi", "VW", "Škoda"
  manufacturerId        String?  // FK ako trebamo precisnost

  // Tip reference
  isAdditive            Boolean  @default(false) // Opciono ili obavezno?
  referenceType         String?  // "Original", "Equivalent", "Compatible"
  referenceInformation  String?  @db.Text // Dodatni detalji

  // External tracking
  externalId            String?  @unique // TecDoc ID ako trebamo later
  tecdocArticleId       Int?     // Reference na article.id u TecDoc

  // Metadata
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  // Constraints
  @@unique([productId, oemNumber, manufacturer])
  @@index([oemNumber])
  @@index([productId])
  @@index([manufacturer])
}
```

**Migracija u Prisma**:
```bash
npx prisma migrate dev --name add_article_oe_numbers
```

### 2. ArticleEAN Model

```prisma
model ArticleEAN {
  id          String   @id @default(cuid())

  // Veza sa proizvodom
  productId   String
  product     Product  @relation(fields: [productId], references: [id], onDelete: Cascade)

  // EAN informacije
  ean         String   @unique // Primjer: "4011338054971"
  type        String?  // "EAN-13", "UPC-A", itd.

  // External tracking
  externalId  String?  // TecDoc ID
  tecdocId    Int?     // TecDoc article_ea_numbers.id

  // Metadata
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([ean])
  @@index([productId])
}
```

### 3. ProductBOMList Model

```prisma
model ProductBOMList {
  id                 String   @id @default(cuid())

  // Parent proizvod (što ima dijelove)
  parentProductId    String
  parentProduct      Product  @relation("BOMParent", fields: [parentProductId], references: [id], onDelete: Cascade)

  // Child proizvod (sastavnica)
  childProductId     String
  childProduct       Product  @relation("BOMChild", fields: [childProductId], references: [id], onDelete: Cascade)

  // BOM informacije
  sequenceId         Int      // Redoslijed montaže
  quantity           Int      // Koliko dijelova trebalo
  unit               String?  // "pieces", "set", itd.

  // Optional
  description        String?  @db.Text // Dodatni opis
  notes              String?  @db.Text // Napomene

  // External tracking
  externalId         String?
  tecdocId           Int?

  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  @@unique([parentProductId, childProductId])
  @@index([parentProductId])
  @@index([childProductId])
}
```

Trebalo bi ažurirati Product model:
```prisma
model Product {
  // ... existing fields ...

  // BOM relacije
  bomParent          ProductBOMList[] @relation("BOMParent")
  bomChildren        ProductBOMList[] @relation("BOMChild")

  // OEM relacije
  articleOENumbers   ArticleOENumber[]

  // EAN relacije
  articleEANs        ArticleEAN[]

  // Pictures
  mediaPictures      ProductPicture[]
}
```

### 4. ProductPicture Model

```prisma
model ProductPicture {
  id           String   @id @default(cuid())

  // Veza sa proizvodom
  productId    String
  product      Product  @relation(fields: [productId], references: [id], onDelete: Cascade)

  // Slika info
  url          String   // URL na CDN ili TecDoc
  alt          String?  // Alt text za SEO
  title        String?  // Human-readable naziv
  sortOrder    Int      @default(0)

  // Media type
  mediaType    String   // "image/jpeg", "image/png", "application/pdf"
  documentType String?  // "Product Photo", "Installation Manual", itd.

  // TecDoc metadata
  externalId   String?
  tecdocName   String?  // Originalni naziv u TecDoc-u

  // Settings
  isPrimary    Boolean  @default(false) // Glavna slika za proizvod
  isPublished  Boolean  @default(true)

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([productId])
  @@index([sortOrder])
}
```

### 5. VehicleVariant Model (Prošireni)

```prisma
model VehicleVariant {
  id                 String   @id @default(cuid())

  // Veza sa generacijom
  generationId       String
  generation         VehicleGeneration @relation(fields: [generationId], references: [id], onDelete: Cascade)

  // Verzija specificnosti
  bodyStyle          String?  // "Sedan", "Avant", "Coupe", itd.
  doors              Int?     // 2, 3, 4, 5
  wheelDrive         String?  // "FWD", "RWD", "AWD"
  transmission       String?  // "Manual", "Automatic", "CVT"

  // Motori specifični za ovu varijantu
  engines            String[] // Engine kodovi koji dolaze sa ovom varijantom
  fuelTypes          String[] // "Petrol", "Diesel", "Hybrid", itd.

  // Specifične godine (granularnije od generacije)
  productionStartMonth  Int?
  productionStartYear   Int?
  productionEndMonth    Int?
  productionEndYear     Int?

  // Posebne opcije
  specialEquipment   String[] // "ABS", "ASR", "ESP", itd.

  // Metadata
  externalId         String?
  tecdocInternalId   String?  // PassengerCars.InternalID iz TecDoc-a

  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  @@unique([generationId, bodyStyle, doors])
  @@index([generationId])
}
```

### 6. SupplierAddress Model (Prošireni)

```prisma
model SupplierAddress {
  id                 String   @id @default(cuid())

  // Veza sa dobavljačem
  supplierId         String
  supplier           Supplier @relation(fields: [supplierId], references: [id], onDelete: Cascade)

  // Adresa info
  name               String   // Primjer: "Hengst Filter SE - Technical Support"
  street             String?
  city               String?
  postalCode         String?
  country            String?

  // Kontakt
  telephone          String?
  email              String?
  website            String?
  fax                String?

  // Tip adrese
  addressType        String   // "Business", "Technical", "Billing", "Shipping"
  isPrimary          Boolean  @default(false)

  // Metadata
  externalId         String?
  tecdocId           Int?

  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  @@index([supplierId])
  @@index([addressType])
}
```

Trebalo bi ažurirati Supplier model:
```prisma
model Supplier {
  // ... existing fields ...

  // Nove relacije
  addresses          SupplierAddress[]

  // TecDoc metadata
  tecdocId           Int?
  nbrOfArticles      Int? // Koliko dijelova pruža ovaj dobavljač
}
```

---

## 📊 MIGRATION UPITI

### Korak 1: Kreiraj staging tabele

```sql
-- Kreiraj staging tabele za TecDoc podatke
CREATE TABLE tecdoc_staging.articles (
  id INT PRIMARY KEY,
  DataSupplierArticleNumber VARCHAR(50) UNIQUE,
  Supplier INT,
  NormalizedDescription TEXT,
  CurrentProduct INT,
  IsValid TINYINT
);

CREATE TABLE tecdoc_staging.article_oe_numbers (
  id INT PRIMARY KEY,
  article_id INT,
  OENbr VARCHAR(50),
  Manufacturer INT,
  IsAdditive TINYINT,
  ReferenceInformation TEXT,
  FOREIGN KEY (article_id) REFERENCES articles(id)
);

CREATE TABLE tecdoc_staging.article_ea_numbers (
  id INT PRIMARY KEY,
  article_id INT,
  EAN VARCHAR(50),
  FOREIGN KEY (article_id) REFERENCES articles(id)
);

CREATE TABLE tecdoc_staging.article_parts_list (
  id INT PRIMARY KEY,
  article_id INT,
  Article VARCHAR(50),
  Supplier INT,
  SequenceID INT,
  Quantity INT,
  FOREIGN KEY (article_id) REFERENCES articles(id)
);

CREATE TABLE tecdoc_staging.products (
  ID INT PRIMARY KEY,
  Description TEXT,
  NormalizedDescription TEXT,
  AssemblyGroupDescription TEXT
);

CREATE TABLE tecdoc_staging.manufacturers (
  id INT PRIMARY KEY,
  Description VARCHAR(100)
);

CREATE TABLE tecdoc_staging.suppliers (
  id INT PRIMARY KEY,
  Description VARCHAR(100),
  Matchcode VARCHAR(50)
);

CREATE TABLE tecdoc_staging.suppliers_address (
  id INT PRIMARY KEY,
  supplier_id INT,
  Name1 VARCHAR(100),
  Street VARCHAR(100),
  City VARCHAR(100),
  PostalCode VARCHAR(20),
  PostalCountryCode VARCHAR(2),
  Telephone VARCHAR(20),
  EMail VARCHAR(100),
  Homepage VARCHAR(255)
);
```

### Korak 2: Importa podaci

```sql
-- Importa iz CSV fajlova (ako su dostupni)
LOAD DATA INFILE '/path/to/articles.csv'
INTO TABLE tecdoc_staging.articles
FIELDS TERMINATED BY ','
LINES TERMINATED BY '\n'
IGNORE 1 ROWS;

-- ... slično za ostale tabele
```

### Korak 3: Kreiraj mapiranje između TecDoc i naših proizvoda

```sql
-- Kreiraj mapiranje tabelu
CREATE TABLE product_mapping (
  our_product_id VARCHAR(50) PRIMARY KEY,
  tecdoc_product_id INT,
  mapping_confidence FLOAT, -- 0-100%
  mapping_method VARCHAR(50), -- "automatic", "manual", "fuzzy"
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Automatska mapiranja (fuzzy match po nazivu)
INSERT INTO product_mapping (our_product_id, tecdoc_product_id, mapping_confidence, mapping_method)
SELECT
  p.id,
  ts.ID,
  ROUND(100 * (
    CASE
      WHEN p.name = ts.Description THEN 1.0
      WHEN LOWER(p.name) = LOWER(ts.Description) THEN 0.95
      WHEN LOWER(p.name) LIKE CONCAT('%', LOWER(ts.NormalizedDescription), '%') THEN 0.85
      ELSE 0
    END
  ), 2) as confidence,
  'automatic'
FROM omerbasic.products p
LEFT JOIN tecdoc_staging.products ts
WHERE ROUND(100 * (...), 2) >= 80
ORDER BY confidence DESC;

-- Ručna mapiranja trebaju biti ažurirana
-- UPDATE product_mapping SET mapping_method = 'manual' WHERE ...
```

### Korak 4: Importa OEM brojeve

```sql
-- Kreiraj ArticleOENumber entije
INSERT INTO article_oe_numbers (
  id, productId, oemNumber, manufacturer, referenceType,
  tecdocArticleId, createdAt, updatedAt
)
SELECT
  CONCAT(pm.our_product_id, '_', aon.OENbr),
  pm.our_product_id,
  aon.OENbr,
  tm.Description,
  'Original',
  aon.article_id,
  NOW(),
  NOW()
FROM tecdoc_staging.article_oe_numbers aon
JOIN tecdoc_staging.articles a ON aon.article_id = a.id
JOIN product_mapping pm ON a.CurrentProduct = pm.tecdoc_product_id
JOIN tecdoc_staging.manufacturers tm ON aon.Manufacturer = tm.id
WHERE pm.mapping_confidence >= 80
  AND aon.OENbr IS NOT NULL
  AND aon.OENbr != '';

-- Provjera koliko smo importali
SELECT COUNT(*) as imported_oem_numbers FROM article_oe_numbers;
-- Trebalo bi biti minimalno 20M (od 23.6M)
```

### Korak 5: Importa EAN kodove

```sql
-- Kreiraj ArticleEAN entije
INSERT INTO article_eans (
  id, productId, ean, tecdocId, createdAt, updatedAt
)
SELECT
  CONCAT(pm.our_product_id, '_EAN_', aen.EAN),
  pm.our_product_id,
  aen.EAN,
  aen.id,
  NOW(),
  NOW()
FROM tecdoc_staging.article_ea_numbers aen
JOIN tecdoc_staging.articles a ON aen.article_id = a.id
JOIN product_mapping pm ON a.CurrentProduct = pm.tecdoc_product_id
WHERE pm.mapping_confidence >= 80
  AND aen.EAN IS NOT NULL
  AND aen.EAN != '';

-- Provjera
SELECT COUNT(*) as imported_eans FROM article_eans;
-- Trebalo bi biti minimalno 3M (od 3.6M)
```

### Korak 6: Importa Parts List (BOM)

```sql
-- Kreiraj ProductBOMList entije
INSERT INTO product_bom_lists (
  id, parentProductId, childProductId, sequenceId, quantity,
  description, tecdocId, createdAt, updatedAt
)
SELECT
  CONCAT(pm1.our_product_id, '_BOM_', apl.id),
  pm1.our_product_id,  -- Parent proizvod
  pm2.our_product_id,  -- Child proizvod
  apl.SequenceID,
  apl.Quantity,
  CONCAT('TecDoc ID: ', apl.article_id),
  apl.id,
  NOW(),
  NOW()
FROM tecdoc_staging.article_parts_list apl
JOIN tecdoc_staging.articles a1 ON apl.article_id = a1.id
JOIN tecdoc_staging.articles a2 ON CONCAT(apl.Supplier, '_', apl.Article) = CONCAT(a2.Supplier, '_', a2.DataSupplierArticleNumber)
JOIN product_mapping pm1 ON a1.CurrentProduct = pm1.tecdoc_product_id
JOIN product_mapping pm2 ON a2.CurrentProduct = pm2.tecdoc_product_id
WHERE pm1.mapping_confidence >= 80
  AND pm2.mapping_confidence >= 80
  AND pm1.our_product_id != pm2.our_product_id;

-- Provjera
SELECT COUNT(*) as imported_bom FROM product_bom_lists;
-- Trebalo bi biti minimalno 2M (od 2.3M)
```

### Korak 7: Dodaj root kategorije (36)

```sql
-- Kreiraj 36 root kategorija
INSERT INTO categories (id, name, parentId, level) VALUES
  (CONCAT('root_', UUID()), 'Brake System', NULL, 1),
  (CONCAT('root_', UUID()), 'Axle Mounting / Steering / Wheels', NULL, 1),
  (CONCAT('root_', UUID()), 'Wheel Drive', NULL, 1),
  (CONCAT('root_', UUID()), 'Exhaust System', NULL, 1),
  (CONCAT('root_', UUID()), 'Air Conditioning', NULL, 1),
  (CONCAT('root_', UUID()), 'Engine', NULL, 1),
  (CONCAT('root_', UUID()), 'Wheels / Tyres', NULL, 1),
  (CONCAT('root_', UUID()), 'Clutch / Parts', NULL, 1),
  (CONCAT('root_', UUID()), 'Belt Drive', NULL, 1),
  (CONCAT('root_', UUID()), 'Steering', NULL, 1),
  -- ... nastavak za svih 36 kategorija
  (CONCAT('root_', UUID()), 'Security Systems', NULL, 1);

-- Provjera
SELECT COUNT(*) as root_categories FROM categories WHERE parentId IS NULL;
-- Trebalo bi biti 36 (ako su bile postojeće, trebalo bi provjeriti dupliciranja)
```

---

## ✅ VALIDACIJSKE PROVJERE

### Provjera 1: OEM Numbers

```sql
-- Provjera OEM mapiranja
SELECT
  COUNT(*) as total_oem,
  COUNT(DISTINCT productId) as products_with_oem,
  COUNT(DISTINCT manufacturer) as unique_manufacturers,
  MIN(LENGTH(oemNumber)) as shortest_oem,
  MAX(LENGTH(oemNumber)) as longest_oem
FROM article_oe_numbers;

-- Trebalo bi:
-- total_oem: ~20M+
-- products_with_oem: ~2M+
-- unique_manufacturers: 50+
```

### Provjera 2: EAN Numbers

```sql
-- Provjera EAN kodova
SELECT
  COUNT(*) as total_eans,
  COUNT(DISTINCT productId) as products_with_ean,
  COUNT(DISTINCT ean) as unique_eans,
  SUM(CASE WHEN LENGTH(ean) = 13 THEN 1 ELSE 0 END) as ean13_count,
  SUM(CASE WHEN LENGTH(ean) = 12 THEN 1 ELSE 0 END) as ean12_count
FROM article_eans;

-- Trebalo bi:
-- total_eans: ~3M
-- products_with_ean: ~1.5M
-- unique_eans: ~3M
```

### Provjera 3: Product Coverage

```sql
-- Koliko proizvoda ima OEM ili EAN?
SELECT
  COUNT(p.id) as total_products,
  COUNT(DISTINCT CASE WHEN aon.id IS NOT NULL THEN p.id END) as products_with_oem,
  COUNT(DISTINCT CASE WHEN ae.id IS NOT NULL THEN p.id END) as products_with_ean,
  COUNT(DISTINCT CASE WHEN aon.id IS NOT NULL OR ae.id IS NOT NULL THEN p.id END) as products_with_any
FROM products p
LEFT JOIN article_oe_numbers aon ON p.id = aon.productId
LEFT JOIN article_eans ae ON p.id = ae.productId;

-- Trebalo bi biti minimalno 70% pokrivanja
```

### Provjera 4: Duplicirane OEM brojeve

```sql
-- Pronađi producte sa duplikatima
SELECT
  productId,
  oemNumber,
  COUNT(*) as count
FROM article_oe_numbers
GROUP BY productId, oemNumber
HAVING COUNT(*) > 1
LIMIT 20;

-- Trebalo bi biti 0 (zbog UNIQUE constraint)
```

---

## 🚀 PERFORMANCE OPTIMIZATION

### Indexi za brzu pretragu

```sql
-- OEM broj pretraga
CREATE INDEX idx_article_oe_numbers_oem ON article_oe_numbers(oemNumber);
CREATE INDEX idx_article_oe_numbers_product ON article_oe_numbers(productId);
CREATE INDEX idx_article_oe_numbers_manufacturer ON article_oe_numbers(manufacturer);

-- EAN pretraga
CREATE INDEX idx_article_eans_ean ON article_eans(ean);
CREATE INDEX idx_article_eans_product ON article_eans(productId);

-- BOM struktura
CREATE INDEX idx_bom_parent ON product_bom_lists(parentProductId);
CREATE INDEX idx_bom_child ON product_bom_lists(childProductId);

-- Vehicle Variant
CREATE INDEX idx_variant_generation ON vehicle_variants(generationId);
CREATE INDEX idx_variant_body_style ON vehicle_variants(bodyStyle);
CREATE INDEX idx_variant_years ON vehicle_variants(productionStartYear, productionEndYear);

-- Supplier Address
CREATE INDEX idx_supplier_address_type ON supplier_addresses(addressType);
CREATE INDEX idx_supplier_address_supplier ON supplier_addresses(supplierId);
```

### Query Optimization - Primjeri

```sql
-- LOŠA: JOINa sve i caches se ne koristi
SELECT p.*, aon.*, ae.*
FROM products p
LEFT JOIN article_oe_numbers aon ON p.id = aon.productId
LEFT JOIN article_eans ae ON p.id = ae.productId
WHERE p.id = ?;

-- DOBRA: Razdvojeni upiti sa caching-om
SELECT * FROM products WHERE id = ?;
SELECT * FROM article_oe_numbers WHERE productId = ? LIMIT 10;
SELECT * FROM article_eans WHERE productId = ?;

-- DOBRA: Redis cache
CACHE_KEY = "product:{id}:oem_numbers"
TTL = 3600 (1 sat)
```

### Caching Strategy

```javascript
// src/lib/cache.ts
import Redis from 'redis';

const redis = new Redis();

export async function getProductOENumbers(productId: string) {
  const cacheKey = `product:${productId}:oem_numbers`;

  // Provjeri cache
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // Dohvati iz baze
  const oems = await db.articleOENumber.findMany({
    where: { productId },
    take: 10, // Top 10 OEM brojeva
  });

  // Spremi u cache
  await redis.setex(cacheKey, 3600, JSON.stringify(oems));

  return oems;
}

export async function invalidateProductCache(productId: string) {
  await redis.del(`product:${productId}:oem_numbers`);
  await redis.del(`product:${productId}:eans`);
  await redis.del(`product:${productId}:bom`);
}
```

---

## 🔄 DATA FRESHNESS STRATEGY

### Monthly Update Script

```javascript
// scripts/update-tecdoc-data.ts
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function updateTecDocData() {
  console.log('Starting TecDoc data update...');

  try {
    // 1. Update OEM numbers (ako je dostupan novi CSV)
    await importOEMNumbers('latest-oem-numbers.csv');
    console.log('✓ OEM numbers updated');

    // 2. Update supplier contact info
    await updateSupplierInfo();
    console.log('✓ Supplier info updated');

    // 3. Invalidate all caches
    await invalidateAllCaches();
    console.log('✓ Caches invalidated');

    console.log('✓ TecDoc data update complete!');
  } catch (error) {
    console.error('✗ TecDoc update failed:', error);
    // Alert team
  }
}

async function importOEMNumbers(csvPath: string) {
  // CSV parsing logika
  // ...
}

async function updateSupplierInfo() {
  // Update supplier email, phone, itd.
  // ...
}

async function invalidateAllCaches() {
  const redis = new Redis();
  const cursor = 0;

  // Invalidate sve product caches
  let result;
  do {
    result = await redis.scan(cursor, 'MATCH', 'product:*');
    const keys = result[1];
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } while (result[0] !== '0');
}

updateTecDocData().catch(console.error);
```

---

## 📋 MIGRATION CHECKLIST

- [ ] **Pre-migration**
  - [ ] Backup postojeće baze
  - [ ] Create dev/staging environment
  - [ ] Test sa malim dataset-om (1000 redaka)

- [ ] **Migration Steps**
  - [ ] Kreiraj Prisma schema
  - [ ] Runa `prisma migrate` za nove tablice
  - [ ] Kreiraj staging tablice u TecDoc bazi
  - [ ] Import TecDoc podatke u staging
  - [ ] Kreiraj product mapping
  - [ ] Import OEM brojeve
  - [ ] Import EAN kodove
  - [ ] Import BOM strukture
  - [ ] Dodaj 36 root kategorija
  - [ ] Kreiraj indexi za performance

- [ ] **Validation**
  - [ ] Provjeri OEM brojeve (trebalo bi ~20M+)
  - [ ] Provjeri EAN kodove (trebalo bi ~3M)
  - [ ] Provjeri product coverage (trebalo bi 70%+)
  - [ ] Provjeri BOM strukture
  - [ ] Test queries za performance

- [ ] **Post-migration**
  - [ ] Update API endpointi
  - [ ] Update frontend komponente (OEM badges, itd.)
  - [ ] Setup caching
  - [ ] Setup monitoring
  - [ ] Deploy na production

---

**Dokument**: TECDOC_MIGRATION_SQL_PLAN.md
**Status**: Gotov za upotrebu
**Sljedeće**: Implementacija korak po korak
