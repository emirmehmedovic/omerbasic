# TecDoc Integration - Dokumentacijski Index

Sveobuhvatna dokumentacija za integraciju TecDoc baze slika sa omerbasic webshop aplikacijom.

---

## 📚 Dokumentacijski Mapak

### Za Brz Početak (5-10 minuta)
1. **[TECDOC_IMAGE_QUICK_START.md](./TECDOC_IMAGE_QUICK_START.md)** - _Počnite ovdje!_
   - Brza konfiguracija
   - Testiranje lokalno
   - VPS setup u 5 koraka
   - Česte greške

### Za Detaljne Upute (45+ minuta)
2. **[TECDOC_IMAGE_SETUP.md](./TECDOC_IMAGE_SETUP.md)** - _Kompletan vodič_
   - Detaljno objašnjenje arhitekture
   - Lokalna konfiguracija sa primjerima
   - VPS setup sa svim koracima
   - Import podataka
   - Testiranje i validacija
   - Troubleshooting sa rješenjima

### Za VPS Deployment (30+ minuta)
3. **[TECDOC_VPS_CHECKLIST.md](./TECDOC_VPS_CHECKLIST.md)** - _Korak po korak checklist_
   - Pre-setup planning
   - 8 faza setup-a
   - Checkbox za svaki korak
   - Vremenske procjene
   - Post-setup maintenance

### Za Skripte i Kod
4. **[scripts/README.md](./scripts/README.md)** - _Dokumentacija skripti_
   - tecdoc_image_linker.py
   - Instalacija i korištenje
   - Konfiguracija
   - Troubleshooting

---

## 🎯 Odaberite Vašu Putanju

### 🚀 Ako ste beginner i trebate brz setup:
```
1. Pročitajte: TECDOC_IMAGE_QUICK_START.md
2. Pokrenite: python3 scripts/tecdoc_image_linker.py --test
3. Slijedite: VPS Setup (5 koraka)
4. Ako trebate više info → TECDOC_IMAGE_SETUP.md
```

### 🔧 Ako trebate detaljan vodič:
```
1. Pročitajte: TECDOC_IMAGE_SETUP.md → Pregled + Arhitektura
2. Lokalna konfiguracija (sve korake)
3. VPS Setup (sve faze)
4. Testiranje i troubleshooting
5. Koristite TECDOC_VPS_CHECKLIST.md kao reference
```

### ✅ Ako trebate checklist za VPS deployment:
```
1. Pročitajte: TECDOC_VPS_CHECKLIST.md
2. Popunite sve checkboxe
3. Kopirajte kode direktno u terminal
4. Ako trebate info → pogledajte TECDOC_IMAGE_SETUP.md sekciju
```

### 🐍 Ako trebate samo info o skriptama:
```
1. Pročitajte: scripts/README.md
2. Pogledajte source kod: scripts/tecdoc_image_linker.py
3. Pokrenite test: python3 scripts/tecdoc_image_linker.py --test
```

---

## 📋 Što Je Koje Gdje

| Trebam... | Pogledaj | Vrijeme |
|-----------|----------|---------|
| Brz pregled i setup | QUICK_START.md | 5 min |
| Razumjeti arhitekturu | SETUP.md → Arhitektura | 10 min |
| Lokalno testiranje | QUICK_START.md ili SETUP.md | 15 min |
| Detaljne korake VPS | SETUP.md → VPS Setup | 30 min |
| Checklist za deployment | VPS_CHECKLIST.md | 30 min |
| Info o skriptama | scripts/README.md | 5 min |
| Troubleshoot problem | SETUP.md → Troubleshooting | 15 min |

---

## 🔑 Ključni Koncepti

### Tri "komponente" integracije:

1. **PostgreSQL Baza** (omerbasic)
   - Sadrži: `Product` sa `tecdocArticleId`
   - Trebat će: `imageUrl` polje

2. **MySQL Baza** (TecDoc)
   - Sadrži: `articles`, `article_mediainformation`
   - Trebat će: Full data import

3. **File System** (/images)
   - Sadrži: Fizičke JPEG datoteke
   - Trebat će: Upload na VPS

### Python Skripta
- Povezuje sve tri komponente
- Pronalazi slike automatski (ne ovisi o putanjama)
- Ažurira PostgreSQL automatski

---

## 🚦 Status Po Koraku

### ✅ Završeno (Lokalno)
- [x] MySQL TecDoc baza instalirana (12.4GB)
- [x] PostgreSQL baza sa `tecdocArticleId` poljima
- [x] Python skripta napisana i testirana
- [x] Test sa stvarnim podacima radi
- [x] Dokumentacija napravljena

