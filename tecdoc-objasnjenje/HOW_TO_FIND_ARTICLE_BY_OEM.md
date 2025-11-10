# 🔍 KAKO PRONAĐI ARTICLE PO OEM BROJU - DETALJNI VODIČ

**Datum**: 8. novembar 2025.
**Primer**: OEM broj `4D0407694N`
**Cilj**: Pronađi sve artikle koji koriste ovaj OEM broj

---

## 📊 KORAK 1: Razumjeti Strukturu

### Šta je OEM Broj?

```
OEM = Original Equipment Manufacturer
4D0407694N = Originalni Audi broj
```

- **Proizvođač**: Audi
- **Proizvod**: Track Control Arm (upravljač za suspenziju)
- **Identificira**: Originalni dio

### Gdje su Čuvani OEM Brojevi?

**Tabela**: `article_oe_numbers`

| Kolona | Šta Sadrži |
|---|---|
| `article_id` | ID našeg artikla u bazi |
| `OENbr` | OEM broj koji tražimo |
| `Manufacturer` | ID proizvođača OEM (npr. 5 = Audi) |

---

## 🔎 KORAK 2: Pronađi OEM Broj u Bazi

### Query 1: Osnovni - Samo OEM Broj

```sql
SELECT *
FROM article_oe_numbers
WHERE OENbr = '4D0407694N'
LIMIT 10;
```

**Rezultat**:
```
article_id = 47065
OENbr = 4D0407694N
Manufacturer = 5 (Audi)
```

✅ **Pronašli smo**: Article ID je **47065**

---

### Query 2: Detaljan - Sa Informacijama o Artiklu

```sql
SELECT
  aon.article_id as 'Article ID',
  a.DataSupplierArticleNumber as 'Article Number',
  s.Description as 'Dobavljač',
  aon.OENbr as 'OEM Broj',
  aon.Manufacturer as 'Manufacturer ID'
FROM article_oe_numbers aon
LEFT JOIN articles a ON a.id = aon.article_id
LEFT JOIN suppliers s ON s.id = a.Supplier
WHERE aon.OENbr = '4D0407694N'
LIMIT 10;
```

**Rezultat**:
```
Article ID: 47065
Article Number: 210047
Dobavljač: A.B.S.
OEM Broj: 4D0407694N
Manufacturer: 5 (Audi)
```

---

## 📋 KORAK 3: Pronađi Sve Artikle za Ovaj OEM

**Problem**: OEM broj može imati **VIŠE ARTIKALA** jer različiti dobavljači prave zamjene za isti dio!

### Query 3: Svi Artikli za Jedan OEM

```sql
SELECT
  a.id as 'Article ID',
  a.DataSupplierArticleNumber as 'Article Number',
  s.Description as 'Dobavljač',
  p.Description as 'Proizvod',
  aon.OENbr as 'OEM Broj'
FROM article_oe_numbers aon
LEFT JOIN articles a ON a.id = aon.article_id
LEFT JOIN suppliers s ON s.id = a.Supplier
LEFT JOIN products p ON p.ID = a.CurrentProduct
WHERE aon.OENbr = '4D0407694N'
GROUP BY a.id, a.DataSupplierArticleNumber, s.Description, p.Description, aon.OENbr
ORDER BY s.Description;
```

**Rezultat**: 6-8 različitih artikala od različitih dobavljača!

---

## 🚗 KORAK 4: Pronađi Vozila koja Koriste Ovaj OEM

### Query 4: Vozila za OEM Broj

```sql
SELECT DISTINCT
  m.Description as 'Proizvodjač',
  mo.Description as 'Model',
  pc.Description as 'Generacija/Motor',
  COUNT(DISTINCT pc.id) as 'Broj varijanti'
FROM article_oe_numbers aon
LEFT JOIN passengercars pc ON 1=1
LEFT JOIN models mo ON mo.id = pc.Model
LEFT JOIN manufacturers m ON m.id = pc.ManufacturerId
WHERE aon.OENbr = '4D0407694N'
  AND aon.Manufacturer = m.id
GROUP BY m.id, m.Description, mo.id, mo.Description, pc.Description
ORDER BY m.Description, mo.Description
LIMIT 50;
```

**Rezultat**: Koja vozila koriste ovaj dio?

---

## ⚙️ KOMPLETAN PRIMER - Korak po Korak

### Tražim: OEM broj `4D0407694N`

### KORAK 1: Pronađi u `article_oe_numbers`

```bash
mysql -u root tecdoc1q2019 << 'EOF'
SELECT article_id, OENbr
FROM article_oe_numbers
WHERE OENbr = '4D0407694N'
LIMIT 1;
EOF
```

**Rezultat**:
```
article_id = 47065
OENbr = 4D0407694N
```

✅ **Article ID = 47065**

---

### KORAK 2: Pronađi Detalje o Artiklu

```bash
mysql -u root tecdoc1q2019 << 'EOF'
SELECT
  a.id,
  a.DataSupplierArticleNumber,
  s.Description,
  p.Description
FROM articles a
LEFT JOIN suppliers s ON s.id = a.Supplier
LEFT JOIN products p ON p.ID = a.CurrentProduct
WHERE a.id = 47065;
EOF
```

**Rezultat**:
```
ID: 47065
Article Number: 210047
Dobavljač: A.B.S.
Proizvod: Track Control Arm
```

---

### KORAK 3: Pronađi Sve Zamjene za Ovaj OEM

