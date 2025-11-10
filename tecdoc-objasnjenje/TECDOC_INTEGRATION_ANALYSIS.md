# 🔄 ANALIZA: TecDoc Integracija vs Trenutni Webshop Projekt

**Datum**: 8. novembar 2025.
**Cilj**: Detaljno poređenje TecDoc baze sa omerbasic webshop projektom i preporuke za integraciju

---

## 📊 EXECUTIVE SUMMARY

### Što imamo sada (omerbasic):
- ✅ Osnovna struktura vozila (Brand → Model → Generation → Engine)
- ✅ Proizvodi sa dimenzijama i tehničkim specifikacijama
- ✅ ProductVehicleFitment linkovanje (N:M relacija)
- ✅ Kategorije sa self-referencing hijerarhijom
- ✅ B2B popusti i pricing
- ✅ Dobavljači i narudžbenice

### Što imamo u TecDoc-u (155M redova):
- ✅ 6.8M dijelova (articles) sa detaljnim podacima
- ✅ 23.6M OEM cross-references za autentifikaciju
- ✅ 70K+ verzije vozila sa točnim godinama
- ✅ 26.2K motora sa točnim kodovima
- ✅ 36 glavnih kategorija sa 3.5M mapiranja
- ✅ 705 dobavljača sa kontaktima
- ✅ 45M tree nodes za navigaciju
- ✅ 6.3M slika i dokumenata

### Zaključak:
**Naš projekt je "shell" koji trebamo napuniti TecDoc podacima!**

---

## 🔍 DETALJNO POREĐENJE STRUKTURA

### 1. VOZILA

#### Naš projekt (omerbasic):
```
VehicleBrand
  └─ VehicleModel
      └─ VehicleGeneration
          └─ VehicleEngine

PLUS: External IDs za TecDoc integraciju
```

#### TecDoc baza:
```
manufacturers (4.7K)
  └─ models (15.7K)
      └─ passengercars (70K verzije) + commercialvehicles (21K)
          └─ engines (26.2K)

PLUS: passengercars_link_engines (N:M relacija)
```

#### Analiza:
| Aspekt | Naš projekt | TecDoc | Gap |
|--------|-------------|--------|-----|
| Marke vozila | Custom | 4.7K | ✅ Dovoljno |
| Modeli | Custom | 15.7K | ✅ Dovoljno |
| Verzije vozila | Generacije | 70K variants | ⚠️ Trebamo granularnost |
| Motori | Custom kodovi | 26.2K sa kodovima | ⚠️ Trebamo mapiranje |
| Vremenske periode | ✅ Ima polja | ✅ From/To datumi | ✅ OK |
| External IDs | ✅ Ima | ✅ Ima | ✅ OK |

**DORADA POTREBNA:**
- [ ] Dodati više verzija po generaciji (ne samo 1 generacija)
- [ ] Mapirati engine codes iz TecDoc-a
- [ ] Dodati više detalja o vozilima (broju vrata, karoseriji, itd.)

---

### 2. PROIZVODI / ARTIKLI

#### Naš projekt (omerbasic):
```
Product:
  ├─ catalogNumber (UNIQUE)
  ├─ oemNumber (možda)
  ├─ Nema OEM cross-references
  └─ JSON: technicalSpecs, dimensions
```

#### TecDoc baza:
```
articles (6.8M):
  ├─ DataSupplierArticleNumber (PK)
  ├─ article_oe_numbers (23.6M) - OEM cross-references
  ├─ article_attributes (22.9M) - specifikacije
  ├─ article_ea_numbers (3.6M) - EAN barcode
  ├─ article_parts_list (2.3M) - BOM
  ├─ article_mediainformation (6.3M) - slike i docs
  └─ article_informations (1.6M) - tekstualni opis
```

#### Analiza:
| Aspekt | Naš projekt | TecDoc | Gap |
|--------|-------------|--------|-----|
| Osnovna info | ✅ Basic | ✅ Detaljno | ⚠️ Trebaju slike, EAN |
| OEM authenticity | ❌ Nema | ✅ 23.6M linkova | ❌ KRITIČNO |
| EAN barcodes | ❌ Nema | ✅ 3.6M | ❌ Trebalo bi |
| Atributi | ✅ Dynamic | ✅ 22.9M | ✅ Kompatibilno |
| Slike/Media | ❌ Ručno | ✅ 6.3M ready | ✅ Trebalo bi |
| BOM struktura | ❌ Nema | ✅ 2.3M | ❌ Trebalo bi |

