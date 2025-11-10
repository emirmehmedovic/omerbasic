# 🔍 TecDoc Struktura - KOMPLETAN VODIČ

**Datum**: 8. novembar 2025.
**Status**: ✅ ANALIZIRANO I VERIFICIRANO
**Cilj**: Razumjeti kako TecDoc organizuje podatke: Model → Generacija → Motor

---

## 📊 REZULTATI ANALIZE

### Query 1: Audi A4 B8 - Generacije u Models

```
✅ Rezultat:
model_id = 6418
model_name = "A4 (8K2, B8)"
└── Sadrži 20+ passengercars zapisa (različiti motori)
```

**Zaključak**:
- ✅ **Generacija JE u models.Description**
- ✅ Format: `MODEL (KOD, GENERACIJA)`
- ✅ Primjer: `A4 (8K2, B8)` = Audi A4, kod 8K2, generacija B8
- ✅ Svi motori za B8 imaju isti model_id (6418)

---

### Query 2: Golf Modeli - Različite Generacije

```
✅ Rezultati (odabrani):
ID   Model                        Varijanti  Od    Do
497  GOLF I (17)                  22        1974  1985
500  GOLF II (19E, 1G1)           39        1983  1992
505  GOLF III (1H1)               23        1991  1997
1994 GOLF IV (1J1)                41        1997  2005
4991 GOLF V (1K1)                 37        2003  2009
```

**Zaključak**:
- ✅ **Svaka generacija ima SVOJ model_id**
- ✅ GOLF I, II, III, IV, V = **RAZLIČITI modeli** u bazi
- ✅ passengercars je grupisan po **generaciji**
- ❌ Nema jednog "GOLF" modela sa sub-generacijama

---

### Query 3: Passengercars - Motori

```
✅ Rezultati:
ID    Description      Broj Motora  Motori
23299 1.8 TFSI         2           CABB, CDHB
23300 3.2 FSI quattro  1           CALA
23301 2.0 TDI          4           CAGA, CJCA, CMEA, CMFA
23302 2.7 TDI          2           CAMA, CGKA
```

**Zaključak**:
- ✅ **1 passengercars može imati VIŠE motora**
- ✅ `passengercars_link_engines` je N:M veza
- ✅ Primjer: "2.0 TDI" ima 4 različita motor koda (različite varijante)
- ✅ passengercars = **MOTOR VELIČINA + VERZIJA** (npr. "1.8 TFSI", "2.0 TDI")

---

## 🏗️ TECDOC HIJERARHIJA

```
manufacturers (Audi, VW, BMW itd.)
│
└── models (A4, A4 Avant, A4L, itd.)
    │
    ├── GOLF I (17) ← Generacija 1
    │   └── passengercars (23 varijante)
    │       └── 1.6 AHL, 1.8 GU, 1.9 GQ, itd.
    │           └── engines (CABB, CDHB, itd.)
    │
    ├── GOLF II (19E) ← Generacija 2
    │   └── passengercars (39 varijanti)
    │
    ├── GOLF III (1H1) ← Generacija 3
    │   └── passengercars (23 varijante)
    │
    └── GOLF IV (1J1) ← Generacija 4
        └── passengercars (41 varijanta)

Nakey:
- models = MODEL + GENERACIJA (razvojeno po ID-u)
- passengercars = MOTOR VELIČINA + VERZIJA
- engines = MOTOR KOD (CABB, BKC, AHL, itd.)
```

---

## 📋 MAPIRANJE TABELA

### 1. Manufacturers → Models

**Tablica**: `manufacturers` (1) ↔ (N) `models`

```sql
-- Svi modeli za Audi
SELECT m.Description, COUNT(*) as broj_modela_s_tim_imenom
FROM manufacturers mf
JOIN models m ON m.ManufacturerId = mf.id
WHERE mf.Description = 'AUDI'
GROUP BY m.Description
LIMIT 10;
```

**Rezultat**: Svaki model ima `ManufacturerId` za proizvođača

---

### 2. Models → Passengercars

**Tablica**: `models` (1) ↔ (N) `passengercars`

```sql
-- Svi motori za A4 B8
SELECT m.Description, pc.Description, COUNT(*) as broj
FROM models m
JOIN passengercars pc ON pc.Model = m.id
WHERE m.Description LIKE '%A4%B8%'
GROUP BY m.Description, pc.Description
LIMIT 10;
```

**Rezultat**: `passengercars.Model` sadrži `models.id`

---

### 3. Passengercars → Engines

