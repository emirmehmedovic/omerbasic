# Pravila za Pisanje Čistog Koda u Projektu Webshop-a

Ovaj dokument definira smjernice i pravila za pisanje čistog, čitljivog i održivog koda u projektu webshop-a za autodijelove. Cilj je osigurati konzistentnost, smanjiti kompleksnost i olakšati buduće izmjene i nadogradnje.

## I. Opći Principi

*   **DRY (Don't Repeat Yourself):** Izbjegavajte ponavljanje koda. Ako primijetite da se isti blok koda ponavlja, izvucite ga u zasebnu funkciju ili komponentu.
*   **KISS (Keep It Simple, Stupid):** Neka kod bude jednostavan i lako razumljiv. Izbjegavajte nepotrebnu kompleksnost.
*   **YAGNI (You Ain't Gonna Need It):** Nemojte pisati kod za funkcionalnosti koje vam trenutno nisu potrebne. Fokusirajte se na ono što je potrebno sada.
*   **SOLID Principi (uglavnom za backend):**
    *   **Single Responsibility Principle (SRP):** Svaka klasa/modul treba imati samo jednu odgovornost.
    *   **Open/Closed Principle (OCP):** Klase/moduli trebaju biti otvoreni za proširenje, ali zatvoreni za modifikaciju.
    *   **Liskov Substitution Principle (LSP):** Podtipovi moraju biti zamjenjivi svojim osnovnim tipovima.
    *   **Interface Segregation Principle (ISP):** Klijenti ne bi trebali biti prisiljeni ovisiti o metodama koje ne koriste.
    *   **Dependency Inversion Principle (DIP):** Visoki nivo modula ne bi trebao ovisiti o niskom nivou modula. Oba bi trebala ovisiti o apstrakcijama.

## II. Specifična Pravila

### A. Struktura Projekta

*   **Organizacija Foldera:**
    *   **Frontend (Next.js):**
        *   `components/`: Reusable UI komponente.
        *   `pages/`: Stranice aplikacije (koristi Next.js routing).
        *   `styles/`: CSS moduli ili globalni stilovi (Tailwind CSS).
        *   `lib/`: Utility funkcije, API klijent.
        *   `hooks/`: Custom React hooks.
    *   **Backend (Node.js/Express):**
        *   `controllers/`: Logika obrade zahtjeva (API endpoint-i).
        *   `routes/`: Definicija ruta (povezivanje URL-ova s kontrolerima).
        *   `models/`: Definicija Prisma modela (baza podataka).
        *   `middleware/`: Middleware funkcije (autentifikacija, autorizacija, validacija).
        *   `utils/`: Utility funkcije.
*   **Veličina Fajlova:**
    *   Težite manjim fajlovima. Ako fajl postane prevelik (više od 500-600 linija koda), razmislite o razdvajanju na manje module ili komponente. Ovo olakšava čitanje, razumijevanje i testiranje koda.
*   **Konvencija Imenovanja:**
    *   Koristite konzistentnu konvenciju imenovanja za fajlove, foldere, varijable i funkcije.
    *   `PascalCase` za komponente (npr. `ProductCard.jsx`).
    *   `camelCase` za funkcije i varijable (npr. `getProductById`, `productPrice`).
    *   `snake_case` za imena tabela i kolona u bazi podataka (npr. `products`, `product_name`).

### B. Stil Pisanja Koda (TypeScript)

*   **Tipovi:**
    *   Uvijek koristite tipove (explicit types) u TypeScript-u. Definirajte tipove za varijable, funkcije, argumente i povratne vrijednosti.
    *   Koristite `interface` ili `type` za definiranje strukture objekata.
    *   Koristite `enum` za definiranje skupova vrijednosti (npr. status narudžbine).
*   **Varijable:**
    *   Koristite `const` za varijable čija se vrijednost neće mijenjati.
    *   Koristite `let` za varijable čija se vrijednost može mijenjati.
    *   Izbjegavajte `var`.
*   **Funkcije:**
    *   Funkcije trebaju imati samo jednu odgovornost.
    *   Funkcije trebaju biti kratke i jednostavne.
    *   Definirajte tipove za argumente i povratne vrijednosti funkcija.
    *   Koristite arrow functions (=>) kad je to moguće.
*   **Komentari:**
    *   Pišite komentare samo kada je to potrebno. Kod bi trebao biti dovoljno jasan da se razumije bez komentara.
    *   Koristite JSDoc za dokumentiranje funkcija i komponenti.
*   **Error Handling:**
    *   Koristite `try...catch` blokove za obradu grešaka.
    *   Vraćajte smislene poruke o greškama.
    *   Logujte greške (u development okruženju).
*   **Asinkroni Kod:**
    *   Koristite `async/await` za pisanje asinkronog koda.
    *   Obradite greške u `try...catch` blokovima.
*   **Validacija:**
    *   Koristite Zod za validaciju podataka (frontend i backend).
    *   Validirajte sve ulazne podatke (request body, query parameters).

### C. Frontend (Next.js)

*   **Komponente:**
    *   Koristite funkcionalne komponente sa React hooks.
    *   Razdvajajte komponente na manje, reusable dijelove.
    *   Koristite prop types (ako ne koristite TypeScript) za dokumentiranje propova.
*   **Stanje:**
    *   Koristite `useState` hook za upravljanje stanjem unutar komponente.
    *   Koristite `useContext` hook za dijeljenje stanja između komponenti.
    *   Razmislite o korištenju state management biblioteke (Redux, Zustand) za kompleksnije upravljanje stanjem.
*   **Stilovi:**
    *   Koristite CSS module ili Tailwind CSS za stiliziranje komponenti.
    *   Izbjegavajte inline stilove.
*   **Optimizacija Performansi:**
    *   Koristite `React.memo` za memoizaciju komponenti.
    *   Koristite `useCallback` i `useMemo` hooks za optimizaciju performansi.
    *   Lazy load slike i druge resurse.
*   **SEO:**
    *   Koristite `next/head` za upravljanje meta tagovima.
    *   Osigurajte da su stranice pravilno indeksirane od strane pretraživača.

### D. Backend (Node.js/Express)

*   **Rute:**
    *   Koristite RESTful konvencije za definisanje API endpoint-a.
    *   Koristite middleware za autentifikaciju, autorizaciju i validaciju.
*   **Kontroleri:**
    *   Kontroleri trebaju biti kratki i jednostavni.
    *   Kontroleri trebaju pozivati funkcije iz modela za interakciju s bazom podataka.
*   **Modeli (Prisma):**
    *   Koristite Prisma Client za interakciju s bazom podataka.
    *   Kreirajte funkcije u modelima za dohvaćanje, kreiranje, ažuriranje i brisanje podataka.
*   **Sigurnost:**
    *   Koristite HTTPS za sve komunikacije.
    *   Zaštitite API endpoint-e od CSRF napada.
    *   Sanitizirajte sve ulazne podatke kako biste spriječili SQL injection napade.
    *   Koristite bcrypt za hashiranje lozinki.
    *   Koristite JWT (JSON Web Tokens) za autentifikaciju.

## III. Alatke i Konfiguracija

*   **ESLint:** Konfigurirajte ESLint za automatsku provjeru koda i primjenu pravila stiliziranja.
*   **Prettier:** Koristite Prettier za automatsko formatiranje koda.
*   **Git:** Koristite Git za kontrolu verzija koda.
*   **Code Reviews:** Redovno obavljajte code reviews kako biste osigurali kvalitetu koda.

## IV. Dodatni Savjeti

*   **Učite iz Primjera:** Proučavajte kod drugih iskusnih programera. Čitajte open-source projekte.
*   **Refaktoriranje:** Redovno refaktorirajte kod kako biste ga učinili čitljivijim, jednostavnijim i održivijim.
*   **Budi Konzistentan:** Držite se ovih pravila i smjernica. Konzistentnost je ključna za održivost koda.
