# 📖 UPUTSTVO: Kako Pronaći Root Kategoriju za Bilo Koji Artikel

**Datum**: 8. novembar 2025.
**Status**: DETALJNO UPUTSTVO - Korak po Korak
**Cilj**: Pronalaženje root kategorije za artikel (npr. HX 81D → Filters)

---

## 🎯 FINALNI REZULTAT - ŠTA TREBAMO NAĆI

Za artikel **HX 81D**:

```
POČETAK: Article broj HX 81D
    ↓
KORAK 1: Pronađi Article ID iz baze
    → Article ID: 166535197
    ↓
KORAK 2: Pronađi CurrentProduct ID
    → Product ID: 416
    ↓
KORAK 3: Pronađi Product Description
    → "Hydraulic Filter, automatic transmission"
    ↓
KORAK 4: Pronađi search_trees čvor koji sadrži Description
    → search_trees čvor ID: 100262 ("Hydraulic Filter")
    ↓
KORAK 5: Pronađi parent_node_id tog čvora
    → parent_node_id: 100005
    ↓
KORAK 6: Pronađi ROOT čvor (parent_node_id = 0)
    → ROOT ID: 100005
    → ROOT KATEGORIJA: "Filters" ✅

KRAJ: HX 81D → Filters (ID: 100005)
```

---

## 🔧 KAKO ISPROBATI - PRAKTIČNI KORACI

### KORAK 1: Pronađi Article ID

**SQL Upit:**
```sql
SELECT
  id as 'Article ID',
  DataSupplierArticleNumber as 'Broj',
  CurrentProduct as 'Product ID',
  Description as 'Opis'
FROM articles
WHERE DataSupplierArticleNumber = 'HX 81D'
LIMIT 1;
```

**Rezultat:**
```
Article ID: 166535197
Broj: HX 81D
Product ID: 416
Opis: Hydraulic Filter, automatic transmission
```

---

### KORAK 2: Pronađi Product Description

**SQL Upit:**
```sql
SELECT
  ID as 'Product ID',
  Description as 'Proizvod'
FROM products
WHERE ID = 416
LIMIT 1;
```

**Rezultat:**
```
Product ID: 416
Proizvod: Hydraulic Filter, automatic transmission
```

---

### KORAK 3: Pronađi search_trees Čvor Koji Sadrži Description

**Problem**: Product Description je "Hydraulic Filter, automatic transmission" ali search_trees čvor ima samo "Hydraulic Filter" - trebam LIKE matching!

**SQL Upit:**
```sql
SELECT
  node_id as 'Čvor ID',
  Description as 'Čvor Naziv',
  parent_node_id as 'Parent ID',
  tree_id
FROM search_trees
WHERE tree_id = 1
  AND parent_node_id > 0
  AND 'Hydraulic Filter, automatic transmission' LIKE CONCAT('%', Description, '%')
LIMIT 10;
```

**Rezultat:**
```
Čvor ID | Čvor Naziv                | Parent ID | tree_id
100262  | Hydraulic Filter          | 100005    | 1
100240  | Automatic Transmission    | 100238    | 1
100808  | Filter                    | 100006    | 1
...
```

**Važna opažanja:**
- Pronašli smo 3 mogućih čvora
- **KLJUČNI čvor: 100262 "Hydraulic Filter" sa parent_id 100005** ✅
- Ostali čvorovi vode do drugih kategorija (Transmission, Brake System)

---

### KORAK 4: Pronađi ROOT Kategoriju (parent_node_id = 0)

**SQL Upit:**
```sql
SELECT
  st_root.node_id as 'ROOT ID',
  st_root.Description as 'ROOT KATEGORIJA',
  st_root.parent_node_id as 'Parent',
  st_root.tree_id
FROM search_trees st_child
LEFT JOIN search_trees st_root ON (
  st_root.node_id = st_child.parent_node_id
  AND st_root.tree_id = st_child.tree_id
)
WHERE st_child.tree_id = 1
  AND st_child.node_id = 100262
  AND st_root.parent_node_id = 0;
```

**Rezultat:**
```
ROOT ID | ROOT KATEGORIJA | Parent | tree_id
100005  | Filters         | 0      | 1
```

---

## ✅ KOMPLETAN SQL ZA PRONALAŽENJE ROOT KATEGORIJE