**Tablica**: `passengercars` (N) ↔ (M) `engines` (preko `passengercars_link_engines`)

```sql
-- Svi motori za 1.8 TFSI A4 B8
SELECT pc.Description, e.Description
FROM passengercars pc
LEFT JOIN passengercars_link_engines ple ON ple.car_id = pc.id
LEFT JOIN engines e ON e.id = ple.engine_id
WHERE pc.id = 23299;
```

**Rezultat**:
```
1.8 TFSI → CABB
1.8 TFSI → CDHB
```

---

## 🎯 KLJUČNE OSOBINE

### models.Description Format

**Format**: `MODEL (KOD, GENERACIJA)` ili `MODEL VARIJANTA (KOD, GEN)`

```
Primeri:
├── A4 (8K2, B8)              ← Sedan
├── A4 Avant (8K5, B8)        ← Break/Kombi
├── A4L Saloon (8K2, B8)      ← Duža verzija (za tržišta)
├── GOLF I (17)               ← Originalni Golf
├── GOLF II (19E, 1G1)        ← Dva koda? (8K2=šasija, 1G1=?????)
├── GOLF III (1H1)
├── GOLF IV (1J1)
├── GOLF V (1K1)
└── GOLF PLUS (5M1, 521)      ← Različita oznaka
```

---

### passengercars.Description Format

**Format**: `VELIČINA MOTOR_VERZIJA` ili `VELIČINA MOTOR_TIP OPCIJE`

```
Primeri za A4 B8:
├── 1.8 TFSI                  ← Benzin, turbonabijan
├── 3.2 FSI quattro           ← Benzin, quattro (4x4)
├── 2.0 TDI                    ← Diesel
├── 2.7 TDI                    ← Diesel
├── 3.0 TDI quattro           ← Diesel, quattro

Primeri za Golf:
├── 1.1                        ← Golf I
├── 1.3 GU                     ← Golf II
├── 1.6 ABU                    ← Golf III
├── 1.8 T AGU                  ← Golf IV (Turbo)
├── 2.0 GTI BVY               ← Golf V GTI
```

---

## 💾 SQL QUERIES ZA PRONALAŽENJE

### Pronađi Sve Generacije za Vozilo

```sql
SELECT DISTINCT
    m.Description as generacija,
    MIN(YEAR(pc.`From`)) as od_godine,
    MAX(YEAR(pc.`To`)) as do_godine,
    COUNT(DISTINCT pc.id) as broj_motora
FROM models m
JOIN passengercars pc ON pc.Model = m.id
WHERE m.Description LIKE '%AUDI%'
  AND m.Description LIKE '%A4%'
GROUP BY m.id, m.Description
ORDER BY MIN(YEAR(pc.`From`));
```

**Rezultat**: Sve A4 generacije sa vremenski rasponima

---

### Pronađi Sve Motore za Generaciju

```sql
SELECT
    pc.Description as motor,
    COUNT(DISTINCT e.id) as broj_kodova,
    GROUP_CONCAT(DISTINCT e.Description SEPARATOR ', ') as kodovi
FROM passengercars pc
LEFT JOIN passengercars_link_engines ple ON ple.car_id = pc.id
LEFT JOIN engines e ON e.id = ple.engine_id
WHERE pc.Model = 6418  -- A4 B8
GROUP BY pc.Description
ORDER BY pc.Description;
```

**Rezultat**: Svi motori sa svim kodovima

---

### Pronađi Sve Varijante za Motor

```sql
SELECT
    pc.Description as motor,
    e.Description as kod,
    YEAR(pc.`From`) as od,
    YEAR(pc.`To`) as do
FROM passengercars pc
LEFT JOIN passengercars_link_engines ple ON ple.car_id = pc.id
LEFT JOIN engines e ON e.id = ple.engine_id
WHERE pc.id = 23299
ORDER BY pc.`From`;
```

**Rezultat**: Vremenske varijante za 1.8 TFSI

---

## 🔄 KAKO STRUKTUIRATI PODATKE ZA APLIKACIJU

### Scenario A: Ako trebas Model → Generacija → Motor

