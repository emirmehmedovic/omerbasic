# SEO plan za TP Omerbašić (Tešanj / Jelah)

Ovaj dokument je **operativni SEO plan** za shop TP Omerbašić.

Fokus:
- Autodijelovi (putnička vozila)
- Kamionski dijelovi (teretna vozila)
- ADR oprema
- Oprema za autopraonice
- Prijevoz automobila i cisterni

---

## Faza 0 – Preduvjeti i osnove

1. [x] **Definisati glavnu domenu**
   - Primjer: `https://www.tp-omerbasic.ba` ili druga odabrana produkcijska domena.
   - Odlučiti hoće li verzija bez `www` redirektati na `www` ili obrnuto.

2. [x] **Podesiti .env za produkciju**
   - U `.env.production` ili varijable na serveru postaviti:
     - `NEXT_PUBLIC_SITE_URL=https://www.tvoja-domena.ba`
   - Provjeriti da se ova vrijednost koristi u:
     - `src/app/layout.tsx` (`metadataBase`)
     - `src/app/sitemap.ts`
     - `src/app/robots.ts`

3. [ ] **Osigurati HTTPS i ispravan redirect**
   - Na hosting/u (Vercel, nginx, reverse proxy, sl.):
     - Sve HTTP zahtjeve redirektati na HTTPS.
     - Sve `non-canonical` domene (npr. bez `www`) redirektati na glavnu domenu.

---

## Faza 1 – Quick wins u kodu (Next.js metadata, sitemap, robots)

### 1.1. Globalni metadata (`src/app/layout.tsx`)

1. [x] **Revidirati globalni `title` i `description`**
   - `title.default`:
     - Uključiti glavne fraze: `autodijelovi`, `kamionski dijelovi`, `ADR oprema`, `Tešanj / Jelah`, `BiH`.
     - Primjer: `TP Omerbašić – Autodijelovi Tešanj | Putnička i teretna vozila, ADR, autopraonice`.
   - `description`:
     - Jasno navesti:
       - Šta prodajete (auto/kamionski dijelovi, ADR, autopraonice),
       - Lokaciju (Rosulje bb, Jelah, Tešanj),
       - Telefonske brojeve i radno vrijeme,
       - Dostavu širom BiH.

2. [x] **Ažurirati `keywords` niz**
   - Dodati varijacije sa lokacijom:
     - `"auto dijelovi Tešanj"`
     - `"autodijelovi Jelah"`
     - `"kamionski dijelovi BiH"`
     - `"ADR oprema BiH"`
     - `"oprema za autopraonice"` itd.

3. [x] **Provjeriti OpenGraph i Twitter meta podatke**
   - `openGraph.title` i `openGraph.description` uskladiti sa novim globalnim opisom.
   - Osigurati ispravan `locale` (npr. `bs_BA`) i `siteName`.

### 1.2. Robots i sitemap

1. [x] **Robots.ts (`src/app/robots.ts`)**
   - Provjeriti da `host` i `sitemap` koriste `NEXT_PUBLIC_SITE_URL` (ne `https://example.com`).
   - Ostaviti pravilo:
     - `allow: '/'`
     - `disallow: ['/admin', '/api']` (admin i API ne želimo indeksirati).

2. [x] **Noindex za specifične rute koje nisu za SEO**
   - Stranica `src/app/ads/[slug]/page.tsx` služi za prikaz reklama na ekranima.
   - Dodati `generateMetadata` u tu rutu i postaviti:
     - `robots: { index: false, follow: false }`
   - Opcionalno: i druge interne / specijalne stranice koje nemaju smisla za Google (npr. specifične interne admin URL‑ove, ako bi ikad bili javno dostupni).

3. [ ] **Sitemap (`src/app/sitemap.ts`) – proširenje**
   - Trenutno: samo `['/', '/products', '/contact']`.
   - Proširiti na:
     - Staticke stranice:
       - `/` (home)
       - `/products`
       - `/contact`
       - Nove uslužne landing stranice (prijevoz, ADR, autopraonice, vidi Fazu 3).
     - Product stranice (nakon uvođenja slugova, vidi Fazu 2):
       - `db.product.findMany({ select: { slug, updatedAt } })` i generisati URL‑ove.

---

## Faza 2 – SEO-friendly URL‑ovi i product stranice

### 2.1. Uvođenje slug‑ova za proizvode

1. [x] **Shema baze (Prisma)**
   - Dodati polje `slug` u model `Product`:
     - `slug String @unique`
   - Izvršiti migraciju baze.

2. [x] **Popuniti slugove za postojeće proizvode**
   - Skripta (npr. `scripts/generate-product-slugs.ts`):
     - Za svaki proizvod generisati slug od:
       - `manufacturer.name`, `product.name`, `šifra` (ako postoji), npr. `bosch-kocione-plocice-golf-5-12345`.
     - Voditi računa o:
       - transliteraciji ć/č/š/ž/đ → c/c/s/z/d
       - zamjeni razmaka sa `-`
       - snižavanju u lowercase.

