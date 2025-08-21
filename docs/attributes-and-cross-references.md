# Atributi i Cross-reference u TecDoc-like sustavu

Ovaj dokument detaljno opisuje kako su osmišljeni atributi proizvoda i cross-reference veze u projektu koji replicira TecDoc funkcionalnosti.

Sadržaj:
- Modeli podataka i relacije
- Administrativni tokovi (UI)
- API endpointi i očekivani payloadi
- Pretraga i filtriranje (basic i advanced)
- Import/Export (CSV) i validacija
- Primjeri korisničkih tokova (use-cases)
- Buduća poboljšanja i plan

---

## 1) Modeli podataka i relacije

Osnovna ideja je da svaka kategorija definira vlastiti skup atributa (schema), a proizvodi čuvaju vrijednosti po toj shemi.

- **Category** – hijerarhijska taksonomija (glavna → podkategorije → specifične), koristi se za navigaciju i filtriranje.
- **CategoryAttribute** (definicija atributa) – definira koje atribute ima određena kategorija.
  - Ključna polja: `name`, `label`, `type` (string/number/boolean/enum…), `unit?`, `options?`, `isRequired`, `isFilterable`, `sortOrder`, `categoryId`.
  - Unikatnost: `@@unique([name, categoryId])`.
  - Planirano: grupiranje atributa (`AttributeGroup`), validacijska pravila, konverzije jedinica.
- **ProductAttributeValue** (vrijednosti atributa) – pohranjuje vrijednost atributa za svaki proizvod.
  - Veza: `(productId, attributeId)` je jedinstvena kombinacija.
  - Planirano: `numericValue`, `unit` za bolje sortiranje i napredno filtriranje.
- **ProductCrossReference** – OEM/aftermarket/konkurentske reference i veze zamjene.
  - Polja: `referenceType` (OEM/Aftermarket/Replacement…), `referenceNumber`, `manufacturer?`, `notes?`, `replacementId?`.
  - Relacije na `Product`:
    - `originalReferences` – reference koje polaze od ovog proizvoda.
    - `replacementFor` – ovaj proizvod je zamjena za drugi.
- **Vehicle/Engine/Generation** – proizvodi su mapirani na kompatibilne generacije/motore vozila (fitment), što omogućava filtriranje po vozilu.

Referenca: `tecdoc.md`, `tecdoc-plan.md`, `docs/tecdoc-implementation-plan.md`.

---

## 2) Administrativni tokovi (UI)

### 2.1 Upravljanje atributima kategorija
- Lokacija (admin): stranica za definiranje atributa po kategoriji (vidi plan u `docs/tecdoc-implementation-plan.md`).
- Akcije:
  - Dodavanje/uređivanje/brisanje `CategoryAttribute` polja.
  - Postavljanje `type`, `label`, `isFilterable`, `sortOrder`, opcionalno `unit`, `options`.
  - (Plan) Grupiranje u `AttributeGroup` i validacija vrijednosti.

### 2.2 Upravljanje vrijednostima atributa proizvoda
- Kada se uređuje proizvod, UI dohvaća atribute prema kategoriji i prikazuje odgovarajuća polja.
- Vrijednosti se spremaju u `ProductAttributeValue`.
- Buduće: prikaz grupirano (po `AttributeGroup`), validacija, automatske konverzije jedinica.

### 2.3 Upravljanje cross-reference podacima
- Komponenta: `src/components/admin/ProductCrossReferenceManager.tsx`.
- Funkcije:
  - Dodavanje/uređivanje/brisanje cross-referenci (OEM, aftermarket…).
  - Povezivanje zamjenskog proizvoda preko modala za pretragu.
  - Modal pretrage ima tekstualni upit i filter po kategoriji ("Sve kategorije" → sentinel vrijednost `"all"`).
  - Poboljšanja kontrasta i UI-a implementirana (npr. vidljivost gumba "Uredi").

---

## 3) API endpointi (trenutni i planirani)

### 3.1 Kategorije
- `GET /api/categories/hierarchy` – vraća stablo kategorija (koristi se za dropdown i rekurzivno skupljanje potomaka pri filtriranju).

### 3.2 Pretraga proizvoda (basic)
- `GET /api/products/search`
  - Parametri: `q` (query), `mode=basic`, (opcionalno) `categoryId`.
  - Ponašanje: ako je `categoryId` zadan i nije `"all"`, backend rekurzivno uključuje sve potomke i filtrira rezultate.
  - Pretraga pokriva osnovna polja (npr. naziv, kataloški/OEM brojevi) i (po potrebi) vozilo.

