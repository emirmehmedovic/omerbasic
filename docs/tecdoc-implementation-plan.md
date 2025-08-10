# Plan implementacije TecDoc-like značajki

## Završene značajke

1. **Upravljanje vozilima i motorima**:
   - Implementiran model `VehicleEngine` za upravljanje motorima vozila
   - Napravljeno admin sučelje za dodavanje i uređivanje motora za svaku generaciju vozila
   - Uklonjeni stari atributi motora iz `VehicleGeneration` modela

2. **Atributi kategorija**:
   - Implementiran model `CategoryAttribute` za definiranje atributa koji pripadaju određenoj kategoriji
   - Napravljeno admin sučelje za upravljanje atributima kategorija

3. **Vrijednosti atributa proizvoda**:
   - Implementiran model `ProductAttributeValue` za pohranu vrijednosti atributa za svaki proizvod
   - Napravljeno admin sučelje za upravljanje vrijednostima atributa proizvoda

4. **Cross-reference proizvoda**:
   - Implementirani modeli za cross-reference proizvoda (originalni/zamjenski dijelovi)
   - Napravljeno admin sučelje za upravljanje cross-reference vezama

5. **Import/Export podataka** ✅
   - ✅ Definiran standardni CSV format za proizvode (zaglavlja, obavezna polja, format)
   - ✅ Implementiran export proizvoda u CSV formatu
   - ✅ Implementiran bulk upload (import) proizvoda putem CSV datoteke
   - ✅ Dokumentiran CSV format i workflow za import/export

## Trenutni fokus: Poboljšani sistem atributa i napredna pretraga

### 1. Poboljšani sistem atributa proizvoda

#### 1.1. Hijerarhija atributa
**Cilj**: Omogućiti grupiranje atributa u logičke cjeline za bolju organizaciju i prikaz.

**Implementacija**:
- Dodati novi model `AttributeGroup` za grupiranje atributa:
  ```prisma
  model AttributeGroup {
    id          String    @id @default(cuid())
    name        String    // Npr. "Tehničke specifikacije", "Dimenzije"
    label       String    // Lokalizirani naziv za prikaz
    sortOrder   Int       @default(0)
    categoryId  String
    category    Category  @relation(fields: [categoryId], references: [id], onDelete: Cascade)
    attributes  CategoryAttribute[]
    
    @@unique([name, categoryId])
  }
  ```
- Ažurirati `CategoryAttribute` model s referencom na grupu
- Implementirati API rute za upravljanje grupama atributa
- Ažurirati admin sučelje za prikaz i upravljanje grupama

#### 1.2. Poboljšani tipovi atributa i validacija
**Cilj**: Omogućiti bolje definiranje tipova atributa i validaciju vrijednosti.

**Implementacija**:
- Proširiti `CategoryAttribute` model:
  ```prisma
  model CategoryAttribute {
    // Postojeća polja...
    type          String    // Proširiti tipove: string, number, boolean, enum, range, dimension
    isComparable  Boolean   @default(false)  // Može li se koristiti za usporedbu proizvoda
    groupId       String?
    group         AttributeGroup? @relation(fields: [groupId], references: [id], onDelete: SetNull)
    
    // Nova polja
    validationRules Json?   // Min/max vrijednosti, regex paterni, itd.
    supportedUnits Json?    // Lista podržanih jedinica za konverziju
  }
  ```
- Implementirati validaciju vrijednosti atributa prema tipu
- Dodati podršku za konverziju jedinica mjere

#### 1.3. Poboljšane vrijednosti atributa
**Cilj**: Omogućiti bolje pohranjivanje i pretraživanje vrijednosti atributa.

**Implementacija**:
- Proširiti `ProductAttributeValue` model:
  ```prisma
  model ProductAttributeValue {
    // Postojeća polja...
    numericValue Float?   // Za numeričke vrijednosti (za lakše sortiranje/filtriranje)
    unit        String?   // Jedinica u kojoj je vrijednost pohranjena
  }
  ```
- Implementirati automatsku konverziju između različitih jedinica mjere
- Ažurirati API rute za upravljanje vrijednostima atributa

#### 1.4. Standardizirani atributi
**Cilj**: Omogućiti predloške atributa za često korištene kategorije.

**Implementacija**:
- Kreirati novi model `AttributeTemplate`:
  ```prisma
  model AttributeTemplate {
    id          String    @id @default(cuid())
    name        String    // Naziv predloška
    description String?   // Opis predloška
    attributes  Json      // Definicije atributa u predlošku
    createdAt   DateTime  @default(now())
    updatedAt   DateTime  @updatedAt
  }
  ```
- Implementirati API rute za upravljanje predlošcima
- Dodati funkcionalnost za primjenu predloška na kategoriju

### 2. Napredna pretraga i filtriranje

#### 2.1. Fuzzy pretraga
**Cilj**: Implementirati fuzzy pretragu za bolje rezultate kod tipfelera.