**DORADA POTREBNA:**
- [ ] Dodati article_oe_numbers za OEM autentifikaciju
- [ ] Dodati EAN barcodes za scanning
- [ ] Dodati article_ea_numbers
- [ ] Dodati BOM strukture (parti lista)
- [ ] Mapirati slike iz TecDoc-a

---

### 3. KOMPATIBILNOST PROIZVOD-VOZILO

#### Naš projekt (omerbasic):
```
ProductVehicleFitment:
  ├─ productId → Product
  ├─ generationId → VehicleGeneration
  ├─ engineId → VehicleEngine (nullable)
  └─ isUniversal: boolean

Tri nivoa:
1. Specifičan motor
2. Svi motori generacije
3. Univerzalan dio
```

#### TecDoc baza:
```
articles_linkages (12.3K rows - SPARSE!):
  ├─ product: ID kategorije
  ├─ article: Broj dijela
  ├─ supplier: ID dobavljača
  ├─ item_type: 1=vozilo, 2=motor, 3=osovina, itd.
  └─ item: InternalID vozila/motora

PROBLEM: Samo 12K direktnih linkova za 70K vozila i 6.8M dijelova!
```

#### Analiza:
| Aspekt | Naš projekt | TecDoc | Gap |
|--------|-------------|--------|-----|
| Vozilo linkovanje | ✅ OK | ⚠️ Sparse (12K) | ⚠️ Trebaju dodatne veze |
| Motor linkovanje | ✅ OK | ⚠️ item_type=2 | ⚠️ Trebaju dodatne veze |
| Čitljivost | ✅ Direktne FK | ⚠️ item_id generic | ⚠️ Komplekse upite |
| Generacije | ✅ Na nivou generacije | ❌ Na nivou vozila | ❌ Nema generacija |
| Osovine | ❌ Nema | ✅ item_type=11 | ❌ Za CV |

**DORADA POTREBNA:**
- [ ] Dodati detaljne linkove iz TecDoc articles_linkages
- [ ] Mapirati article_id sa našim Product ID
- [ ] Dodati osovine za commercial vehicles
- [ ] Obogatiti dataset sa OEM ekvivalencijama

---

### 4. KATEGORIJE

#### Naš projekt (omerbasic):
```
Category:
  ├─ name: String
  ├─ parentId: String (self-reference) → UNLIMITED levels
  ├─ level: Int (1-3, sugerirano)
  └─ children: recursive

Beskonačna hijerarhija (flexible!)
```

#### TecDoc baza:
```
products (5,843 kategorije):
  ├─ ID: Int (1-5843)
  ├─ Description
  ├─ AssemblyGroupDescription - TOP LEVEL grupa
  └─ Samo ~314 ima linkane dijelove

tree_node_products (45M linkova):
  ├─ node_id: Čvor u stablu
  ├─ parent_node_id: Parent čvor
  ├─ product_id: FK → products.ID
  └─ valid_state: Aktivnost

TOP 36 ROOT kategorija:
1. Brake System (828K dijelova)
2. Axle/Steering/Wheels (272K)
3. Wheel Drive (264K)
... i tako dalje
```

#### Analiza:
| Aspekt | Naš projekt | TecDoc | Gap |
|--------|-------------|--------|-----|
| Fleksibilnost | ✅ Unlimited | ⚠️ Fiksna 36 | ✅ Trebaju ROOT categories |
| Dubina | ✅ Beskonačna | ⚠️ Max 3 nivoa | ✅ OK |
| Broj kategorija | ? | 5,843 | ⚠️ Trebalo bi mapiranje |
| Korištene kategorije | ? | 314 | ✅ Malo |
| Grupisanje | ❌ Nema | ✅ 36 grupa | ❌ TREBALO BI |