3. [x] **Promjena rute**
   - Umjesto `/products/[productId]`, uvesti `/products/[slug]`:
     - Nova ruta: `src/app/products/[slug]/page.tsx`.
     - U kodu `findUnique({ where: { slug } })` umjesto `id`.

4. [x] **301 redirect sa starog `/products/[productId]`**
   - Opcije:
     - a) Zadržati staru rutu koja radi lookup po `id` i odmah radi `redirect` na novu slug rutu.
     - b) Middleware (`middleware.ts`) koji prepoznaje stari pattern i radi redirect.
   - Cilj: ne gubiti eventualni authority/starije linkove.

### 2.2. Product metadata i structured data

1. [x] **Dodati `generateMetadata` u product page**
   - Za `src/app/products/[slug]/page.tsx`:
     - Title:
       - `{product.manufacturer?.name} {product.name} – autodijelovi Tešanj | TP Omerbašić`
     - Description:
       - Kratak opis proizvoda, za koje vozilo (brand/model/generacija), + lokacija + kontakt.
     - Canonical:
       - `"/products/" + product.slug`.

2. [x] **Dodati JSON‑LD Product schema**
   - U `return` dijelu product stranice ubaciti `<script type="application/ld+json">` sa:
     - `@context: "https://schema.org"`
     - `@type: "Product"`
     - Polja:
       - `name`, `image`, `brand`, `sku` ili `mpn`, `description`
       - `offers`:
         - `price`, `priceCurrency: "BAM"`, `availability`, `url`
   - Koristiti podatke iz `product` objekta.

3. [x] **Breadcrumbs (navigacija)**
   - Uvesti breadcrumbs na product strani:
     - HTML struktura: Početna → Kategorija → Potkategorija → Proizvod.
   - Dodati i `BreadcrumbList` JSON‑LD:
     - `itemListElement` niz sa pozicijama i URL‑ovima.

---

## Faza 3 – Hub stranice za glavne kategorije i usluge

### 3.1. Hub stranice za glavne product kategorije

1. [x] **Kreirati rute za 4 glavne kategorije**
   - Primjeri ruta:
     - `/proizvodi/putnicka-vozila`
     - `/proizvodi/teretna-vozila`
     - `/proizvodi/adr-oprema`
     - `/proizvodi/oprema-za-autopraonice`

2. [x] **Sadržaj na svakoj hub stranici**
   - H1: “Autodijelovi za [kategorija] – Tešanj, BiH”.
   - Kratak uvod (2–3 paragrafa):
     - Šta nudite za tu kategoriju.
     - Za koga je (tipovi vozila, ciljni kupci).
     - Istaknuti prednosti (veliki lager, brza dostava, stručna podrška).
   - Linkovi / CTA:
     - Link na filtriranu listu proizvoda (`/products` sa query parametrima za tu kategoriju).
     - Interni linkovi ka popularnim potkategorijama ili brendovima.

3. [x] **Metadata za svaku hub stranicu**
   - U `export const metadata` (ili `generateMetadata`):
     - Title i description fokusirani na tu kategoriju + lokaciju (Tešanj, Jelah, BiH).

4. [x] **Interno linkanje sa početne stranice**
   - Na home stranici osigurati da glavne kategorije linkaju na nove hub URL‑ove.

### 3.2. Landing stranice za usluge

1. [x] **Definisati rute za usluge**
   - Primjeri:
     - `/prijevoz-vozila` – usluga prijevoza automobila.
     - `/prijevoz-cisterni` – usluga prijevoza cisterni.
     - `/adr-oprema` – (može biti hub i usluga).
     - `/oprema-za-autopraonice` – oprema, kemija, itd.

2. [x] **Sadržaj po landing stranici**
   - H1: “Prijevoz vozila Tešanj – siguran transport automobila širom BiH”.
   - Sekcije:
     - Šta tačno nudite (tipovi vozila/cisterni koje prevozite).
     - Područje pokrivanja (Tešanj, BiH, region ako je relevantno).
     - Proces saradnje (korak 1–2–3).
     - Reference (ako postoje) i tipični klijenti.
     - FAQ sekcija (5–7 najčešćih pitanja).
   - Jasan CTA:
     - Telefon (klikabilan),
     - Kontakt forma,
     - Email.

3. [x] **Metadata za uslužne stranice**
   - Targetirane ključne riječi:
     - “prijevoz vozila Tešanj”, “prijevoz automobila BiH”, “prijevoz cisterni BiH”, itd.

---

## Faza 4 – Lokalni SEO (Tešanj / Jelah / BiH)

