# Vehicle Fitments Architecture - Comprehensive Summary

## Overview
The system uses a hierarchical vehicle data model linked to products through a `ProductVehicleFitment` junction table. This enables precise compatibility matching between automotive parts and specific vehicle configurations (including engine types, generations, and years).

---

## 1. Database Models & Data Structure

### Core Vehicle Hierarchy
Located in: `/Users/emir_mw/omerbasic/prisma/schema.prisma`

#### 1.1 VehicleBrand
```prisma
model VehicleBrand {
  id          String         @id @default(cuid())
  name        String         @unique
  type        VehicleType    // PASSENGER or COMMERCIAL
  models      VehicleModel[]
  externalId  String?        // TecDoc external reference
  source      String?
}

enum VehicleType {
  PASSENGER
  COMMERCIAL
}
```
- Represents vehicle manufacturers (e.g., Mercedes, Volkswagen, Audi)
- Can be either passenger cars or commercial vehicles
- Stores external IDs for integration with TecDoc database

#### 1.2 VehicleModel
```prisma
model VehicleModel {
  id               String              @id @default(cuid())
  name             String
  brandId          String
  brand            VehicleBrand        @relation(fields: [brandId], references: [id], onDelete: Cascade)
  generations      VehicleGeneration[]
  externalId       String?
  period           String?
  productionStart  DateTime?
  productionEnd    DateTime?
  
  @@unique([brandId, externalId])
}
```
- Specific model of a brand (e.g., Golf, Passat, A3)
- Links to multiple generations (different production periods/facelifts)
- Tracks production dates and external references

#### 1.3 VehicleGeneration
```prisma
model VehicleGeneration {
  id               String              @id @default(cuid())
  modelId          String
  model            VehicleModel        @relation(fields: [modelId], references: [id], onDelete: Cascade)
  name             String              // e.g., "B8", "Mk7", "Tiguan II"
  period           String?             // e.g., "2014-2023"
  vinCode          String?
  bodyStyles       Json?               // e.g., ["Sedan", "Variant"]
  engines          Json?               // e.g., ["1.6 TDI", "2.0 TDI"]
  externalId       String?             // TecDoc passengercars.id
  
  // Detailed technical information
  constructionType String?             // Sedan, Hatchback, etc.
  wheelbase        Float?              // mm
  brakeSystem      String?
  driveType        String?             // FWD, RWD, AWD
  fuelType         String?
  transmission     String?
  doors            Int?
  axles            Int?                // Important for commercial vehicles
  weight           Float?              // kg
  productionStart  String?             // Year format
  productionEnd    String?
  
  vehicleEngines   VehicleEngine[]
  productFitments  ProductVehicleFitment[]
  
  @@unique([modelId, name])
}
```
- Represents a specific generation/facelift of a model
- Stores comprehensive technical specifications
- Links to all engines available for this generation
- Links to all product fitments for this generation
- Example: Audi A3 8L, A3 8P, A3 8V are separate generations

#### 1.4 VehicleEngine
```prisma
model VehicleEngine {
  id               String              @id @default(cuid())
  generationId     String
  generation       VehicleGeneration   @relation(fields: [generationId], references: [id], onDelete: Cascade)
  engineType       String              // PETROL, DIESEL, HYBRID, ELECTRIC
  enginePowerKW    Float?              // Engine power in kilowatts
  enginePowerHP    Float?              // Engine power in horsepower
  engineCapacity   Int?                // Displacement in ccm
  engineCode       String?             // e.g., CAX, BJB, etc.
  engineCodes      String[]            // Multiple possible codes
  description      String?
  cylinders        String?
  yearFrom         DateTime?
  yearTo           DateTime?
  externalId       String?             // TecDoc reference
  source           String?
  createdAt        DateTime
  updatedAt        DateTime
  
  productFitments  ProductVehicleFitment[]
  
  @@unique([generationId, externalId])
}
```
- Specific engine variant within a generation
- Can have multiple codes (different names/markets)
- Tracks power output in both kW and HP
- Links to all products compatible with this engine