### ⏳ Trebate Sada (VPS)
- [ ] Upload CSV datoteka na VPS
- [ ] Setup MySQL na VPS
- [ ] Upload slika na VPS (95GB - dugotrajan)
- [ ] Setup Python okruženja na VPS
- [ ] Ažuriranje skripte za VPS
- [ ] Pokrenuti import skriptu
- [ ] Integracija sa Next.js

### 🔮 Future (Maintenance)
- Periodički update TecDoc baze
- Backup MySQL baze
- Monitoring disk space-a
- Performance optimization

---

## 🎓 Primjer: Od Početka Do Kraja

### Lokalno (5 minuta):
```bash
cd /Users/emir_mw/omerbasic
source venv_tecdoc/bin/activate
python3 scripts/tecdoc_image_linker.py --test
```

### Output trebao bi biti:
```
✓ Spojena MySQL baza
✓ Spojena PostgreSQL baza

Proizvod: FILTER GORIVA ACTROS MP4
✓ Pronađene slike (1)
✓ Pronađene datoteke (1)
  → 1/1/9/190130.JPG
```

### Na VPS (nakon setup-a):
```bash
ssh user@vps
cd /home/user/scripts
source ../venv_tecdoc/bin/activate
python3 tecdoc_image_linker.py --all

# Rezultat:
# ✓ Pronađeno proizvoda: 150
# ✓ Ažurirano proizvoda: 145
```

### U aplikaciji:
```tsx
<Image
  src={product.imageUrl}  // "/images/1/1/9/190130.JPG"
  alt={product.name}
  width={300}
  height={300}
/>
```

---

## 📞 Pomoć & Podrška

### Ako trebate...

**Brz odgovor:**
→ QUICK_START.md ili TROUBLESHOOTING sekcija

**Detaljno objašnjenje:**
→ SETUP.md

**Korak po korak za VPS:**
→ VPS_CHECKLIST.md

**Specifično o skriptama:**
→ scripts/README.md

**Što je krivo:**
→ SETUP.md → Troubleshooting sekcija

---

## 🗂️ Datoteke u Projektu

```
/Users/emir_mw/omerbasic/
├── TECDOC_INDEX.md                  ← Ste ovdje
├── TECDOC_IMAGE_QUICK_START.md      ← Brz početak
├── TECDOC_IMAGE_SETUP.md            ← Detaljno uputstvo
├── TECDOC_VPS_CHECKLIST.md          ← Checklist za VPS
│
├── scripts/
│   ├── README.md                    ← Info o skriptama
│   ├── tecdoc_image_linker.py       ← Glavna skripta
│   └── __pycache__/
│
├── venv_tecdoc/                     ← Virtual environment
│   └── bin/activate
│
└── .env                             ← Credentials (ne commit!)
    └── DATABASE_URL=postgresql://...
```

---

## ✨ Što Ste Dobili

### Kompletna Rješenja Za:

1. ✅ **Lokalno Testiranje**
   - Python skripta koja radi
   - Test podatka sa stvarnim artikla
   - Validacija svih konekcija

2. ✅ **VPS Setup**
   - Detaljne upute za sve korake
   - Checklist sa checkbox-ima
   - Kode koji se mogu direktno kopirati

3. ✅ **Maintenance**
   - Skripta za update-ovanje slika
   - Monitoring mogućnosti
   - Backup procedure

4. ✅ **Dokumentacija**
   - 4 dokumenta sa različitim razinama detalja
   - Примјери koda
   - Troubleshooting guide

---

## 🎯 Sljedeći Korak

### Zavisno gdje ste:

**Ako još uvijek radite lokalno:**
→ `python3 scripts/tecdoc_image_linker.py --test`

**Ako se pripremata za VPS:**
→ Pročitajte `TECDOC_IMAGE_QUICK_START.md`

**Ako trebate detaljno:**
→ Pročitajte `TECDOC_IMAGE_SETUP.md`

**Ako trebate korak po korak:**
→ Koristite `TECDOC_VPS_CHECKLIST.md`

---

## 📊 Statistika

- **Dokumentacijsko vrijeme**: ~2 sata za čitanje i razumijevanje
- **VPS setup vrijeme**: 2-4 sata (ovisno o brzini interneta)
- **Lokalno testiranje**: 5-10 minuta
- **Total time to production**: 6-8 sati

---

## 🚀 Verzija & Datum

**Dokumentacija verzija**: 1.0
**TecDoc Image Linker verzija**: 1.0
**Zadnja ažuriranja**: 2025-11-12
**Status**: ✓ Production-Ready

---

## 📝 Napomene

Sva uputstva pretpostavljaju:
- macOS lokalno (za testiranje)
- Linux VPS (Ubuntu/Debian)
- PostgreSQL na Neon (cloud)
- MySQL na VPS-u

Ako koristite drugačije setup, prilagodite putanje i komande.

---

**Sretno sa integracijom!** 🎉

Za pitanja ili probleme, konsultirajte relevantni dokument iz gore navedenog mapaka.
