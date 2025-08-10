# Plan za implementaciju naprednog pretraživanja i filtriranja

## Uvod

Ovaj dokument opisuje plan za implementaciju naprednog pretraživanja i filtriranja proizvoda u webshop aplikaciji, s ciljem postizanja TecDoc-like funkcionalnosti. Napredna pretraga i filtriranje omogućit će korisnicima da brzo i precizno pronađu proizvode koji odgovaraju njihovim potrebama, koristeći različite kriterije i metode pretraživanja.

## Trenutno stanje

Trenutno aplikacija ima osnovnu funkcionalnost pretraživanja i filtriranja proizvoda:
- Pretraga po nazivu proizvoda
- Filtriranje po kategorijama
- Osnovno filtriranje po cijeni

Nedavno smo implementirali poboljšani sistem atributa proizvoda koji uključuje:
- Grupe atributa za bolju organizaciju
- Predloške atributa za standardizaciju
- Validaciju i standardizaciju jedinica mjere
- Podršku za različite tipove atributa (string, number, enum, itd.)

## Ciljevi naprednog pretraživanja i filtriranja

1. **Fuzzy pretraživanje** - omogućiti pronalaženje proizvoda čak i kada korisnik napravi manje greške u upitu
2. **Pretraživanje po atributima** - omogućiti pretraživanje proizvoda po vrijednostima atributa
3. **Pretraživanje po dimenzijama i tehničkim specifikacijama** - omogućiti pretraživanje proizvoda po vrijednostima u JSON poljima
4. **Napredno pretraživanje po cross-referencama** - omogućiti pronalaženje proizvoda po OEM brojevima i brojevima konkurenata
5. **Pretraživanje po standardima** - omogućiti pronalaženje proizvoda koji odgovaraju određenim standardima
6. **Kombiniranje različitih kriterija pretraživanja** - omogućiti kombiniranje više kriterija za preciznije rezultate

## Tehnički pristup

### 1. Fuzzy pretraživanje

Za implementaciju fuzzy pretraživanja koristit ćemo sljedeće tehnike:

#### Backend implementacija:
- Implementacija Levenshtein distance algoritma za mjerenje sličnosti između upita i naziva proizvoda
- Implementacija trigram indeksiranja za brže pretraživanje sličnih stringova
- Postavljanje praga sličnosti (npr. 0.7 ili 70%) za uključivanje proizvoda u rezultate

```typescript
// Primjer implementacije fuzzy pretraživanja
function levenshteinDistance(a: string, b: string): number {
  // Implementacija Levenshtein algoritma
}

function calculateSimilarity(query: string, productName: string): number {
  const distance = levenshteinDistance(query.toLowerCase(), productName.toLowerCase());
  const maxLength = Math.max(query.length, productName.length);
  return 1 - distance / maxLength;
}

async function fuzzySearch(query: string, similarityThreshold = 0.7) {
  const products = await db.product.findMany();
  return products.filter(product => 
    calculateSimilarity(query, product.name) >= similarityThreshold
  );
}
```

#### API ruta:
```typescript
// GET /api/products/search?q=query&fuzzy=true
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q') || '';
  const fuzzy = searchParams.get('fuzzy') === 'true';
  
  if (fuzzy) {
    const results = await fuzzySearch(query);
    return NextResponse.json(results);
  } else {
    // Postojeća implementacija pretraživanja
  }
}
```

### 2. Pretraživanje po atributima

Za pretraživanje po atributima koristit ćemo sljedeći pristup:

#### Backend implementacija:
- Proširenje Prisma upita za uključivanje filtriranja po vrijednostima atributa
- Podrška za različite tipove atributa i operatore usporedbe (jednako, veće od, manje od, između, itd.)

```typescript
async function searchByAttributes(attributeFilters: AttributeFilter[]) {
  return await db.product.findMany({
    where: {
      ProductAttributeValue: {
        some: {
          OR: attributeFilters.map(filter => ({
            attribute: {
              name: filter.name
            },
            value: filter.operator === 'eq' ? filter.value : undefined,
            numericValue: filter.operator === 'gt' ? { gt: filter.value } : 
                         filter.operator === 'lt' ? { lt: filter.value } : 
                         filter.operator === 'between' ? { gte: filter.min, lte: filter.max } : 
                         undefined
          }))
        }
      }
    },
    include: {
      // Uključivanje potrebnih relacija
    }
  });
}
```