#### 1.5 ProductVehicleFitment (THE KEY MODEL)
```prisma
model ProductVehicleFitment {
  id                   String              @id @default(cuid())
  productId            String
  product              Product             @relation(fields: [productId], references: [id], onDelete: Cascade)
  generationId         String
  generation           VehicleGeneration   @relation(fields: [generationId], references: [id], onDelete: Cascade)
  engineId             String?             // Optional: can be null for generation-level compatibility
  engine               VehicleEngine?      @relation(fields: [engineId], references: [id], onDelete: SetNull)
  
  // Fitment-specific details
  fitmentNotes         String?             // e.g., "Only with ABS", "Reinforced", etc.
  position             String?             // e.g., "Front", "Rear", "Left", "Right"
  bodyStyles           String[]            // e.g., ["Sedan", "Variant"]
  yearFrom             Int?                // Year range for compatibility
  yearTo               Int?
  isUniversal          Boolean             @default(false)
  
  // External references
  externalVehicleId    String?
  externalModelId      String?
  externalManufacturer String?
  externalEngineName   String?
  
  createdAt            DateTime
  updatedAt            DateTime
  
  @@unique([productId, generationId, engineId])  // Ensures no duplicates
  @@index([generationId, engineId])
  @@index([productId])
}
```
- **CENTRAL MODEL**: Links products to specific vehicle configurations
- Can be:
  - **Generation-level**: Product fits all engines in a generation (engineId = null)
  - **Engine-level**: Product fits specific engines only (engineId specified)
- Stores detailed fitment information (position, notes, year ranges)
- Unique constraint prevents duplicate links

#### 1.6 Product Model (Partial)
```prisma
model Product {
  id                  String              @id @default(cuid())
  name                String
  description         String?
  price               Float
  catalogNumber       String              @unique
  oemNumber           String?
  // ... other fields ...
  
  vehicleFitments     ProductVehicleFitment[]
}
```
- Many-to-many relationship with vehicles through ProductVehicleFitment

---

## 2. API Endpoints

### 2.1 Vehicle Data Retrieval Endpoints

#### GET /api/vehicle-brands
Retrieve all vehicle brands, optionally filtered by type
```typescript
// Query Parameters:
type?: 'PASSENGER' | 'COMMERCIAL'

// Response:
VehicleBrand[] with nested models and generations
```

#### GET /api/brands (Alternative)
Similar to above, returns filtered brands
```typescript
// Query Parameters:
type: 'PASSENGER' | 'COMMERCIAL'

// Returns:
Array of VehicleBrand objects
```

#### GET /api/brands/[brandId]/models
Get all models for a specific brand
```typescript
// Parameters:
brandId: string

// Response:
VehicleModel[]
```

#### GET /api/models/[modelId]/generations
Get all generations for a specific model
```typescript
// Parameters:
modelId: string

// Response:
VehicleGeneration[]
Sorted by period (descending)
```

#### GET /api/vehicles
Get all vehicles (flat structure combining brand/model/generation)
```typescript
// Query Parameters:
type: 'PASSENGER' | 'COMMERCIAL'

// Response:
Array of {
  id: string (generationId)
  name: string (formatted as "Brand Model Generation")
  type: VehicleType
}
```

#### GET /api/generations/[generationId]/engine-types
Get available engine types for a generation
```typescript
// Response:
string[] (PETROL, DIESEL, HYBRID, ELECTRIC)
```

#### GET /api/engine-types/[engineType]/powers
Get available power outputs for an engine type
```typescript
// Response:
number[] (kW values)
```

#### GET /api/engine-capacities/[capacity]/codes
Get available engine codes for a specific capacity
```typescript
// Response:
string[] (engine codes like CAX, BJB)
```

#### GET /api/engines/[engineId]
Get specific engine details
```typescript
// Response:
VehicleEngine object with all technical specs
```

### 2.2 Vehicle Fitment Management Endpoints

#### GET /api/admin/vehicle-fitments
Retrieve fitments for a specific vehicle generation
```typescript
// Query Parameters:
generationId: string (required)
engineId?: string (optional - filter by engine)

// Response:
ProductVehicleFitment[] with included product and engine data
Requires ADMIN role
```

