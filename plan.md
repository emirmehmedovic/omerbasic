# Detaljan Plan Izrade Webshop-a za Autodijelove (Ručni Unos Podataka)

Ovaj dokument opisuje detaljan plan izrade webshop-a za autodijelove, kamionske dijelove, ADR opremu i opremu za autopraonice, uzimajući u obzir ručni unos podataka o proizvodima, headless arhitekturu i naknadnu integraciju s kasom.

## I.  Planiranje i Specifikacija

### **[ ] 1. Definicija Zahteva**

*   **[ ] 1.1. Funkcionalni Zahtevi**
    *   **[ ] 1.1.1. Katalog Proizvoda**
        *   [x] Detaljno definisati atribute proizvoda:
            *   [x] Marka vozila
            *   [x] Model vozila
            *   [x] Godina proizvodnje
            *   [x] Tip motora
            *   [x] Kataloški broj (proizvođača i aftermarket)
            *   [x] OEM broj
            *   [x] Naziv proizvoda
            *   [x] Opis proizvoda
            *   [x] Cijena
            *   [x] Stanje zaliha
            *   [x] Slike proizvoda (jedna slika, upload implementiran)
            *   [x] Dimenzije (težina, širina, visina, dužina)
            *   [x] Jedinica mjere
        *   [x] Odrediti obavezne i opcione atribute
        *   [x] Definisati kategorije i podkategorije proizvoda (npr. Kočioni sistem, Sistem ogibljenja, Motor)
        *   [x] Omogućiti filtriranje proizvoda po svim relevantnim atributima
        *   [x] Implementirati pretragu proizvoda po nazivu, kataloškom broju, OEM broju i opisu.
    *   **[x] 1.1.2. Korpa i Proces Naručivanja**
        *   [x] Dodavanje proizvoda u korpu
        *   [x] Izmjena količine proizvoda u korpi
        *   [x] Uklanjanje proizvoda iz korpe
        *   [x] Pregled korpe
        *   [x] Unos podataka za dostavu i fakturisanje (odvojene adrese)
        *   [x] Izbor načina dostave (lično preuzimanje, kurirska služba)
        *   [x] Prikaz fiksnog iznosa dostave
        *   [x] Izbor načina plaćanja (bankovni transfer, pouzeće)
        *   [x] Pregled narudžbine prije potvrde
        *   [x] Potvrda narudžbine
        *   [x] Slanje email potvrde narudžbine korisniku
    *   **[x] 1.1.3. Upravljanje Narudžbinama (Admin)**
        *   [x] Pregled svih narudžbina
        *   [x] Promjena statusa narudžbine
        *   [x] Dodavanje komentara na narudžbinu
        *   [x] Slanje email obavještenja korisniku o promjeni statusa narudžbine
        *   [x] Generisanje otpremnice (PDF)
        *   [x] Generisanje fakture (PDF)
        *   [x] Ispis etiketa za pakete
    *   **[ ] 1.1.4. Upravljanje Korisnicima**
        *   [x] Registracija korisnika (standardni korisnici)
        *   [x] Prijava korisnika
        *   [x] Zaboravljena lozinka
        *   [x] Promjena lozinke
        *   [x] Upravljanje profilom korisnika (adrese)
*   [x] Upravljanje podacima za fakturisanje (firma, OIB)
        *   [x] Kreiranje B2B korisnika (Admin)
        *   [x] Upravljanje B2B korisnicima (Admin) - dodjela popusta, uslova plaćanja itd.
        *   [ ] Upravljanje ulogama i dozvolama korisnika (Admin)
    *   **[x] 1.1.5. Upravljanje Proizvodima (Admin)**
        *   [x] Dodavanje novih proizvoda
        *   [x] Uređivanje postojećih proizvoda
        *   [x] Brisanje proizvoda
        *   [x] Upload slika proizvoda (jedna slika po proizvodu) - **RIJEŠENO**
        *   [x] Upravljanje kategorijama i podkategorijama proizvoda
        *   [ ] Bulk upload proizvoda (CSV format - definisati strukturu)  *Opcionalno, za budućnost*
    *   **[ ] 1.1.6. Analitika i Izvještaji (Admin)**
        *   [ ] Prikaz ukupnog broja narudžbina
        *   [ ] Prikaz ukupnog prihoda
        *   [ ] Prikaz najprodavanijih proizvoda
        *   [ ] Prikaz statistike posjeta webshop-u
        *   [ ] Izvoz podataka u CSV format
        *   [ ] Izračunavanje dobiti (ručni unos troškova)
        *   [ ] Grafički prikaz podataka (chartovi)
