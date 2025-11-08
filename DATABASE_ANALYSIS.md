# 📊 DETALJNÁ ANALIZA BAZE PODATAKA - WEBSHOP AUTO DIJELOVA

---

## 1. CORE ENTITETI I NJIHOVA STRUKTURA

### A) PROIZVOD (Product)

```
┌──────────────────────────────┐
│        PRODUCT               │
├──────────────────────────────┤
│ id: String (CUID)            │
│ name: String                 │
│ description: String?         │
│ price: Float                 │
│ purchasePrice: Float?        │
│ imageUrl: String?           │
│ stock: Int (default: 0)     │
│ catalogNumber: String (UNIQUE)│
│ oemNumber: String?          │
│ unitOfMeasure: String?      │
│ sku: String?                │
│ isFeatured: Boolean (FALSE) │
│ isArchived: Boolean (FALSE) │
│                              │
│ SPECIJALNA POLJA:            │
│ • dimensions (JSON)          │
│   └─ { weight, width,       │
│        height, length }      │
│ • technicalSpecs (JSON)     │
│   └─ { viskozitet, standardi}│
│ • standards (String[])      │
│                              │
│ INDEKSI:                     │
│ ⚡ [categoryId, isArchived]  │
│ ⚡ [isFeatured]              │
│ ⚡ [updatedAt]               │
│ ⚡ [createdAt]               │
│ ⚡ [price]                   │
│ ⚡ [name]                    │
└──────────────────────────────┘
```

### B) KATEGORIJA (Category)

```
┌──────────────────────────────┐
│       CATEGORY               │
├──────────────────────────────┤
│ id: String (CUID)            │
│ name: String                 │
│ parentId: String? (FK)       │ ← SELF-REF
│ level: Int (1-3)             │
│ iconUrl: String?             │
│ imageUrl: String?            │
│                              │
│ HIERARCHIJA:                 │
│ • children (1:N → Category)  │
│ • parent (1:1 → Category)    │
│                              │
│ CONSTRAINT:                  │
│ ✓ UNIQUE(name, parentId)     │
│   └─ Ista imena OK ako su    │
│      pod različitim roditeljima
│                              │
│ PRIMJER STRUKTURE:           │
│ Ulja                         │
│ ├── Motorazno ulje           │
│ │   ├── Sintetičko           │
│ │   ├── Polusintetičko       │
│ │   └── Mineralno            │
│ ├── Hidraaulika              │
│ └── Prijenosno               │
└──────────────────────────────┘
```

### C) PROIZVOĐAČ (Manufacturer)

```
┌──────────────────────────────┐
│    MANUFACTURER              │
├──────────────────────────────┤
│ id: String (CUID)            │
│ name: String                 │
│ slug: String (UNIQUE)        │
│ description: String?         │
│ country: String?             │
│ website: String?             │
│ createdAt: DateTime          │
│ updatedAt: DateTime          │
│                              │
│ RELATIONS:                   │
│ • products (1:N)             │
│ • groupDiscounts (1:N)       │
│                              │
│ PRIMJERI:                    │
│ • BOSCH                      │
│ • MANN-FILTER                │
│ • CASTROL                    │
│ • MOBIL                      │
└──────────────────────────────┘
```

---

## 2. VOZILA - HIJERARHIJA

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  VehicleBrand                                       │
│  ├── id: String (CUID)                              │
│  ├── name: String (UNIQUE)                          │
│  │   • AUDI, BMW, FORD, MERCEDES, PEUGEOT, FIAT...│
│  ├── type: VehicleType (PASSENGER | COMMERCIAL)    │
│  ├── externalId: String? (TecDoc/ODIN ID)          │
│  └── source: String? (npr. "TecDoc")                │
│                                                     │
│  └─────────────┐                                    │
│                │ 1:N relacija                       │
│                ▼                                    │
│  VehicleModel                                       │
│  ├── id: String (CUID)                              │
│  ├── name: String                                   │
│  │   • A1, A3, A4, A5, A6, A8 (za AUDI)            │
│  ├── brandId: String (FK → VehicleBrand)            │
│  ├── externalId: String?                            │
│  ├── period: String? (npr. "2010-2020")             │
│  ├── productionStart: DateTime?                     │
│  ├── productionEnd: DateTime?                       │
│  └── CONSTRAINT: UNIQUE(brandId, externalId)        │
│                                                     │
│  └─────────────┐                                    │
│                │ 1:N relacija                       │
│                ▼                                    │
│  VehicleGeneration                                  │
│  ├── id: String (CUID)                              │
│  ├── modelId: String (FK → VehicleModel)            │
│  ├── name: String                                   │
│  │   • "B8" (2008-2015) - Audi A4                   │
│  │   • "B9" (2015-2023) - Audi A4                   │
│  │   • "B10" (2023+) - Audi A4                      │
│  ├── period: String? (npr. "2014-2023")             │
│  ├── vinCode: String?                               │
│  ├── bodyStyles: Json? (npr. ["Sedan", "Avant"])    │
│  ├── engines: Json? (npr. ["1.6 TDI", "2.0 TDI"])   │
│  │                                                 │
│  │  TEHNIČKI DETALJI (TecDoc polja):               │
│  ├── constructionType: String? (Sedan, Hatchback...)
│  ├── wheelbase: Float? (u mm)                       │
│  ├── brakeSystem: String? (ABS/ESP...)              │
│  ├── driveType: String? (FWD, RWD, AWD)             │
│  ├── fuelType: String? (Petrol, Diesel, Hybrid...)  │
│  ├── transmission: String? (Manual, Automatic...)   │
│  ├── doors: Int? (3, 4, 5...)                       │
│  ├── weight: Float? (u kg)                          │
│  ├── productionStart: String? (godina)              │
│  ├── productionEnd: String? (godina)                │
│  └── CONSTRAINT: UNIQUE(modelId, name)              │
│                                                     │
│  └─────────────┐                                    │
│                │ 1:N relacija                       │
│                ▼                                    │
│  VehicleEngine                                      │
│  ├── id: String (CUID)                              │
│  ├── generationId: String (FK)                      │
│  ├── engineType: String                             │
│  │   • PETROL, DIESEL, HYBRID, ELECTRIC             │
│  ├── engineCode: String?                            │
│  ├── engineCodes: String[] (niz koda)               │
│  │   • ["CAXA", "CBBB", "CBPA"] za AUx             │
│  ├── enginePowerKW: Float?                          │
│  ├── enginePowerHP: Float?                          │
│  ├── engineCapacity: Int? (u ccm)                   │
│  │   • 1600, 2000, 2500...                          │
│  ├── cylinders: String? (broj cilindara)            │
│  ├── description: String?                           │
│  ├── externalId: String? (TecDoc ID)                │
│  ├── yearFrom: DateTime?                            │
│  ├── yearTo: DateTime?                              │
│  ├── source: String?                                │
│  └── CONSTRAINT: UNIQUE(generationId, externalId)   │
│                                                     │
└─────────────────────────────────────────────────────┘

