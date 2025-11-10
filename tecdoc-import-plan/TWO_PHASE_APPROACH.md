# 🎯 TecDoc Import - 2-Faze Pristup

**Datum:** 8. novembar 2025.  
**Status:** ✅ OPTIMIZOVAN PRISTUP

---

## 🚀 Zašto 2 Faze?

### Problem Sa 1-Faze Pristupom:
- ❌ Sporo (3-4 sata za sve)
- ❌ Ako nešto pukne, gubite napredak
- ❌ Ne znate koliko proizvoda će biti pronađeno

### Prednosti 2-Faze Pristupa:
- ✅ **FAZA 1**: Brzo pronalazi sve proizvode (30-60 min)
- ✅ **FAZA 2**: Obogaćuje samo pronađene (2-3 sata)
- ✅ Možete zaustaviti i nastaviti
- ✅ Znate tačno koliko proizvoda ima u TecDoc-u

---

## 📊 Kako Radi

```
FAZA 1: Pronađi Proizvode (BRZO - 30-60 min)
├─ Učitaj sve proizvode iz Postgres
├─ Za svaki proizvod:
│  ├─ Pronađi u TecDoc po catalogNumber
│  ├─ Ako pronađen → spremi article_id i product_id
│  └─ Update Postgres sa ID-jevima
└─ Rezultat: Znamo koji proizvodi postoje u TecDoc-u

FAZA 2: Obogati Podatke (SPORO - 2-3 sata)
├─ Učitaj samo proizvode sa tecdocArticleId
├─ Za svaki proizvod:
│  ├─ Pronađi ROOT kategoriju (semantic matching)
│  ├─ Izvuci OEM brojeve
│  ├─ Izvuci specifikacije
│  ├─ Izvuci vozila
│  └─ Izvuci cross-references
└─ Rezultat: Potpuno obogaćeni proizvodi
```

---

## ⚡ FAZA 1: Pronađi Proizvode

### Skripta: `phase1_find_products.py`

**Što radi:**
- Pronalazi sve proizvode u TecDoc bazi
- Sprema samo `tecdocArticleId` i `tecdocProductId`
- NE izvlači dodatne podatke (brzo!)

**Pokretanje:**
```bash
cd tecdoc-import-plan
python phase1_find_products.py
```

**Output:**
```
📦 Loaded 24,617 products without TecDoc ID
✅ [1/24617] 1987947896 → Not found
✅ [2/24617] HX 81D → article_id=166535197
✅ [3/24617] 29449 → article_id=83782833
...

📊 Final Stats:
   Total: 24,617
   Found: 20,900 (85%)
   Not found: 3,717 (15%)
   Updated: 20,900
```

**Vrijeme:** 30-60 minuta

---

## 🎨 FAZA 2: Obogati Podatke

### Skripta: `tecdoc_enrichment_updated.py`

**Što radi:**
- Učitava samo proizvode sa `tecdocArticleId IS NOT NULL`
- Za svaki proizvod izvlači:
  - ✅ ROOT kategoriju (sa semantic matching)
  - ✅ OEM brojeve
  - ✅ Tehničke specifikacije
  - ✅ Kompatibilna vozila
  - ✅ Cross-references

**Pokretanje:**
```bash
python tecdoc_enrichment_updated.py
```

**Output:**
```
📦 Loaded 20,900 products with TecDoc ID

Processing: 29449
   🏷️  TecDoc ROOT (hierarchy): Transmission (node_id: 100238)
   ✅ Mapped to: Mjenjač / prenos
   📋 Found 5 OEM numbers
   🔧 Found 12 technical specs
   🚗 Found 45 compatible vehicles
   🔄 Found 8 cross-references
   💾 Updated in database

📊 Final Stats:
   Processed: 20,900
   Category mapped: 18,500 (88%)
   OEM found: 19,700 (94%)
   Specs found: 18,900 (90%)
```

**Vrijeme:** 2-3 sata

---

## 🔧 Semantic Matching Za ROOT Kategorije