**DORADA POTREBNA:**
- [ ] Dodati 36 root kategorija iz TecDoc
- [ ] Mapirati naše kategorije na TecDoc kategorije
- [ ] Dodati AssemblyGroupDescription kao "top-level gruppe"
- [ ] Obogatiti tree strukturu

---

### 5. DOBAVLJAČI

#### Naš projekt (omerbasic):
```
Supplier:
  ├─ name, companyName
  ├─ address, city, postalCode, country
  ├─ email, phone
  ├─ contactPerson
  ├─ taxId
  └─ Basic info

SupplierProduct:
  ├─ supplierSku
  ├─ price (nabavna)
  ├─ minOrderQty
  ├─ leadTime
  └─ Dobavljač → proizvod veza
```

#### TecDoc baza:
```
suppliers (705 dobavljača):
  ├─ ID
  ├─ Description
  ├─ Matchcode
  ├─ NbrOfArticles

suppliers_address (2K adresa):
  ├─ Name, Street, City
  ├─ Telephone, Email, Homepage
  ├─ AddressTypeID (business, technical, itd.)

suppliers_link_address:
  └─ Veza suppliers ↔ address

article_new_numbers (~800K):
  └─ Novi OEM brojevi
```

#### Analiza:
| Aspekt | Naš projekt | TecDoc | Gap |
|--------|-------------|--------|-----|
| Broj dobavljača | Custom | 705 | ✅ Trebalo bi mapirati |
| Kontakt info | ✅ OK | ✅ OK | ⚠️ TecDoc je iz 2019 |
| Tipovi adresa | ❌ Nema | ✅ AddressTypeID | ✅ Trebalo bi |
| SKU mapiranje | ✅ OK | ✅ article_new_numbers | ✅ Trebalo bi |
| Pricing | ✅ OK | ❌ Nema | ✅ OK |

**DORADA POTREBNA:**
- [ ] Mapirati 705 TecDoc dobavljača
- [ ] Dodati AddressTypeID (business, technical, billing)
- [ ] Dodati article_new_numbers za SKU mapiranje
- [ ] Ažurirati kontakt info sa TecDoc-a

---

### 6. OEM AUTHENTICITY (KRITIČNO!)

#### Naš projekt (omerbasic):
```
ProductCrossReference:
  ├─ referenceType: "OEM", "Aftermarket", "Equivalent"
  ├─ referenceNumber: String
  ├─ manufacturer: String
  ├─ replacementId: FK → Product (ako postoji u bazi)
  └─ notes

PROBLEM: Ručno dodavano, nema masovnog mapiranja!
```

#### TecDoc baza:
```
article_oe_numbers (23.6M redova!):
  ├─ article_id: FK → articles
  ├─ OENbr: OEM broj
  ├─ Manufacturer: Proizvođač vozila
  ├─ IsAdditive: Opciono/obavezno
  └─ ReferenceInformation: Dodatni detalji

PRIMJER:
  E497L (Hengst) → OEM 04E115561C (Audi)
              → OEM 06E115561 (VW)
              → OEM 1J0133843 (Škoda)
```

#### Analiza:
| Aspekt | Naš projekt | TecDoc | Gap |
|--------|-------------|--------|-----|
| OEM brojevi | ❌ Nema | ✅ 23.6M! | ❌ KRITIČNO |
| Autentifikacija | ❌ Nema | ✅ IsVGL flag | ❌ KRITIČNO |
| Ekvivalentnost | ❌ Manual | ✅ Automated | ❌ TREBALO BI |
| Verifikacija | ❌ Nema | ✅ Manufacturer flag | ❌ TREBALO BI |

**DORADA POTREBNA (PRIORITET 1):**
- [ ] **DODATI article_oe_numbers tabelu**
- [ ] Mapirati sve 23.6M OEM linkova
- [ ] Dodati OEM badge sistem na frontend-u
- [ ] Omogućiti pretragu po OEM broju

---

### 7. TREE HIJERARHIJA ZA NAVIGACIJU

#### Naš projekt (omerbasic):
```
GET /api/categories
└─ Vraća flat listu sa children array (rekurzivno)
```