PRIMJER KONKRETNOG STABLA:
────────────────────────

AUDI (VehicleBrand, PASSENGER)
└── A4 (VehicleModel)
    ├── B8 (VehicleGeneration, 2008-2015)
    │   ├── 1.8 TFSI 120 KW (VehicleEngine)
    │   │   └── engineCode: "CAXA"
    │   │   └── engineCapacity: 1800
    │   │   └── enginePowerKW: 120
    │   └── 2.0 TDI 100 KW (VehicleEngine)
    │       └── engineCode: "CBAA"
    │       └── engineCapacity: 1968
    │       └── enginePowerKW: 100
    │
    ├── B9 (VehicleGeneration, 2015-2023)
    │   ├── 1.4 TFSI 110 KW (VehicleEngine)
    │   ├── 2.0 TFSI 185 KW (VehicleEngine)
    │   └── 2.0 TDI 140 KW (VehicleEngine)
    │
    └── B10 (VehicleGeneration, 2023+)
        └── ...
```

---

## 3. POVEZIVANJE PROIZVODA S VOZILIMA

### ProductVehicleFitment - Ključna Tablica

```
┌──────────────────────────────────────────────────┐
│         PRODUCTVEHICLEFITMENT                    │
├──────────────────────────────────────────────────┤
│ (Mostovna tablica za N:M relaciju)              │
│                                                  │
│ id: String (CUID)                                │
│ productId: String (FK → Product)                 │
│ generationId: String (FK → VehicleGeneration)    │
│ engineId: String? (FK → VehicleEngine)           │
│                                                  │
│ DETALJNE INFORMACIJE:                            │
│ • fitmentNotes: String? (dodatne napomene)      │
│ • position: String? ("Prednji", "Stražnji")     │
│ • bodyStyles: String[] (["Sedan", "Avant"])     │
│ • yearFrom: Int? (kompatibilan od godine)       │
│ • yearTo: Int? (kompatibilan do godine)         │
│ • isUniversal: Boolean (false)                  │
│                                                  │
│ EXTERNAL REFERENCES:                             │
│ • externalVehicleId: String?                    │
│ • externalModelId: String?                      │
│ • externalManufacturer: String?                 │
│ • externalEngineName: String?                   │
│                                                  │
│ CONSTRAINT:                                      │
│ ✓ UNIQUE(productId, generationId, engineId)     │
│   └─ Sprječava duplikate za isti proizvod i motor
│                                                  │
│ INDEXI:                                          │
│ ⚡ [generationId, engineId]                     │
│ ⚡ [productId]                                  │
└──────────────────────────────────────────────────┘

PRIMJERI ZAPISA:
──────────────

1. SPECIFIČAN MOTOR:
   productId: "P123" (Filter za BMW 320i)
   generationId: "G_BMW_3_F30"
   engineId: "E_120KW_TDI"
   → Kompatibilan SAMO s BMW 3-series F30 s 2.0 TDI 120KW

2. SVI MOTORI GENERACIJE:
   productId: "P456" (Gasket set za Audi A4 B9)
   generationId: "G_AUDI_A4_B9"
   engineId: NULL
   → Kompatibilan s SVIM motorima Audi A4 B9 generacije

3. UNIVERZALAN DIO:
   productId: "P789" (Automotive tape)
   generationId: NULL
   engineId: NULL
   isUniversal: true
   → Kompatibilan s BILO KOJIM vozilom
```

### N:M Relacijska Struktura

```
        PRODUCT          VEHICLE GENERATION
          (1)                    (N)
           |                      |
           |                      |
        +--+--+                +--+--+
        |     |                |     |
       (N)   (1)              (N)   (1)
        |     |                |     |
   ┌────┴─────┴────────────────┴─────┴──────┐
   │    PRODUCTVEHICLEFITMENT                │
   │                                        │
   │  Product "Ulje 5W30" → može biti      │
   │  kompatibilo s:                      │
   │  • Audi A4 B8 (1.8 TFSI)              │
   │  • Audi A4 B8 (2.0 TDI)               │
   │  • BMW 320i (1.6 TDI)                 │
   │  • Ford Focus III (1.6 TDI)           │
   │  ... i tako dalje                     │
   │                                        │
   │  Svaki zapis je posebna relacija      │
   └────────────────────────────────────────┘

QUERY PRIMJER - Pronađi sve proizvode za vozilo:

SELECT p.*
FROM Product p
JOIN ProductVehicleFitment pvf ON p.id = pvf.productId
JOIN VehicleEngine ve ON (
  (pvf.engineId = ve.id) OR
  (pvf.engineId IS NULL AND ve.generationId = pvf.generationId) OR
  (pvf.isUniversal = true)
)
WHERE ve.generationId = 'G_AUDI_A4_B9'
  AND ve.engineType = 'DIESEL'