#### POST /api/admin/vehicle-fitments/batch
Batch create product-vehicle fitment links
```typescript
// Request Body:
{
  productIds: string[]
  generationId: string (required)
  engineIds?: string[] (optional - link to specific engines)
  linkAllEngines?: boolean (if true, links to all engines in generation)
}

// Response:
{
  created: number
  skipped: number (for duplicates)
}

Requires ADMIN role
```

#### DELETE /api/admin/vehicle-fitments/batch
Batch delete product-vehicle fitment links
```typescript
// Request Body:
{
  productIds: string[]
  generationId: string (required)
  engineIds?: string[]
  linkAllEngines?: boolean
  isUniversal?: boolean
}

// Response:
{
  deleted: number
}

Requires ADMIN role
```

### 2.3 Vehicle Compatibility Search Endpoint

#### GET /api/products/vehicle-compatibility
Search products by vehicle compatibility
```typescript
// Query Parameters:
vehicleGenerationId?: string
vehicleEngineId?: string
bodyStyle?: string
position?: string
year?: number
page: number (default: 1)
limit: number (default: 10)
sortBy: 'name' | 'price' | 'createdAt' (default: 'name')
sortOrder: 'asc' | 'desc' (default: 'asc')

// Response:
{
  products: Product[] (with vehicleFitments included)
  total: number
  page: number
  limit: number
  totalPages: number
}

// Product Response Structure:
{
  id: string
  name: string
  catalogNumber: string
  oemNumber: string | null
  price: number
  imageUrl: string | null
  category: { id, name }
  vehicleFitments: [{
    id: string
    fitmentNotes: string | null
    position: string | null
    bodyStyles: string[]
    yearFrom: number | null
    yearTo: number | null
    isUniversal: boolean
    generation: {
      id: string
      name: string
      model: {
        id: string
        name: string
        brand: { id, name }
      }
    }
    engine: {
      id: string
      engineType: string
      enginePowerKW: number | null
      enginePowerHP: number | null
      engineCapacity: number | null
      engineCode: string | null
    } | null
  }]
}
```

---

## 3. Frontend Components

### 3.1 Vehicle Selector Component
**File**: `/Users/emir_mw/omerbasic/src/components/vehicle-selector.tsx`

**Purpose**: Hierarchical dropdown-based vehicle selection

**Features**:
- Sequential selection: Type → Brand → Model → Generation → Engine specs
- Two layout modes: horizontal (compact) and vertical (spacious)
- LocalStorage persistence of selections
- Deduplication of engine data
- Cascading dropdowns (each selection narrows subsequent options)

**Props**:
```typescript
interface VehicleSelectorProps {
  onGenerationSelect: (generationId: string) => void
  layout?: 'horizontal' | 'vertical'
  rememberSelection?: boolean
}
```

**Selection Flow**:
1. Select Vehicle Type (PASSENGER/COMMERCIAL)
2. Select Brand (filtered by type)
3. Select Model (filtered by brand)
4. Select Generation (filtered by model)
5. Select Engine Type (PETROL/DIESEL/HYBRID/ELECTRIC)
6. Select Engine Power (kW)
7. Select Engine Capacity (ccm)
8. Select Engine Code

**Data Fetching Flow**:
```
Type Change → Fetch Brands
    ↓
Brand Change → Fetch Models
    ↓
Model Change → Fetch Generations
    ↓
Generation Change → Fetch Engine Types
    ↓
Engine Type Change → Fetch Engine Powers
    ↓
Engine Power Change → Fetch Engine Capacities
    ↓
Engine Capacity Change → Fetch Engine Codes
```

### 3.2 Vehicle Compatibility Client Component
**File**: `/Users/emir_mw/omerbasic/src/app/products/vehicle-compatibility/_components/VehicleCompatibilityClient.tsx`

**Purpose**: Product search and display filtered by vehicle compatibility

**Features**:
- Uses VehicleSelector for vehicle selection
- Hierarchical filters (categories, brands, generations)
- Pagination with smart page display
- Vehicle fitment information display
- Loading and error states