#### API ruta:
```typescript
// GET /api/products/search?attributes=diameter:gt:100,material:eq:metal
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const attributesParam = searchParams.get('attributes');
  
  if (attributesParam) {
    const attributeFilters = parseAttributeFilters(attributesParam);
    const results = await searchByAttributes(attributeFilters);
    return NextResponse.json(results);
  } else {
    // Postojeća implementacija pretraživanja
  }
}
```

### 3. Pretraživanje po dimenzijama i tehničkim specifikacijama

Za pretraživanje po JSON poljima koristit ćemo sljedeći pristup:

#### Backend implementacija:
- Korištenje Prisma JSON filtriranja za pretraživanje po vrijednostima u JSON poljima
- Podrška za ugniježđene putanje u JSON objektima

```typescript
async function searchByJsonFields(filters: JsonFilter[]) {
  return await db.product.findMany({
    where: {
      OR: filters.map(filter => {
        if (filter.field === 'dimensions') {
          return {
            dimensions: {
              path: [filter.path],
              equals: filter.value
            }
          };
        } else if (filter.field === 'technicalSpecs') {
          return {
            technicalSpecs: {
              path: [filter.path],
              equals: filter.value
            }
          };
        }
        return {};
      })
    }
  });
}
```

#### API ruta:
```typescript
// GET /api/products/search?dimensions=width:100,height:50&specs=material:metal
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const dimensionsParam = searchParams.get('dimensions');
  const specsParam = searchParams.get('specs');
  
  const filters = [];
  
  if (dimensionsParam) {
    const dimensionFilters = parseDimensionFilters(dimensionsParam);
    filters.push(...dimensionFilters.map(f => ({ field: 'dimensions', ...f })));
  }
  
  if (specsParam) {
    const specFilters = parseSpecFilters(specsParam);
    filters.push(...specFilters.map(f => ({ field: 'technicalSpecs', ...f })));
  }
  
  if (filters.length > 0) {
    const results = await searchByJsonFields(filters);
    return NextResponse.json(results);
  } else {
    // Postojeća implementacija pretraživanja
  }
}
```

### 4. Napredno pretraživanje po cross-referencama

Za pretraživanje po cross-referencama koristit ćemo sljedeći pristup:

#### Backend implementacija:
- Proširenje Prisma upita za uključivanje pretraživanja po OEM brojevima i cross-referencama
- Podrška za različite tipove cross-referenci (OEM, zamjenski, konkurentski)

```typescript
async function searchByCrossReferences(referenceNumber: string, referenceType?: string) {
  return await db.product.findMany({
    where: {
      OR: [
        { oemNumber: { contains: referenceNumber, mode: 'insensitive' } },
        { originalReferences: { has: referenceNumber } },
        { replacementFor: { has: referenceNumber } }
      ]
    }
  });
}
```

#### API ruta:
```typescript
// GET /api/products/search?reference=12345&type=oem
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const reference = searchParams.get('reference');
  const type = searchParams.get('type');
  
  if (reference) {
    const results = await searchByCrossReferences(reference, type || undefined);
    return NextResponse.json(results);
  } else {
    // Postojeća implementacija pretraživanja
  }
}
```

### 5. Pretraživanje po standardima

Za pretraživanje po standardima koristit ćemo sljedeći pristup:

#### Backend implementacija:
- Dodavanje polja za standarde u model proizvoda ili kao posebni atributi
- Implementacija pretraživanja po standardima

```typescript
async function searchByStandards(standards: string[]) {
  return await db.product.findMany({
    where: {
      OR: [
        { standards: { hasSome: standards } },
        {
          ProductAttributeValue: {
            some: {
              attribute: {
                name: 'standard'
              },
              value: {
                in: standards
              }
            }
          }
        }
      ]
    }
  });
}
```

#### API ruta:
```typescript
// GET /api/products/search?standards=ISO9001,DIN1234
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const standardsParam = searchParams.get('standards');
  
  if (standardsParam) {
    const standards = standardsParam.split(',');
    const results = await searchByStandards(standards);
    return NextResponse.json(results);
  } else {
    // Postojeća implementacija pretraživanja
  }
}
```

### 6. Kombiniranje različitih kriterija pretraživanja