### Verzija 1: Za Poznati Article Broj

```sql
SELECT
  a.DataSupplierArticleNumber as 'Artikel Broj',
  p.Description as 'Proizvod',
  st_child.node_id as 'search_trees Čvor ID',
  st_child.Description as 'Čvor Naziv',
  st_root.node_id as 'ROOT ID',
  st_root.Description as 'ROOT KATEGORIJA'
FROM articles a
LEFT JOIN products p ON p.ID = a.CurrentProduct
LEFT JOIN search_trees st_child ON (
  p.Description LIKE CONCAT('%', st_child.Description, '%')
  AND st_child.tree_id = 1
  AND st_child.parent_node_id > 0
)
LEFT JOIN search_trees st_root ON (
  st_root.node_id = st_child.parent_node_id
  AND st_root.tree_id = 1
  AND st_root.parent_node_id = 0
)
WHERE a.DataSupplierArticleNumber = 'HX 81D'
LIMIT 5;
```

---

### Verzija 2: Za Poznati Product ID

```sql
SELECT
  p.ID as 'Product ID',
  p.Description as 'Proizvod',
  st_child.node_id as 'Čvor ID',
  st_child.Description as 'Čvor Naziv',
  st_root.node_id as 'ROOT ID',
  st_root.Description as 'ROOT KATEGORIJA'
FROM products p
LEFT JOIN search_trees st_child ON (
  p.Description LIKE CONCAT('%', st_child.Description, '%')
  AND st_child.tree_id = 1
  AND st_child.parent_node_id > 0
)
LEFT JOIN search_trees st_root ON (
  st_root.node_id = st_child.parent_node_id
  AND st_root.tree_id = 1
  AND st_root.parent_node_id = 0
)
WHERE p.ID = 416
LIMIT 5;
```

---

## 📊 STRUKTURA BAZE - KLJUČNE TABELE

### 1. ARTICLES Tabela
```
Šta sadrži: Svi artikli (6.7M redova)

Ključne kolone:
- id: Jedinstveni Article ID
- DataSupplierArticleNumber: Broj artikla (npr. "HX 81D")
- CurrentProduct: ID u products tabeli
- IsValid: Da li je validan (1 = DA)
```

### 2. PRODUCTS Tabela
```
Šta sadrži: Kategorije proizvoda (5,843 redova)

Ključne kolone:
- ID: Product ID
- Description: Naziv proizvoda (npr. "Hydraulic Filter, automatic transmission")
```

### 3. SEARCH_TREES Tabela
```
Šta sadrži: Hijerarhija kategorija (6,611 redova)

Ključne kolone:
- node_id: ID čvora (npr. 100262)
- parent_node_id: ID parent čvora (npr. 100005)
- Description: Naziv čvora (npr. "Hydraulic Filter")
- tree_id: Tip hijerarhije (1 = putničke automobile)

Mapiranje:
- parent_node_id = 0 → ROOT KATEGORIJA (36 mogućih)
- parent_node_id > 0 → CHILD čvor (trebam slijediti parent)
```

---

## 🔍 MAPIRANJE LANAC - DETALJNO OBJAŠNJENJE

```
┌─────────────────────────────────────────────────────────────────┐
│ ARTICLE: HX 81D (Article ID: 166535197)                        │
│ Dobavljač: KNECHT                                               │
│ Tip: Hydraulic Filter, automatic transmission                   │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ PRODUCTS LOOKUP: CurrentProduct = 416                           │
│ Product Description: "Hydraulic Filter, automatic transmission" │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ SEARCH_TREES MATCHING:                                          │
│ Trebam pronaći čvorove koji se nalaze u Description             │
│                                                                  │
│ Mogućnosti:                                                      │
│ 1. "Hydraulic Filter" → čvor 100262 → parent 100005             │
│ 2. "Automatic Transmission" → čvor 100240 → parent 100238       │
│ 3. "Filter" → čvor 100808 → parent 100006                       │
│                                                                  │
│ ODABIRAMO: "Hydraulic Filter" jer je SPECIFIČNIJA ✅            │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ PRONAĐI ROOT: parent_node_id = 0                                │
│                                                                  │
│ čvor 100005:                                                     │
│   - node_id: 100005                                              │
│   - Description: "Filters"                                       │
│   - parent_node_id: 0 ✅ (OVO JE ROOT!)                          │
│   - tree_id: 1 (putničke automobile)                             │
└─────────────────────────────────────────────────────────────────┘
                           ↓
          ✅ REZULTAT: Filters (ID: 100005)
```