```

---

## 4. ATRIBUTI - FLEKSIBILAN SUSTAV

```
┌─────────────────────────────────────────────────────────┐
│                 ATRIBUTI KATEGORIJE                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  CategoryAttribute                                      │
│  ├── id: String (CUID)                                  │
│  ├── name: String (tehnički naziv)                      │
│  │   • "viscosity", "diameter", "thread_size"           │
│  ├── label: String (korisnom prijatna oznaka)           │
│  │   • "Viskozitet", "Promjer", "Veličina navoja"       │
│  ├── type: String                                       │
│  │   • "string", "number", "enum", "range", "dimension" │
│  ├── unit: String?                                      │
│  │   • "cSt" (za viskozitet), "mm", "kg", "%"           │
│  ├── options: Json? (za enum tipove)                    │
│  │   • { "S": "Sintetičko", "P": "Polusintetičko" }    │
│  ├── isRequired: Boolean                                │
│  ├── isFilterable: Boolean (može li se koristiti za filter)
│  ├── isComparable: Boolean (može li se usporediti)      │
│  ├── sortOrder: Int (redoslijed prikaza)                │
│  ├── categoryId: String (FK → Category)                 │
│  ├── groupId: String? (FK → AttributeGroup)             │
│  │                                                     │
│  │  VALIDACIJA:                                        │
│  ├── validationRules: Json?                             │
│  │   • { "min": 0, "max": 100, "regex": "..." }         │
│  ├── supportedUnits: Json?                              │
│  │   • { "converted": ["SAE", "ISO"] }                  │
│  │                                                     │
│  └── CONSTRAINT: UNIQUE(name, categoryId)               │
│                                                         │
│  ┌────────────────────────────────────────────┐        │
│  │ AttributeGroup                             │        │
│  ├────────────────────────────────────────────┤        │
│  │ Logička grupacija atributa u kategoriji    │        │
│  │                                            │        │
│  │ • id: String (CUID)                        │        │
│  │ • name: String ("Technical", "Dimensions")│        │
│  │ • label: String (za prikaz)                │        │
│  │ • sortOrder: Int (redoslijed grupa)        │        │
│  │ • categoryId: String (FK)                  │        │
│  │                                            │        │
│  │ PRIMJER:                                   │        │
│  │ ─────────                                  │        │
│  │ Grupa: "Tehnički detalji"                  │        │
│  │ ├── viscosity                              │        │
│  │ ├── density                                │        │
│  │ └── flashPoint                             │        │
│  │                                            │        │
│  │ Grupa: "Standardi"                         │        │
│  │ ├── iso_standard                           │        │
│  │ ├── acea_standard                          │        │
│  │ └── api_standard                           │        │
│  │                                            │        │
│  └────────────────────────────────────────────┘        │
│                      ▲                                   │
│                      │ 1:N                              │
│                      │                                   │
└──────────────────────┼───────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
   ┌────▼──────────────┐    ┌────────▼────────┐
   │ProductAttributeVal│    │ CategoryAttribute│
   ├───────────────────┤    │                 │
   │ id: String        │    │ id: String      │
   │ value: String     │    │ name: String    │
   │ numericValue: Flt │    │ label: String   │
   │ unit: String?     │    │ type: String    │
   │ productId: FK     │    │ options: Json?  │
   │ attributeId: FK   │    │ ...             │
   │                   │    │                 │
   │ UNIQUE            │    └─────────────────┘
   │ (productId,       │
   │  attributeId)     │
   │                   │
   │ PRIMJER:          │
   │ product: "Ulje"   │
   │ attribute: "visc" │
   │ value: "5W30"     │
   │ numericValue: 30  │
   │ unit: "cSt"       │
   └───────────────────┘

PRAKTIČNI PRIMJER - ULJE:
────────────────────────

Category: "Ulja"
  ├── AttributeGroup: "Tehnički detalji"
  │   ├── CategoryAttribute:
  │   │   ├── name: "viscosity"
  │   │   ├── label: "Viskozitet SAE"
  │   │   ├── type: "enum"
  │   │   ├── options: {"5W30": "5W30", "10W40": "10W40"}
  │   │   └── isFilterable: true
  │   │
  │   └── CategoryAttribute:
  │       ├── name: "density"
  │       ├── label: "Gustoća"
  │       ├── type: "number"
  │       ├── unit: "g/cm³"
  │       └── validationRules: {"min": 0.8, "max": 0.9}
  │
  └── AttributeGroup: "Standardi"
      ├── CategoryAttribute:
      │   ├── name: "acea_standard"
      │   ├── label: "ACEA standard"
      │   ├── type: "enum"
      │   ├── options: {"A2": "ACEA A2", "C3": "ACEA C3"}
      │   └── isFilterable: true
      │
      └── CategoryAttribute:
          ├── name: "api_standard"
          ├── label: "API standard"
          ├── type: "enum"
          ├── options: {"SL": "API SL", "SM": "API SM"}
          └── isFilterable: true

KONKRETAN PROIZVOD - CASTROL MAGNATEC 5W30:
─────────────────────────────────────────

Product:
  id: "prod_castrol_5w30"
  name: "Castrol Magnatec 5W30"
  categoryId: "cat_oils"

ProductAttributeValue:
  ├── ProductAttributeValue {
  │     value: "5W30"
  │     numericValue: 30
  │     attributeId: "attr_viscosity"
  │   }
  │
  ├── ProductAttributeValue {
  │     value: "0.855"
  │     numericValue: 0.855
  │     unit: "g/cm³"
  │     attributeId: "attr_density"
  │   }
  │
  ├── ProductAttributeValue {
  │     value: "C3"
  │     attributeId: "attr_acea"
  │   }
  │
  └── ProductAttributeValue {
        value: "SM"
        attributeId: "attr_api"
      }
