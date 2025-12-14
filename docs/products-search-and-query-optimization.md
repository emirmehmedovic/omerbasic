# Plan optimizacije queryja i pretrage proizvoda

**Cilj:**

- Optimizirati upite za listing i pretragu proizvoda za ~24k+ artikala.
- Iskoristiti postojeće trigram + unaccent indekse i poboljšati filtriranje.
- Zadržati postojeće ponašanje i UX, **posebno**:
  - `/products` stranica i svi filteri (kategorije, cijena, vozila).
  - `VehicleSelector` (odabir vozila i vraćeni rezultati).

**Glavna pravila:**

- Svaka faza je mala (bitesize), s jasnim koracima i checklistom testova.
- Nakon svake faze:
  - Usporedi rezultate i ponašanje s trenutnim stanjem (prije promjena).
  - Ako ima sumnje, **feature flag off** / rollback.

---

## Faza 0 – Priprema i sigurnosne ograde

### 0.1. Feature flagovi i okruženja

- **Zadatak 0.1.1** – Uvesti env varijable:
  - `USE_TRIGRAM_LISTING_SEARCH` (default `false`).
  - `USE_TRIGRAM_ADVANCED_SEARCH` (default `false`).
- **Implementacija (high-level):**
  - U `products/route.ts` i `/api/products/advanced-search` koristiti ove flagove da odluče da li će koristiti novu, optimiziranu logiku ili postojeću.
  - Kad je flag `false` → ponašanje je **100% isto kao sada**.

**Test checklist (0.1):**

- `USE_TRIGRAM_LISTING_SEARCH=false`, `USE_TRIGRAM_ADVANCED_SEARCH=false`:
  - `/products` stranica – potvrdi da filteri rade kao i danas (ručno klikanje + uporedba broj rezultata).
  - `VehicleSelector` – odaberi tipično vozilo (npr. VW Golf + generacija + motor) i provjeri da brojevi rezultata i proizvodi izgledaju kao i prije.

---

### 0.2. Produkcijski `.env`

- Kada uradiš commit/pull i deploy na **produkcijskom** serveru:
  - U produkcijski `.env` dodaj (ako već nisu dodane):
    - `USE_TRIGRAM_LISTING_SEARCH="false"`
    - `USE_TRIGRAM_ADVANCED_SEARCH="false"`
  - Restartaj aplikaciju / servis nakon izmjene `.env`.
  - Tek nakon što na stagingu/prod okruženju potvrdiš da sve radi kako treba, možeš po potrebi postaviti:
    - `USE_TRIGRAM_LISTING_SEARCH="true"` i/ili `USE_TRIGRAM_ADVANCED_SEARCH="true"`.
  - Ako se pojave problemi, prvi korak roll‑backa je vratiti vrijednosti na `"false"` (bez mijenjanja koda).

## Faza 1 – DB indeksi (bez promjene koda)

**Cilj:** ubrzati tipične WHERE uslove bez mijenjanja query logike.

### 1.1. Dodati indekse na Product

- **Zadatak 1.1.1** – U `schema.prisma` dodati:
  - `@@index([oemNumber])`
  - `@@index([sku])`
  - `@@index([categoryId, isArchived, stock])`
- **Opcionalno** (ako se često filtrira i po cijeni):
  - `@@index([categoryId, isArchived, stock, price])`

### 1.2. Dodati indekse na ProductCrossReference

- **Zadatak 1.2.1** – U `ProductCrossReference`:
  - `@@index([referenceNumber])`
- **Opcionalno:**
  - `@@index([referenceType, referenceNumber])` ako često ograničavaš po tipu reference.

### 1.3. Dodati indekse na ProductAttributeValue

- **Zadatak 1.3.1** – U `ProductAttributeValue`:
  - `@@index([attributeId, numericValue])`
- **Opcionalno**, ako se puno filtrira po string vrijednostima atributa:
  - `@@index([attributeId, value])`

### 1.4. (Opcionalno) GIN indeksi na JSON polja

- **Zadatak 1.4.1** – Ako dimenzije/specs filteri postanu teški:
  - Dodati SQL migracije za GIN indekse tipa:
    - `CREATE INDEX CONCURRENTLY product_dimensions_gin_idx ON "Product" USING gin ("dimensions" jsonb_path_ops);`
    - `CREATE INDEX CONCURRENTLY product_technical_specs_gin_idx ON "Product" USING gin ("technicalSpecs" jsonb_path_ops);`

> Ove indekse dodaj tek ako monitorisanjem vidiš da JSON filteri postaju bottleneck.

### Test checklist (Faza 1)

Nema promjene koda – samo indeksi. Ipak, provjeriti:

- Pokrenuti migracije na staging bazi.
- Na stagingu:
  - `/products` bez filtera, samo paginacija.
  - `/products` sa kombinacijom: kategorija + min/max cijena + `includeOutOfStock=false`.
  - `VehicleSelector` – generacija + motor.
- U oba slučaja provjeriti:
  - Rezultati (broj proizvoda i primjeri proizvoda) su **identični** prije i poslije indeksa.
  - Latencija requesta je ista ili manja.

---

