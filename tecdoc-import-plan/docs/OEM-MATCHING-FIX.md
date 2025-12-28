# OEM Matching Fix - Dokumentacija

**Datum**: 2025-12-25
**Status**: ✅ IMPLEMENTIRANO I TESTIRANO

---

## 🎯 Problem koji smo riješili

### Originalni Problem

Korisnik je testirao proizvod:
- **SKU**: 36020
- **Catalog Number**: TQ-5001-ME105
- **OEM Number**: 0
- **Očekivano**: Pronađi validne OEM brojeve za ovaj proizvod
- **Dobijeno**: False positive match - našao Mirror Glass (FIAT) umjesto Mass Air Flow Sensor

### Root Cause

Advanced matching algoritam je koristio OEM vrijednost "0" (placeholder/error) za matching i pronašao article_id 815170 koji također ima OEM "0" kao placeholder za FIAT dijelove. Ovo je rezultiralo u **potpuno pogrešnom matchu**.

---

## ✅ Implementirano Rješenje

### 1. OEM Validation Funkcija

Dodana nova funkcija koja prepoznaje i skipuje placeholder/invalid OEM vrijednosti:

```python
def should_skip_oem_matching(self, oem: str) -> bool:
    """
    Provjeri da li je OEM vrijednost placeholder/invalid

    Skipuje:
    - Prazne vrijednosti
    - Placeholder vrijednosti kao "0", "N/A", "NONE"
    - Veoma kratke vrijednosti (< 3 karaktera)
    - All zeros (0, 00, 000, 0000, etc.)
    """
    if not oem:
        return True

    oem_clean = oem.strip().upper()

    # Placeholder values
    placeholder_values = ['0', 'N/A', 'NA', 'NONE', '-', '/', 'X', 'XX', 'XXX']
    if oem_clean in placeholder_values:
        return True

    # Too short to be a valid OEM
    if len(oem_clean) < 3:
        return True

    # All zeros (0, 00, 000, 0000, etc.)
    if oem_clean.replace('0', '') == '':
        return True

    return False
```

### 2. Modificiran Advanced Match Algoritam

```python
def advanced_match(self, catalog: str, oem: str = None, ean: str = None) -> MatchResult:
    """
    Multi-level matching strategy

    Prioriteti:
    0. EAN exact (100%)
    1. Catalog exact (95%)
    2. Catalog normalized (85%)
    3. OEM exact (80%) - SAMO AKO JE VALID OEM
    4. OEM normalized (70%) - SAMO AKO JE VALID OEM
    """

    # ... EAN i Catalog matching ...

    # Validiraj OEM prije matchinga
    skip_oem = self.should_skip_oem_matching(oem)
    if skip_oem and oem:
        logging.debug(f"  → Skipping OEM matching for placeholder value: '{oem}'")

    # Nivo 3: OEM Exact (samo ako je validan OEM)
    if oem and not skip_oem:
        article_id = self.find_by_oem_exact(oem)
        if article_id:
            return MatchResult(article_id, 80, "oem_exact")

    # Nivo 4: OEM Normalized (samo ako je validan OEM)
    if oem and not skip_oem:
        article_id = self.find_by_oem_normalized(oem)
        if article_id:
            return MatchResult(article_id, 70, "oem_normalized")

    # Not found
    return MatchResult(None, 0, "not_found")
```

---

## 📊 Test Rezultati

### Test 1: OEM Validation Logic

Testirano 12 različitih OEM vrijednosti:

| OEM Value         | Should Skip? | Actual | Status      | Description          |
|-------------------|--------------|--------|-------------|----------------------|
| 0                 | True         | True   | ✅ PASS     | Single zero          |
| 00                | True         | True   | ✅ PASS     | Double zero          |
| 000               | True         | True   | ✅ PASS     | Triple zero          |
| N/A               | True         | True   | ✅ PASS     | N/A placeholder      |
| NA                | True         | True   | ✅ PASS     | NA placeholder       |
| -                 | True         | True   | ✅ PASS     | Dash placeholder     |
| XX                | True         | True   | ✅ PASS     | XX placeholder       |
| 11 42 8 580 680   | False        | False  | ✅ PASS     | Valid BMW OEM        |
| A 004 094 24 04   | False        | False  | ✅ PASS     | Valid Mercedes OEM   |
| 03L115562         | False        | False  | ✅ PASS     | Valid VAG OEM        |
| 1234567           | False        | False  | ✅ PASS     | Valid generic OEM    |
| AB                | True         | True   | ✅ PASS     | Too short (2 chars)  |