```

---

## 5. CIJENE I POPUSTI - MULTI-LEVEL SISTEM

```
┌─────────────────────────────────────────────────────────────┐
│                    PRICING LOGIC                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Product.price = BASE CIJENA                               │
│                                                             │
│  1️⃣ FEATURED PRODUCT POPUST (Globalni)                     │
│     ───────────────────────────────────────                │
│     FeaturedProduct {                                      │
│       productId: FK                                        │
│       isActive: Boolean                                    │
│       isDiscountActive: Boolean                            │
│       discountType: "PERCENTAGE" | "FIXED"                 │
│       discountValue: Float                                 │
│       startsAt: DateTime?                                  │
│       endsAt: DateTime?                                    │
│     }                                                      │
│                                                             │
│     if (isActive && isDiscountActive && timingValid) {     │
│       if (discountType === 'PERCENTAGE')                   │
│         newPrice = price * (1 - discountValue/100)         │
│       else if (discountType === 'FIXED')                   │
│         newPrice = price - discountValue                   │
│       pricingSource = 'FEATURED'                           │
│     }                                                      │
│                                                             │
│  2️⃣ B2B POPUST (Korisnik ili Grupa)                        │
│     ─────────────────────────────────────────             │
│     User.discountPercentage (pojedinačni B2B)              │
│     ili                                                    │
│     B2BDiscountGroup {                                    │
│       name: String                                        │
│       stackingStrategy: "MAX" | "ADDITIVE" | "PRIORITY"    │
│       priority: Int                                       │
│                                                             │
│       members: B2BGroupMember[]                            │
│       categoryDiscounts: B2BGroupCategoryDiscount[]        │
│       manufacturerDiscounts: B2BGroupManuDiscount[]        │
│       categoryManufacturerDiscounts: B2BCatManDiscount[]   │
│     }                                                      │
│                                                             │
│     LOGIC:                                                 │
│     ──────                                                 │
│     Ako je korisnik B2B:                                   │
│     1. Provjeri B2BGroupCategoryDiscount (po kategoriji)   │
│     2. Provjeri B2BGroupManufacturerDiscount (po tvorcu)   │
│     3. Provjeri B2BGroupCatManDiscount (kategorija+tvorac) │
│     4. Ako nema grupe, koristi User.discountPercentage    │
│                                                             │
│     Stacking strategija:                                   │
│     • MAX: Koristi najveći popust                          │
│     • ADDITIVE: Sabira sve popuste                         │
│     • PRIORITY: Koristi popust s najvećom prioritetom      │
│                                                             │
│  3️⃣ KATEGORIJSKI POPUST (Naslijeđeni)                      │
│     ──────────────────────────────────────                │
│     CategoryDiscount {                                    │
│       userId: FK                                          │
│       categoryId: FK                                       │
│       discountPercentage: Float                            │
│       UNIQUE(userId, categoryId)                           │
│     }                                                      │
│                                                             │
│  FINALNA CIJENA:                                            │
│  ──────────────                                             │
│  originalPrice = Product.price                             │
│  price = originalPrice                                     │
│  priceSource = 'BASE'                                      │
│                                                             │
│  if (featured && valid) {                                  │
│    price = apply_featured_discount(price)                  │
│    priceSource = 'FEATURED'                                │
│  }                                                         │
│                                                             │
│  if (isB2B) {                                              │
│    discount = calc_b2b_discount(user, category, manu)      │
│    if (discount > 0) {                                     │
│      price = price * (1 - discount/100)                    │
│      priceSource = 'B2B'                                   │
│    }                                                       │
│  }                                                         │
│                                                             │
│  API Response:                                             │
│  {                                                         │
│    ...product,                                             │
│    originalPrice: 100,      // Ako ima popusta             │
│    price: 89.99,            // Finalna cijena              │
│    pricingSource: 'FEATURED' // Izvor popusta              │
│  }                                                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. CROSS-REFERENCES - ZAMJENSKE REFERENCE

```
┌──────────────────────────────────────────────────┐
│        PRODUCTCROSSREFERENCE                      │
├──────────────────────────────────────────────────┤
│ id: String (CUID)                                │
│ productId: String (FK → Product)                 │
│ referenceType: String                            │
│   • "OEM" - Originalni broj dijela               │
│   • "Aftermarket" - Zamjenjuje OEM               │
│   • "Replacement" - Direktna zamjena             │
│   • "Compatible" - Kompatibilan sa               │
│   • "Equivalent" - Ekvivalentan                  │
│ referenceNumber: String (broj dijela)            │
│   • "4B0129620E" (Audi OEM broj)                 │
│   • "MANN-FILTER HU816x" (filter broj)           │
│ manufacturer: String? (proizvođač reference)     │
│ notes: String? (dodatne napomene)                │
│ replacementId: String? (FK → Product)            │
│   • Ako u bazi postoji drugi proizvod koji       │
│     odgovara ovoj referenci                      │
│                                                  │
│ PRIMJER 1 - OEM BROJ:                            │
│ ─────────────────────                            │
│ Product: "Bosch Ulje filter"                     │
│ referenceType: "OEM"                             │
│ referenceNumber: "0451103268"                    │
│ manufacturer: "Bosch"                            │
│ → Bosch proizvodi originalne dijelove s ovim br. │
│                                                  │
│ PRIMJER 2 - ZAMJENA:                             │
│ ──────────────────                               │
│ Product: "MANN-FILTER HU816x"                    │
│ referenceType: "Replacement"                     │
│ referenceNumber: "0451103268"                    │
│ replacementId: "prod_bosch_filter_orig"          │
│ notes: "Direktna zamjena za Bosch originalni"    │
│ → MANN filter može biti korišten umjesto Boscha │
│                                                  │
│ PRIMJER 3 - KOMPATIBILAN:                        │
│ ────────────────────────                         │
│ Product: "Generic automotive tape"               │
│ referenceType: "Compatible"                      │
│ referenceNumber: "4B0129620" (dio broja)         │
│ manufacturer: "*"                                │
│ notes: "Kompatibilan sa dijelovima od 4B012xxxx" │
│ → Generička traka kompatibilna s više dijelova  │
│                                                  │
└──────────────────────────────────────────────────┘
```

---

## 7. DOBAVLJAČI - SUPPLY CHAIN

