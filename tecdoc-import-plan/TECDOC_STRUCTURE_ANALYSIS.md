# 🔍 TecDoc Struktura - Analiza i Provjera

**Datum**: 8. novembar 2025.  
**Cilj**: Razumjeti kako TecDoc organizuje podatke o vozilima (Model → Generacija → Motor)

---

## 📋 Pitanja za Provjeru

### 1️⃣ Kako TecDoc Organizuje Podatke?

**Query za Audi A4 B8:**

```sql
SELECT 
    m.id as model_id,
    m.Description as model_name,
    pc.id as car_id,
    pc.Description as car_description,
    pc.`From`,
    pc.`To`
FROM models m
JOIN passengercars pc ON pc.Model = m.id
WHERE m.Description LIKE '%A4%B8%'
ORDER BY pc.`From`
LIMIT 20;
```

**Pokrenite:**
```bash
mysql -u root tecdoc1q2019 -e "SELECT m.id as model_id, m.Description as model_name, pc.id as car_id, pc.Description as car_description, pc.\`From\`, pc.\`To\` FROM models m JOIN passengercars pc ON pc.Model = m.id WHERE m.Description LIKE '%A4%B8%' ORDER BY pc.\`From\` LIMIT 20"
```

**Pitanja:**
- ✅ Da li svi `passengercars` za A4 B8 imaju **isti period** (From/To)?
- ✅ Da li svi imaju **isti kod generacije** (B8, 8K2) u Description?
- ❌ Da li su **različiti motori** (1.8 TFSI, 2.0 TDI, itd.)?

---

### 2️⃣ Kako Razlikovati Generaciju od Motora?

**Query za Golf modele:**

```sql
SELECT 
    m.Description as model,
    COUNT(DISTINCT pc.id) as broj_motora,
    MIN(pc.`From`) as od,
    MAX(pc.`To`) as do
FROM models m
JOIN passengercars pc ON pc.Model = m.id
WHERE m.Description LIKE '%GOLF%'
GROUP BY m.id, m.Description
ORDER BY m.Description;
```

**Pokrenite:**
```bash
mysql -u root tecdoc1q2019 -e "SELECT m.Description as model, COUNT(DISTINCT pc.id) as broj_motora, MIN(pc.\`From\`) as od, MAX(pc.\`To\`) as do FROM models m JOIN passengercars pc ON pc.Model = m.id WHERE m.Description LIKE '%GOLF%' GROUP BY m.id, m.Description ORDER BY m.Description"
```

**Pitanja:**
- Koliko `passengercars` zapisa ima **jedan model**?
- Da li su **svi različiti motori** ili **različite generacije**?
- Primjer: `GOLF III (1H1)` - koliko motora?

---

### 3️⃣ Kako Povezati Motore sa Passengercars?

**Query za jedan passengercars zapis:**

```sql
SELECT 
    pc.id,
    pc.Description,
    e.id as engine_id,
    e.Description as engine_code
FROM passengercars pc
LEFT JOIN passengercars_link_engines ple ON ple.car_id = pc.id
LEFT JOIN engines e ON e.id = ple.engine_id
WHERE pc.id = 23299
LIMIT 10;
```

**Pokrenite:**
```bash
mysql -u root tecdoc1q2019 -e "SELECT pc.id, pc.Description, e.id as engine_id, e.Description as engine_code FROM passengercars pc LEFT JOIN passengercars_link_engines ple ON ple.car_id = pc.id LEFT JOIN engines e ON e.id = ple.engine_id WHERE pc.id = 23299 LIMIT 10"
```

**Pitanja:**
- Koliko **engine_id** ima jedan `passengercars`?
- Da li je **1 passengercars = 1 motor** ili **1 passengercars = više motora**?

---

### 4️⃣ Provjera Strukture: Model vs Generacija

**Query za detaljnu analizu:**

```sql
SELECT 
    m.id,
    m.Description,
    COUNT(DISTINCT pc.id) as total_passengercars,
    COUNT(DISTINCT SUBSTRING_INDEX(pc.Description, ' ', 1)) as unique_engines
FROM models m
JOIN passengercars pc ON pc.Model = m.id
WHERE m.ManufacturerId = 121  -- VW
GROUP BY m.id, m.Description
ORDER BY total_passengercars DESC
LIMIT 10;
```

**Pokrenite:**
```bash
mysql -u root tecdoc1q2019 -e "SELECT m.id, m.Description, COUNT(DISTINCT pc.id) as total_passengercars FROM models m JOIN passengercars pc ON pc.Model = m.id WHERE m.ManufacturerId = 121 GROUP BY m.id, m.Description ORDER BY total_passengercars DESC LIMIT 10"
```

**Pitanja:**
- Koji model ima **najviše passengercars** zapisa?
- Da li to znači **više motora** ili **više generacija**?

---