*   **[ ] 1.2. Nefunkcionalni Zahtevi**
    *   [ ] 1.2.1. Performanse: Webshop mora biti brz i responsivan.
    *   [ ] 1.2.2. Skalabilnost: Webshop mora biti skalabilan da podrži rastući broj proizvoda i korisnika.
    *   [ ] 1.2.3. Sigurnost: Webshop mora biti siguran od hakerskih napada.
    *   [ ] 1.2.4. Pristupačnost: Webshop mora biti pristupačan korisnicima sa invaliditetom.
    *   [ ] 1.2.5. SEO: Webshop mora biti optimizovan za pretraživače.
    *   [ ] 1.2.6. Responzivnost: Webshop mora biti responsivan i raditi na svim uređajima (desktop, tablet, mobilni).

### **[ ] 2. UI/UX Dizajn**

*   **[ ] 2.1. Izrada Wireframe-ova**
    *   [x] Početna stranica
    *   [ ] Stranica kategorije
    *   [x] Stranica proizvoda
    *   [x] Korpa
    *   [x] Proces naručivanja
    *   [ ] Stranica za prijavu/registraciju
    *   [ ] Profil korisnika
    *   [x] Admin panel
*   **[ ] 2.2. Izrada Mockup-ova**
    *   [ ] Dizajn baziran na "Apple-like" estetici: jednostavnost, čistoća, umjereni gradijenti, glassmorphism
    *   [ ] Definisanje palete boja
    *   [ ] Odabir tipografije
    *   [ ] Dizajn ikonica
    *   [ ] Definisanje UX principa (navigacija, interakcija)
*   **[ ] 2.3. Revizija i Odobrenje Dizajna**

### **[ ] 3. Dizajn Baze Podataka (sa Selektorom Vozila)**