**Rezultat**: ✅ All validation tests PASSED! (12/12)

### Test 2: Problematični Proizvod (SKU 36020)

```
SKU:     36020
Catalog: TQ-5001-ME105
OEM:     0
Expected: NOT FOUND (jer je OEM placeholder)
```

**Prije fixa**:
- ❌ Matched article_id 815170 (Mirror Glass, FIAT)
- ❌ Confidence: 80%
- ❌ Method: oem_exact
- ❌ FALSE POSITIVE!

**Poslije fixa**:
- ✅ Article ID: None
- ✅ Confidence: 0%
- ✅ Method: not_found
- ✅ OEM '0' je pravilno preskočen!

### Test 3: Advanced Matching sa Validnim OEM Brojevima

Testirano 10 proizvoda bez TecDoc ID ali sa validnim OEM brojevima:

**Rezultati**:
- Testirano: 10 proizvoda
- Pronađeno: 6 (60.0%)
- Nije pronađeno: 4 (40.0%)

**Matching metode**:
- Catalog normalized: 6 (100% uspješnih matcheva bilo preko catalog)
- OEM exact: 0
- OEM normalized: 0

**Primjeri uspješnih matcheva**:

| SKU   | Product Type  | Catalog       | Matched? | Method              | Confidence |
|-------|---------------|---------------|----------|---------------------|------------|
| 52203 | Buffer        | 10939380      | ✅ YES   | catalog_normalized  | 85%        |
| 47641 | Damper        | 25111165415   | ✅ YES   | catalog_normalized  | 85%        |
| 46678 | Brake Caliper | 342759        | ✅ YES   | catalog_normalized  | 85%        |
| 52494 | Switch        | 0148500008    | ✅ YES   | catalog_normalized  | 85%        |
| 54507 | Brake Disc    | 0986479677    | ✅ YES   | catalog_normalized  | 85%        |
| 36450 | Wiper Blade   | 3397118913    | ✅ YES   | catalog_normalized  | 85%        |

**Zaključak**:
- ✅ OEM validation radi - ne matchuje više na placeholder vrijednosti
- ✅ Catalog matching radi odlično (60% success rate)
- ℹ️ OEM matching nije bio potreban u ovim testovima jer je catalog matching našao rezultate

---

## 📈 Analiza OEM Data Quality

### Ukupne Statistike

```
📊 Ukupno proizvoda: 24,617
   - Sa OEM brojem: 24,517 (99.6%)
   - Bez OEM broja: 100 (0.4%)
```

### Placeholder OEM Vrijednosti

```
OEM Value | Count | Percentage | Description
----------|-------|------------|------------
'0'       | 9,255 | 37.60%     | Single zero
'-'       |    51 |  0.21%     | Dash
'NA'      |     1 |  0.00%     | NA

📊 Ukupno placeholder OEM: 9,307 (37.8%)
   OEM kraći od 3 karaktera: 9,309 (37.8%)
```

### Valid OEM Brojevi

```
📊 Proizvodi sa validnim OEM brojevima (len >= 5): 15,004
   - Procenat od ukupno: 60.9%
   - Procenat od onih sa OEM: 61.2%
```

### Top Najčešćih OEM Vrijednosti

| OEM Number   | Count | Placeholder? |
|--------------|-------|--------------|
| 0            | 9,255 | ❌ YES       |
| ALTUR        |    92 | ✅ NO        |
| -            |    51 | ❌ YES       |
| TOPRAN       |    26 | ✅ NO        |
| BOSCH        |    22 | ✅ NO        |
| LIQUI MOLY   |    15 | ✅ NO        |

### Proizvodi sa TecDoc ID

```
📊 Proizvodi sa TecDoc ID: 14,443 (58.7%)
   - Sa validnim OEM: 12,924 (89.5%)
   - Sa placeholder OEM: 1,402 (9.7%)
```

### Proizvodi BEZ TecDoc ID - Matching Potencijal

```
📊 Proizvodi BEZ TecDoc ID: 10,174 (41.3%)

   ✅ Sa validnim OEM (matching potencijal): 2,080 (20.4%)
   ✅ Sa EAN (matching potencijal): 1 (0.0%)
   ❌ Bez validnih podataka: 8,094 (79.6%)
```

---

## 🎯 Odgovor na Korisnikov Upit