## Faza 2 – Optimizacija `/api/products` (listing) za `q`

**Cilj:** kad korisnik koristi `q` na `/products`, umjesto velikog Prisma `OR contains` koristiti trigram prefilter (brže i skalabilnije).

### 2.1. Uvođenje trigram prefiltera u `GET /api/products`

#### Zadatak 2.1.1 – Prebacivanje na feature flag

- U `src/app/api/products/route.ts`:
  - Čitanje `process.env.USE_TRIGRAM_LISTING_SEARCH` (tretirati bilo šta osim `'true'` kao `false`).
  - Ako je flag `false` → **ne dirati** postojeću logiku za `q`.

#### Zadatak 2.1.2 – Implementacija trigram prefiltra (iza flaga)

- Kad je `USE_TRIGRAM_LISTING_SEARCH === 'true'` i `q.length >= 3`:
  - Uraditi raw SQL upit (slično `advancedSearch` u `search-utils.ts`):
    - `SELECT p.id FROM "Product" p WHERE immutable_unaccent(lower(...)) % immutable_unaccent(lower($q)) ... ORDER BY score DESC LIMIT N`.
    - Limitiraj na npr. `N = 1000`.
  - Rezultat: lista `prefilteredIds`.
- U nastavku `where` objekta:
  - Ako `prefilteredIds` postoji:
    - `where.id = { in: prefilteredIds }`.
  - Na to **dodati** postojeće filtere:
    - `categoryId in (getCategoryAndChildrenIds(...))`.
    - `vehicleFitments.some(...)` za `generationId` / `engineId`.
    - `price` range.
    - `stock > 0` (osim ako je `includeOutOfStock=true`).

#### Zadatak 2.1.3 – Fallback za kratke upite

- Ako `q` postoji, ali `q.length < 3`:
  - **Ne koristiti trigram**, već:
    - Ograničiti se na preciznije uslove tipa:
      - `catalogNumber` `equals`/`startsWith` (indeksirano).
      - `oemNumber` `equals`/`startsWith` (indeksirano).
      - `sku` `equals`/`startsWith` (indeksirano).
    - Izbjegavati `contains` po `description`.

### 2.2. Testiranje – fokus na `/products` i VehicleSelector

Radi sve prvo s `USE_TRIGRAM_LISTING_SEARCH=false`, pa onda `true`.

#### Test skup A – bez `q` (ne smije se promijeniti ništa)

- **Koraci:**
  - `USE_TRIGRAM_LISTING_SEARCH=false` → otvori `/products?categoryId=...` (tipična kategorija).
  - Zapiši:
    - Broj rezultata (iz UI i iz `X-Total-Count`).
    - Prvih 10 proizvoda (naziv, cijena, katalog broj).
  - Uključi flag (`USE_TRIGRAM_LISTING_SEARCH=true`), redeploy.
  - Opet otvori istu URL.
- **Očekivanje:**
  - Broj rezultata, redoslijed i proizvodi moraju biti isti.

#### Test skup B – `q` samo (bez vozila)

- Primjeri upita:
  - `q=filter`, `q=disc`, `q=ATE 24.xxx`, `q=OEM broj koji znaš`.
- Usporedba prije/poslije flaga:
  - Broj rezultata može se malo razlikovati (trigram vs contains), ali:
    - **Top 3–5 rezultata** trebaju biti isti ili semantički bolji.
    - Nijedan očiti rezultat ne smije „nestati“ (znaš da postoji proizvod za konkretan OEM/kataloški broj → mora i dalje biti vidljiv).

#### Test skup C – `q` + vozilo (VehicleSelector)

- Scenarij:
  - Odaberi brand → model → generaciju → motor (VehicleSelector).
  - Filteri postavljaju `generationId`/`engineId` i često `categoryId`.
- Test:
  - Prije flaga: zabilježi broj rezultata / primjer 5 artikala.
  - Sa flagom: provjeri da se rezultatni skup poklapa (do sitnih razlika u poretku kad je i `q` uključeno).
- Posebno pazi na:
  - Kombinacije gdje korisnik prvo odabere vozilo, pa tek onda unese `q`.

Ako bilo što izgleda sumnjivo:
- Isključi `USE_TRIGRAM_LISTING_SEARCH` i zadrži indeksne promjene (Faza 1).

---

## Faza 3 – Optimizacija `/api/products/advanced-search`

**Napomena:**

- Ova ruta (`/api/products/advanced-search`) je odvojena od `/api/products/search?mode=advanced` koje već koristi `advancedSearch` helper.
- Cilj ove faze je **lagano** poboljšanje performansi, **bez** refaktorisanja na potpuno novi backend.

### 3.1. Feature flag i trigram za `validatedQuery`

#### Zadatak 3.1.1 – Uvesti flag

- U ovoj ruti čitati `USE_TRIGRAM_ADVANCED_SEARCH`.
- Ako je `false` → zadržati postojeće ponašanje.

#### Zadatak 3.1.2 – Prefilter za `validatedQuery`