*   **[x] 3.1. Definisanje Tabela**
    *   **[x] `products` (Ažurirano)**
        *   [x] `id`
        *   [x] `category_id` (FOREIGN KEY)
        *   [x] `name`
        *   [x] `description`
        *   [x] `price`
        *   [x] `stock`
        *   [x] `catalog_number` (UNIQUE)
        *   [x] `oem_number`
        *   [x] `image_url`
        *   [x] `dimensions` (JSON ili zasebna polja)
        *   [x] `created_at`, `updated_at`
    *   **[x] `VehicleBrand`**
        *   [x] `id`
        *   [x] `name` (npr. "Volkswagen", "MAN")
        *   [x] `type` (ENUM - 'PASSENGER', 'COMMERCIAL')
    *   **[x] `VehicleModel`**
        *   [x] `id`
        *   [x] `name` (npr. "Passat", "Tiguan")
        *   [x] `brandId` (FOREIGN KEY to VehicleBrand)
    *   **[x] `VehicleGeneration`**
        *   [x] `id`
        *   [x] `modelId` (FOREIGN KEY to VehicleModel)
        *   [x] `generation` (npr. "B8")
        *   [x] `vinCode` (VARCHAR)
        *   [x] `period` (npr. "2014-2023")
        *   [x] `bodyStyles` (JSON/TEXT)
        *   [x] `engines` (JSON/TEXT)
    *   **[x] `_ProductToVehicleGeneration`** (Prisma implicitna many-to-many tabela)
        *   [x] `A` (FOREIGN KEY to Product)
        *   [x] `B` (FOREIGN KEY to VehicleGeneration)
    *   [x] `categories`
        *   [x] `id` (INT, PRIMARY KEY, AUTO_INCREMENT)
        *   [x] `name` (VARCHAR)
        *   [x] `parent_id` (INT, FOREIGN KEY, NULLABLE)
    *   [x] `users`
        *   [x] `id` (INT, PRIMARY KEY, AUTO_INCREMENT)
        *   [x] `email` (VARCHAR, UNIQUE)
        *   [x] `password` (VARCHAR)
        *   [x] `first_name` (VARCHAR)
        *   [x] `last_name` (VARCHAR)
        *   [x] `address` (VARCHAR)
        *   [x] `city` (VARCHAR)
        *   [x] `country` (VARCHAR)
        *   [x] `phone` (VARCHAR)
        *   [x] `role` (ENUM - 'user', 'b2b', 'admin')
        *   [x] `b2b_discount` (DECIMAL, NULLABLE) *(samo za B2B korisnike)*
        *   [x] `created_at` (TIMESTAMP)
        *   [x] `updated_at` (TIMESTAMP)
    *   [x] `orders`
        *   [x] `id` (INT, PRIMARY KEY, AUTO_INCREMENT)
        *   [x] `user_id` (INT, FOREIGN KEY)
        *   [x] `shipping_address` (VARCHAR)
        *   [x] `billing_address` (VARCHAR)
        *   [x] `shipping_method` (ENUM - 'pickup', 'courier')
        *   [x] `payment_method` (ENUM - 'bank_transfer', 'cash_on_delivery')
        *   [x] `status` (ENUM - 'received', 'processing', 'shipped', 'delivered', 'cancelled')
        *   [x] `total_amount` (DECIMAL)
        *   [x] `created_at` (TIMESTAMP)
        *   [x] `updated_at` (TIMESTAMP)
    *   [x] `order_items`
        *   [x] `id` (INT, PRIMARY KEY, AUTO_INCREMENT)
        *   [x] `order_id` (INT, FOREIGN KEY)
        *   [x] `product_id` (INT, FOREIGN KEY)
        *   [x] `quantity` (INT)
        *   [x] `price` (DECIMAL)  *(cijena proizvoda u trenutku narudžbe)*
    *   [x] `sessions` *(za sesije korisnika)*
        *   [x] `id` (VARCHAR, PRIMARY KEY)
        *   [x] `user_id` (INT, FOREIGN KEY)
        *   [x] `expires_at` (TIMESTAMP)
        *   [x] `created_at` (TIMESTAMP)
*   **[ ] 3.2. Kreiranje ER Dijagrama (opciono, ali preporučljivo)**
*   **[x] 3.3. Implementacija Baze Podataka u PostgreSQL**
    *   [x] Kreiranje tabela
    *   [x] Definisanje stranih ključeva i indeksa
    *   [x] Postavljanje seed podataka (osnovne kategorije, admin korisnik)

## II. Razvoj

### **[NOVO] 1. Implementacija Selektora Vozila**

*   **[x] 1.1. Baza Podataka (Prisma)**
    *   [x] Ažurirati `schema.prisma` s novim modelima: `VehicleBrand`, `VehicleModel`, `VehicleGeneration`.
    *   [x] Definirati many-to-many vezu između `Product` i `VehicleGeneration`.
    *   [x] Pokrenuti `prisma migrate dev` za primjenu promjena na bazu.
*   **[x] 1.2. Unos Podataka (Seeding)**
    *   [x] Kreirati ili proširiti `seed` skriptu za unos podataka o vozilima iz JSON strukture.
    *   [ ] Povezati postojeće proizvode s odgovarajućim generacijama vozila.
*   **[x] 1.3. Backend (API Rute)**
    *   [x] `GET /api/brands?type=[type]` - Dohvaća brendove po tipu (putnička/teretna).
    *   [x] `GET /api/brands/[brandId]/models` - Dohvaća modele za brend.
    *   [x] `GET /api/models/[modelId]/generations` - Dohvaća generacije za model.
    *   [x] `GET /api/products?generationId=[genId]` - Dohvaća proizvode filtrirane po generaciji vozila.
*   **[x] 1.4. Frontend (UI/UX)**
    *   [x] Kreirati stranicu `/vozila` ili komponentu na početnoj stranici za selektor.
    *   [x] Implementirati kaskadne padajuće izbornike (dropdowns): Tip -> Brend -> Model -> Generacija.
    *   [x] Nakon odabira generacije, preusmjeriti korisnika na stranicu s filtriranim proizvodima (`/search?generationId=...`).
    *   [x] Na stranici `/search` prikazati proizvode koji odgovaraju odabranoj generaciji.
    *   [ ] Grupirati prikazane proizvode po kategorijama.