**Type Definitions**:
```typescript
type ProductWithFitment = {
  id: string
  name: string
  catalogNumber: string
  oemNumber: string | null
  price: number
  imageUrl: string | null
  images: string[]
  category: { id, name }
  vehicleFitments: Array<{
    id: string
    fitmentNotes: string | null
    position: string | null
    bodyStyles: string[]
    yearFrom: number | null
    yearTo: number | null
    isUniversal: boolean
    generation: {
      id: string
      name: string
      model: { id, name, brand: { id, name } }
    }
    engine: {
      id: string
      engineType: string
      enginePowerKW: number | null
      enginePowerHP: number | null
      engineCapacity: number | null
      engineCode: string | null
    } | null
  }>
}
```

**Fitment Information Display**:
- Vehicle identification: "Brand Model Generation"
- Engine details: Type, Capacity (L), Power (kW), Code
- Position information
- Year range compatibility
- Special fitment notes

### 3.3 Vehicle Product Linker Component
**File**: `/Users/emir_mw/omerbasic/src/app/admin/vehicles/link/_components/VehicleProductLinker.tsx`

**Purpose**: Admin interface for linking/unlinking products to vehicle generations

**Features**:
- Search products by name, OEM, catalog number
- Filter linked/unlinked products
- Batch link multiple products to generation
- Engine selection options:
  - Generation-level only (no engine specification)
  - All engines in generation
  - Selected engines only
- Unlink individual fitments

**Linking Options**:
```typescript
engineMode: 'none'      // Generation-level, no specific engine
         | 'all'       // All engines in generation
         | 'selected'  // Only specified engines
```

### 3.4 Vehicles Admin Component
**File**: `/Users/emir_mw/omerbasic/src/app/admin/vehicles/_components/VehiclesClient.tsx`

**Purpose**: CRUD operations for vehicle hierarchy (brands, models, generations, engines)

**Features**:
- Tab-based interface (PASSENGER/COMMERCIAL)
- Accordion tree structure for navigation
- Create/Edit/Delete brands, models, generations
- Engine management per generation
- Search and pagination
- Multiple vehicle type support

---

## 4. Data Import and Linking

### 4.1 Data Import Scripts

#### script/import-vehicles.ts
**Purpose**: Import vehicle hierarchy from JSON data

**Data Structure**:
```typescript
type VehicleBrandInput = {
  name: string
  externalId: string
  type: 'PASSENGER' | 'COMMERCIAL'
  source?: string
  models: VehicleModelInput[]
}

type VehicleModelInput = {
  externalId: string
  name: string
  period?: string
  productionStart?: Date
  productionEnd?: Date
  generations: VehicleGenerationInput[]
}

type VehicleGenerationInput = {
  externalId: string
  name: string
  period?: string
  productionStart?: Date
  productionEnd?: Date
  engines?: VehicleEngineInput[]
}

type VehicleEngineInput = {
  externalId: string
  engineType: string
  enginePowerKW?: number
  enginePowerHP?: number
  engineCapacity?: number
  engineCode?: string
  description?: string
  cylinders?: string
  engineCodes?: string[]
  yearFrom?: Date
  yearTo?: Date
  source?: string
}
```