Za kombiniranje različitih kriterija pretraživanja koristit ćemo sljedeći pristup:

#### Backend implementacija:
- Implementacija složenog upita koji kombinira različite kriterije pretraživanja
- Podrška za paginaciju i sortiranje rezultata

```typescript
async function advancedSearch(params: SearchParams) {
  const { query, fuzzy, attributes, dimensions, specs, reference, standards, page, limit, sort } = params;
  
  const where: any = {};
  const OR: any[] = [];
  
  // Dodavanje uvjeta za tekstualno pretraživanje
  if (query) {
    if (fuzzy) {
      // Implementacija fuzzy pretraživanja
    } else {
      OR.push({ name: { contains: query, mode: 'insensitive' } });
      OR.push({ description: { contains: query, mode: 'insensitive' } });
    }
  }
  
  // Dodavanje uvjeta za atribute
  if (attributes && attributes.length > 0) {
    // Implementacija pretraživanja po atributima
  }
  
  // Dodavanje uvjeta za dimenzije i tehničke specifikacije
  if (dimensions || specs) {
    // Implementacija pretraživanja po JSON poljima
  }
  
  // Dodavanje uvjeta za cross-reference
  if (reference) {
    // Implementacija pretraživanja po cross-referencama
  }
  
  // Dodavanje uvjeta za standarde
  if (standards && standards.length > 0) {
    // Implementacija pretraživanja po standardima
  }
  
  if (OR.length > 0) {
    where.OR = OR;
  }
  
  // Izvršavanje upita s paginacijom i sortiranjem
  return await db.product.findMany({
    where,
    skip: (page - 1) * limit,
    take: limit,
    orderBy: sort ? { [sort.field]: sort.direction } : { createdAt: 'desc' },
    include: {
      // Uključivanje potrebnih relacija
    }
  });
}
```

#### API ruta:
```typescript
// GET /api/products/search?q=query&fuzzy=true&attributes=...&dimensions=...&...
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  
  const params: SearchParams = {
    query: searchParams.get('q') || undefined,
    fuzzy: searchParams.get('fuzzy') === 'true',
    attributes: parseAttributeFilters(searchParams.get('attributes') || ''),
    dimensions: parseDimensionFilters(searchParams.get('dimensions') || ''),
    specs: parseSpecFilters(searchParams.get('specs') || ''),
    reference: searchParams.get('reference') || undefined,
    standards: searchParams.get('standards')?.split(',') || [],
    page: parseInt(searchParams.get('page') || '1'),
    limit: parseInt(searchParams.get('limit') || '20'),
    sort: parseSortParam(searchParams.get('sort') || '')
  };
  
  const results = await advancedSearch(params);
  return NextResponse.json(results);
}
```

## Frontend implementacija

### 1. Komponente za napredno pretraživanje i filtriranje

#### SearchBar komponenta:
```tsx
export function SearchBar() {
  const [query, setQuery] = useState('');
  const [fuzzy, setFuzzy] = useState(false);
  
  const handleSearch = () => {
    // Implementacija pretraživanja
  };
  
  return (
    <div className="flex items-center space-x-2">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Pretraži proizvode..."
        className="w-full"
      />
      <div className="flex items-center">
        <Checkbox
          id="fuzzy"
          checked={fuzzy}
          onCheckedChange={setFuzzy}
        />
        <Label htmlFor="fuzzy" className="ml-2">Fuzzy pretraga</Label>
      </div>
      <Button onClick={handleSearch}>Pretraži</Button>
    </div>
  );
}
```

#### AttributeFilter komponenta:
```tsx
export function AttributeFilter({ attributes, onFilterChange }) {
  const [selectedFilters, setSelectedFilters] = useState({});
  
  const handleFilterChange = (attributeName, value) => {
    setSelectedFilters(prev => ({
      ...prev,
      [attributeName]: value
    }));
    
    onFilterChange(selectedFilters);
  };
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Filtriraj po atributima</h3>
      {attributes.map(attribute => (
        <div key={attribute.id} className="space-y-2">
          <Label>{attribute.label}</Label>
          {attribute.type === 'enum' ? (
            <Select
              onValueChange={(value) => handleFilterChange(attribute.name, value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Odaberi..." />
              </SelectTrigger>
              <SelectContent>
                {attribute.options.map(option => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : attribute.type === 'number' ? (
            <div className="flex items-center space-x-2">
              <Input
                type="number"
                placeholder="Min"
                onChange={(e) => handleFilterChange(attribute.name, { min: e.target.value })}
              />
              <span>-</span>
              <Input
                type="number"
                placeholder="Max"
                onChange={(e) => handleFilterChange(attribute.name, { max: e.target.value })}
              />
              {attribute.unit && <span>{attribute.unit}</span>}
            </div>
          ) : (
            <Input
              placeholder={`Unesite ${attribute.label.toLowerCase()}...`}
              onChange={(e) => handleFilterChange(attribute.name, e.target.value)}
            />
          )}
        </div>
      ))}
    </div>
  );
}
```

