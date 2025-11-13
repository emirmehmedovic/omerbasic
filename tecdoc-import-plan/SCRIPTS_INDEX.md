# 🔗 Vehicle Fitments Cross-Linking Scripts - Index

## 📂 Datoteke u Ovom Direktorijumu

### ⭐ Glavne Skripte

#### 1. **cross_link_products_smart.py** - PREPORUČENO
Smart linking skriptu koja pronalazi proizvode sa motorima u njihovoj marki, a onda pronalazi i povezuje sve druge brendove sa istim engine kodom.

**Status:** ✅ Production Ready
**Testirana:** ✓ Uspješno (5/5 novih veza)

```bash
# Dry-run (test)
python3 cross_link_products_smart.py --dry-run --product-id cmhqilidi06g6omc32vumxxun

# Stvarno linkanje
python3 cross_link_products_smart.py --product-id cmhqilidi06g6omc32vumxxun --report report.csv

# Bulk processing
python3 cross_link_products_smart.py --limit 100 --report bulk_report.csv
```

---

### 🔧 Pomoćne Skripte za Analizu

#### 2. **debug_tecdoc_engine.py**
Pronalazi motor po engine code-u i prikazuje sve brendove koji ga imaju.

```bash
# Prikazuje sve motore sa engine code-om BKC
python3 debug_tecdoc_engine.py
```

**Output:**
- Pronađeni motori sa detaljima
- Brendovi koji imaju taj motor
- TecDoc ID-evi
- Proizvodi povezani sa motorom

---

#### 3. **analyze_engine_linking.py**
Detaljno analizira mogućnosti cross-linkinga:
- Grupiraj motore po atributima
- Pronađi engine kodove sa više TecDoc ID-eva
- Preporuke za linking strategiju

```bash
python3 analyze_engine_linking.py
```

**Output:**
- Motori grupirani po TecDoc ID
- Motori grupirani po snazi/kapacitetu
- Analiza mogućnosti
- Preporuke

---

#### 4. **list_engine_codes_with_products.py**
Pronalazi sve engine kodove koji imaju proizvode i prikazuje statistiku.

```bash
python3 list_engine_codes_with_products.py
```

**Output:**
- Top 30 engine kodova sa proizvodima
- Broj povezanih proizvoda
- Različiti TecDoc ID-evi

---

### 📖 Dokumentacija

#### **SMART_CROSS_LINK_README.md**
Detaljni upute za korištenje glavne skripte.

Sadrži:
- Kako se skriptu postavlja
- Sve opcije i parametre
- Primjeri korištenja
- Česti problemi i rješenja
- Napredne SQL upite

#### **SCRIPTS_INDEX.md**
Ovaj dokument - index svih skripti.

---

## 🚀 Brz Start

### Setup (prvi put)
```bash
cd /Users/emir_mw/omerbasic/tecdoc-import-plan
source venv/bin/activate
pip install asyncpg  # Ako nije instaliran
```

### Test na Jednom Proizvodu
```bash
python3 cross_link_products_smart.py --dry-run --product-id cmhqilidi06g6omc32vumxxun --report test.csv
```

### Stvarno Linkanje
```bash
python3 cross_link_products_smart.py --product-id cmhqilidi06g6omc32vumxxun --report report.csv
```

### Analiza (prije linkanja)
```bash
python3 list_engine_codes_with_products.py
```

---

## 📊 Primjer Rada

### Scenario: BMW Proizvod sa Mini Motorom
```
Input:
  Proizvod: "FILT.ZRAKA BMW 320D 98-" (F205701)
  Brendovi: BMW
  Motori: B37 C15 A, M54 B25, itd.

Processing:
  → Pronalaženje engine kodova
  → Pretraga drugih brendova sa B37 C15 A
  → Nađeno: Mini ima isti motor!

Output:
  ✓ 5 novih veza kreirano:
    - Mini MINI (F55)
    - Mini MINI (F56)
    - Mini MINI CLUBMAN (F54)
    - Mini MINI COUNTRYMAN (F60)
    - Mini MINI Convertible (F57)

Report:
  actual_report2.csv (5 redaka)
```

---

## 🔑 Važne Opcije

### Za cross_link_products_smart.py

| Opcija | Opis | Primjer |
|--------|------|---------|
| `--dry-run` | Pregled bez promjena | `--dry-run` |
| `--product-id ID` | Jedan proizvod | `--product-id cmhq...` |
| `--limit N` | Max N proizvoda | `--limit 100` |
| `--report FILE` | CSV report | `--report out.csv` |

---

## 📈 Statistika

### Engine Kodovi sa Proizvodima
- **BBJ**: 631 proizvoda
- **DEUC**: 631 proizvoda
- **BAU**: 631 proizvoda
- ... (30+ engine kodova sa proizvodima)

### Potencijal Cross-Linkinga
- Proizvodi koji su samo u jednoj marki: **Potencijalno za expansion**
- Engine kodovi sa više brendova: **Ready for linking**

---

## ✅ Checklist Prije Bulk Processing

- [ ] Testirao sam sa `--dry-run`
- [ ] Analizirao sam output
- [ ] Provjario sam CSV report
- [ ] Setup je ispravan (venv aktiviran)
- [ ] DATABASE_URL je dostupan
- [ ] Backup baze je napravljen
- [ ] Razumijem što će skriptu raditi

---

## 🔍 Debug

### "No modules named asyncpg"
```bash
source venv/bin/activate
pip install asyncpg
```

### "DATABASE_URL not found"
```bash
# Provjeri je li dostupan
echo $DATABASE_URL

# Ako nije, možeš ga postaviti
export DATABASE_URL="postgresql://..."
```

### "Nema drugih brendova"
To je OK - znači da engine kod se koristi samo u jednoj marki.

---

## 📞 Kontakt / Info

- **Autor**: Generated with Claude Code
- **Verzija**: 1.0
- **Datum**: 13. Listopada 2025
- **Status**: ✅ Production Ready

---

## Struktura Direktorijuma

```
tecdoc-import-plan/
├── cross_link_products_smart.py ⭐ GLAVNA SKRIPTU
├── debug_tecdoc_engine.py
├── analyze_engine_linking.py
├── list_engine_codes_with_products.py
├── SMART_CROSS_LINK_README.md 📖 DOKUMENTACIJA
├── SCRIPTS_INDEX.md (OVJ)
├── venv/ (Python okruženje)
└── [reports i temp datoteke kreirane tijekom rada]
```

---

## 🎯 Sljedeći Koraci

1. ✅ Testiraj sa `--dry-run`
2. ✅ Analiziraj rezultate
3. ✅ Ako je OK, pokreni stvarno linkanje
4. ✅ Prati CSV report za rezultate
5. ✅ Evaluiraj utjecaj na proizvode

---

**Ready to Cross-Link!** 🚀