- Kad je `true` i `validatedQuery.length >= 3`:
  - Uraditi raw SQL prefilter da dobiješ `id`-jeve proizvoda koji odgovaraju `validatedQuery` (isto kao u Fazi 2, ali bez dodatnih standarda/atributa).
  - Ograniči rezultat (npr. 5000 ID-jeva).
  - U `whereConditions` dodaj `id in [prefilteredIds]`.
  - Ostali filteri (`categoryId`, price, vehicleGenerationId, crossReferenceNumber, atributi) ostaju isti.

### 3.2. Testovi – napredna pretraga

- Odabrati nekoliko tipičnih scenarija u UI-ju koji koriste naprednu pretragu:
  - Pretraga po `query` + kategoriji.
  - Pretraga po `query` + vozilu.
  - Pretraga po atributima (npr. viskozitet / promjer).
- Prije i poslije flaga:
  - Usporedi broj rezultata i reprezentativne proizvode.
  - Dozvoljene su sitne razlike u redoslijedu kad postoji fuzzy komponenta, ali ne smiju „nestati“ relevantni proizvodi.

Ako promjena uvede previše razlika ili komplikacija – flag se vraća na `false` i ova faza se može odgoditi.

---

## Faza 4 – Cross-reference pretraga (po potrebi)

Ova faza je **opcionalna**, zavisi od stvarnog opterećenja.

### 4.1. Mjerenje

- Uključi logovanje za:
  - `/api/products/search/cross-references`.
  - `/api/products/advanced-search` kad se koristi `crossReferenceNumber`.
- Pogledaj:
  - Koliko često se pozivaju.
  - Koliko traje prosječan upit (ms).

### 4.2. Optimizacija (ako je potrebno)

Ako vidimo da su upiti spori i dominantno filtriraju po `referenceNumber`:

- Provjeriti da je indeks na `ProductCrossReference.referenceNumber` migriran (Faza 1).
- Po potrebi:
  - Umjesto `contains` na cijelom stringu, koristiti `startsWith` / `equals` za tipične formate referenci.
  - Ili uvesti trigram indeks i `%` operator nad `referenceNumber` za fuzzy search.

### Test checklist (Faza 4)

- Uporedi rezultate za nekoliko poznatih OEM / aftermarket brojeva prije i poslije.
- Pobrinuti se da se:
  - Nisu promijenili osnovni slučajevi (upišeš tačan OEM → dobiješ isti proizvod).
  - UI za cross-reference pretragu i dalje prikazuje očekivane podatke.

---

## Faza 5 – Monitoring i rollback strategija

### 5.1. Monitoring

- Uvesti (ili provjeriti da već postoji):
  - Logging sporih upita (npr. `PRISMA_LOG_QUERIES=true` na stagingu).
  - Grafikone / logove za latenciju:
    - `/api/products`.
    - `/api/products/search`.
    - `/api/products/advanced-search`.
    - `/api/products/search/cross-references`.

### 5.2. Rollback

- Ako bilo koja faza uvede regresiju:
  - Prvo isključi odgovarajući feature flag:
    - `USE_TRIGRAM_LISTING_SEARCH=false`.
    - `USE_TRIGRAM_ADVANCED_SEARCH=false`.
  - Time se backend vraća na postojeće ponašanje, uz zadržane indekse (koji ne mijenjaju semantiku).

---

## Sažetak zadataka (bitesize)

**Faza 0 – Sigurnosni okvir**

- [x] Dodati `USE_TRIGRAM_LISTING_SEARCH` i `USE_TRIGRAM_ADVANCED_SEARCH` u `.env.example` i lokalni/staging `.env`.
- [x] Uvesti čitanje `USE_TRIGRAM_LISTING_SEARCH` u `GET /api/products` (advanced search flag će se koristiti u Fazi 3).
- [ ] Test: `/products` i VehicleSelector rade identično prije/poslije.

**Faza 1 – Indeksi**

- [x] Dodati indekse u `schema.prisma` za Product, ProductCrossReference, ProductAttributeValue.
- [x] Generirati i pokrenuti migracije (lokalno/staging).
- [ ] Test: `/products` i VehicleSelector – isti rezultati, brži upiti.

**Faza 2 – `/api/products` listing**

- [x] Implementirati trigram prefilter za `q` iza `USE_TRIGRAM_LISTING_SEARCH`.
- [x] Implementirati sigurniji tretman kratkih upita (`q.length < 3`).
- [ ] Test skup A/B/C (bez `q`, sa `q`, `q` + vozilo) na stagingu.

**Faza 3 – `/api/products/advanced-search`**

- [x] Uvesti `USE_TRIGRAM_ADVANCED_SEARCH` i koristiti ga za trigram prefilter kad `validatedQuery.length >= 3`.
- [ ] Testirati tipične napredne pretrage (tekst + kategorija + vozilo + atributi).

**Faza 4 – Cross-reference (po potrebi)**

- [ ] Izmjeriti latenciju cross-reference ruta.
- [ ] Po potrebi pojačati indekse i/ili prefilter.

**Faza 5 – Monitoring**

- [ ] Uključiti query logove na stagingu i usporediti planove prije/poslije.
- [ ] Postaviti minimalne metrike za praćenje latencije ključnih ruta.