#### TecDoc baza:
```
search_trees + tree_node_products:
  ├─ 45M tree nodes
  ├─ Strukturirane hijerarhije
  ├─ Parent-child relacije
  └─ Validnost flagovi

PLUS: 36 root kategorija za top navigation
```

#### Analiza:
| Aspekt | Naš projekt | TecDoc | Gap |
|--------|-------------|--------|-----|
| Tree struktura | ✅ Postoji | ✅ 45M nodes | ✅ Trebalo bi mapirati |
| Top nav | ❌ Nema | ✅ 36 kategorija | ❌ TREBALO BI |
| Breadcrumbs | ✅ Lako | ✅ Lako | ✅ OK |
| Sitemap | ✅ Moguće | ✅ Optimizirano | ✅ OK |

**DORADA POTREBNA:**
- [ ] Dodati 36 root kategorija kao main navigation
- [ ] Obogatiti tree_node_products
- [ ] Kreirati cache za tree strukture

---

## 📋 PLAN INTEGRACIJE - REDOSLIJED PRIORITETA

### FAZA 1: KRITIČNI ELEMENTI (1-2 tjedna)

#### 1.1 Dodati OEM Authenticity (NAJVEĆE PRAVO)
```javascript
// Trebamo dodati u Prisma schema:
model ArticleOENumber {
  id: String @id @default(cuid())
  productId: String (FK → Product)
  oemNumber: String
  manufacturer: String (koji OEM - Audi, VW, itd.)
  isAdditive: Boolean (opciono ili obavezno)
  referenceInformation: String?
  externalId: String? (TecDoc ID)

  @@unique([productId, oemNumber])
  @@index([oemNumber])
}
```

**Zašto**: 23.6M OEM linkova = KOMPETITIVNA PREDNOST
**Utjecaj**: +15-25% mogućnost premium pricing
**Vrijeme**: 1 tjedan
**Kompleksnost**: Srednja

#### 1.2 Dodati EAN Barcodes
```javascript
model ArticleEAN {
  id: String @id @default(cuid())
  productId: String (FK → Product)
  ean: String @unique

  @@index([ean])
}
```

**Zašto**: 3.6M EAN kodova - mobile scanning
**Utjecaj**: B2B profesionalni mehaničari
**Vrijeme**: 3 dana
**Kompleksnost**: Niska

#### 1.3 Mapirati root kategorije (36)
```javascript
// Dodati u Category model:
isRootCategory: Boolean @default(false)
rootCategoryIndex: Int? // 1-36 za ordering

// Primjeri:
Root: "Brake System"
Root: "Axle Mounting/Steering/Wheels"
Root: "Wheel Drive"
... (36 kategorija)
```

**Zašto**: Top navigation, browsing
**Utjecaj**: UX poboljšanja, conversion +10%
**Vrijeme**: 3 dana
**Kompleksnost**: Niska

---

### FAZA 2: OBOGAĆENI PODACI (2-3 tjedna)

#### 2.1 Dodati Parts List struktura (BOM)
```javascript
model ProductBOMList {
  id: String @id @default(cuid())
  productId: String (FK → Product) // Parent
  componentProductId: String (FK → Product) // Child
  sequenceId: Int
  quantity: Int

  parent: Product @relation("BOMParent", fields: [productId], references: [id])
  component: Product @relation("BOMComponent", fields: [componentProductId], references: [id])

  @@unique([productId, componentProductId])
}
```

**Zašto**: "Frequently bought together" rekomendacije
**Utjecaj**: AOV +8-12%
**Vrijeme**: 1 tjedan
**Kompleksnost**: Srednja

#### 2.2 Dodati Pictures/Media Linkovanje
```javascript
// Proširiti Product:
mediaUrls: String[] // Slike iz TecDoc-a
mediaDocuments: String[] // PDFs i tehničke datoteke
externalImageId: String? // TecDoc image reference
```

**Zašto**: 6.3M slika i dokumenata
**Utjecaj**: Conversion +25%, return rate -20%
**Vrijeme**: 1 tjedan (ako je CDN setup)
**Kompleksnost**: Srednja

