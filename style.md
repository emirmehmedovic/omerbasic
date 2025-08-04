# Style Guide

Ovaj dokument definira vizualne smjernice i principe dizajna za aplikaciju kako bi se osigurala dosljednost, modernost i funkcionalnost sučelja.

## 1. Osnovni Principi

- **Čistoća i Minimalizam (Apple-like):** Dizajn treba biti jednostavan, bez suvišnih elemenata. Fokus je na sadržaju i funkcionalnosti. Svaki element na stranici mora imati jasnu svrhu.
- **Funkcionalnost:** Estetika ne smije narušiti upotrebljivost. Sučelje mora biti intuitivno i lako za korištenje.
- **Glassmorphism:** Korištenje efekta zamućenog stakla za pozadine kontejnera kako bi se stvorio osjećaj dubine i slojevitosti.
- **Responzivnost (Mobile-First):** Sve komponente i layouti moraju biti u potpunosti responzivni. Dizajnirati prvenstveno za mobilne uređaje, a zatim prilagoditi za veće ekrane.

## 2. Paleta Boja

- **Primarna Pozadina:** Svijetlo siva ili bijela za glavni sadržaj kako bi se postigao osjećaj prozračnosti.
- **Sekundarna Pozadina (Glassmorphism):** Polu-prozirna bijela s pozadinskim zamućenjem (`backdrop-blur`).
- **Tekst:** Tamno siva (skoro crna) za visoki kontrast i čitljivost.
- **Akcentna Boja:** **Sangria** (`#92000A`). Koristi se za gumbe, linkove, aktivne elemente i važne notifikacije kako bi privukla pažnju korisnika.
- **Boja za Greške:** Jarko crvena.
- **Boja za Uspjeh:** Zelena.

## 3. Tipografija

- **Font:** Koristit ćemo sistemski `sans-serif` font (San Francisco za Apple uređaje, Roboto za Android/Windows, itd.) kako bismo osigurali nativan osjećaj i optimalne performanse.
- **Veličine:** Jasna hijerarhija naslova (H1, H2, H3) i paragrafa.

## 4. Elementi Sučelja (UI)

- **Kartice (Cards):**
    - **Zaobljeni kutovi:** Značajno zaobljeni kutovi (npr. `rounded-xl` ili `rounded-2xl` u Tailwindu) za mekši i moderniji izgled.
    - **Sjenka:** Blaga, suptilna sjenka za podizanje kartice s pozadine.
    - **Padding:** Dovoljno unutarnjeg prostora (`padding`) kako bi sadržaj "disao".
- **Gumbi (Buttons):**
    - **Primarni gumbi:** Ispunjeni **Sangria** bojom s bijelim tekstom.
    - **Sekundarni gumbi:** Prozirna pozadina s **Sangria** okvirom i tekstom.
    - **Hover efekt:** Suptilna promjena svjetline ili blaga sjenka pri prelasku mišem.
- **Input Polja:**
    - Jednostavni okviri s blago zaobljenim kutovima.
    - Jasno vidljiv `focus` state (npr. promjena boje okvira u **Sangria**).
- **Glassmorphism Efekt:**
    - Primjenjuje se na kontejnere kao što su bočne navigacije, modali ili specifični dashboard widgeti.
    - Kombinacija `background-color` s alfa prozirnošću (npr. `bg-white/30`) i `backdrop-blur`.

## 5. Redizajn Admin Panela - Smjernice

- **Layout:**
    - Koristiti bočnu navigaciju (sidebar) s ikonama i tekstom za glavne sekcije (Proizvodi, Narudžbe, Korisnici).
    - Glavni sadržaj će imati više "zraka", s većim razmacima između elemenata.
- **Dashboard Početna:** Prikaz ključnih metrika (KPIs) u obliku modernih kartica (npr. ukupan prihod, broj novih narudžbi).
- **Tablice:**
    - Redizajnirati tablice da budu čišće, s više vertikalnog prostora.
    - Akcije (Uredi, Obriši) mogu biti unutar "kebab" menija (tri točkice) kako bi se smanjio vizualni nered.