1. [ ] **Google Business Profile**
   - Provjeriti da profil postoji i da su podaci tačni:
     - Naziv: “TP Omerbašić” + opis aktivnosti (autodijelovi).
     - Primarna kategorija: “Prodavnica auto dijelova”.
     - Sekundarne: “Kamionski dijelovi”, “Transport robe” (ako radite prijevoz), “Auto servis” (ako postoji servis).
     - Link na web stranicu (canonical domena).
     - Radno vrijeme i kontakt.
   - Redovno:
     - Objavljivati postove (akcije, noviteti, usluge).
     - Odgovarati na recenzije.

2. [x] **Lokalne landing stranice**
   - Kreirati 1–2 stranice:
     - `/autodijelovi-tesanj`
     - `/autodijelovi-jelah`
   - Sadržaj:
     - Fokus na lokalne kupce iz Tešnja/Jelah.
     - Kako doći do prodavnice, parking, mapa.
     - Zašto ste bolji izbor lokalno (blizina, lager, brzina isporuke).

3. [ ] **Lokalne citacije i direktoriji**
   - Prijaviti firmu na:
     - Lokalne portale / poslovne direktorije.
     - Specijalizirane auto forume / direktorije u BiH.
   - Paziti na **dosljedan NAP** (Name, Address, Phone) svuda.

---

## Faza 5 – Off-page SEO i link building

1. [ ] **Partneri i B2B kupci**
   - Identificirati veće B2B klijente (transportne firme, servise, fleet kompanije).
   - Dogovoriti da vas na svojim web stranicama navedu kao dobavljača dijelova sa linkom.

2. [ ] **Sadržaj kao baza za linkove (blog/vodiči)**
   - Planirati stručne članke (kasnije):
     - “Kako izabrati kočione pločice za teretna vozila u BiH”.
     - “Šta je ADR oprema i šta vam je obavezno u BiH”.
     - “Kako održavati opremu za autopraonicu da traje duže”.
   - Objave koristiti da dobijete linkove sa:
     - Portala,
     - Foruma,
     - Partnerskih sajtova.

3. [ ] **Sponzorstva / događaji**
   - Ako sponzorišete lokalne sportske timove, događaje, manifestacije:
     - Dogovoriti da vas navedu sa linkom na web sajt.

---

## Faza 6 – Mjerenje i iteracije

1. [ ] **Postaviti osnovnu analitiku**
   - Google Analytics 4 (ili drugi alat).
   - Postaviti ciljeve (konverzije):
     - Poslate kontakt forme,
     - Klik na telefon,
     - Registracije / narudžbe.

2. [ ] **Search Console**
   - Verifikovati domenu u Google Search Console.
   - Dodati sitemap URL (npr. `https://www.tvoja-domena.ba/sitemap.xml`).
   - Pratiti:
     - Query‑je po kojima se rangirate,
     - CTR, pozicije,
     - Index coverage (greške, isključene stranice).

3. [ ] **Iteracije na osnovu podataka**
   - 1x mjesec dana:
     - Pregledati stranice sa najviše prikaza, ali niskim CTR‑om → prilagoditi title/description.
     - Identificirati proizvode i kategorije koje već dobijaju dobar organski promet → dodatno ih ojačati sadržajem i internim linkovima.

---

## Predloženi redoslijed implementacije (sa prioritetom)

**Prioritet 1 (brzi dobici, 1–2 dana rada):**
- [x] Podesiti `NEXT_PUBLIC_SITE_URL` i provjeriti `layout.tsx`, `sitemap.ts`, `robots.ts`.
- [x] Revidirati globalni `metadata` (title, description, keywords).
- [x] Dodati/izmijeniti `metadata` za `/products` i `/contact`.
- [x] Dodati `noindex` na `ads/[slug]` rutu.
- [ ] Proširiti `sitemap` barem na sve ključne statičke stranice.

**Prioritet 2 (struktura proizvoda i kategorija, 1–2 sedmice):**
- [x] Uvesti `slug` polje za proizvode i popuniti ga skriptom.
- [x] Prebaciti rutu na `/products/[slug]` uz 301 redirect sa stare `/products/[id]` rute.
- [x] Implementirati `generateMetadata` i Product JSON‑LD na product stranici.
- [ ] Napraviti hub stranice za 4 glavne kategorije i uvezati ih sa početne stranice i `/products`.

**Prioritet 3 (lokalni i off‑page, kontinuirano):**
- [ ] Optimizirati Google Business profil.
- [x] Napraviti lokalne landing stranice (`autodijelovi-tesanj`, `autodijelovi-jelah`).
- [ ] Početi graditi linkove preko partnera, portala, događaja.
- [ ] Uvesti analitiku (GA4, Search Console) i mjesečni SEO review.