### **[ ] 2. Back-end (Node.js/Express)**

*   **[ ] 1.1. Postavljanje Projekta**
    *   [ ] Inicijalizacija Node.js projekta (`npm init`)
    *   [ ] Instaliranje potrebnih paketa: `express`, `prisma`, `@prisma/client`, `zod`, `bcrypt`, `jsonwebtoken`, `cors`, `dotenv`
    *   [ ] Konfigurisanje `.env` fajla (database URL, secret key, port)
    *   [ ] Konfigurisanje Prisma
        *   [ ] Definisanje Prisma sheme (`schema.prisma`)
        *   [ ] Generisanje Prisma Client (`prisma generate`)
    *   [ ] Postavljanje TypeScript konfiguracije (`tsconfig.json`)
*   **[ ] 1.2. Kreiranje Middleware-a**
    *   [ ] Middleware za autentifikaciju
    *   [ ] Middleware za autorizaciju (provjera uloga korisnika)
    *   [ ] Middleware za validaciju zahtjeva (koristeći Zod)
    *   [ ] Middleware za obradu grešaka
*   **[ ] 1.3. Kreiranje API Endpoints-a**
    *   **[ ] 1.3.1. Proizvodi**
        *   [ ] `GET /products` - Dohvatanje svih proizvoda (sa paginacijom i filtriranjem)
        *   [ ] `GET /products/:id` - Dohvatanje jednog proizvoda po ID-u
        *   [ ] `POST /products` - Kreiranje novog proizvoda (Admin)
        *   [ ] `PUT /products/:id` - Uređivanje postojećeg proizvoda (Admin)
        *   [ ] `DELETE /products/:id` - Brisanje proizvoda (Admin)
    *   **[ ] 1.3.2. Kategorije**
        *   [ ] `GET /categories` - Dohvatanje svih kategorija
        *   [ ] `GET /categories/:id` - Dohvatanje jedne kategorije po ID-u
        *   [ ] `POST /categories` - Kreiranje nove kategorije (Admin)
        *   [ ] `PUT /categories/:id` - Uređivanje postojeće kategorije (Admin)
        *   [ ] `DELETE /categories/:id` - Brisanje kategorije (Admin)
    *   **[ ] 1.3.3. Korisnici**
        *   [ ] `POST /register` - Registracija novog korisnika
        *   [ ] `POST /login` - Prijava korisnika
        *   [ ] `GET /me` - Dohvatanje podataka o trenutno prijavljenom korisniku (zaštićen endpoint)
        *   [ ] `PUT /me` - Uređivanje profila korisnika (zaštićen endpoint)
        *   [ ] `POST /users` - Kreiranje novog korisnika (Admin)
        *   [ ] `GET /users` - Dohvatanje svih korisnika (Admin)
        *   [ ] `GET /users/:id` - Dohvatanje jednog korisnika po ID-u (Admin)
        *   [ ] `PUT /users/:id` - Uređivanje postojećeg korisnika (Admin)
        *   [ ] `DELETE /users/:id` - Brisanje korisnika (Admin)
    *   **[ ] 1.3.4. Narudžbine**
        *   [ ] `POST /orders` - Kreiranje nove narudžbine (zaštićen endpoint)
        *   [ ] `GET /orders` - Dohvatanje svih narudžbina (Admin)
        *   [ ] `GET /orders/:id` - Dohvatanje jedne narudžbine po ID-u (Admin ili vlasnik narudžbine)
        *   [ ] `PUT /orders/:id` - Uređivanje statusa narudžbine (Admin)
    *   **[ ] 1.3.5. Sesije**
        *   [ ] Implementacija sesija korisnika (npr. korištenjem `express-session` i odgovarajuće baze podataka)
*   **[ ] 1.4. Testiranje API-ja (Postman, Insomnia)**

### **[ ] 2. Front-end (Next.js)**

*   **[ ] 2.1. Postavljanje Projekta**
    *   [ ] Kreiranje novog Next.js projekta (`npx create-next-app@latest`)
    *   [ ] Instaliranje potrebnih paketa: `axios`, `react-hook-form`, `zod`, `tailwindcss`, `postcss`, `autoprefixer`, `next-auth`
    *   [ ] Konfigurisanje Tailwind CSS
    *   [ ] Konfigurisanje NextAuth.js (opciono)
