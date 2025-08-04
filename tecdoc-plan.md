# TecDoc-Style Filtriranje Proizvoda - Plan Implementacije

## Uvod

Ovaj dokument detaljno opisuje plan implementacije TecDoc-style filtriranja za automobilske dijelove. Cilj je što više približiti funkcionalnost originalnom TecDoc iskustvu, omogućavajući korisnicima precizno filtriranje proizvoda prema vozilu i tehničkim specifikacijama.

## Faza 1: Proširenje modela podataka

- [x] Analizirati postojeći model vozila i proizvoda
- [x] Proširiti model vozila (VehicleGeneration):
  - [x] Dodati polje `engineType` (PETROL, DIESEL, HYBRID, ELECTRIC)
  - [x] Dodati polje `enginePowerKW` (broj)
  - [x] Dodati polje `enginePowerHP` (broj)
  - [x] Dodati polje `engineCapacity` (broj u ccm)
  - [x] Dodati polje `engineCode` (string)
- [x] Proširiti model proizvoda (Product):
  - [x] Dodati polje `technicalSpecs` (JSON) za fleksibilno pohranjivanje specifikacija
  - [x] Dodati polje `dimensions` (JSON) za dimenzije proizvoda
  - [x] Dodati polje `standards` (array) za standarde koje proizvod zadovoljava
- [x] Implementirati hijerarhiju kategorija:
  - [x] Dodati polje `parentId` u model Category (već je postojalo)
  - [x] Dodati polje `level` (1=glavna, 2=podkategorija, 3=specifična)
- [x] Kreirati migraciju za Prisma shemu
- [x] Ažurirati tipove u TypeScriptu

## Faza 2: Unapređenje VehicleSelector komponente

- [x] Dodati dropdown za tip motora
- [x] Dodati dropdown za snagu motora (kW/KS)
- [x] Dodati dropdown za zapreminu motora (ccm)
- [x] Dodati dropdown za kod motora
- [x] Implementirati API rute za dohvat podataka o motoru
- [x] Implementirati pamćenje odabranog vozila za korisnika (opcionalno)
- [ ] Implementirati API endpointe za dohvat dodatnih parametara:
  - [ ] `/api/generations/:id/engines` za dohvat tipova motora za generaciju
  - [ ] `/api/engines/:id/details` za dohvat detalja o motoru
- [ ] Dodati mogućnost pamćenja odabranog vozila:
  - [ ] Implementirati localStorage spremanje odabranog vozila
  - [ ] Dodati "Moje vozilo" funkcionalnost za brzi odabir

## Faza 3: Unapređenje ProductFilters komponente

- [ ] Refaktorirati ProductFilters za podršku dinamičkih filtera:
  - [ ] Implementirati dinamičko učitavanje filtera ovisno o kategoriji
  - [ ] Dodati filtere za tehničke specifikacije (npr. viskozitet za ulja)
  - [ ] Dodati filtere za dimenzije (npr. promjer za kočione diskove)
- [ ] Implementirati hijerarhijski prikaz kategorija:
  - [ ] Kreirati TreeView komponentu za prikaz kategorija
  - [ ] Omogućiti odabir na bilo kojoj razini hijerarhije
- [ ] Dodati kombinirano filtriranje:
  - [ ] Implementirati logiku za kombiniranje filtera vozila i tehničkih parametara
  - [ ] Optimizirati API upite za brzo filtriranje

## Faza 4: Vizualni odabir dijelova (opcionalno)

- [ ] Istražiti opcije za implementaciju vizualnog odabira:
  - [ ] Evaluirati postojeće open-source rješenja
  - [ ] Procijeniti mogućnost custom implementacije
- [ ] Implementirati osnovni vizualni odabir:
  - [ ] Kreirati SVG dijagrame za glavne sustave vozila
  - [ ] Implementirati interaktivnost (hover, klik)
- [ ] Povezati vizualni odabir s filtriranjem:
  - [ ] Mapirati dijelove dijagrama s kategorijama proizvoda
  - [ ] Implementirati automatsko filtriranje pri odabiru dijela

## Faza 5: Testiranje i UX poboljšanja

- [ ] Provesti testiranje s realnim podacima:
  - [ ] Testirati sve filtere s različitim kombinacijama
  - [ ] Provjeriti performanse kod velikog broja proizvoda
- [ ] Prikupiti povratne informacije:
  - [ ] Implementirati sustav za povratne informacije korisnika
  - [ ] Analizirati ponašanje korisnika (analytics)
- [ ] Iterativno poboljšavati UX:
  - [ ] Optimizirati brzinu učitavanja i filtriranja
  - [ ] Poboljšati mobilno iskustvo
  - [ ] Dodati pomoćne tooltipove i objašnjenja

## Faza 6: Integracija s B2B sustavom

- [ ] Prilagoditi TecDoc filtriranje za B2B korisnike:
  - [ ] Dodati B2B-specifične filtere (npr. količina na zalihi)
  - [ ] Implementirati brzo naručivanje iz rezultata pretrage
- [ ] Implementirati napredne B2B funkcionalnosti:
  - [ ] Spremanje često korištenih filtera
  - [ ] Izvoz rezultata u CSV/Excel

## Tehnički detalji i napomene

### Prisma shema proširenja

```prisma
model VehicleGeneration {
  // Postojeća polja...
  
  // Nova polja
  engineType     String?
  enginePowerKW  Float?
  enginePowerHP  Float?
  engineCapacity Int?
  engineCode     String?
}

model Product {
  // Postojeća polja...
  
  // Nova polja
  technicalSpecs Json?
  dimensions     Json?
  standards      String[]
}

model Category {
  // Postojeća polja...
  
  // Nova polja
  parentId       String?
  parent         Category?  @relation("SubCategories", fields: [parentId], references: [id])
  subCategories  Category[] @relation("SubCategories")
  level          Int        @default(1)
}
```

### API endpointi

- `GET /api/categories/tree` - Dohvat hijerarhije kategorija
- `GET /api/generations/:id/engines` - Dohvat tipova motora za generaciju
- `GET /api/products/filter` - Napredni filter s podrškom za tehničke specifikacije

### Primjer tehničkih specifikacija (JSON)

```json
{
  "viscosity": "5W-30",
  "standards": ["API SN", "ACEA C3"],
  "capacity": 5,
  "synthetic": true
}
```

### Primjer dimenzija (JSON)

```json
{
  "diameter": 320,
  "thickness": 28,
  "height": 54.2,
  "width": 136
}
```

## Vremenski okvir

- Faza 1: 1-2 tjedna
- Faza 2: 1-2 tjedna
- Faza 3: 2-3 tjedna
- Faza 4: 2-4 tjedna (opcionalno)
- Faza 5: 1-2 tjedna
- Faza 6: 1-2 tjedna

Ukupno: 8-15 tjedana, ovisno o opsegu implementacije i dostupnim resursima.