```bash
mysql -u root tecdoc1q2019 << 'EOF'
SELECT
  COUNT(DISTINCT a.id) as 'Broj različitih artikala',
  GROUP_CONCAT(DISTINCT s.Description SEPARATOR ', ') as 'Dobavljači'
FROM article_oe_numbers aon
LEFT JOIN articles a ON a.id = aon.article_id
LEFT JOIN suppliers s ON s.id = a.Supplier
WHERE aon.OENbr = '4D0407694N';
EOF
```

**Rezultat**:
```
Broj različitih artikala: 6
Dobavljači: A.B.S., AUTLOG, AUTOMEGA, AYD, BENDIX, BGA
```

---

## 📊 VIZUELNI PREGLED

```
OEM Broj: 4D0407694N
│
├─→ Article 47065 (A.B.S. - 210047)
├─→ Article 572933 (AUTLOG - FT1630)
├─→ Article 609982 (AUTOMEGA - 110060710)
├─→ Article 668470 (AYD - 9400049)
├─→ Article 713638 (BENDIX - 041647B)
└─→ Article 759739 (BGA - KS0100)
```

Svaki artikal je **različit proizvođač/dobavljač** ali koristi **isti OEM broj**

---

## 🎯 PRAKTIČNI SQL QUERIES

### Query A: Pronađi Article ID po OEM Broju (BRŽE)

```sql
SELECT DISTINCT article_id
FROM article_oe_numbers
WHERE OENbr = '4D0407694N'
LIMIT 1;
```

**Rezultat**: `47065`

---

### Query B: Pronađi Article Number po OEM Broju

```sql
SELECT
  a.DataSupplierArticleNumber as 'Article Number',
  s.Description as 'Dobavljač'
FROM article_oe_numbers aon
LEFT JOIN articles a ON a.id = aon.article_id
LEFT JOIN suppliers s ON s.id = a.Supplier
WHERE aon.OENbr = '4D0407694N'
LIMIT 1;
```

**Rezultat**: `210047` (A.B.S.)

---

### Query C: Pronađi Sve Artikle + Vozila

```sql
SELECT
  a.id as 'Article ID',
  a.DataSupplierArticleNumber as 'Article Number',
  s.Description as 'Dobavljač',
  COUNT(DISTINCT pc.id) as 'Kompatibilnih vozila'
FROM article_oe_numbers aon
LEFT JOIN articles a ON a.id = aon.article_id
LEFT JOIN suppliers s ON s.id = a.Supplier
LEFT JOIN passengercars pc ON 1=1
WHERE aon.OENbr = '4D0407694N'
  AND aon.Manufacturer = pc.ManufacturerId
GROUP BY a.id, a.DataSupplierArticleNumber, s.Description
ORDER BY COUNT(DISTINCT pc.id) DESC;
```

---

## 💡 VAŽNE NAPOMENE

### 1. OEM Broj Mora Biti Tačan

```
❌ POGREŠNO: '4D0407694'    (bez N)
❌ POGREŠNO: '4D0407694n'   (mala slova)
✅ TAČNO: '4D0407694N'      (velika slova, kompletan broj)
```

### 2. Razlika Između OEM i Article Number

```
OEM broj (4D0407694N):
  ├─ Originalni Audi broj
  ├─ Svi dobavljači koriste isti OEM broj
  └─ Pronalazak zamjena

Article Number (210047):
  ├─ Broj od dobavljača (A.B.S.)
  ├─ Različit za svaki dobavljač
  └─ Koristi se za narudžbu
```

### 3. Manufacturer ID je Važan

```
article_oe_numbers.Manufacturer = 5 (Audi)
  ↓
Ovo znači:
  - OEM je od Audija (originalni)
  - Trebas naći koja Audi vozila ga koriste
  - Ostalih 5 artikala su zamjene
```

---

## 🔄 TOK PRONALAŽENJA

```
1. Imaš OEM broj
         ↓
2. Traži u article_oe_numbers
         ↓
3. Pronađi article_id
         ↓
4. Pronađi detalje u articles tabeli
         ↓
5. Pronađi proizvod (products tabela)
         ↓
6. Pronađi vozila (passengercars tabela)
         ↓
7. Gotovo! Sada znaš:
   - Koji artikal koristi ovaj OEM
   - Koja vozila trebaju ovaj dio
   - Koje zamjene su dostupne
```

---

## 🛠️ PRIMJER U PRAKSI

### Scenario: Kupac traži dio za Audi A4

```
Kupac: "Trebam track control arm za Audi A4 B8, OEM je 4D0407694N"

1. Pronađi OEM broj
   → Article ID = 47065

2. Pronađi dobavljače
   → A.B.S. (210047)
   → AUTLOG (FT1630)
   → BENDIX (041647B)

3. Pronađi cijenu (trebam integrisati sa inventory sistemom)

4. Ponudi kupcu sve opcije
```

---

## 📚 DALJE ČITANJE

- `TECDOC_STRUCTURE_ANALYSIS.md` - Kako je organizovana baza
- `HOW_TO_FIND_ARTICLE_ROOT_CATEGORY.md` - Pronalaženje kategorija
- `ARTICLE_250570646_COMPLETE_VEHICLE_COMPATIBILITY.md` - OE broj analiza

---

**Kreirano**: 8. novembar 2025.
**Status**: ✅ KOMPLETAN VODIČ - OEM pronalaženje dokumentovano!
**File**: `/Users/emir_mw/tecdoc/HOW_TO_FIND_ARTICLE_BY_OEM.md`