*   **[ ] 2.2. Kreiranje Komponenti**
    *   [ ] Komponente za prikaz proizvoda (lista, detalji)
    *   [ ] Komponente za prikaz kategorija
    *   [ ] Komponente za prijavu/registraciju
    *   [ ] Komponente za upravljanje profilom
    *   [ ] Komponente za prikaz korpe
    *   [ ] Komponente za proces naručivanja
    *   [ ] Komponente za admin panel
    *   [ ] Komponente za navigaciju i footer
*   **[ ] 2.3. Povezivanje sa Back-end API-jem (Axios)**
    *   [ ] Implementacija funkcija za dohvaćanje podataka sa API-ja
    *   [ ] Implementacija funkcija za slanje podataka na API
*   **[ ] 2.4. Upravljanje Stanjem Aplikacije (React Context, Redux ili Zustand)**
*   **[ ] 2.5. Implementacija SEO optimizacije**
    *   [ ] Korištenje `next/head` za upravljanje meta tagovima
    *   [ ] Optimizacija slika
    *   [ ] Kreiranje sitemap.xml
*   **[ ] 2.6. Testiranje Front-enda**
    *   [ ] Unit testovi
    *   [ ] Integracioni testovi
    *   [ ] End-to-end testovi (Cypress, Playwright)

### **[x] 3. Implementacija Admin Panela**

*   **[x] 3.1. Izrada Layout-a za Admin Panel**
*   **[x] 3.2. Implementacija Funkcionalnosti za Upravljanje Proizvodima**
    *   [x] Dodavanje novih proizvoda
    *   [x] Uređivanje postojećih proizvoda
    *   [x] Brisanje proizvoda
    *   [x] Upload slika proizvoda
*   **[ ] 3.3. Implementacija Funkcionalnosti za Upravljanje Kategorijama**
*   **[ ] 3.4. Implementacija Funkcionalnosti za Upravljanje Korisnicima**
    *   [ ] Kreiranje B2B korisnika
    *   [ ] Upravljanje ulogama i dozvolama
*   **[x] 3.5. Implementacija Funkcionalnosti za Upravljanje Narudžbinama**
    *   [x] Pregled svih narudžbina
    *   [x] Promjena statusa narudžbine
    *   [ ] Generisanje otpremnice i fakture

## III. Testiranje

*   **[ ] 1. Testiranje Back-enda**
    *   [ ] Unit testovi za svaki API endpoint
    *   [ ] Integracioni testovi za provjeru interakcije između različitih modula
*   **[ ] 2. Testiranje Front-enda**
    *   [ ] Unit testovi za svaku komponentu
    *   [ ] Integracioni testovi za provjeru interakcije između komponenti
    *   [ ] End-to-end testovi za provjeru funkcionalnosti cijele aplikacije
*   **[ ] 3. Testiranje Admin Panela**
    *   [ ] Testiranje svih funkcionalnosti admin panela
*   **[ ] 4. Korisničko Testiranje (User Acceptance Testing - UAT)**
    *   [ ] Angažovanje korisnika za testiranje webshop-a
    *   [ ] Prikupljanje povratnih informacija
    *   [ ] Ispravljanje grešaka

## IV. Deployment

*   **[ ] 1. Konfigurisanje VPS-a na Hetzneru**
    *   [ ] Instalacija Node.js
    *   [ ] Instalacija PostgreSQL
    *   [ ] Konfigurisanje firewall-a
    *   [ ] Postavljanje Nginx-a kao reverse proxy-ja
*   **[ ] 2. Deployment Back-enda**
    *   [ ] Kopiranje koda na server
    *   [ ] Instaliranje zavisnosti (`npm install`)
    *   [ ] Konfigurisanje environment varijabli
    *   [ ] Pokretanje back-enda (npr. koristeći PM2)
*   **[ ] 3. Deployment Front-enda**
    *   [ ] Build Next.js aplikacije (`npm run build`)
    *   [ ] Export Next.js aplikacije (`npm run export`)
    *   [ ] Kopiranje static fajlova na server
    *   [ ] Konfigurisanje Nginx-a za serviranje static fajlova
