# TecDoc Kategorije - Brzo Uputstvo

## 🚀 Brzi Start

### 1. Import kategorija iz .md fajlova

```bash
npm run import:tecdoc-categories
```

Ova komanda će:
- Parsirati `putnička-vozila.md` i `teretna-vozila.md` fajlove
- Kreirati/ažurirati kategorije sa External ID-jevima
- Povezati ih sa parent kategorijama ("Putnička vozila" i "Teretna vozila")

### 2. Provjera rezultata

```bash
npm run check:tecdoc-categories
```

### 3. Pregled u admin panelu

Idite na: `http://localhost:3000/admin/categories`

## 📋 Šta je importovano?

### Putnička vozila (37 kategorija)
- **100001** - Karoserija vozila
- **100002** - Motor
- **100005** - Filteri
- **100006** - Kočioni sistem
- ... i još 33 kategorije

### Teretna vozila (32 kategorije)
- **200022** - Kabina vozača / karoserija
- **200026** - Motor
- **200047** - Filteri
- **200058** - Kočioni sistem
- ... i još 28 kategorija

## 🔧 Kako dodati nove kategorije?

### Metoda 1: Putem admin panela
1. Idite na `/admin/categories`
2. Kliknite "Dodaj novu kategoriju"
3. Unesite naziv, odaberite parent kategoriju
4. Unesite External ID (npr. 100001)
5. Kliknite "Spremi"

### Metoda 2: Dodati u .md fajl i reimportovati
1. Dodajte red u `putnička-vozila.md` ili `teretna-vozila.md`:
   ```markdown
   | **100999** | Nova kategorija |
   ```
2. Pokrenite: `npm run import:tecdoc-categories`

## 📊 Struktura baze

```
Category
├── id (cuid)
├── name (string)
├── externalId (string?) ← TecDoc Node ID
├── parentId (string?)
└── level (int)
```

## 🔍 Korisne komande

```bash
# Import kategorija
npm run import:tecdoc-categories

# Provjera kategorija
npm run check:tecdoc-categories

# Otvori Prisma Studio
npm run db:studio

# Otvori admin panel
# http://localhost:3000/admin/categories
```

## 💡 Savjeti

1. **External ID je opcionalan** - Možete kreirati kategorije bez njega
2. **Jedinstveni External ID** - Svaki External ID mora biti jedinstven
3. **Idempotentna skripta** - Možete pokrenuti import više puta
4. **Automatsko ažuriranje** - Postojeće kategorije će biti ažurirane

## 📖 Detaljnija dokumentacija

Za više informacija pogledajte: `docs/tecdoc-categories-import.md`