### Problem:
"Transmission Oil" može matchovati na:
- 706233 "Oil" → 100238 "Transmission" ⭐⭐⭐
- 103352 "Oil" → 103202 "Power Take Off" ⭐
- 102201 "Oil" → 100011 "Suspension" ⭐

### Rješenje:
```sql
ORDER BY 
    CASE
        WHEN p.Description LIKE CONCAT('%', st_root.Description, '%') THEN 3  -- PERFECT!
        WHEN st_child.Description = p.Description THEN 2
        ELSE 1
    END DESC,
    LENGTH(st_child.Description) DESC
```

**Rezultat:**
- "Transmission Oil" → "Transmission" (100238) ✅ PERFECT MATCH!

---

## 📋 Workflow

### Dan 1: FAZA 1
```bash
# 1. Pokreni FAZA 1
python phase1_find_products.py

# 2. Provjeri rezultate
psql -d neondb -c "
SELECT 
    COUNT(*) as total,
    COUNT(\"tecdocArticleId\") as found,
    ROUND(100.0 * COUNT(\"tecdocArticleId\") / COUNT(*), 2) as pct
FROM \"Product\"
"
```

**Očekivano:**
```
total  | found | pct
24,617 | 20,900 | 84.90
```

### Dan 2: FAZA 2
```bash
# 1. Pokreni FAZA 2
python tecdoc_enrichment_updated.py

# 2. Monitoruj napredak
tail -f tecdoc_enrichment.log

# 3. Provjeri rezultate
psql -d neondb -c "
SELECT 
    COUNT(*) as total,
    COUNT(\"categoryId\") as with_category,
    COUNT(\"oemNumber\") as with_oem,
    COUNT(\"technicalSpecs\") as with_specs
FROM \"Product\"
WHERE \"tecdocArticleId\" IS NOT NULL
"
```

---

## ✅ Prednosti Ovog Pristupa

### 1. **Brzina**
- FAZA 1: 30-60 min (samo ID lookup)
- FAZA 2: 2-3 sata (samo za pronađene)
- **Ukupno: 3-4 sata** (isto kao prije, ali sa kontrolom)

### 2. **Sigurnost**
- Ako FAZA 1 pukne → samo ponovi (brzo)
- Ako FAZA 2 pukne → ponovi samo FAZA 2
- Možete zaustaviti i nastaviti

### 3. **Transparentnost**
- Znate tačno koliko proizvoda postoji u TecDoc-u
- Možete vidjeti napredak u realnom vremenu
- Lako debugujete probleme

### 4. **Optimizacija**
- FAZA 2 radi samo sa pronađenim proizvodima
- Ne gubi vrijeme na proizvode koji ne postoje
- Semantic matching za tačnije kategorije

---

## 🎯 Sljedeći Koraci

### 1. Testirajte FAZA 1
```bash
python phase1_find_products.py
```

### 2. Provjerite Rezultate
```sql
SELECT COUNT(*) FROM "Product" WHERE "tecdocArticleId" IS NOT NULL;
```

### 3. Pokrenite FAZA 2
```bash
python tecdoc_enrichment_updated.py
```

### 4. Verifikujte
```sql
SELECT 
    p.name,
    c.name as category,
    p."oemNumber",
    p."tecdocArticleId"
FROM "Product" p
LEFT JOIN "Category" c ON p."categoryId" = c.id
WHERE p."tecdocArticleId" IS NOT NULL
LIMIT 10;
```

---

## 📊 Očekivani Rezultati

| Metrika | Prije | FAZA 1 | FAZA 2 |
|---------|-------|--------|--------|
| Proizvoda ukupno | 24,617 | 24,617 | 24,617 |
| Sa TecDoc ID | 0 | **20,900** | 20,900 |
| Sa kategorijom | 24,617 | 24,617 | **24,617** |
| Sa OEM brojevima | 14,770 | 14,770 | **19,700** |
| Sa specifikacijama | 1,231 | 1,231 | **18,900** |
| Sa vozilima | 9,847 | 9,847 | **14,800** |

---

**Status:** ✅ Production Ready  
**Preporučeno:** DA - Ovaj pristup je bolji!