```python
class Vehicle:
    def __init__(self):
        self.manufacturer = "Audi"
        self.model = "A4"           # Parsevati iz models.Description
        self.generation = "B8"      # Parsevati iz models.Description
        self.generation_code = "8K2"
        self.years = (2007, 2015)

    def add_engine(self, size, type_name, engine_codes):
        # passengercars.Description → size, type
        # engines → kodovi
        self.engines.append({
            'size': size,           # "1.8"
            'type': type_name,      # "TFSI"
            'codes': engine_codes,  # ["CABB", "CDHB"]
        })

# Primer:
audi_a4_b8 = Vehicle()
audi_a4_b8.add_engine("1.8", "TFSI", ["CABB", "CDHB"])
audi_a4_b8.add_engine("2.0", "TDI", ["CAGA", "CJCA", "CMEA", "CMFA"])
```

---

### Scenario B: Direktno iz Baze

```python
# Query koji daje sve što trebas
SELECT
    m.id as model_id,
    m.Description as model_full_name,
    pc.id as passengercars_id,
    pc.Description as engine_description,
    YEAR(pc.From) as od,
    YEAR(pc.To) as do,
    GROUP_CONCAT(e.Description) as engine_codes
FROM models m
JOIN passengercars pc ON pc.Model = m.id
LEFT JOIN passengercars_link_engines ple ON ple.car_id = pc.id
LEFT JOIN engines e ON e.id = ple.engine_id
WHERE m.Description LIKE '%A4%B8%'
GROUP BY m.id, pc.id
ORDER BY m.Description, pc.Description;
```

**Rezultat**: 1 red = 1 kombinacija (generacija + motor + kodovi)

---

## ⚠️ VAŽNE NAPOMENE

### 1. Multiple Generations Sa Istim Imenom?

```
Videli smo:
ID    Description
1994  GOLF IV (1J1)    [1997-2005]
7427  GOLF IV (1J1)    [2003-2009]
```

⚠️ **Dva različita ID-ja za istu generaciju!**
- Mogućnost: Različita tržišta ili facelift
- Preporuka: Koristiti `id + Description + years` kao ključ

---

### 2. Zamjena Motora Tijekom Generacije

```
A4 B8:
├── 1.8 TFSI [2007-2012]
└── 1.8 TFSI [2008-2015]  ← Različite godine
```

💡 **Različiti passengercars za istu veličinu motora ali različite periode**
- Novi motor kod ili refresh
- TecDoc čuva kao **zasebne passengercars** zapise

---

### 3. Motori sa Više Kodova

```
2.0 TDI:
├── CAGA
├── CJCA
├── CMEA
└── CMFA
```

✅ **Svi su varijante "2.0 TDI"**
- Različiti godišnji kuriri
- Različiti tržišne verzije
- Koriste se za pronalaženje dijelova

---

## 📈 KOMPLETAN PRIMER: Audi A4 Struktura

```
AUDI
└── Model: A4 (8D2, B5) [1994-2001]
    └── passengercars:
        ├── 1.6 AHL → [AHL]
        ├── 1.8 T AEB → [AEB, AUG]
        └── 1.9 TDI AFN → [AFN, AVB]

└── Model: A4 (8E2, B6) [2000-2004]
    └── passengercars:
        ├── 1.6 ALZ → [ALZ]
        ├── 1.8 T AVJ → [AVJ, AVG]
        └── 2.0 TDI BPW → [BPW]

└── Model: A4 (8K2, B8) [2007-2015]
    └── passengercars:
        ├── 1.8 TFSI → [CABB, CDHB]
        ├── 2.0 TDI → [CAGA, CJCA, CMEA, CMFA]
        ├── 2.7 TDI → [CAMA, CGKA]
        ├── 3.0 TDI → [CDUC, CGKB]
        └── 3.2 FSI → [CALA]
```

---

## ✅ ZAKLJUČAK

### TecDoc Struktura je:

1. **Generacije su u models tabeli** ✅
   - `models.Description` = "MODEL (KOD, GENERACIJA)"
   - Svaka generacija ima svoj `models.id`

2. **Motori su u passengercars** ✅
   - `passengercars.Description` = "VELIČINA TIP"
   - Povezani sa `engines` kroz `passengercars_link_engines`

3. **N:M veza između passengercars i engines** ✅
   - 1 "1.8 TFSI" može imati 2 različita engine koda
   - Potrebna `passengercars_link_engines` tabela

4. **Timespan je u passengercars** ✅
   - `passengercars.From` i `passengercars.To`
   - Znamo tačno koje godine je motor u ponudi

---

**Kreirano**: 8. novembar 2025.
**Status**: ✅ KOMPLETAN VODIČ - TecDoc struktura dokumentovana!
**File**: `/Users/emir_mw/tecdoc/TECDOC_STRUCTURE_ANALYSIS.md`