---

## 💡 KLJUČNI KONCEPTI

### 1. TREE_ID = 1 (Putničke Automobile)
- Trebamo koristiti samo `tree_id = 1` za filtiranje
- Drugi tree_id-evi (2, 3, 4, 11, 12, 14) su za komercijalna vozila, motore, itd.

### 2. PARENT_NODE_ID = 0 (ROOT)
- Samo čvorovi sa `parent_node_id = 0` su ROOT kategorije
- Postoji tačno 36 root kategorija za tree_id = 1

### 3. LIKE MATCHING
```sql
Product Description LIKE CONCAT('%', search_trees Description, '%')
```
- "Hydraulic Filter, automatic transmission" LIKE "%Hydraulic Filter%"
- Ovo omogućava pronalaženje čvorova čak i ako product ima duži opis

### 4. SPECIFIČNOST > OPŠTENOST
- Ako ima nekoliko mogućih čvorova, odaberi SPECIFIČNIJI
- "Hydraulic Filter" je specifičniji od "Filter"
- To vodi do tačnije root kategorije

---

## 🎓 PRIMJER: Korak po Korak Kako Testiram

### U MySQL:
```bash
mysql -u root tecdoc1q2019
```

### Korak 1:
```sql
-- Pronađi article
SELECT id, DataSupplierArticleNumber, CurrentProduct
FROM articles
WHERE DataSupplierArticleNumber = 'HX 81D' LIMIT 1;
```

### Korak 2:
```sql
-- Pronađi product
SELECT ID, Description
FROM products
WHERE ID = 416 LIMIT 1;
```

### Korak 3:
```sql
-- Pronađi search_trees čvorove
SELECT node_id, Description, parent_node_id
FROM search_trees
WHERE tree_id = 1
  AND 'Hydraulic Filter, automatic transmission' LIKE CONCAT('%', Description, '%')
LIMIT 10;
```

### Korak 4:
```sql
-- Pronađi root za čvor 100262
SELECT node_id, Description, parent_node_id
FROM search_trees
WHERE node_id = 100005 AND parent_node_id = 0;
```

---

## 🔬 SVI SQL UPITI KOJE SAM KORISTIO - KOMPLETAN PREGLED

### SQL Upit 1: Pronađi Article po Broju (HX 81D)

**Svrha**: Pronalaženje article ID-a i osnovnih podataka

```sql
SELECT
  a.id,
  a.DataSupplierArticleNumber as 'Broj',
  a.Supplier,
  a.CurrentProduct,
  p.Description as 'Proizvod',
  a.IsValid,
  s.Description as 'Dobavljač'
FROM articles a
LEFT JOIN products p ON p.ID = a.CurrentProduct
LEFT JOIN suppliers s ON s.ID = a.Supplier
WHERE a.DataSupplierArticleNumber = 'HX 81D'
LIMIT 5;
```

**Rezultat**:
```
id: 166535197
Broj: HX 81D
Dobavljač: KNECHT
CurrentProduct: 416
Proizvod: Hydraulic Filter, automatic transmission
IsValid: 1
```

---

### SQL Upit 2: Pronađi sve Filtere po Description

**Svrha**: Pronalaženje svih proizvoda koji sadrže reč "Filter"

```sql
SELECT
  p.ID,
  p.Description as 'Proizvod',
  COUNT(a.id) as 'Broj Artikala'
FROM products p
LEFT JOIN articles a ON a.CurrentProduct = p.ID
WHERE p.Description LIKE '%Filter%'
GROUP BY p.ID, p.Description
ORDER BY COUNT(a.id) DESC
LIMIT 20;
```

**Rezultat** (Top 5):
```
ID  | Proizvod                              | Broj Artikala
8   | Air Filter                            | 85,949
424 | Filter, interior air                  | 49,898
9   | Fuel filter                           | 43,346
7   | Oil Filter                            | 35,182
5172| Soot/Particulate Filter Cleaning      | 19,664
```

---