```
┌─────────────────────────────────────────────────────────┐
│                    DOBAVLJAČ (Supplier)                 │
├─────────────────────────────────────────────────────────┤
│ id: String (CUID)                                       │
│ name: String                                            │
│ companyName: String                                     │
│ address: String                                         │
│ city: String                                            │
│ postalCode: String                                      │
│ country: String                                         │
│ email: String                                           │
│ phone: String                                           │
│ contactPerson: String?                                  │
│ taxId: String?                                          │
│ notes: String? (specijalne napomene)                    │
│ isActive: Boolean (default: true)                       │
│                                                         │
│ PRIMJER:                                                │
│ ───────                                                 │
│ BOSCH REXROTH d.o.o.                                   │
│ │ email: [email protected]                                 │
│ │ phone: +385 1 6456 123                               │
│ │ contactPerson: "Mario Horvat"                        │
│ │ taxId: "12345678901"                                 │
│                                                         │
│                  ┌────────────────────────┐             │
│                  │ SupplierCategory       │             │
│                  ├────────────────────────┤             │
│                  │ supplierId: FK         │             │
│                  │ categoryId: FK         │             │
│                  │ priority: Int (1-10)   │             │
│                  │ notes: String?         │             │
│                  │                        │             │
│                  │ PRIMJER:               │             │
│                  │ ──────────             │             │
│                  │ Bosch → Filtri (prio:1)│             │
│                  │ Bosch → Ulja (prio:2)  │             │
│                  │ Bosch → Kočnice (prio:5)│            │
│                  │                        │             │
│                  └────────────────────────┘             │
│                                                         │
│                  ┌────────────────────────┐             │
│                  │ SupplierProduct        │             │
│                  ├────────────────────────┤             │
│                  │ supplierId: FK         │             │
│                  │ productId: FK          │             │
│                  │ supplierSku: String?   │             │
│                  │ priority: Int (1-10)   │             │
│                  │ price: Float (nabavna) │             │
│                  │ minOrderQty: Int?      │             │
│                  │ leadTime: Int? (dani)  │             │
│                  │ notes: String?         │             │
│                  │                        │             │
│                  │ PRIMJER:               │             │
│                  │ ──────────             │             │
│                  │ Bosch → Filter HU816x  │             │
│                  │   SKU: "HU816X-BOSCH" │             │
│                  │   nabavna cijena: 45.00│             │
│                  │   min. količina: 10    │             │
│                  │   vrijeme isporuke: 3d │             │
│                  │   prioritet: 1         │             │
│                  │                        │             │
│                  │ MANN → Filter HU816x   │             │
│                  │   SKU: "MF-HU816X"     │             │
│                  │   nabavna cijena: 42.50│             │
│                  │   min. količina: 5     │             │
│                  │   vrijeme isporuke: 2d │             │
│                  │   prioritet: 2 (jeftiniji!)         │
│                  │                        │             │
│                  └────────────────────────┘             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 8. NARUDŽBENICE (PURCHASE ORDERS)

```
┌────────────────────────────────────────────────────┐
│            PURCHASEORDER                           │
├────────────────────────────────────────────────────┤
│ id: String (CUID)                                  │
│ orderNumber: String (UNIQUE, npr. "PO-2024-0001") │
│ supplierId: String (FK → Supplier)                 │
│ status: PurchaseOrderStatus                        │
│   DRAFT → SENT → CONFIRMED →                       │
│   PARTIALLY_RECEIVED → RECEIVED / CANCELLED        │
│ orderDate: DateTime (default: now())               │
│ expectedDeliveryDate: DateTime?                    │
│ deliveryDate: DateTime?                            │
│ subtotal: Float (bez poreza)                       │
│ taxAmount: Float (PDV)                             │
│ totalAmount: Float (ukupno)                        │
│ notes: String?                                     │
│ createdById: String (FK → User ADMIN)              │
│ updatedById: String? (FK → User ADMIN)             │
│                                                    │
│ PRIMJER:                                           │
│ ───────                                            │
│ orderNumber: "PO-2024-0147"                        │
│ status: "CONFIRMED"                                │
│ supplierId: "supplier_bosch"                       │
│ orderDate: 2024-11-08                              │
│ expectedDeliveryDate: 2024-11-11 (3 dana)          │
│ subtotal: 5,000.00 EUR                             │
│ taxAmount: 1,000.00 EUR (20% PDV)                  │
│ totalAmount: 6,000.00 EUR                          │
│                                                    │
│          ┌──────────────────────────┐              │
│          │ PurchaseOrderItem        │              │
│          ├──────────────────────────┤              │
│          │ id: String               │              │
│          │ purchaseOrderId: FK      │              │
│          │ productId: FK            │              │
│          │ supplierProductId: FK?   │              │
│          │ quantity: Int            │              │
│          │ unitPrice: Float         │              │
│          │ totalPrice: Float        │              │
│          │ receivedQty: Int (0)     │              │
│          │ notes: String?           │              │
│          │                          │              │
│          │ PRIMJER 1:               │              │
│          │ ──────────               │              │
│          │ product: Filter HU816x   │              │
│          │ quantity: 100            │              │
│          │ unitPrice: 45.00         │              │
│          │ totalPrice: 4,500.00     │              │
│          │ receivedQty: 0           │              │
│          │                          │              │
│          │ PRIMJER 2:               │              │
│          │ ──────────               │              │
│          │ product: Ulje 5W30       │              │
│          │ quantity: 200 (litre)    │              │
│          │ unitPrice: 2.50          │              │
│          │ totalPrice: 500.00       │              │
│          │ receivedQty: 0           │              │
│          │                          │              │
│          └──────────────────────────┘              │
│                                                    │
│          ┌──────────────────────────┐              │
│          │ PurchaseOrderStatusHist. │              │
│          ├──────────────────────────┤              │
│          │ id: String               │              │
│          │ purchaseOrderId: FK      │              │
│          │ status: String           │              │
│          │ changedById: FK → User   │              │
│          │ changedAt: DateTime      │              │
│          │ notes: String?           │              │
│          │                          │              │
│          │ PRIMJER TIMELINE:        │              │
│          │ ──────────────────       │              │
│          │ 2024-11-08 12:00         │              │
│          │ DRAFT → SENT (admin: A)  │              │
│          │ notes: "Slano e-mailom" │              │
│          │                          │              │
│          │ 2024-11-08 14:30         │              │
│          │ SENT → CONFIRMED (A)     │              │
│          │ notes: "Bosch potvrdio"  │              │
│          │                          │              │
│          │ 2024-11-10 09:00         │              │
│          │ CONFIRMED →              │              │
│          │ PARTIALLY_RECEIVED (A)   │              │
│          │ notes: "70 od 100 filtara│              │
│          │        primljeno"        │              │
│          │                          │              │
│          │ 2024-11-11 16:00         │              │
│          │ PARTIALLY_RECEIVED →     │              │
│          │ RECEIVED (A)             │              │
│          │ notes: "Kompletan prijam"│              │
│          │                          │              │
│          └──────────────────────────┘              │
│                                                    │
│          ┌──────────────────────────┐              │
│          │ PurchaseOrderComment     │              │
│          ├──────────────────────────┤              │
│          │ id: String               │              │
│          │ purchaseOrderId: FK      │              │
│          │ comment: String (text)   │              │
│          │ createdById: FK → User   │              │
│          │ createdAt: DateTime      │              │
│          │                          │              │
│          │ PRIMJER:                 │              │
│          │ ────────                 │              │
│          │ "Bosch javio da će biti  │              │
│          │  kašnjenja od 2 dana     │              │
│          │  zbog visokog            │              │
│          │  zahtjeva za filterima"  │              │
│          │                          │              │
│          └──────────────────────────┘              │
│                                                    │
└────────────────────────────────────────────────────┘
```

---

## 9. KORISNICI I AUTENTIFIKACIJA

```
┌──────────────────────────────────────────────────┐
│              USER (NextAuth.js)                   │
├──────────────────────────────────────────────────┤
│ id: String (CUID)                                │
│ name: String?                                    │
│ email: String? (UNIQUE)                          │
│ emailVerified: DateTime?                         │
│ image: String?                                   │
│ password: String?                                │
│ role: UserRole                                   │
│   • USER (Redovni kupac)                         │
│   • ADMIN (Administrator)                        │
│   • B2B (Korporativni kupac)                     │
│ companyName: String? (za B2B)                    │
│ taxId: String? (OIB, za B2B)                     │
│ discountPercentage: Float? (B2B popust)          │
│                                                  │
│ RELACIJE:                                        │
│ • accounts (1:N) - OAuth/OAuth2                 │
│ • sessions (1:N) - SessionToken                 │
│ • orders (1:N) - Kupljene narudžbe              │
│ • comments (1:N) - Komentari na narudžbama      │
│ • addresses (1:N) - Adrese za dostavu           │
│ • discountGroupMemberships (1:N)                │
│ • passwordResetTokens (1:N)                     │
│                                                  │
│ PRIMJERI:                                        │
│ ─────────                                        │
│                                                  │
│ USER - REDOVNI KUPAC                             │
│ ────────────────────                             │
│ id: "user_123"                                   │
│ name: "Ivan Horvat"                              │
│ email: "[email protected]"                    │
│ role: "USER"                                     │
│ discountPercentage: 0                            │
│                                                  │
│ B2B - KORPORATIVNI KUPAC                         │
│ ───────────────────────                          │
│ id: "user_456"                                   │
│ name: "Marko Horvat"                             │
│ email: "[email protected]"                  │
│ role: "B2B"                                      │
│ companyName: "AutoShop d.o.o."                   │
│ taxId: "12345678901"                             │
│ discountPercentage: 10% (globalni popust)        │
│                                                  │
│ ili u grupi:                                     │
│                                                  │
│ B2B GROUP - GRUPA KORPORATIVNIH KUPACA           │
│ ─────────────────────────────────────            │
│ id: "b2b_group_1"                                │
│ name: "Autoleasingove kompanije"                 │
│ stackingStrategy: "MAX" (koristi najviši popust) │
│ priority: 1                                      │
│ members: [user_456, user_789, user_999]          │
│                                                  │
│ → Kategorijski popusti:                          │
│   • Filtri: 15%                                  │
│   • Ulja: 12%                                    │
│   • Kočnice: 8%                                  │
│                                                  │
│ → Proizvođački popusti:                          │
│   • Bosch: 18%                                   │
│   • Castrol: 10%                                 │
│   • MANN: 13%                                    │
│                                                  │
│ → Specijalni popusti:                            │
│   • Bosch filtri: 20% (kategorija + proizvođač) │
│                                                  │
└──────────────────────────────────────────────────┘
```

---

## 10. REDOSLIJED PODATAKA - INDEXI ZA PERFORMANSE

```
┌──────────────────────────────────────────────────────┐
│         KLJUČNI INDEXI ZA BRZO PRONALAŽENJE          │
├──────────────────────────────────────────────────────┤
│                                                      │
│ PRODUCT TABLICA                                      │
│ ───────────────                                      │
│ ⚡ (categoryId, isArchived)                          │
│    → Brz pronalažak proizvoda u kategoriji          │
│    → Čist prikaz samo aktivnih                      │
│                                                      │
│ ⚡ (isFeatured)                                      │
│    → Brz pronalažak featured proizvoda              │
│                                                      │
│ ⚡ (updatedAt)                                       │
│    → Sortirani prikaz po vremenu ažuriranja         │
│    → "Najnovije", "Nedavno dorađeni"                │
│                                                      │
│ ⚡ (createdAt)                                       │
│ ⚡ (createdAt, id) - Compound                        │
│    → Paginirani prikaz "novo dodani"                │
│    → Efikasna keyset pagination                     │
│                                                      │
│ ⚡ (price)                                           │
│    → Filtriranje po raspon cijena                    │
│    → Sortiranje po cijeni (ascending/descending)    │
│                                                      │
│ ⚡ (name)                                            │
│    → Full-text search na naziv                      │
│    → Brzak pronalažak po nazivu                     │
│                                                      │
│ ⚡ (manufacturerId)                                  │
│    → Brz pronalažak po proizvođaču                  │
│                                                      │
│                                                      │
│ PRODUCTVEHICLEFITMENT TABLICA                        │
│ ──────────────────────────────                       │
│ ⚡ (generationId, engineId)                          │
│    → Brz pronalažak dijelova za vozilo+motor       │
│    → Core za pretragu "koji dijelovi za Audi A4"   │
│                                                      │
│ ⚡ (productId)                                       │
│    → Brz pronalažak kompatibilnih vozila za proizvod│
│    → "Ovaj dio odgovara za...")                     │
│                                                      │
│                                                      │
│ CATEGORY TABLICA                                     │
│ ────────────────                                     │
│ ⚡ (parentId)                                        │
│    → Brz pronalažak podkategorija                   │
│    → Izgradnja hierarchijske strukture              │
│                                                      │
│ ✓ UNIQUE(name, parentId)                            │
│    → Sprječava duplikate u istoj razini             │
│                                                      │
│                                                      │
│ VEHICLEGENERATION TABLICA                            │
│ ──────────────────────────                           │
│ ⚡ (modelId)                                         │
│    → Brz pronalažak generacija vozila               │
│    → "Audi A4 B8, B9, B10..."                       │
│                                                      │
│                                                      │
│ EFFICIENCY NAPOMENA:                                 │
│ ──────────────────                                   │
│ • Index (createdAt, id) je compound - jedan index   │
│   koji pokriva i createdAt i id                    │
│   → Bolje za keyset pagination nego dva odvojena    │
│                                                      │
│ • (categoryId, isArchived) compound sprječava       │
│   potrebu za filtriranjem nakon pronalaženja       │
│   → Direktno dohvaćanje aktivnih proizvoda          │
│                                                      │
│ • (generationId, engineId) compound za ProductFitment│
│   → Optimalan za najčešće korištene upite           │
│   → Pretraga po vozilu često ide s motorom          │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## 11. PRIMJER KOMPLETNOG TOKA - OD KRAJA DO KRAJA

