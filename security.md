# Sigurnosne Smjernice i Najbolje Prakse za Projekt Webshop-a

Ovaj dokument definira sigurnosne smjernice i najbolje prakse za razvoj i održavanje sigurnog webshop-a za autodijelove. Cilj je minimizirati rizik od potencijalnih ranjivosti i osigurati zaštitu podataka korisnika i sistema.

## I. Općenite Sigurnosne Preporuke

*   **Defense in Depth (Slojevita Zaštita):** Primijenite višeslojni pristup sigurnosti. Nemojte se oslanjati na samo jednu sigurnosnu mjeru.
*   **Least Privilege Principle (Princip Najmanjih Ovlasti):** Korisnicima i procesima dodijelite samo one ovlasti koje su im neophodne za obavljanje svojih zadataka.
*   **Regular Security Audits (Redovite Sigurnosne Revizije):** Redovito provodite sigurnosne revizije koda, infrastrukture i konfiguracije.
*   **Stay Updated (Održavajte Sustav Ažurnim):** Redovito ažurirajte sve softverske komponente (operativni sustav, web server, biblioteke, framework-ove) na najnovije verzije kako biste zakrpali poznate ranjivosti.
*   **Secure Development Lifecycle (SDLC):** Integrirajte sigurnosne prakse u svaki korak razvojnog procesa.
*   **Incident Response Plan (Plan Odgovora na Incidente):** Pripremite plan za odgovor na sigurnosne incidente. Definirajte procedure za otkrivanje, analizu, obuzdavanje i oporavak od incidenata.

## II. Specifične Sigurnosne Smjernice

### A. Backend (Node.js/Express)

*   **Authentication (Autentikacija):**
    *   **Strong Password Policy (Jaka Lozinka):** Implementirajte jaku politiku lozinki (minimalna duljina, kombinacija znakova, redovita promjena).
    *   **Hashing Passwords (Hashiranje Lozinki):** Koristite bcrypt ili Argon2 za hashiranje lozinki. Nikada ne pohranjujte lozinke u čistom tekstu.
    *   **Salting Passwords (Dodavanje Soli Lozinkama):** Dodajte jedinstvenu "sol" svakoj lozinki prije hashiranja.
    *   **Two-Factor Authentication (Dvofaktorska Autentikacija - 2FA):** Implementirajte dvofaktorsku autentikaciju za dodatnu sigurnost.
    *   **Rate Limiting (Ograničenje Brzine):** Ograničite broj pokušaja prijave kako biste spriječili brute-force napade.
*   **Authorization (Autorizacija):**
    *   **Role-Based Access Control (RBAC):** Implementirajte kontrolu pristupa temeljenu na ulogama. Definirajte različite uloge (npr. korisnik, B2B korisnik, administrator) i dodijelite im različite ovlasti.
    *   **JWT (JSON Web Tokens):** Koristite JWT za autentikaciju i autorizaciju.
    *   **Validate JWT (Validirajte JWT):** Temeljito validirajte JWT na svakom zaštićenom endpointu. Provjerite potpis, rok trajanja i druge relevantne tvrdnje.
    *   **Refresh Tokens (Osvježavajući Tokeni):** Koristite refresh tokene za produljenje sesija bez potrebe za ponovnom prijavom.
*   **Data Validation (Validacija Podataka):**
    *   **Input Sanitization (Sanitizacija Ulaznih Podataka):** Sanitizirajte sve ulazne podatke kako biste spriječili injection napade (SQL injection, XSS).
    *   **Zod Validation:** Koristite Zod za validaciju svih ulaznih podataka (request body, query parameters, headers).
    *   **Whitelist Input (Dopuštena Lista Ulaznih Podataka):** Definirajte dopuštenu listu ulaznih podataka i odbijte sve što nije na toj listi.
*   **Security Headers (Sigurnosni Headeri):**
    *   **Implement Security Headers:** Postavite sigurnosne headere u HTTP odgovorima kako biste poboljšali sigurnost webshop-a (npr. `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options`, `X-XSS-Protection`, `X-Content-Type-Options`).
*   **Error Handling (Obrada Grešaka):**
    *   **Avoid Sensitive Information (Izbjegavajte Osjetljive Informacije):** Ne prikazujte osjetljive informacije u porukama o pogreškama.
    *   **Log Errors (Logirajte Greške):** Logirajte sve pogreške za analizu i praćenje potencijalnih problema.
*   **Database Security (Sigurnost Baze Podataka):**
    *   **Prepared Statements (Pripremljene Izjave):** Koristite pripremljene izjave (parametrized queries) kako biste spriječili SQL injection napade. Prisma ORM to radi automatski.
    *   **Least Privilege (Najmanje Ovlasti):** Konfigurirajte korisničke račune baze podataka s minimalnim potrebnim ovlastima.
    *   **Regular Backups (Redovite Sigurnosne Kopije):** Redovito pravite sigurnosne kopije baze podataka.
*   **Cross-Site Scripting (XSS) Prevention:**
    *   **Escape Output (Izlazno Izbjegavanje):** Izbjegavajte HTML entitete za sve podatke koji se prikazuju na stranici.
    *   **Content Security Policy (CSP):** Koristite Content Security Policy (CSP) kako biste ograničili izvore skripti i drugih resursa koji se mogu učitati na stranicu.