### Proizvod: TQ-5001-ME105 (SKU 36020)

**Pitanje**: "Da vidimo možemo li naći ispravne OEM brojeve za ovaj proizvod?"

**Odgovor**:

❌ **Ne možemo pronaći OEM brojeve za ovaj proizvod** iz sljedećih razloga:

1. **OEM vrijednost "0" je placeholder** - nije stvarni OEM broj
   - Prije fixa: Matchao na pogrešan proizvod (Mirror Glass)
   - Poslije fixa: Pravilno preskočen

2. **Catalog broj "TQ-5001-ME105" ne postoji u TecDocu**
   - Provjereno: Nije pronađen ni exact ni normalized
   - Razlog: Vjerovatno je aftermarket brand (Taiwan Quality, TomQuest, ili sličan)

3. **Nema EAN koda** - ne može se matchati preko EAN-a

4. **Proizvod je "Mass Air Flow Sensor"** - ovaj tip proizvoda POSTOJI u TecDocu
   - Pronađeno: 10 sličnih proizvoda sa TecDoc ID-jevima
   - SKU 29558: TecDoc 250495127 (PEUGEOT Mass Air Flow)
   - SKU 29645: TecDoc 166028593 (Mercedes Mass Air Flow)
   - Zaključak: Problem je specifičan za ovaj catalog broj, ne za tip proizvoda

### Alternativne Strategije za TQ-5001-ME105

1. **Manuelni Matching**
   - Potražiti ekvivalentne OEM brojeve za mass air flow sensor
   - Cross-reference sa drugim bazama (partslink, RockAuto, etc.)

2. **Vehicle-based Matching**
   - Ako znamo za koja vozila je proizvod namjenjen
   - Pretraga TecDoca po vehicle + product type

3. **Supplier Information**
   - Kontaktirati dobavljača za originalne OEM brojeve
   - Importovati podatke iz supplier kataloga

4. **Category-based Suggestions**
   - Matchati samo po product type (Mass Air Flow Sensor)
   - Ponuditi listu mogućih TecDoc artikala za manuelni odabir

---

## 🚀 Sljedeći Koraci

### 1. Za Proizvode sa Placeholder OEM (9,307 proizvoda)

**Problem**: OEM vrijednost je '0', '-', 'N/A', etc.

**Rješenje**:
- ✅ Fix je implementiran - više se ne matchuju false positives
- ⚠️ Ovi proizvodi neće biti matchati preko OEM-a
- 💡 Alternativa: Pokušaj catalog matching ili EAN matching

**Akcija**:
```bash
# Pokreni enrichment sa catalog/EAN matching (bez OEM)
python tecdoc_advanced_enrichment.py --filter-mode='no_tecdoc' --limit=9307
```

### 2. Za Proizvode sa Validnim OEM (2,080 proizvoda bez TecDoc ID)

**Potencijal**: Ovi proizvodi imaju validne OEM brojeve (len >= 5)

**Očekivani Success Rate**: 40-70% (na osnovu testova)

**Akcija**:
```bash
# Batch processing sa advanced matching
python tecdoc_advanced_enrichment.py --filter-mode='valid_oem' --limit=2080
```

### 3. Za Proizvode sa TecDoc ID (14,443 proizvoda)

**Cilj**: Popuniti OEM brojeve iz TecDoca (ako već postoje TecDoc matches)

**Akcija**:
```bash
# Enrichment za popunjavanje OEM brojeva
python tecdoc_advanced_enrichment.py --filter-mode='has_tecdoc' --limit=14443
```

### 4. Za Proizvode bez Validnih Podataka (8,094 proizvoda)

**Problem**: Nema valid catalog, OEM, ili EAN podatke

**Rješenje**:
- Import podataka iz drugih izvora
- Manuelni matching
- Category-based suggestions
- Vehicle-based matching (ako imamo vehicle informacije)

---

## 📝 Kreirani Fajlovi

### 1. Modified Script
- **File**: `tecdoc_advanced_enrichment.py`
- **Changes**:
  - Dodana `should_skip_oem_matching()` funkcija
  - Modificiran `advanced_match()` da koristi validation
  - Bugfix: False positive matching na placeholder OEM vrijednosti

### 2. Test Scripts
- **File**: `test_oem_validation.py`
  - Testira OEM validation logic (12 test cases)
  - Testira problematični proizvod (SKU 36020)
  - Pronalazi proizvode sa validnim OEM brojevima

