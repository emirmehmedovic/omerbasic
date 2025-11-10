# TecDoc Kategorije - Import Dokumentacija

## Pregled

Ovaj dokument opisuje proces importa TecDoc kategorija iz `.md` fajlova u bazu podataka.

## Struktura kategorija

### Glavni tipovi vozila

1. **Putnička vozila** (`putnička-vozila.md`)
   - External ID opseg: 100001 - 706365
   - 37 podkategorija

2. **Teretna vozila** (`teretna-vozila.md`)
   - External ID opseg: 200022 - 706221
   - 32 podkategorije

## Format `.md` fajlova

Fajlovi koriste Markdown tabelu format:

```markdown
| Node ID | Kategorija (Bosanski) |
|----------|------------------------|
| **100001** | Karoserija vozila |
| **100002** | Motor |
```

## Import proces

### 1. Priprema fajlova

Fajlovi moraju biti u root direktoriju projekta:
- `/putnička-vozila.md`
- `/teretna-vozila.md`

### 2. Pokretanje importa

```bash
npm run import:tecdoc-categories
```

### 3. Šta skripta radi

1. **Parsira `.md` fajlove** - Izvlači External ID i naziv kategorije
2. **Pronalazi/kreira parent kategoriju** - "Putnička vozila" ili "Teretna vozila"
3. **Provjerava postojeće kategorije**:
   - Ako postoji kategorija sa istim `externalId` → ažurira je
   - Ako postoji kategorija sa istim imenom i parentom → dodaje `externalId`
   - Inače → kreira novu kategoriju
4. **Postavlja level** - Parent kategorije imaju level 1, podkategorije level 2

## Struktura baze podataka

```prisma
model Category {
  id         String    @id @default(cuid())
  name       String
  externalId String?   // TecDoc Node ID
  parentId   String?
  level      Int       @default(1)
  // ... ostala polja
}
```

## Rezultati importa

### Putnička vozila
- ✨ Kreirano: 37 kategorija
- Parent: "Putnička vozila"
- External ID opseg: 100001 - 706365

### Teretna vozila
- ✨ Kreirano: 32 kategorija
- Parent: "Teretna vozila"
- External ID opseg: 200022 - 706221

## Primjeri kategorija

### Putnička vozila
- **100001** - Karoserija vozila
- **100002** - Motor
- **100005** - Filteri
- **100006** - Kočioni sistem
- **100007** - Sistem za hlađenje

### Teretna vozila
- **200022** - Kabina vozača / karoserija
- **200026** - Motor
- **200047** - Filteri
- **200058** - Kočioni sistem
- **200059** - Sistem komprimovanog zraka

## Ponovno pokretanje

Skripta je idempotentna - može se pokrenuti više puta bez dupliciranja podataka:
- Postojeće kategorije će biti ažurirane
- Nove kategorije će biti kreirane
- Ništa neće biti obrisano

## Provjera rezultata

### Putem check skripte (preporučeno)
```bash
npm run check:tecdoc-categories
```

Ova skripta prikazuje:
- Broj podkategorija za svaki tip vozila
- Prvih 10 podkategorija sa External ID-jevima
- Ukupnu statistiku kategorija
- Provjeru duplikata External ID-a

### Putem admin panela
Idite na `/admin/categories` da vidite sve kategorije sa njihovim External ID-jevima.

### Putem Prisma Studio
```bash
npm run db:studio
```

### Putem SQL upita
```sql
SELECT id, name, "externalId", "parentId", level 
FROM "Category" 
WHERE "parentId" IN (
  SELECT id FROM "Category" 
  WHERE name IN ('Putnička vozila', 'Teretna vozila')
)
ORDER BY "externalId";
```

## Napomene

1. **External ID je opcionalan** - Kategorije mogu postojati bez External ID-a
2. **Jedinstveni External ID** - Svaki External ID mora biti jedinstven u sistemu
3. **Hijerarhija** - Sve TecDoc kategorije su podkategorije glavnih kategorija vozila
4. **Level sistem** - Level 1 = glavne kategorije, Level 2 = podkategorije

## Troubleshooting

### Greška: "Fajl nije pronađen"
- Provjerite da su `.md` fajlovi u root direktoriju projekta
- Provjerite imena fajlova (mora biti tačno `putnička-vozila.md` i `teretna-vozila.md`)

### Greška: "Kategorija s ovim imenom već postoji"
- Skripta automatski ažurira postojeće kategorije
- Ako i dalje postoji problem, provjerite `@@unique([name, parentId])` constraint u schema.prisma

### Greška pri parsiranju
- Provjerite format tabele u `.md` fajlu
- Svaki red mora biti u formatu: `| **ID** | Naziv |`

## Budući razvoj

- [ ] Dodati podršku za level 3 kategorije (specifične podkategorije)
- [ ] Dodati validaciju External ID formata
- [ ] Dodati mapping između TecDoc i internih kategorija
- [ ] Automatski import atributa za svaku kategoriju