*   **Cross-Site Request Forgery (CSRF) Prevention:**
    *   **CSRF Tokens (CSRF Tokeni):** Koristite CSRF tokene za zaštitu od CSRF napada.
    *   **SameSite Cookies (SameSite Kolačići):** Konfigurirajte SameSite atribut kolačića kako biste spriječili slanje kolačića s cross-origin zahtjevima.
*   **Dependency Management (Upravljanje Zavisnostima):**
    *   **Keep Dependencies Updated (Održavajte Zavisnosti Ažurnima):** Redovito ažurirajte sve zavisnosti na najnovije verzije.
    *   **Vulnerability Scanning (Skeniranje Ranjivosti):** Koristite alate za skeniranje zavisnosti kako biste otkrili poznate ranjivosti.
*   **Environment Variables (Varijable Okoline):**
    *   **Securely Store Credentials (Sigurno Pohranjujte Povjerljive Informacije):** Pohranjujte osjetljive informacije (npr. ključeve API-ja, lozinke baze podataka) u varijable okoline, a ne u kodu.
    *   **Don't Commit Credentials (Ne Predajte Povjerljive Informacije):** Nikada ne predavajte povjerljive informacije u repozitorij koda.
*   **HTTPS (Sigurna Komunikacija):**
    *   **Use HTTPS (Koristite HTTPS):** Osigurajte da se sva komunikacija između klijenta i servera odvija putem HTTPS-a.
    *   **HSTS (HTTP Strict Transport Security):** Omogućite HSTS kako biste osigurali da preglednici uvijek koriste HTTPS za pristup webshop-u.

### B. Frontend (Next.js)

*   **XSS Prevention:**
    *   **Sanitize Input:** Sanitizirajte korisnički unos prije prikazivanja na stranici kako biste spriječili XSS napade.
    *   **Escape Output:** Izbjegavajte HTML entitete za sve podatke koji se prikazuju na stranici.
*   **Content Security Policy (CSP):**
    *   **Configure CSP:** Konfigurirajte Content Security Policy (CSP) kako biste ograničili izvore skripti i drugih resursa koji se mogu učitati na stranicu.
*   **Dependency Management:**
    *   **Keep Dependencies Updated:** Redovito ažurirajte sve zavisnosti na najnovije verzije.
    *   **Vulnerability Scanning:** Koristite alate za skeniranje zavisnosti kako biste otkrili poznate ranjivosti.
*   **Secure Storage (Sigurno Pohranjivanje):**
    *   **Avoid Storing Sensitive Data (Izbjegavajte Pohranjivanje Osjetljivih Podataka):** Izbjegavajte pohranjivanje osjetljivih podataka (npr. lozinke, kreditne kartice) u localStorage ili kolačićima.
    *   **Use Secure Cookies (Koristite Sigurne Kolačiće):** Ako morate pohranjivati podatke u kolačićima, koristite sigurne kolačiće (secure attribute) i ograničite njihov rok trajanja.
*   **Code Obfuscation (Zamračivanje Koda):**
    *   **Consider Code Obfuscation:** Razmislite o zamračivanju koda kako biste otežali dekompiliranje i analiziranje koda od strane napadača.

### C. Hosting i Infrastruktura

*   **Secure Configuration (Sigurna Konfiguracija):**
    *   **Harden Servers:** Očvrsnite servere kako biste smanjili površinu napada.
    *   **Disable Unnecessary Services (Onemogućite Nepotrebne Usluge):** Onemogućite sve nepotrebne usluge i portove.
    *   **Use Firewalls (Koristite Vatrozide):** Konfigurirajte vatrozide kako biste ograničili pristup serverima.
*   **Regular Security Updates (Redovite Sigurnosne Nadogradnje):**
    *   **Update Operating System (Ažurirajte Operativni Sustav):** Redovito ažurirajte operativni sustav i sve instalirane programe.
*   **Intrusion Detection System (IDS):**
    *   **Implement IDS:** Implementirajte sustav za otkrivanje upada kako biste otkrili i odgovorili na sumnjive aktivnosti.
*   **Logging and Monitoring (Logiranje i Nadzor):**
    *   **Enable Logging:** Omogućite detaljno logiranje svih aktivnosti na serveru i u aplikaciji.
    *   **Monitor Logs:** Redovito nadzirite logove kako biste otkrili potencijalne probleme.
*   **Backups (Sigurnosne Kopije):**
    *   **Regular Backups:** Redovito pravite sigurnosne kopije podataka i konfiguracije.
    *   **Offsite Backups:** Pohranjujte sigurnosne kopije na udaljenoj lokaciji kako biste se zaštitili od gubitka podataka u slučaju katastrofe.

## III. Dodatne Preporuke

*   **Security Awareness Training (Obuka o Sigurnosti):** Obučite sve članove tima o sigurnosnim prijetnjama i najboljim praksama.
*   **Penetration Testing (Testiranje Probojnosti):** Redovito provodite testiranje probojnosti kako biste otkrili ranjivosti u sustavu.
*   **Vulnerability Disclosure Program (Program Objavljivanja Ranjivosti):** Razmislite o uspostavljanju programa objavljivanja ranjivosti kako biste potaknuli sigurnosne istraživače da prijave potencijalne probleme.

## IV. Zaključak

Sigurnost je kontinuirani proces. Redovito provjeravajte i ažurirajte svoje sigurnosne mjere kako biste bili korak ispred potencijalnih napadača. Pridržavanjem ovih smjernica i najboljih praksi možete značajno smanjiti rizik od sigurnosnih incidenata i osigurati zaštitu svog webshop-a.