### SCENARIO: Kupac traži dijelove za svoju Audi A4 B9 s 2.0 TDI 140 KW

#### 1️⃣ FRONTEND - Odabir vozila

```
Korisnik ulazi na /products

Birka: AUDI
└─ GET /api/vehicle-brands/
   Returns: { id, name, type, models[] }

Birka: Audi A4
└─ GET /api/vehicle-brands/[brandId]/models/
   Returns: { id, name, externalId, generations[] }

Birka: A4 B9 (2015-2023)
└─ GET /api/vehicle-brands/.../models/[modelId]/generations/
   Returns: {
     id: "gen_a4_b9",
     name: "B9",
     period: "2015-2023",
     engineType: ["1.4 TFSI", "2.0 TFSI", "2.0 TDI"],
     engines: [
       { id: "eng_1", engineCode: "CAEB", type: "1.4 TFSI", ... },
       { id: "eng_2", engineCode: "CCHQ", type: "2.0 TDI", ... },
       ...
     ]
   }

Birka: 2.0 TDI 140 KW
└─ engineId: "eng_2"
```

#### 2️⃣ BACKEND - Pronalažak dijelova

```
GET /api/products?generationId=gen_a4_b9&engineId=eng_2&page=1

QUERY LOGIC:
────────────

SELECT p.* FROM Product p
WHERE EXISTS (
  SELECT 1 FROM ProductVehicleFitment pvf
  WHERE pvf.productId = p.id
  AND (
    /* Specifičan motor */
    (pvf.generationId = 'gen_a4_b9' AND pvf.engineId = 'eng_2')

    /* Ili svi motori ove generacije */
    OR (pvf.generationId = 'gen_a4_b9' AND pvf.engineId IS NULL)

    /* Ili univerzalan dio */
    OR pvf.isUniversal = true
  )
)
AND p.isArchived = false

RESULTS (primjer):
──────────────────

[
  {
    id: "prod_filter_123",
    name: "Bosch Ulje filter HU 8160/1-x",
    catalogNumber: "F002H200090",
    price: 45.99,
    imageUrl: "/images/filter_bosch.jpg",
    isFeatured: false,
    stock: 23,
    category: { id: "cat_filters", name: "Filtri" },
    manufacturer: { id: "manu_bosch", name: "Bosch" }
  },
  {
    id: "prod_air_filter",
    name: "MANN-FILTER C30015",
    catalogNumber: "C30015",
    price: 35.50,
    imageUrl: "/images/filter_air.jpg",
    isFeatured: false,
    stock: 45,
    category: { id: "cat_filters", name: "Filtri" },
    manufacturer: { id: "manu_mann", name: "MANN" }
  },
  ...
]

Prikazuje (default) 24 stavke po stranici
```