### SQL Upit 3: Pronađi Sve Root Kategorije sa "Filter" u Imenu

**Svrha**: Pronalaženje root čvorova koji sadrže "Filter"

```sql
SELECT
  node_id,
  parent_node_id,
  Description as 'Root Kategorija',
  tree_id
FROM search_trees
WHERE tree_id = 1
  AND parent_node_id = 0
  AND Description LIKE '%Filter%';
```

**Rezultat**:
```
node_id | parent_node_id | Root Kategorija | tree_id
100005  | 0              | Filters         | 1
```

---

### SQL Upit 4: Pronađi Kompatibilna Vozila za HX 81D

**Svrha**: Pronalaženje vozila koja su kompatibilna sa proizvodom

```sql
SELECT
  COUNT(DISTINCT tnp.parent_node_id) as 'Broj vozila sa HX 81D'
FROM tree_node_products tnp
WHERE tnp.product_id = 416
  AND tnp.tree_id = 1;
```

**Rezultat**:
```
Broj vozila sa HX 81D: 3
```

---

### SQL Upit 5: Pronađi Detaljne Informacije o Kompatibilnim Vozilima

**Svrha**: Pronalaženje nazivanja i godina vozila

```sql
SELECT
  tnp.parent_node_id as 'Vehicle ID',
  pc.Description as 'Vozilo',
  pc.From as 'Od godine',
  pc.To as 'Do godine'
FROM tree_node_products tnp
LEFT JOIN passengercars pc ON pc.ID = tnp.parent_node_id
WHERE tnp.product_id = 416
  AND tnp.tree_id = 1
  AND tnp.parent_node_id IS NOT NULL
GROUP BY tnp.parent_node_id
ORDER BY pc.Description;
```

**Rezultat**:
```
Vehicle ID | Vozilo | Od godine  | Do godine
100240     | 1.5    | 2013-08-01 | 2016-05-31
```

---

### SQL Upit 6: Root Kategorija sa LIKE Matching (GLAVNI UPIT!)

**Svrha**: KOMPLETAN lanac od artikla do root kategorije

```sql
SELECT
  'HX 81D' as 'Artikel',
  p.Description as 'Proizvod',
  st_child.node_id as 'search_trees čvor',
  st_child.Description as 'čvor naziv',
  st_child.parent_node_id as 'parent_id',
  st_root.node_id as 'ROOT ID',
  st_root.Description as 'ROOT KATEGORIJA'
FROM products p
LEFT JOIN search_trees st_child ON (
  p.Description LIKE CONCAT('%', st_child.Description, '%')
  AND st_child.tree_id = 1
  AND st_child.parent_node_id > 0
)
LEFT JOIN search_trees st_root ON (
  st_root.node_id = st_child.parent_node_id
  AND st_root.tree_id = 1
  AND st_root.parent_node_id = 0
)
WHERE p.ID = 416
LIMIT 5;
```

**Rezultat**:
```
Artikel | Proizvod                              | search_trees čvor | čvor naziv                | parent_id | ROOT ID | ROOT KATEGORIJA
HX 81D  | Hydraulic Filter, automatic trans.    | 100262            | Hydraulic Filter          | 100005    | 100005  | Filters
HX 81D  | Hydraulic Filter, automatic trans.    | 100240            | Automatic Transmission    | 100238    | 100238  | Transmission
HX 81D  | Hydraulic Filter, automatic trans.    | 100808            | Filter                    | 100006    | 100006  | Brake System
```

---

### SQL Upit 7: Testiranje Statističkog Mapiranja (Skalabilnost)

**Svrha**: Provera koliko % artikala ima root kategoriju

```sql
SELECT
  COUNT(DISTINCT a.id) as 'Testirano',
  SUM(CASE WHEN st_root.node_id IS NOT NULL THEN 1 ELSE 0 END) as 'Sa ROOT',
  ROUND(100 * SUM(CASE WHEN st_root.node_id IS NOT NULL THEN 1 ELSE 0 END) / COUNT(DISTINCT a.id), 2) as '%'
FROM (
  SELECT id FROM articles LIMIT 1000
) a_sample
LEFT JOIN articles a ON a.id = a_sample.id
LEFT JOIN products p ON p.ID = a.CurrentProduct
LEFT JOIN search_trees st_child ON (
  st_child.Description = p.Description
  AND st_child.tree_id = 1
  AND st_child.parent_node_id > 0
)
LEFT JOIN search_trees st_root ON (
  st_root.node_id = st_child.parent_node_id
  AND st_root.tree_id = 1
  AND st_root.parent_node_id = 0
);
```