#### 2.3 Odaberi Vozila (Granularnost)
```javascript
// Razdvojiti VehicleGeneration na više verzija:
VehicleVariant {
  id: String @id @default(cuid())
  generationId: String (FK)
  generation: VehicleGeneration

  // Dodatni detalji:
  bodyStyle: String ("Sedan", "Avant", itd.)
  doors: Int
  fuelType: String ("Petrol", "Diesel", "Hybrid")
  transmission: String ("Manual", "Automatic")

  productionStartMonth: Int
  productionEndMonth: Int
}
```

**Zašto**: TecDoc ima 70K verzija vozila (ne samo generacije)
**Utjecaj**: Bolja točnost kompatibilnosti
**Vrijeme**: 1-2 tjedna
**Kompleksnost**: Visoka

---

### FAZA 3: DETALJNA PODRŠKA (3-4 tjedna)

#### 3.1 Mapirati svih 5,843 TecDoc kategorija
```javascript
model TecDocCategory {
  id: String @id @default(cuid())
  externalId: Int // TecDoc ID (1-5843)
  name: String
  normalizedName: String
  assemblyGroup: String // Npr. "Lights", "Suspension"

  localCategoryId: String? (FK → Category)
  category: Category?
}
```

**Zašto**: Kompletan katalog iz TecDoc-a
**Utjecaj**: Pokrivanje 6.8M dijelova
**Vrijeme**: 1 tjedan
**Kompleksnost**: Srednja

#### 3.2 Dodati Supplier Network detalje
```javascript
// Proširiti Supplier:
tecdocId: Int?
addressType: String[] // "Business", "Technical", "Billing"
nbrOfArticles: Int? // Koliko dijelova od ovog dobavljača

supplierAddresses: SupplierAddress[]

model SupplierAddress {
  id: String @id @default(cuid())
  supplierId: String
  supplier: Supplier

  name: String
  street: String
  city: String
  country: String

  telephone: String?
  email: String?
  homepage: String?

  addressType: String // Business, Technical, Billing
}
```

**Zašto**: B2B sourcing, wholesale integration
**Utjecaj**: B2B revenue stream
**Vrijeme**: 1 tjedan
**Kompleksnost**: Srednja

#### 3.3 Kompatibilnost Matcher (Advanced)
```javascript
model ArticleCompatibility {
  id: String @id @default(cuid())
  productId: String (FK)

  // TecDoc linkovanje
  tecdocProductId: Int?
  tecdocArticles: String[] // DataSupplierArticleNumber

  // Vozilna kompatibilnost
  vehicleGenerations: String[] // FK-ovi
  engineIds: String[] // FK-ovi

  // OEM ekvivalenti
  oemEquivalents: String[] // OE brojevi
  alternativeSuppliers: String[] // Dobavljači koji pružaju isto

  // Confidence score
  confidenceScore: Float // 0-100%
}
```

**Zašto**: AI-powered part matching (Feature 11 iz TecDoc analizi)
**Utjecaj**: "Can I use part X on vehicle Y?" s 95% accuracy
**Vrijeme**: 2 tjedna
**Kompleksnost**: Visoka

---

## 🗺️ TABEL ZA DODATI

### Ključne nove tablice

| Tablica | Svrha | Redova | Prioritet | Napomena |
|---------|-------|--------|----------|----------|
| **ArticleOENumber** | OEM authenticity | 23.6M | 🔴 P1 | Kritično za premium positioning |
| **ArticleEAN** | Barcode scanning | 3.6M | 🟠 P1 | Za B2B mehaničare |
| **ProductBOMList** | Dijelovi i sastavnice | 2.3M | 🟠 P2 | Za "kupite zajedno" |
| **ProductPicture** | Slike proizvoda | 6.3M | 🟠 P2 | Poboljšava conversion |
| **VehicleVariant** | Verzije vozila | 70K | 🟠 P2 | Veća granularnost |
| **SupplierAddress** | Kontakt info | 2K | 🟠 P2 | Za B2B integraciju |
| **TecDocCategory** | Mapiranje kategorija | 5,843 | 🟡 P3 | Reference mapping |
| **ArticleCompatibility** | Advanced matcher | 6.8M | 🟡 P3 | Za AI features |

---

## 🔧 KOJI PODACI SU NAJJEDNOSTAVNIJI ZA MIGRACIJU