- **File**: `test_advanced_matching.py`
  - Testira advanced matching na 10 proizvoda sa validnim OEM
  - Success rate: 60%
  - Pokazuje koje metode matchinga rade

- **File**: `analyze_oem_data_quality.py`
  - Kompletna analiza OEM data quality
  - Statistike placeholder vs valid OEM
  - Matching potencijal analiza

### 3. Dokumentacija
- **File**: `docs/OEM-MATCHING-FIX.md` (ovaj fajl)
  - Opis problema i rješenja
  - Test rezultati
  - Data quality analiza
  - Sljedeći koraci

---

## 💡 Preporuke

### Immediate Actions (Danas/Sutra)

1. **Pokreni enrichment za proizvode sa TecDoc ID**
   ```bash
   python tecdoc_advanced_enrichment.py --filter-mode='has_tecdoc'
   ```
   - Cilj: Popuni OEM brojeve za 14,443 proizvoda
   - Vrijeme: ~2-3 sata
   - Očekivano: ~90% dobije OEM podatke

2. **Test advanced matching na većem sample-u**
   ```bash
   python tecdoc_advanced_enrichment.py --filter-mode='valid_oem' --limit=100
   ```
   - Cilj: Validacija success rate-a
   - Vrijeme: ~10 minuta
   - Očekivano: 40-70% success rate

### Medium-term Actions (Ova Sedmica)

3. **Batch processing za proizvode sa validnim OEM**
   - 2,080 proizvoda sa validnim OEM brojevima
   - Očekivano: 800-1,400 novih matcheva

4. **Analiza proizvoda koji nisu matchati**
   - Zašto nisu pronađeni?
   - Da li treba dodatne normalizacije?
   - Da li catalog brojevi postoje u TecDocu?

### Long-term Actions (Sljedeći Sprint)

5. **Import OEM brojeva iz drugih izvora**
   - Supplier katalozi
   - Cross-reference baze (partslink, rockauto)
   - Alternative data sources

6. **Vehicle-based Matching**
   - Za proizvode gdje znamo za koja vozila su namjenjeni
   - TecDoc search po vehicle + product type

7. **Manual Matching Interface**
   - Za proizvode koji ne mogu biti automatski matchati
   - UI za pregled i odabir TecDoc ekvivalenata

---

## 🔍 Debugging & Troubleshooting

### Ako Advanced Matching Ne Radi

1. **Check OEM Validation**
   ```python
   from tecdoc_advanced_enrichment import TecDocAdvancedEnricher
   enricher = TecDocAdvancedEnricher()

   should_skip = enricher.should_skip_oem_matching("YOUR_OEM_HERE")
   print(f"Should skip: {should_skip}")
   ```

2. **Test Catalog Matching**
   ```python
   article_id = enricher.find_by_catalog_exact("YOUR_CATALOG")
   if not article_id:
       article_id = enricher.find_by_catalog_normalized("YOUR_CATALOG")
   print(f"Found: {article_id}")
   ```

3. **Test OEM Matching** (samo ako je valid OEM)
   ```python
   if not enricher.should_skip_oem_matching(oem):
       article_id = enricher.find_by_oem_exact(oem)
       if not article_id:
           article_id = enricher.find_by_oem_normalized(oem)
       print(f"Found: {article_id}")
   ```

### Common Issues

| Issue                          | Cause                           | Solution                        |
|--------------------------------|---------------------------------|---------------------------------|
| False positive matches         | Placeholder OEM values          | ✅ Fixed with validation       |
| No matches for valid products  | Catalog not in TecDoc           | Try vehicle-based matching      |
| Too many placeholder OEM       | Bad data import                 | Clean OEM data from source      |
| Slow matching performance      | Large database                  | Add indexes, batch processing   |

---

## 📞 Contact & Support

**Za Pitanja**:
- OEM matching strategije
- Data quality issues
- Performance optimizacije
- Alternative matching metode

**Files**:
- `/Users/emir_mw/omerbasic/tecdoc-import-plan/tecdoc_advanced_enrichment.py`
- `/Users/emir_mw/omerbasic/tecdoc-import-plan/test_*.py`
- `/Users/emir_mw/omerbasic/tecdoc-import-plan/docs/OEM-MATCHING-FIX.md`

---

**Kraj Dokumenta**
*Generisano: 2025-12-25*
*Verzija: 1.0*
*Status: PRODUCTION READY*