## 📊 Očekivani Rezultati

### Scenario A: 1 Model = 1 Generacija, Više Motora

```
models:
  └─ GOLF III (1H1) [1991-1997]

passengercars:
  ├─ 1.6 ABU (74kW)
  ├─ 1.8 AAM (55kW)
  ├─ 1.9 TDI 1Z (66kW)
  └─ 2.0 GTI 16V ABF (110kW)
```

**Zaključak**: 
- ✅ `models.Description` = **MODEL + GENERACIJA**
- ✅ `passengercars` = **MOTORI**
- ✅ Trebamo grupisati passengercars po modelu

---

### Scenario B: 1 Model = Više Generacija

```
models:
  ├─ GOLF III (1H1) [1991-1997]
  ├─ GOLF IV (1J1) [1997-2005]
  └─ GOLF V (1K1) [2003-2008]

passengercars (za Golf III):
  ├─ 1.6 ABU
  └─ 1.9 TDI 1Z
```

**Zaključak**:
- ✅ `models` = **MODEL + GENERACIJA** (već razdvojeno)
- ✅ `passengercars` = **MOTORI**
- ✅ Možemo direktno mapirati

---

## 🎯 Što Trebamo Utvrditi

### Ključna Pitanja:

1. **Da li TecDoc ima posebne zapise za generacije?**
   - Ili je generacija **uključena u naziv modela**?

2. **Da li passengercars predstavlja:**
   - ❓ Jedan motor za jednu generaciju?
   - ❓ Ili jednu varijantu vozila (motor + oprema)?

3. **Kako grupisati passengercars u generacije?**
   - Po **periodu** (From/To)?
   - Po **kodu generacije** u Description?
   - Po **modelu** (models.id)?

---

## 📝 Primjer Analize

### Audi A4 - Očekivana Struktura

```
Model: A4
  ├─ Generacija: B5 (8D2) [1994-2001]
  │   ├─ Motor: 1.6 AHL (74kW/100PS)
  │   ├─ Motor: 1.8 T AEB (110kW/150PS)
  │   └─ Motor: 1.9 TDI AFN (81kW/110PS)
  │
  ├─ Generacija: B6 (8E2) [2000-2004]
  │   ├─ Motor: 1.6 ALZ (75kW/102PS)
  │   ├─ Motor: 1.8 T AVJ (120kW/163PS)
  │   └─ Motor: 2.0 TDI BPW (100kW/136PS)
  │
  └─ Generacija: B8 (8K2) [2007-2015]
      ├─ Motor: 1.8 TFSI CABB (118kW/160PS)
      ├─ Motor: 2.0 TDI CAGA (105kW/143PS)
      └─ Motor: 3.0 TDI CCWA (176kW/240PS)
```

### TecDoc Struktura (Provjeriti):

**Opcija 1: Generacija u models**
```sql
models:
  - A4 (8D2, B5)  ← MODEL + GENERACIJA
  - A4 (8E2, B6)  ← MODEL + GENERACIJA
  - A4 (8K2, B8)  ← MODEL + GENERACIJA

passengercars (za B8):
  - 1.8 TFSI CABB
  - 2.0 TDI CAGA
  - 3.0 TDI CCWA
```

**Opcija 2: Generacija NIJE u models**
```sql
models:
  - A4  ← SAMO MODEL

passengercars:
  - B5 - 1.6 AHL
  - B5 - 1.8 T AEB
  - B6 - 1.6 ALZ
  - B8 - 1.8 TFSI CABB
```

---

## ✅ Akcije Nakon Analize

### Ako je Opcija 1 (Generacija u models):
```python
# Jednostavno:
VehicleModel.name = parse_model_name("A4 (8K2, B8)")  # "A4"
VehicleGeneration.name = parse_generation("A4 (8K2, B8)")  # "B8 (8K2)"
VehicleEngine = passengercars  # Direktno mapiranje
```

### Ako je Opcija 2 (Generacija NIJE u models):
```python
# Kompleksnije - trebamo grupisati:
1. Parsirati passengercars.Description za generaciju
2. Grupisati passengercars po generaciji
3. Kreirati VehicleGeneration za svaku grupu
4. Kreirati VehicleEngine za svaki passengercars
```

---

## 🚀 Sljedeći Koraci

1. **Pokrenite sve query-je** iz ovog dokumenta
2. **Analizirajte rezultate**
3. **Odredite koji scenario** odgovara TecDoc strukturi
4. **Javite mi rezultate** - ažuriraću import skriptu

---

## 📌 Napomene

- **models.Description** format: `MODEL (KOD, GENERACIJA)`
- **passengercars.Description** format: `MOTOR_VELIČINA MOTOR_KOD`
- **engines.Description** format: `MOTOR_KOD` (CDBA, BKC, itd.)

Provjerite ove formate u vašoj bazi!