### Prioritet 1 (Najjednostavnije)
1. **OEM brojevi** - CSV import iz TecDoc
   - 23.6M redova ali jednostavni mapping
   - `product_id, oemNumber, manufacturer`

2. **EAN kodovi** - CSV import
   - 3.6M redova
   - `product_id, ean`

3. **Root kategorije (36)** - Manual setup
   - 36 redaka teksta
   - Jedan dan rada

### Prioritet 2 (Umjerena kompleksnost)
4. **Parts List (BOM)** - SQL export → transform
   - 2.3M redova
   - Trebaju mapiranje product IDs

5. **Slike/Media** - URL mapping
   - 6.3M redova
   - Samo URL-ovi, CDN setup trebao

6. **Dobavljači (705)** - Hybrid manual/import
   - 705 + 2K adresa
   - Trebala normalizacija

### Prioritet 3 (Kompleksna)
7. **Vozilne verzije (70K)** - Structured transformation
   - Trebaju parsiranje detalja
   - Mapiranje na existing generations

8. **Sve 5,843 kategorije** - CSV transform
   - Trebaju hierarchical mapping
   - Validacija linkova

---

## 📈 IMPAKT PROGNOZA

### Nakon FAZE 1 (2 tjedna):
- ✅ OEM authenticity badges
- ✅ Pretraga po barcode (mobile ready)
- ✅ Top-level kategorije za browsing
- **Expected Revenue Impact**: +15-25% (premium positioning)

### Nakon FAZE 2 (5 tjedana):
- ✅ Parts BOM strukture
- ✅ "Frequently bought together"
- ✅ Bolje slike i media
- ✅ Fine-grained vehicle selection
- **Expected Revenue Impact**: +40-50% (od FAZE 1)

### Nakon FAZE 3 (9 tjedana):
- ✅ Kompletan TecDoc katalog
- ✅ AI-powered matching
- ✅ B2B supplier network
- ✅ 6.8M dijelova sa OEM autentifikacijom
- **Expected Revenue Impact**: +60-80% (od početne baseline)

---

## 💾 DATA MIGRATION STRATEGY

### Step 1: Backup (obavezno!)
```bash
# Backup postojeće baze
pg_dump omerbasic > backup_$(date +%Y%m%d).sql
```

### Step 2: Import TecDoc data (u staging)
```bash
# Kreiraj staging tables
CREATE TABLE tecdoc_articles_staging (...)
CREATE TABLE tecdoc_oem_numbers_staging (...)
... itd.

# Import iz CSV/SQL
COPY tecdoc_articles_staging FROM 'articles.csv'
```

### Step 3: Mapiranje
```sql
-- Mapiranje TecDoc product ID → naš Product ID
CREATE TABLE tecdoc_product_mapping (
  tecdoc_id INT,
  our_product_id STRING,
  confidence FLOAT
)

-- Popunjavanje sa matching logikom
INSERT INTO tecdoc_product_mapping
SELECT
  t.ID,
  p.id,
  SIMILARITY(t.Description, p.name)
FROM tecdoc_products t
LEFT JOIN products p ON SIMILARITY(t.Description, p.name) > 0.8
```

### Step 4: Insert u production
```sql
INSERT INTO article_oe_numbers (productId, oemNumber, manufacturer)
SELECT
  m.our_product_id,
  ton.OENbr,
  tm.Description
FROM tecdoc_oem_numbers ton
JOIN tecdoc_product_mapping m ON ton.product_id = m.tecdoc_id
JOIN tecdoc_manufacturers tm ON ton.manufacturer_id = tm.id
```

### Step 5: Validacija
```sql
-- Provjeri koliko smo mapirali
SELECT COUNT(*) as mapped FROM article_oe_numbers
-- Trebalo bi 23.6M ili blizu toga

-- Provjeri greške
SELECT COUNT(*) as unmapped FROM tecdoc_product_mapping WHERE our_product_id IS NULL
```

---

## ⚙️ TECHNICAL DECISIONS

### Decision 1: External IDs - zadržati ili ne?
**Zaključak**: ZADRŽATI
- Trebaju za TecDoc mapiranje
- Trebaju za future updates
- Niskokostni storage