*   **[ ] 4. Konfigurisanje Domene i SSL Certifikata**
*   **[ ] 5. Praćenje Performansi i Logovanje**

## V. Održavanje

*   **[ ] 1. Redovno Ažuriranje Zavisnosti**
*   **[ ] 2. Praćenje Sigurnosnih Propusta**
*   **[ ] 3. Pravljenje Redovnih Backupa Baze Podataka**
*   **[ ] 4. Praćenje Performansi Webshop-a**
*   **[ ] 5. Ispravljanje Grešaka**
*   **[ ] 6. Implementacija Novih Funkcionalnosti**

## VI. Naknadna Integracija sa Kasom (Planiranje)

*   **[ ] 1. Analiza Strukture Podataka u Kasi**
    *   [ ] Identifikacija relevantnih podataka (proizvodi, zalihe)
    *   [ ] Dokumentovanje formata podataka
*   **[ ] 2. Izbor Metode Integracije**
    *   [ ] Direktni pristup bazi podataka kase (ako je moguće)
    *   [ ] Automatizovano generisanje i import CSV fajlova
    *   [ ] Prelazak na moderniji sistem kase sa API-jem (dugoročno rješenje)
*   **[ ] 3. Razvoj API-ja za Sinhronizaciju Podataka**
    *   [ ] Kreiranje endpoint-a za dohvaćanje podataka o proizvodima i zalihama iz kase
    *   [ ] Kreiranje endpoint-a za slanje podataka o narudžbinama u kasu
*   **[ ] 4. Testiranje Integracije**
*   **[ ] 5. Monitoring i Održavanje Integracije**

## VII. Ručni Unos Podataka - Detaljno

*   **[ ] 1. Priprema za unos podataka**
    *   [ ] Definisanje formata unosa podataka (Excel šablon ili slično)
    *   [ ] Obuka tima za unos podataka
    *   [ ] Kreiranje uputstva za unos podataka (definisanje pravila i standarda)
*   **[ ] 2. Unos podataka o proizvodima**
    *   [ ] Unos svih obaveznih i opcionih atributa
    *   [ ] Upload slika proizvoda
    *   [ ] Provjera tačnosti podataka
*   **[ ] 3. Validacija unesenih podataka**
    *   [ ] Automatska validacija podataka (Zod na back-endu)
    *   [ ] Ručna provjera unesenih podataka
*   **[ ] 4. Praćenje napretka unosa podataka**
    *   [ ] Kreiranje izvještaja o unesenim proizvodima
    *   [ ] Identifikacija problema i uska grla

***

Ovaj plan je dinamičan i može se mijenjati tokom razvoja projekta. Redovna komunikacija i praćenje napretka su ključni za uspjeh. Sretno!


Objašnjenje po sekcijama:

I. Planiranje i Specifikacija: Fokus na definisanje svih funkcionalnosti, UI/UX i dizajna baze podataka. Vrlo važno je detaljno razraditi atribute proizvoda s obzirom na ručni unos.

II. Razvoj: Detaljan plan razvoja back-enda (API) i front-enda (Next.js).

III. Testiranje: Osigurati da je aplikacija kvalitetna i bez grešaka.

IV. Deployment: Postavljanje aplikacije na VPS serveru.

V. Održavanje: Redovno održavanje aplikacije kako bi bila sigurna i pouzdana.

VI. Naknadna Integracija sa Kasom: Plan za buduću integraciju, jer se trenutno ne planira raditi.

VII. Ručni Unos Podataka - Detaljno: Ovo je ključno, jer će to biti najzahtjevniji dio posla. Potrebno je osigurati kvalitet unesenih podataka.

Kako koristiti ovaj fajl:

Kopirajte sadržaj u MD (Markdown) fajl (npr. plan.md).

Koristite Markdown editor (npr. Visual Studio Code sa Markdown ekstenzijom) da vidite formatiran tekst.

Dok radite na svakom zadatku, označite ga sa [x] kada ga završite.

Dodajte komentare i bilješke ispod svakog zadatka ako je potrebno.

Ovaj dokument bi vam trebao poslužiti kao temeljni vodič kroz cijeli proces izrade webshopa. Sretno!