# Uputstvo: Import kategorija (Putnička, Teretna vozila, ADR)

Ovo uputstvo objašnjava kako da uvezete hijerarhijske kategorije u bazu koristeći skriptu `scripts/import-categories.ts`.

## Preduslovi
- Podešen `.env` i konekcija na bazu.
- Instalirane dependencije i generisan Prisma klijent:
  ```bash
  npm install
  npm run postinstall # ili: npx prisma generate
  ```
- Migracije pokrenute:
  ```bash
  npm run db:migrate
  ```

## Skripta za import
- Lokacija: `scripts/import-categories.ts`
- Podržani formati JSON-a:
  - Objekt: mapiranje `Naziv kategorije` → `djeca` (objekt ili niz)
  - Niz stringova: svaka stavka postaje dijete (leaf) nadređene kategorije

Primjeri ulaznih datoteka:
- Putnička vozila: `vozila/putnicka-vozila-kategorija.json`
- Teretna vozila: `teretna-vozila/teretna-vozila-kategorije.json`
- ADR oprema: `adr/adr.json`

## Kako pokrenuti import
Možete koristiti `tsx` ili `ts-node`.

- Putnička vozila (root: "Putnička vozila"):
  ```bash
  npx tsx scripts/import-categories.ts vozila/putnicka-vozila-kategorija.json "Putnička vozila"
  ```

- Teretna vozila (root: "Teretna vozila"):
  ```bash
  npx tsx scripts/import-categories.ts teretna-vozila/teretna-vozila-kategorije.json "Teretna vozila"
  ```

- ADR oprema (root: "ADR"):
  ```bash
  npx tsx scripts/import-categories.ts adr/adr.json "ADR"
  ```

Napomena: umjesto `tsx` možete koristiti i `ts-node`:
```bash
npx ts-node scripts/import-categories.ts <putanja-do-jsona> "<root-naziv>"
```

## Šta skripta radi
- Osigurava da root kategorija postoji (npr. "Putnička vozila", "Teretna vozila", "ADR").
- Rekurzivno kreira djecu:
  - Ako su djeca objekt, prolazi kroz ključeve kao kategorije.
  - Ako su djeca niz stringova, svaki string postaje leaf dijete.
- Idempotentno ponašanje: provjerava `(name, parentId)` prije kreiranja, tako da ponovni import ne pravi duplikate.

## Provjera rezultata
Pokrenite Prisma Studio i provjerite stablo kategorija:
```bash
npm run db:studio
```
- Provjerite da root kategorije imaju `parentId = null` i da su djeca/unučad pravilno povezana.

## Rješavanje problema
- Ako dobijete grešku konekcije na bazu, provjerite `.env` i da je DB dostupna.
- Ako je `prisma` schema mijenjana, pokrenite `npm run postinstall` ili `npx prisma generate`.
- Ako želite proširiti model (npr. `slug`, `sortOrder`, unique indeks na `(name, parentId)`), ažurirajte `prisma/schema.prisma` i pokrenite migraciju.