**Implementacija**:
- Istražiti i odabrati odgovarajuću metodu za fuzzy pretragu (Levenshtein, trigram)
- Implementirati fuzzy pretragu u API ruti za naprednu pretragu:
  ```typescript
  // Primjer implementacije fuzzy pretrage
  if (validatedQuery && validatedQuery.length >= 2) {
    whereConditions.OR = [
      // Postojeća pretraga
      { name: { contains: validatedQuery, mode: 'insensitive' } },
      // Fuzzy pretraga
      // ...
    ];
  }
  ```
- Testirati i optimizirati performanse fuzzy pretrage

#### 2.2. Pretraga po dimenzijama i tehničkim specifikacijama
**Cilj**: Omogućiti pretragu po JSON poljima za dimenzije i tehničke specifikacije.

**Implementacija**:
- Proširiti API rutu za naprednu pretragu:
  ```typescript
  // Pretraga po dimenzijama
  if (validatedDimensions) {
    const dimensionConditions = Object.entries(validatedDimensions).map(([key, value]) => ({
      dimensions: {
        path: [key],
        equals: value
      }
    }));
    
    if (dimensionConditions.length > 0) {
      if (!whereConditions.AND) whereConditions.AND = [];
      whereConditions.AND.push(...dimensionConditions);
    }
  }
  ```
- Implementirati UI komponente za filtriranje po dimenzijama i tehničkim specifikacijama
- Dodati validaciju za parametre pretrage

#### 2.3. Napredna pretraga po OEM i konkurentskim brojevima
**Cilj**: Poboljšati pretragu po cross-referencama.

**Implementacija**:
- Proširiti API rutu za naprednu pretragu:
  ```typescript
  // Pretraga po OEM brojevima
  if (validatedOemNumber) {
    if (!whereConditions.OR) whereConditions.OR = [];
    
    whereConditions.OR.push(
      { oemNumber: { contains: validatedOemNumber, mode: 'insensitive' } },
      {
        originalReferences: {
          some: {
            referenceType: 'OEM',
            referenceNumber: {
              contains: validatedOemNumber,
              mode: 'insensitive'
            }
          }
        }
      }
    );
  }
  ```
- Implementirati UI komponente za pretragu po OEM i konkurentskim brojevima
- Dodati indekse u bazu podataka za optimizaciju pretrage

#### 2.4. Pretraga po standardima
**Cilj**: Omogućiti pretragu po standardima koje proizvod zadovoljava.

**Implementacija**:
- Proširiti API rutu za naprednu pretragu:
  ```typescript
  // Pretraga po standardima
  if (validatedStandard) {
    whereConditions.standards = {
      has: validatedStandard
    };
  }
  ```
- Implementirati UI komponente za filtriranje po standardima
- Dodati podršku za višestruki odabir standarda

## Plan implementacije

### Faza 1: Poboljšanje modela podataka
- [ ] Ažurirati Prisma shemu s novim modelima i poljima
- [ ] Kreirati migraciju i primijeniti promjene na bazu podataka
- [ ] Ažurirati TypeScript tipove i validacijske sheme

### Faza 2: Implementacija poboljšanog sistema atributa
- [ ] Kreirati API rute za upravljanje grupama atributa
- [ ] Implementirati validaciju vrijednosti atributa prema tipu
- [ ] Implementirati konverziju jedinica mjere
- [ ] Ažurirati admin sučelje za upravljanje atributima

### Faza 3: Implementacija napredne pretrage
- [ ] Implementirati fuzzy pretragu
- [ ] Proširiti API rutu za naprednu pretragu
- [ ] Implementirati pretragu po JSON poljima
- [ ] Poboljšati pretragu po cross-referencama

### Faza 4: Ažuriranje korisničkog sučelja
- [ ] Implementirati poboljšane filtere za pretragu
- [ ] Dodati podršku za pretragu po dimenzijama i tehničkim specifikacijama
- [ ] Implementirati prikaz grupiranih atributa na stranici proizvoda

## Preostale značajke za implementaciju

### 1. Logika kompatibilnosti proizvoda
- Implementacija logike koja određuje koji proizvodi odgovaraju kojem vozilu
- Poboljšanje selekcije vozila na frontend-u s preciznijim filterima
- Automatsko filtriranje proizvoda na temelju odabranog vozila

### 2. Poboljšanje korisničkog iskustva
- Dodavanje više detalja o proizvodima na temelju atributa kategorija
- Poboljšanje prikaza kompatibilnih vozila za svaki proizvod
- Interaktivni prikaz tehničkih specifikacija

### 3. Izvještaji i analitika
- Implementacija izvještaja o najpopularnijim proizvodima po kategoriji vozila
- Analitika za praćenje trendova u pretraživanju i kupnji dijelova
- Dashboard za administratore s ključnim metrikama

### 4. API integracije
- Mogućnost integracije s vanjskim katalozima
- API endpointi za integraciju s drugim sustavima
4. Poboljšati performanse pretrage za velike skupove podataka
5. Implementirati paginaciju i sortiranje rezultata pretrage
