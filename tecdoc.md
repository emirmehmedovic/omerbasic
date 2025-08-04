# Implementacija TecDoc-sličnog sustava za webshop autodijelova

## Trenutno stanje

Naš webshop za autodijelove trenutno ima implementirane sljedeće funkcionalnosti:

- **Hijerarhiju kategorija** (glavna kategorija → podkategorije)
- **Osnovni model vozila** (marka → model → generacija)
- **Povezivanje proizvoda s generacijama vozila** (many-to-many relacija)
- **Tehničke specifikacije** kao JSON polja
- **Dimenzije proizvoda** kao JSON polja
- **B2B funkcionalnosti** s različitim cijenama
- **Osnovne filtere** za pretragu proizvoda

## Cilj: Kloniranje TecDoc funkcionalnosti

Cilj je implementirati sustav koji funkcionalno oponaša TecDoc bez stvarne integracije s TecDoc API-jem. Želimo stvoriti vlastitu bazu podataka i funkcionalnosti koje će korisnicima pružiti iskustvo slično TecDoc sustavu.

## Nedostaci trenutnog sustava

1. **Nestrukturirani tehnički podaci**
   - Trenutno koristimo JSON polja za tehničke specifikacije i dimenzije
   - Nedostaje struktura specifična za različite kategorije proizvoda

2. **Ograničena identifikacija vozila**
   - Nedostaje detaljnija kategorizacija vozila
   - Nedostaju dodatni parametri motora i šasije

3. **Nedostatak cross-reference sustava**
   - Nema povezivanja zamjenskih dijelova
   - Nedostaje OEM cross-reference

4. **Ograničena specijalizacija za različite tipove proizvoda**
   - Nedostaju specifični atributi za ulja, gume, ADR opremu, itd.

## Plan implementacije TecDoc-sličnog sustava

### 1. Unapređenje modela podataka

#### 1.1 Proširenje modela vozila

```typescript
// Proširenje VehicleGeneration modela
model VehicleGeneration {
  // Postojeća polja...
  
  // Dodatna polja za detaljnije informacije o vozilu
  constructionType    String?    // Tip konstrukcije (npr. Sedan, Hatchback)
  wheelbase           Float?     // Međuosovinski razmak u mm
  brakeSystem         String?    // Tip kočionog sustava
  driveType           String?    // Tip pogona (FWD, RWD, AWD)
  fuelType            String?    // Tip goriva (dodatno uz engineType)
  transmission        String?    // Tip transmisije
  doors               Int?       // Broj vrata
  axles               Int?       // Broj osovina (važno za teretna vozila)
  weight              Float?     // Težina vozila u kg
}
```

#### 1.2 Implementacija strukturiranih atributa po kategorijama

```typescript
// Model za definicije atributa kategorija
model CategoryAttribute {
  id            String    @id @default(cuid())
  name          String    // Naziv atributa (npr. "viscosity", "diameter")
  label         String    // Oznaka za prikaz (npr. "Viskozitet", "Promjer")
  type          String    // Tip podatka (string, number, boolean, enum)
  unit          String?   // Jedinica mjere (npr. "mm", "kg")
  options       Json?     // Opcije za enum tipove
  isRequired    Boolean   @default(false)
  isFilterable  Boolean   @default(false)
  sortOrder     Int       @default(0)  // Redoslijed prikaza
  categoryId    String
  category      Category  @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  
  @@unique([name, categoryId])
}

// Model za vrijednosti atributa proizvoda
model ProductAttributeValue {
  id          String    @id @default(cuid())
  value       String    // Vrijednost atributa (spremljena kao string)
  productId   String
  product     Product   @relation(fields: [productId], references: [id], onDelete: Cascade)
  attributeId String
  attribute   CategoryAttribute @relation(fields: [attributeId], references: [id], onDelete: Cascade)
  
  @@unique([productId, attributeId])
}
```

#### 1.3 Implementacija cross-reference sustava

```typescript
// Model za cross-reference
model ProductCrossReference {
  id              String   @id @default(cuid())
  productId       String
  product         Product  @relation("OriginalProduct", fields: [productId], references: [id], onDelete: Cascade)
  referenceType   String   // OEM, Aftermarket, Replacement, etc.
  referenceNumber String   // Broj dijela za referencu
  manufacturer    String?  // Proizvođač reference
  notes           String?  // Dodatne napomene
  replacementId   String?  // ID zamjenskog proizvoda ako postoji u sustavu
  replacement     Product? @relation("ReplacementProduct", fields: [replacementId], references: [id])
}

// Proširenje Product modela
model Product {
  // Postojeća polja...
  
  // Nove relacije
  attributeValues     ProductAttributeValue[]
  originalReferences  ProductCrossReference[] @relation("OriginalProduct")
  replacementFor      ProductCrossReference[] @relation("ReplacementProduct")
}
```