### 3.3 Pretraga proizvoda (advanced – plan)
- `GET /api/products/filter` (plan, vidi `tecdoc.md` i `docs/tecdoc-implementation-plan.md`)
  - Filteri po atributima kategorije (`CategoryAttribute`), dimenzijama, tehničkim specifikacijama, standardima, cross-referencama (OEM, konkurentski brojevi).
  - Fuzzy pretraga, rasponi za numeričke vrijednosti, više odabira za enum.

### 3.4 Vozila i motori (plan/djelomično gotovo)
- `GET /api/generations/:id/engines` – dohvat motora za generaciju (planirano u `tecdoc-plan.md`).
- Produkcija fitment podataka za filtriranje po vozilu.

---

## 4) Pretraga i filtriranje – ponašanje sustava

### 4.1 Basic pretraga (implementirano)
- Frontend (modal u `ProductCrossReferenceManager.tsx`) koristi debounced poziv na `/api/products/search`.
- Dropdown kategorija koristi sentinel vrijednost `"all"` da se izbjegnu prazne vrijednosti u Radix Select.
- Ako je izabrano nešto osim `"all"`, API dobiva `categoryId` i filtrira uključujući sve potomke.

### 4.2 Advanced pretraga (plan)
- UI dinamički gradi filtere prema `CategoryAttribute` definicijama za aktivnu kategoriju.
- Backend pretvara odabrane filtere u `where` uvjete (uključujući JSON polja ili migrirane numeričke vrijednosti `numericValue`).
- Cross-ref pretraga: pretraživanje po `ProductCrossReference.referenceNumber` s tipom `OEM` i drugim tipovima.

---

## 5) Import/Export (CSV)

- Definiran standardni CSV format i workflow (vidi `docs/csv-format-specification.md`).
- Podržan export i bulk upload.
- CSV može sadržavati:
  - Osnovna polja proizvoda
  - Cross-reference (OEM/aftermarket) kolone
  - (Plan) Atributne vrijednosti po konvenciji zaglavlja (npr. `attr:viscosity`, `attr:diameter(mm)`).
- Validacija i izvještavanje o greškama važni su za kvalitetu podataka.

---

## 6) Primjeri tokova

### 6.1 Dodavanje atributa za kategoriju
1. U adminu otvoriti kategoriju (npr. "Motorna ulja").
2. Dodati atribute: `viscosity` (enum), `acea` (enum), `api` (enum), `volume` (number, unit=L).
3. Označiti `isFilterable` gdje ima smisla.

### 6.2 Uređivanje proizvoda
1. Odabrati kategoriju proizvoda.
2. UI prikaže polja na temelju `CategoryAttribute`.
3. Unijeti vrijednosti → sprema se u `ProductAttributeValue`.

### 6.3 Dodavanje cross-reference
1. U `ProductCrossReferenceManager` klik „Dodaj novu referencu“.
2. Odabrati `referenceType` (npr. OEM), unijeti `referenceNumber`, (opcija) `manufacturer` i `notes`.
3. Ako zamjenski proizvod postoji, odabrati ga kroz modal pretrage (sa `q` + `categoryId`).

### 6.4 Pretraga u modalu
1. Unijeti upit (min 3 slova) → debounce → `GET /api/products/search?q=...&mode=basic`.
2. (Opcija) Izabrati kategoriju ("Sve kategorije" = `all`) → ponovno se trigerira pretraga.
3. Rezultati prikazuju naziv, kataloški/OEM broj, proizvođača itd.

---

## 7) Buduća poboljšanja

- **AttributeGroup**: grupiranje i prikaz atributa u sekcije.
- **Validacija i konverzije**: pravila po tipu (min/max), konverzije jedinica.
- **Napredni filteri**: rasponi za numeričke vrijednosti, više odabira za enum, fuzzy search.
- **Kompatibilnost vozila**: precizniji fitment (više detalja o vozilu i motoru), automatsko filtriranje po selekciji vozila.
- **UX**: poboljšani prikazi proizvoda (grupirani atributi), kontrasti i spacing, breadcrumbi (npr. "Motor: Svi").
- **Performanse**: indeksi za atribute i cross-ref tablice, paginacija i sortiranje.

---

## 8) Reference
- `src/components/admin/ProductCrossReferenceManager.tsx`
- `src/app/api/products/search/route.ts`
- `src/app/api/categories/hierarchy/route.ts`
- `docs/csv-format-specification.md`
- `tecdoc.md`, `tecdoc-plan.md`, `docs/tecdoc-implementation-plan.md`