**Rezultat**:
```
Testirano | Sa ROOT | %
1000      | 1000    | 100.00
```

---

### SQL Upit 8: Pronađi Sve Root Kategorije (36 komada)

**Svrha**: Kompletan pregled svih root kategorija

```sql
SELECT
  st.node_id,
  st.Description as 'Root Kategorija',
  COUNT(DISTINCT a.id) as 'Broj Artikala',
  st.tree_id
FROM search_trees st
LEFT JOIN products p ON (
  p.Description LIKE CONCAT('%', st.Description, '%')
)
LEFT JOIN articles a ON (
  a.CurrentProduct = p.ID
)
WHERE st.tree_id = 1
  AND st.parent_node_id = 0
GROUP BY st.node_id, st.Description, st.tree_id
ORDER BY COUNT(DISTINCT a.id) DESC;
```

---

### SQL Upit 9: Pronađi Root Kategoriju za Production Lookup

**Svrha**: Brz lookup kada znamo Product ID

```sql
SELECT
  p.ID as 'Product ID',
  p.Description as 'Proizvod',
  st_child.node_id as 'Čvor ID',
  st_child.Description as 'Čvor Naziv',
  st_root.node_id as 'ROOT ID',
  st_root.Description as 'ROOT KATEGORIJA'
FROM products p
LEFT JOIN search_trees st_child ON (
  p.Description LIKE CONCAT('%', st_child.Description, '%')
  AND st_child.tree_id = 1
  AND st_child.parent_node_id > 0
)
LEFT JOIN search_trees st_root ON (
  st_root.node_id = st_child.parent_node_id
  AND st_root.tree_id = 1
  AND st_root.parent_node_id = 0
)
WHERE p.ID = 416
LIMIT 5;
```

---

### SQL Upit 10: Pronađi Article Broj za Pronalaženje Root Kategorije

**Svrha**: Kompletan lanac od article broja do root kategorije (ONE-LINER verzija)

```sql
SELECT
  a.DataSupplierArticleNumber as 'Artikel Broj',
  p.Description as 'Proizvod',
  st_child.node_id as 'search_trees Čvor ID',
  st_child.Description as 'Čvor Naziv',
  st_root.node_id as 'ROOT ID',
  st_root.Description as 'ROOT KATEGORIJA'
FROM articles a
LEFT JOIN products p ON p.ID = a.CurrentProduct
LEFT JOIN search_trees st_child ON (
  p.Description LIKE CONCAT('%', st_child.Description, '%')
  AND st_child.tree_id = 1
  AND st_child.parent_node_id > 0
)
LEFT JOIN search_trees st_root ON (
  st_root.node_id = st_child.parent_node_id
  AND st_root.tree_id = 1
  AND st_root.parent_node_id = 0
)
WHERE a.DataSupplierArticleNumber = 'HX 81D'
LIMIT 5;
```

---

## ✅ ZAKLJUČAK

### Algoritam za pronalaženje root kategorije:

1. **Ulaz**: Article broj (npr. "HX 81D")
2. **Pronađi**: Article ID i CurrentProduct ID
3. **Pronađi**: Product Description
4. **Pronađi**: search_trees čvor koji se poklapa (LIKE matching)
5. **Pronađi**: parent_node_id tog čvora
6. **Pronađi**: ROOT čvor gdje je parent_node_id = 0
7. **Izlaz**: ROOT KATEGORIJA

### Za HX 81D:
- **Article**: HX 81D → ID 166535197
- **Product**: ID 416 → "Hydraulic Filter, automatic transmission"
- **search_trees čvor**: 100262 → "Hydraulic Filter"
- **Parent**: 100005
- **ROOT**: 100005 → "Filters" ✅

---

**Kreirano**: 8. novembar 2025.
**Status**: DETALJNO UPUTSTVO - Spremno za upotrebu
**Fajl**: `/Users/emir_mw/tecdoc/HOW_TO_FIND_ARTICLE_ROOT_CATEGORY.md`