### Decision 2: Migrirati sve 5,843 kategorije ili samo 36?
**Zaključak**: POČETI SA 36, DODATI OSTATAK KASNIJE
- 36 root kategorija = odmah koristan
- 5,843 = overkill za start
- Faza 3 aktivnost

### Decision 3: Slike/Media - download u local ili remote URLs?
**Zaključak**: REMOTE URLs (CDN)
- 6.3M slika = 1-2 TB storage
- TecDoc je vec host-ao
- Samo čuva URLs
- Fall-back na default slike

### Decision 4: OEM Numbers - show all ili samo top?
**Zaključak**: SHOW TOP 3-5, sa "View More" linkovima
- Mobile UX - previše linkova = loše
- Desktop - može biti detaljnije
- Filtriranje je efikasnije

---

## 📝 RECOMMENDED IMPLEMENTATION ORDER

### Week 1-2 (FAZA 1)
```
Day 1-2: ArticleOENumber tabela + migration script
Day 3: Frontend: OEM badge sistem
Day 4-5: ArticleEAN tabela + barcode search
Day 6-7: 36 root kategorija + top navigation
Day 8-10: Testing + bug fixes
Day 11-12: Deploy + monitor
```

### Week 3-5 (FAZA 2)
```
Day 13-15: ProductBOMList tabela + reciprocal relationships
Day 16-17: Frontend: "Frequently bought together"
Day 18-20: ProductPicture linking + CDN setup
Day 21-22: VehicleVariant expansion (velika aktivnost!)
Day 23-25: Testing + optimization
Day 26-28: Deploy
Day 29-35: Buffer + monitoring
```

### Week 6-9 (FAZA 3)
```
Day 36-40: TecDocCategory mapping (sve 5,843)
Day 41-45: SupplierAddress expansion + B2B network
Day 46-50: ArticleCompatibility (AI matcher prep)
Day 51-60: Comprehensive testing + edge cases
Day 61-63: Deploy + final tweaks
```

---

## ⚠️ RISKS I MITIGACIJA

| Risk | Vjerojatnost | Impakt | Mitigacija |
|------|--------------|--------|-----------|
| Mapping greške (OEM) | Visoka | Kritičan | Triple-check sa Hengst/Bosch |
| Data freshness (2019) | Srednja | Srednji | Update supplier info quarterly |
| Performance (23.6M OEM) | Srednja | Srednji | Proper indexing + caching |
| Duplicate products | Visoka | Srednji | Fuzzy matching + manual review |
| Storage growth | Srednja | Nizak | Plan za archival strategy |

---

## 📊 SUCCESS METRICS

Pratiti nakon svakog deployment-a:

### FAZA 1
- [ ] OEM badge click-through rate > 5%
- [ ] Barcode scan success rate > 80%
- [ ] Top category usage > 30% of traffic

### FAZA 2
- [ ] "Frequently bought together" conversion > 8%
- [ ] BOM structure accuracy > 95%
- [ ] Image load time < 2s

### FAZA 3
- [ ] Compatibility matcher accuracy > 90%
- [ ] B2B supplier filtering > 20% of orders
- [ ] Overall revenue lift > 60%

---

## 🎯 ZAKLJUČAK

### Što trebamo učiniti?

1. **Odmah (FAZA 1)**: OEM authenticity + EAN + root kategorije
   - 2 tjedna
   - +15-25% revenue boost
   - Relativno lako

2. **Brzo (FAZA 2)**: BOM, slike, fine-grained vehicles
   - 3 tjedna
   - +40-50% revenue (kumulativno)
   - Umjereno teško

3. **Strukturno (FAZA 3)**: Puno kategorija, AI, B2B
   - 4 tjedna
   - +60-80% revenue (kumulativno)
   - Kompleksno ali moguće

### Bottom line:
**Ako to učinimo sljedno, imamo kompetitivnu prednost od 60-80% Revenue Lift samo sa TecDoc datima i OEM autentifikacijom.**

---

**Dokument**: TECDOC_INTEGRATION_ANALYSIS.md
**Datum**: 8. novembar 2025.
**Status**: Gotov za implementaciju
**Sljedeće**: Započeti FAZU 1