#### 3️⃣ FRONTEND - Prikaz rezultata

```
ProductsResults.tsx prikazuje grid od 24 stavke

┌────────────────────────────────────────────────┐
│  Odabrali ste: Audi A4 B9 (2015-2023)         │
│  Motor: 2.0 TDI 140 KW                         │
│  Pronađeno: 487 dijelova                       │
├────────────────────────────────────────────────┤
│                                                │
│  ┌───────┐  ┌───────┐  ┌───────┐              │
│  │ Filter│  │ Filter│  │ Filter│  ...         │
│  │Bosch  │  │ MANN  │  │Cabin  │              │
│  │45.99€ │  │35.50€ │  │22.00€ │              │
│  │23kom  │  │45kom  │  │67kom  │              │
│  │ [ADD]  │  │ [ADD]  │  │ [ADD]  │              │
│  └───────┘  └───────┘  └───────┘              │
│                                                │
│  < Stranica 1 od 21 >  [1] 2  3  ...  21      │
│                                                │
└────────────────────────────────────────────────┘
```

#### 4️⃣ KORISNIK - Klik na proizvod

```
Klikne na "Bosch Ulje filter HU 8160/1-x"

→ Preusmjeravanje na /products/prod_filter_123
```

#### 5️⃣ DETALJI PROIZVODA

```
GET /api/products/prod_filter_123

RESPONSE:
────────
{
  id: "prod_filter_123",
  name: "Bosch Ulje filter HU 8160/1-x",
  description: "Originalni Bosch ulje filter...",
  price: 45.99,
  imageUrl: "/images/filter_bosch.jpg",
  stock: 23,
  catalogNumber: "F002H200090",
  oemNumber: "04E115561C",
  isFeatured: false,
  pricingSource: "BASE",

  // Tehnički detalji
  dimensions: {
    diameter: 76,
    height: 100,
    weight: 0.45
  },
  technicalSpecs: {
    filterType: "Oil",
    capacity: 0.95,
    efficiency: 99.5
  },
  standards: ["ISO 2943", "SAE J2003"],

  // Kompatibilnost vozila
  vehicleFitments: [
    {
      id: "fitment_1",
      generationId: "gen_a4_b9",
      generation: {
        id: "gen_a4_b9",
        name: "B9",
        model: {
          id: "mod_a4",
          name: "A4",
          brand: { id: "br_audi", name: "AUDI" }
        }
      },
      engineId: "eng_2",
      engine: {
        id: "eng_2",
        engineType: "DIESEL",
        engineCode: "CCHQ",
        enginePowerKW: 140
      },
      position: "Engine",
      fitmentNotes: "Originalni filter za motor 2.0 TDI 140KW"
    },
    {
      id: "fitment_2",
      generationId: "gen_a4_b9",
      engineId: null,  // Kompatibilan s svim motorima generacije
      engine: null,
      fitmentNotes: "Kompatibilan sa svim ostalim motorima B9"
    }
  ],

  // Atributi - Tehnički detalji
  attributeValues: [
    {
      id: "av_1",
      value: "76mm",
      attribute: { id: "attr_1", name: "diameter", label: "Promjer" }
    },
    {
      id: "av_2",
      value: "0.95L",
      attribute: { id: "attr_2", name: "capacity", label: "Kapacitet" }
    }
  ],

  // Cross-references
  originalReferences: [
    {
      referenceType: "OEM",
      referenceNumber: "04E115561C",
      manufacturer: "Audi"
    },
    {
      referenceType: "OEM",
      referenceNumber: "06E115561",
      manufacturer: "VW"
    }
  ],

  replacementFor: [],  // Nijedan drugi proizvod ga ne zamjenjuje

  category: {
    id: "cat_filters",
    name: "Filtri"
  },
  manufacturer: {
    id: "manu_bosch",
    name: "Bosch",
    website: "https://www.bosch.com"
  }
}
```