**Features**:
- Upserts vehicles (doesn't create duplicates)
- Dry-run mode for testing
- Progress reporting
- Batch processing

#### script/import-products-linking.ts
**Purpose**: Link products to vehicles with detailed fitment information

**Data Structure**:
```typescript
{
  productId: string
  generationId: string
  engineIds?: string[]
  fitmentNotes?: string
  position?: string
  bodyStyles?: string[]
  yearFrom?: number
  yearTo?: number
  isUniversal?: boolean
}
```

**Key Features**:
- Model name decomposition (extracts generation tokens from names)
- Engine upsert with field merging
- Fitment note preservation
- Supports multiple engines per product
- Duplicate detection

**Model Name Parsing** (decomposeModelAndGenerations):
- Recognizes patterns like:
  - B\d (B3, B4, B5 - VAG generations)
  - Mk\d (Mk1, Mk2, Mk3 - Ford/others)
  - Roman numerals (I, II, III, IV, V, X)
  - Platform codes (8L, 8P, 9N, W203, T5)
- Splits combined tokens (Passat B3/B4 → two generations)
- Falls back to "General" generation for base models

#### script/link-products-to-vehicles.ts
**Purpose**: Legacy linking script using heuristics from product names

**Features**:
- Brand alias mapping
- Model alias mapping (per brand)
- Generation token detection
- Year range derivation
- Pruning of bad fitments
- CSV reporting

**Brand Aliases**:
```typescript
{
  'VW': 'Volkswagen',
  'MB': 'Mercedes-Benz',
  'AUDI': 'Audi',
  'ŠKODA': 'Škoda',
  // ... etc
}
```

### 4.2 Data Cleanup Scripts

#### script/preview-bad-models.ts
**Purpose**: Identify and optionally delete models with embedded generation info

**Detection Rules**:
- Contains `/` (e.g., B5/B5.5)
- Space + generation token pattern
- Platform codes in model name

**Example Bad Models**:
- "Golf Mk4" should be "Golf" model + "Mk4" generation
- "Passat B3/B4" should be split
- "A3 8L" should use separate generation

#### script/merge-models-into-base.ts
**Purpose**: Normalize embedded-generation models

**Process**:
1. Decompose model name into base + generations
2. Create target generations under base model
3. Move engines and fitments to correct generation
4. Delete empty old model

---

## 5. Data Flow Examples

### Example 1: Display Compatible Products for a Vehicle

```
User selects:
  Type: PASSENGER
  Brand: Audi
  Model: A3
  Generation: 8L (2003-2012)
  Engine: DIESEL, 1.9L TDI, 96 kW (BXE code)

↓ Frontend calls:
  GET /api/products/vehicle-compatibility
    ?vehicleGenerationId=gen-8L-id
    &vehicleEngineId=engine-96kw-id

↓ API queries:
  SELECT * FROM products
  JOIN product_vehicle_fitment ON products.id = product_vehicle_fitment.productId
  WHERE generation_id = 'gen-8L-id'
    AND (engine_id = 'engine-96kw-id' OR engine_id IS NULL)

↓ Returns:
  Products with all fitment details including:
  - Compatible positions
  - Year range
  - Special notes
  - Engine specifications
```

### Example 2: Link Multiple Products to a Vehicle

```
Admin selects:
  Generation: BMW M3 (F80) 2014-2019
  Engine Mode: All engines
  Products: Multiple product IDs

↓ POST /api/admin/vehicle-fitments/batch with:
{
  productIds: [prod1, prod2, prod3]
  generationId: 'bmw-m3-f80-id'
  linkAllEngines: true
}

↓ Endpoint:
  1. Expands to all engine IDs in generation
  2. Creates ProductVehicleFitment for each (product, generation, engine) combo
  3. Detects and skips duplicates
  4. Returns count of created vs skipped

↓ Response:
{
  created: 6,  // 2 products × 3 engines each
  skipped: 0
}
```

### Example 3: Import Vehicle Data from JSON

```
Input JSON structure:
{
  brands: [{
    name: "Audi",
    type: "PASSENGER",
    models: [{
      name: "A3",
      generations: [{
        name: "8L",
        period: "2003-2012",
        engines: [{
          engineType: "DIESEL",
          engineCapacity: 1900,
          enginePowerKW: 96,
          engineCode: "BXE"
        }]
      }]
    }]
  }]
}

↓ Process:
  1. Upsert VehicleBrand "Audi"
  2. Upsert VehicleModel "A3" under Audi
  3. Upsert VehicleGeneration "8L" under A3
  4. Upsert VehicleEngine (DIESEL, 1.9L, 96kW) under 8L
  5. Create unique constraints prevent duplicates
```

---

## 6. Key Technical Insights

### 6.1 Unique Constraints
- **VehicleBrand**: name (global)
- **VehicleModel**: (brandId, externalId)
- **VehicleGeneration**: (modelId, name)
- **VehicleEngine**: (generationId, externalId)
- **ProductVehicleFitment**: (productId, generationId, engineId)

The ProductVehicleFitment unique constraint is critical - it prevents:
- Duplicate product-generation pairs
- Multiple engine links for same product-generation combo

### 6.2 Nullable Engine ID
- engineId in ProductVehicleFitment can be NULL
- Represents generation-level compatibility (all engines)
- Useful for universal parts or transmission-specific parts

### 6.3 Cascading Deletes
- Deleting Brand cascades to Models, Generations, Engines, Fitments
- Deleting Model cascades to Generations, Engines, Fitments
- Deleting Generation cascades to Engines, Fitments
- Engine deletion sets Fitment.engineId to NULL (OnDelete: SetNull)
  - Preserves generation-level fitment if specific engine deleted

### 6.4 External References
- All major entities store externalId (for TecDoc integration)
- Enables synchronization with external databases
- Used to detect already-imported data

### 6.5 Year Range Flexibility
ProductVehicleFitment supports:
- yearFrom only (open-ended start)
- yearTo only (open-ended end)
- Both yearFrom and yearTo (specific range)
- Neither (universal or generation-matched years)
- isUniversal flag for truly universal parts

---

## 7. Search & Filter Capabilities

### 7.1 Product Compatibility Filters
- vehicleGenerationId: Filter by specific generation
- vehicleEngineId: Further filter by engine
- bodyStyle: Filter by body type (Sedan, Variant, etc.)
- position: Filter by fitment position (Front, Rear, Left, Right)
- year: Filter by production year with smart matching

### 7.2 Year Matching Logic
```typescript
Year is compatible if:
  (yearFrom <= year <= yearTo) OR
  (yearFrom <= year AND yearTo is null) OR
  (yearFrom is null AND year <= yearTo) OR
  (yearFrom is null AND yearTo is null AND isUniversal)
```

### 7.3 Sorting Options
- name (default)
- price
- createdAt

---

## 8. Integration Points

### 8.1 TecDoc Integration
- External IDs stored for all vehicle entities
- externalId references TecDoc database IDs
- Import scripts handle TecDoc data mapping
- Engine codes and specifications from TecDoc

### 8.2 Product Integration
- Products linked through ProductVehicleFitment
- Each product can fit multiple vehicles/engines
- Fitment details stored per product-vehicle combo
- Position and notes provide specific guidance

### 8.3 Category System
- Products have categories (filters in search)
- Vehicle compatibility works across all categories
- Can filter by both vehicle AND category

---

## 9. Data Validation & Quality

### 9.1 Model Name Validation
- Detects embedded generation tokens
- Preview/cleanup scripts identify bad data
- Merge scripts normalize structure

### 9.2 Duplicate Prevention
- ProductVehicleFitment unique constraint
- Engine upsert by (generationId, externalId)
- Brand/Model/Generation upserts prevent dupes

### 9.3 Data Integrity
- Cascading deletes maintain referential integrity
- External ID tracking prevents reimports
- Batch operations use transactions (implicit)

---

## 10. Summary of Key Files

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Database models and relationships |
| `src/app/api/vehicle-brands/route.ts` | Brand retrieval |
| `src/app/api/brands/[brandId]/models/route.ts` | Model retrieval |
| `src/app/api/models/[modelId]/generations/route.ts` | Generation retrieval |
| `src/app/api/admin/vehicle-fitments/route.ts` | Fitment GET |
| `src/app/api/admin/vehicle-fitments/batch/route.ts` | Fitment batch operations |
| `src/app/api/products/vehicle-compatibility/route.ts` | Product search by vehicle |
| `src/components/vehicle-selector.tsx` | Hierarchical vehicle selection UI |
| `src/app/products/vehicle-compatibility/_components/VehicleCompatibilityClient.tsx` | Product search UI |
| `src/app/admin/vehicles/link/_components/VehicleProductLinker.tsx` | Admin linking UI |
| `scripts/import-vehicles.ts` | Vehicle hierarchy import |
| `scripts/import-products-linking.ts` | Product-vehicle linking |
| `scripts/link-products-to-vehicles.ts` | Legacy heuristic linking |

---

## 11. Conclusion

The vehicle fitments system is a sophisticated, hierarchical data structure that:
- Supports precise vehicle-to-product matching
- Allows filtering by multiple vehicle attributes (generation, engine, year, body style)
- Provides comprehensive admin interfaces for data management
- Integrates with TecDoc for external data sources
- Maintains data integrity through careful constraint design
- Supports both generation-level and engine-level fitments
- Enables flexible year-range compatibility matching