#### CrossReferenceSearch komponenta:
```tsx
export function CrossReferenceSearch({ onSearch }) {
  const [reference, setReference] = useState('');
  const [type, setType] = useState('all');
  
  const handleSearch = () => {
    onSearch({ reference, type });
  };
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Pretraži po referenci</h3>
      <div className="flex items-center space-x-2">
        <Input
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="Unesite broj reference..."
          className="w-full"
        />
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Sve reference</SelectItem>
            <SelectItem value="oem">OEM broj</SelectItem>
            <SelectItem value="replacement">Zamjenski</SelectItem>
            <SelectItem value="competitor">Konkurentski</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={handleSearch}>Pretraži</Button>
      </div>
    </div>
  );
}
```

### 2. Integracija s postojećim komponentama

#### ProductFilter komponenta:
```tsx
export function ProductFilter() {
  const [activeTab, setActiveTab] = useState('basic');
  const [filters, setFilters] = useState({});
  
  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters
    }));
  };
  
  const applyFilters = () => {
    // Implementacija primjene filtera
  };
  
  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="basic">Osnovni filteri</TabsTrigger>
          <TabsTrigger value="attributes">Atributi</TabsTrigger>
          <TabsTrigger value="references">Reference</TabsTrigger>
          <TabsTrigger value="advanced">Napredno</TabsTrigger>
        </TabsList>
        
        <TabsContent value="basic">
          {/* Postojeći osnovni filteri */}
        </TabsContent>
        
        <TabsContent value="attributes">
          <AttributeFilter
            attributes={categoryAttributes}
            onFilterChange={(attrFilters) => handleFilterChange({ attributes: attrFilters })}
          />
        </TabsContent>
        
        <TabsContent value="references">
          <CrossReferenceSearch
            onSearch={(refFilters) => handleFilterChange({ reference: refFilters })}
          />
        </TabsContent>
        
        <TabsContent value="advanced">
          {/* Napredni filteri */}
        </TabsContent>
      </Tabs>
      
      <div className="flex justify-end">
        <Button onClick={applyFilters}>Primijeni filtere</Button>
      </div>
    </div>
  );
}
```

## Plan implementacije

### Faza 1: Backend implementacija
1. Implementacija fuzzy pretraživanja
2. Implementacija pretraživanja po atributima
3. Implementacija pretraživanja po dimenzijama i tehničkim specifikacijama
4. Implementacija pretraživanja po cross-referencama
5. Implementacija pretraživanja po standardima
6. Implementacija kombiniranog pretraživanja

### Faza 2: API rute
1. Implementacija API rute za napredno pretraživanje
2. Implementacija API rute za dohvat filtera za kategoriju
3. Implementacija API rute za dohvat dostupnih vrijednosti atributa

### Faza 3: Frontend implementacija
1. Implementacija komponenti za napredno pretraživanje i filtriranje
2. Integracija s postojećim komponentama
3. Implementacija prikaza rezultata pretraživanja
4. Implementacija paginacije i sortiranja rezultata

## Zaključak

Implementacija naprednog pretraživanja i filtriranja značajno će poboljšati korisničko iskustvo i funkcionalnost webshop aplikacije. Korisnici će moći brzo i precizno pronaći proizvode koji odgovaraju njihovim potrebama, što će povećati zadovoljstvo korisnika i potencijalno povećati prodaju.

Ovaj plan pruža detaljan tehnički pristup implementaciji naprednog pretraživanja i filtriranja, s primjerima koda i opisom komponenti koje će biti implementirane. Plan je podijeljen u faze kako bi se osigurala postupna implementacija i testiranje funkcionalnosti.