### 2. Implementacija specijaliziranih atributa po kategorijama proizvoda

#### 2.1 Motorna ulja i maziva

Predefinirati atribute za kategoriju ulja:
- Viskozitet (npr. 5W-30, 10W-40)
- ACEA specifikacija (npr. A3/B4, C3)
- API specifikacija (npr. SN, SM)
- Odobrenja proizvođača (npr. MB 229.5, VW 504.00)
- Baza ulja (mineralno, sintetičko, polusintetičko)
- Volumen pakiranja (1L, 4L, 5L, itd.)

#### 2.2 Gume

Predefinirati atribute za kategoriju guma:
- Dimenzije (širina/visina/promjer)
- Indeks brzine (npr. H, V, W)
- Indeks nosivosti (npr. 91, 95)
- Sezona (ljetna, zimska, cjelogodišnja)
- EU oznaka (otpor kotrljanja, prianjanje na mokrom, buka)
- DOT kod (datum proizvodnje)

#### 2.3 ADR oprema

Predefinirati atribute za ADR opremu:
- ADR klasa (npr. 1, 2, 3)
- Certifikati (npr. UN, EC)
- Materijal izrade
- Kapacitet/volumen
- Kompatibilnost s opasnim tvarima

#### 2.4 Repromaterijal za autopraonice

Predefinirati atribute za repromaterijal:
- Tip proizvoda (šampon, vosak, sredstvo za čišćenje)
- pH vrijednost
- Koncentracija
- Kompatibilnost s opremom
- Ekološki certifikati

### 3. Unapređenje korisničkog sučelja

#### 3.1 Napredni filteri za pretragu

- Implementirati dinamičke filtere bazirane na atributima kategorije
- Dodati filtriranje po OEM brojevima i cross-reference
- Implementirati naprednu pretragu po tehničkim specifikacijama

#### 3.2 Poboljšani odabir vozila

- Dodati više detalja o vozilima
- Implementirati pamćenje odabranog vozila
- Poboljšati prikaz kompatibilnosti dijelova s vozilima

#### 3.3 Specijalizirani prikazi za različite kategorije

- Implementirati vizualni odabir dimenzija guma
- Implementirati tablični prikaz specifikacija ulja
- Implementirati vizualni prikaz kompatibilnosti s vozilima

### 4. Implementacija administrativnog sučelja

#### 4.1 Upravljanje atributima kategorija

- Sučelje za definiranje atributa po kategorijama
- Mogućnost dodavanja/uređivanja/brisanja atributa
- Definiranje redoslijeda prikaza atributa

#### 4.2 Upravljanje cross-reference podacima

- Sučelje za unos OEM i aftermarket brojeva
- Mogućnost povezivanja zamjenskih dijelova
- Import/export cross-reference podataka

#### 4.3 Masovni import podataka

- Implementirati import podataka iz CSV/Excel datoteka
- Definirati predloške za različite kategorije proizvoda
- Implementirati validaciju podataka pri importu

## Koraci implementacije

### Faza 1: Osnovna struktura (1-2 mjeseca)

1. Proširiti Prisma shemu s novim modelima
2. Implementirati migracije baze podataka
3. Ažurirati API rute za podršku novim modelima
4. Implementirati osnovne CRUD operacije za nove modele

### Faza 2: Specijalizacija kategorija (2-3 mjeseca)

1. Implementirati preddefinirane atribute za glavne kategorije proizvoda
2. Ažurirati forme za dodavanje/uređivanje proizvoda
3. Implementirati dinamičke filtere bazirane na atributima kategorija
4. Implementirati cross-reference sustav

### Faza 3: Napredne funkcionalnosti (3-4 mjeseca)

1. Implementirati specijalizirane prikaze za različite kategorije
2. Poboljšati odabir vozila s više detalja
3. Implementirati masovni import podataka
4. Implementirati naprednu pretragu i filtriranje

## Tehnički zahtjevi

- Proširenje Prisma sheme
- Razvoj novih API ruta
- Implementacija novih React komponenti
- Razvoj administrativnog sučelja

## Zaključak

Implementacijom predloženih unapređenja, naš webshop će dobiti funkcionalnosti slične TecDoc sustavu, ali prilagođene našim specifičnim potrebama. Fokus je na stvaranju strukturirane baze podataka s detaljnim tehničkim specifikacijama i naprednim mogućnostima pretraživanja, što će značajno poboljšati korisničko iskustvo i olakšati pronalaženje odgovarajućih dijelova za različita vozila.