#### 6️⃣ FRONTEND - Prikaz detalja

```
ProductDetails.tsx prikazuje:

┌─────────────────────────────────────────────┐
│ BOSCH ULJE FILTER HU 8160/1-X               │
│ ┌───────────┐                               │
│ │   Slika   │ Katalog broj: F002H200090    │
│ │  proizvoda│ OEM broj: 04E115561C          │
│ │           │ Cijena: 45.99€                │
│ │           │ Stanje: 23 kom               │
│ │           │ [DODAJ U KOŠARICU]            │
│ └───────────┘                               │
│                                             │
│ ┌──────────────────────────────────────────┐│
│ │ SPECIFIKACIJE | VOZILA | ATRIBUTI | REF. ││
│ │                                          ││
│ │ SPECIFIKACIJE                            ││
│ │ • Tip: Oil filter                        ││
│ │ • Kapacitet: 0.95L                       ││
│ │ • Promjer: 76mm                          ││
│ │ • Visina: 100mm                          ││
│ │ • Težina: 0.45kg                         ││
│ │                                          ││
│ │ VOZILA (kompatibilan s):                 ││
│ │ • AUDI A4 B9 (2015-2023)                ││
│ │   └─ 2.0 TDI 140KW (CCHQ) ✓ Specifično ││
│ │   └─ 1.4 TFSI 110KW ✓ Sve generacije  ││
│ │   └─ 2.0 TFSI 185KW ✓ Sve generacije  ││
│ │                                          ││
│ │ OEM REFERENCA:                           ││
│ │ • Audi: 04E115561C                       ││
│ │ • VW: 06E115561                          ││
│ │                                          ││
│ │ Opis: Originalni filter za motor 2.0 TDI││
│ │ 140KW, kompatibilan i sa svim ostalim   ││
│ │ motorima u A4 B9 generaciji.             ││
│ │                                          ││
│ └──────────────────────────────────────────┘│
└─────────────────────────────────────────────┘
```

#### 7️⃣ ADMIN - PREGLED KOMPATIBILNOSTI

```
Admin ide na /admin/categories/[catId]/assign-products

Vidi:
- Sve kategorije s podkategorijama
- Sve proizvode u kategoriji
- SVE vozilne generacije
- SVE motore za svaku generaciju

Može:
- Dodijeliti proizvod generaciji (SVE motore)
- Dodijeliti proizvod specifičnom motoru
- Označiti kao "universal"
- Dodati napomene o fitmentu
```

---

## 12. ZAKLJUČAK - KEY METRICS

| Metrika | Opis | Primjer |
|---------|------|---------|
| **Relacijske tabličke** | Broj tablica za relacije | 47+ (Product, Category, VehicleBrand, VehicleModel, VehicleGeneration, VehicleEngine, ProductVehicleFitment, itd.) |
| **Hierarchije** | Kako se kategorizirani podaci organiziraju | Brand → Model → Generation → Engine; Category (self-ref) |
| **Fleksibilnost** | JSON polja za dodatne podatke | `dimensions`, `technicalSpecs`, `bodyStyles`, `engines`, `options` |
| **Performanse** | Ključni indexi | 13+ indexa za brzo pronalaženje |
| **B2B podrška** | Kako je B2B implementiran | User role, DiscountGroup, CategoryDiscount, hierarchijski popusti |
| **Supply chain** | Upravljanje dobavljačima | Supplier, SupplierProduct, PurchaseOrder, PurchaseOrderStatusHistory |
| **Pricing** | Nivoi cijena | BASE → FEATURED → B2B (s MAX/ADDITIVE/PRIORITY strategijama) |
| **Scalability** | Kako se sustav može proširiti | TecDoc polja, external IDs, predloški atributa |

---

## SAŽETAK ANALIZE

Pregleda sam kompletan projekat webshopa auto dijelova i identificirao sam **detaljnu analizu** sa sljedećim ključnim točkama:

### Ključne Strukture:

1. **PROIZVODI (Product)** - Core entitet s JSON poljima za dimenzije i tehničke specifikacije
2. **VOZILA (Brand → Model → Generation → Engine)** - Hijerarhijska struktura s 4 nivoa
3. **KOMPATIBILNOST (ProductVehicleFitment)** - N:M relacija koja povezuje proizvode s vozilima na nivou motora
4. **KATEGORIJE** - Self-referencing struktura za unlimited hijerarhije
5. **ATRIBUTI** - Fleksibilan sustav za dinamičke karakteristike po kategoriji
6. **CIJENE** - Multi-level sistem: BASE → FEATURED → B2B (s 3 stacking strategije)
7. **DOBAVLJAČI** - Kompletan supply chain s narudžbenicama i statusima
8. **B2B** - Grupe kupaca s kategorijskim i proizvođačkim popustima

### Tehnički Highlights:

- **47+ tablica** u bazi s jasnom separacijom domena
- **13+ indexa** za optimalne performanse
- **JSON polja** za fleksibilnost (dimensions, technicalSpecs, bodyStyles, engines)
- **Keyset pagination** za brzo pronalaženje
- **External IDs** za integracije s TecDoc/ODIN sustavima
- **Compound constraints** za podatkovnu integritet
- **Role-based access** (USER, ADMIN, B2B)

Sve je izvrsno dokumentirano s primjerima tokova podataka od forme do baze i natrag!
