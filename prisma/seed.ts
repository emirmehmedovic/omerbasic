const { PrismaClient } = require('../src/generated/prisma/client');
const fs = require('fs');
const path = require('path');
const db = new PrismaClient();

// --- PODACI --- 

const specificProductsData = [
    { kategorija: "Teretna vozila", podkategorija: "Dijelovi šasije", naziv: "Zračni jastuk za osovinu", opis: "Zračni jastuk visoke nosivosti za stražnju osovinu, kompatibilan sa MAN i Volvo kamionima.", cijena: 112.50, sifra: "TV-SAS-ZJ001", dostupnost: true },
    { kategorija: "Teretna vozila", podkategorija: "Motor i dijelovi motora", naziv: "Turbopunjač Garrett GT3576", opis: "Originalni Garrett turbopunjač za DAF i Scania kamione. Visok pritisak, ušteda goriva.", cijena: 870.00, sifra: "TV-MOT-TURB01", dostupnost: true },
    { kategorija: "Putnička vozila", podkategorija: "Kočioni sistem", naziv: "Disk pločice ATE", opis: "ATE kočione pločice za VW Golf 6/7, prednje, sa indikatorima istrošenosti.", cijena: 38.90, sifra: "PV-KOC-ATE001", dostupnost: true },
    { kategorija: "Putnička vozila", podkategorija: "Električni sistem", naziv: "Akumulator VARTA 74Ah", opis: "Start-Stop AGM tehnologija, idealan za vozila s velikom potrošnjom struje.", cijena: 129.99, sifra: "PV-ELK-VARTA74", dostupnost: true },
    { kategorija: "ADR oprema", podkategorija: "Oprema za označavanje", naziv: "ADR narančasta tablica 400x300 mm", opis: "Metalna reflektirajuća tablica sa nosačima. U skladu sa EU normama.", cijena: 11.75, sifra: "ADR-OZN-TAB400", dostupnost: true },
    { kategorija: "ADR oprema", podkategorija: "Zaštitna oprema", naziv: "Reflektujući prsluk XL", opis: "Visokovidljiv prsluk, žute boje, sa dvostrukim reflektirajućim trakama.", cijena: 4.20, sifra: "ADR-ZOP-PRSLXL", dostupnost: true },
    { kategorija: "Autopraonice", podkategorija: "Detergenti i hemikalije", naziv: "Auto šampon sa voskom 5L", opis: "Koncentrovani šampon sa efektom sjaja i zaštite, pH neutralan.", cijena: 9.80, sifra: "AP-HEM-SHAM5L", dostupnost: true },
    { kategorija: "Autopraonice", podkategorija: "Mašine i uređaji", naziv: "Visokotlačni perač Karcher HD 5/15", opis: "Industrijski perač za profesionalne autopraonice, 150 bara pritisak.", cijena: 749.00, sifra: "AP-MAS-HD515", dostupnost: false },
];

// --- ART CSV MAPIRANJE ---

const CSV_FILE_PATH = path.join(__dirname, '../proizvodi-csv/ART.csv');
const PUBLIC_DIR = path.join(__dirname, '../public');
const PRODUCT_IMAGES_DIR = path.join(PUBLIC_DIR, 'images/products_pictures');

type CategoryMapping = { parent: string; sub: string };

const categoryCodeMap: Record<string, CategoryMapping> = {
  '14184': { parent: 'Putnička vozila', sub: 'Podvozje i šasija' },
  '14186': { parent: 'Putnička vozila', sub: 'Podvozje i šasija' },
  '14440': { parent: 'Putnička vozila', sub: 'Podvozje i šasija' },
  '14444': { parent: 'Putnička vozila', sub: 'Podvozje i šasija' },
  '18264': { parent: 'Putnička vozila', sub: 'Podvozje i šasija' },
  '19604': { parent: 'Putnička vozila', sub: 'Podvozje i šasija' },
  '19605': { parent: 'Putnička vozila', sub: 'Podvozje i šasija' },
  '21408': { parent: 'Putnička vozila', sub: 'Kočioni sistem' },
  '22865': { parent: 'Putnička vozila', sub: 'Kočioni sistem' },
  '22866': { parent: 'Putnička vozila', sub: 'Kočioni sistem' },
  '23366': { parent: 'Putnička vozila', sub: 'Podvozje i šasija' },
  '23822': { parent: 'Putnička vozila', sub: 'Kočioni sistem' },
  '23824': { parent: 'Putnička vozila', sub: 'Kočioni sistem' },
  '27095': { parent: 'Putnička vozila', sub: 'Podvozje i šasija' },
  '50764': { parent: 'Putnička vozila', sub: 'Električni sistem' },
  '50777': { parent: 'Putnička vozila', sub: 'Električni sistem' },
  '50778': { parent: 'Putnička vozila', sub: 'Električni sistem' },
  '50946': { parent: 'Putnička vozila', sub: 'Kočioni sistem' },
  '51425': { parent: 'Putnička vozila', sub: 'Električni sistem' },
  '51487': { parent: 'Putnička vozila', sub: 'Kočioni sistem' },
  '51488': { parent: 'Putnička vozila', sub: 'Kočioni sistem' },
};

const keywordCategoryMap: { keywords: string[]; category: CategoryMapping }[] = [
  {
    keywords: ['KRAJNIK', 'KUGLA', 'SPONA', 'ŠTANGICA', 'STANGICA', 'OS', 'SELEN', 'MANDZETA', 'MANDŽETA', 'GLAVČINA', 'GLEŽAJ', 'LEŽAJ', 'LEZ', 'REMENICA'],
    category: { parent: 'Putnička vozila', sub: 'Podvozje i šasija' },
  },
  {
    keywords: ['SAJLA', 'DISK', 'PAKNE', 'KOČ', 'KOC', 'ABS', 'KOČION', 'FSL', 'FDB'],
    category: { parent: 'Putnička vozila', sub: 'Kočioni sistem' },
  },
  {
    keywords: ['FIL', 'FILTER', 'REMEN', 'ZUP', 'PUMPA', 'TERMOSTAT', 'NATEZAČ', 'NATEZAC', 'BRTV', 'ULJE', 'ULJA', 'NAVOJ', 'ZAMAŠNJAK', 'ZAMASNJAK', 'KLIZAČ', 'KLIZAC', 'BPV', 'BKM', 'REMENICE'],
    category: { parent: 'Putnička vozila', sub: 'Motor i dijelovi motora' },
  },
  {
    keywords: ['SENZOR', 'PREKIDAČ', 'PREKIDAC', 'ŽARULJA', 'ZARULJA', 'GRIJAČ', 'GRIJAC', 'AKUMULATOR', 'METLICE AERO', 'METLICE BOSCH', 'METLICA', 'LAMPA', 'XENON'],
    category: { parent: 'Putnička vozila', sub: 'Električni sistem' },
  },
  {
    keywords: ['METLICE', 'BRISAČ', 'BRISAC', 'TABLICA', 'REFLEKT', 'KABLOVI ZA START', 'PASTA ZA PRANJE', 'BRTVENA MASA'],
    category: { parent: 'Putnička vozila', sub: 'Karoserija i kabina' },
  },
];

const fallbackCategory: CategoryMapping = { parent: 'Putnička vozila', sub: 'Ostalo' };

function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let value = '';
  let inQuotes = false;

  const pushValue = () => {
    current.push(value.trim());
    value = '';
  };

  const pushRow = () => {
    if (current.length === 0) return;
    rows.push(current);
    current = [];
  };

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const next = content[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        value += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ';' && !inQuotes) {
      pushValue();
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i++;
      pushValue();
      if (current.some(cell => cell !== '')) {
        pushRow();
      } else {
        current = [];
      }
    } else {
      value += char;
    }
  }

  pushValue();
  if (current.some(cell => cell !== '')) pushRow();

  return rows.map((row) => {
    const lastIndex = row.length - 1;
    if (lastIndex >= 0 && row[lastIndex] === '') {
      return row.slice(0, lastIndex);
    }
    return row;
  });
}

function resolveCategory({ katbro, katbroStaro, name }: { katbro?: string; katbroStaro?: string; name?: string }): CategoryMapping {
  const candidates = [katbro, katbroStaro].filter((value): value is string => Boolean(value));
  for (const code of candidates) {
    if (categoryCodeMap[code]) return categoryCodeMap[code];
  }

  const upperName = (name || '').toUpperCase();
  for (const mapping of keywordCategoryMap) {
    if (mapping.keywords.some(keyword => upperName.includes(keyword))) {
      return mapping.category;
    }
  }

  return fallbackCategory;
}

async function ensureCategory(parentName: string, subName: string) {
  let parent = await db.category.findFirst({
    where: { name: parentName, parentId: null },
  });

  if (!parent) {
    parent = await db.category.create({ data: { name: parentName } });
  }

  let subCategory = await db.category.findFirst({
    where: { name: subName, parentId: parent.id },
  });

  if (!subCategory) {
    subCategory = await db.category.create({ data: { name: subName, parentId: parent.id } });
  }

  return subCategory;
}

async function seedCsvProducts() {
  console.log('Početak uvoza ART CSV proizvoda...');

  if (!fs.existsSync(CSV_FILE_PATH)) {
    console.warn(`CSV datoteka nije pronađena: ${CSV_FILE_PATH}`);
    return;
  }

  const content = fs.readFileSync(CSV_FILE_PATH, 'utf-8');
  const rows = parseCsv(content);

  if (rows.length === 0) {
    console.warn('CSV datoteka je prazna.');
    return;
  }

  const headers = rows[0].map((h) => h.trim());
  const columnIndex = headers.reduce<Record<string, number>>((acc, header, index) => {
    acc[header] = index;
    return acc;
  }, {});

  const requiredColumns = ['SIFART', 'IMEART', 'KATBRO', 'KATBRO_STARO', 'OEM', 'OEM_STARO', 'BROJ'];
  for (const column of requiredColumns) {
    if (columnIndex[column] === undefined) {
      console.error(`Nedostaje kolona '${column}' u CSV datoteci.`);
      return;
    }
  }

  let created = 0;
  let updated = 0;
  const warnings: string[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const get = (column: string): string => {
      const value = row[columnIndex[column]];
      return value ? value.trim() : '';
    };

    const sifart = get('SIFART');
    const imeart = get('IMEART');
    const katbro = get('KATBRO');
    const katbroStaro = get('KATBRO_STARO');
    const oem = get('OEM') || get('OEM_STARO');
    const broj = get('BROJ');

    if (!sifart) {
      warnings.push(`Red ${i + 1}: nedostaje SIFART, preskačem.`);
      continue;
    }

    const { parent, sub } = resolveCategory({ katbro, katbroStaro, name: imeart });
    const category = await ensureCategory(parent, sub);

    const price = parseFloat(broj.replace(',', '.'));
    const validPrice = Number.isFinite(price) ? price : 0;

    const normalizedOem = (oem || '').replace(/[^0-9A-Za-z]/g, '').toUpperCase();
    let imageUrl: string | null = null;
    if (normalizedOem) {
      const imagePath = path.join(PRODUCT_IMAGES_DIR, `${normalizedOem}.jpg`);
      if (fs.existsSync(imagePath)) {
        const relativeToPublic = path.relative(PUBLIC_DIR, imagePath).split(path.sep).join('/');
        imageUrl = `/${relativeToPublic}`;
      }
    }

    try {
      const result = await db.product.upsert({
        where: { catalogNumber: sifart },
        update: {
          name: imeart || sifart,
          description: imeart || null,
          oemNumber: oem || null,
          price: validPrice,
          categoryId: category.id,
          imageUrl: imageUrl || undefined,
        },
        create: {
          name: imeart || sifart,
          description: imeart || null,
          price: validPrice,
          stock: 0,
          catalogNumber: sifart,
          oemNumber: oem || null,
          categoryId: category.id,
          imageUrl,
        },
      });

      if (result.createdAt.getTime() === result.updatedAt.getTime()) created++;
      else updated++;
    } catch (error: any) {
      console.error(`Greška pri upisu proizvoda '${sifart}':`, error.message || error);
    }
  }

  console.log(`Uvoz CSV proizvoda završen. Kreirano: ${created}, ažurirano: ${updated}.`);
  if (warnings.length) {
    console.warn('Upozorenja tijekom uvoza:');
    warnings.forEach(w => console.warn(`  - ${w}`));
  }
}

// --- FUNKCIJE ZA SEEDANJE ---

async function seedSpecificProducts() {
  console.log('Početak unosa specifičnih proizvoda...');
  let createdCount = 0;
  for (const p of specificProductsData) {
    try {
      const subCategory = await ensureCategory(p.kategorija, p.podkategorija);
      const imageUrl = '/uploads/products/1752933222430-315966082.jpg';
      const product = await db.product.upsert({
        where: { catalogNumber: p.sifra },
        update: {
          imageUrl: imageUrl,
        },
        create: {
          name: p.naziv,
          description: p.opis,
          price: p.cijena,
          catalogNumber: p.sifra,
          stock: p.dostupnost ? Math.floor(Math.random() * 50) + 10 : 0,
          imageUrl: imageUrl,
          categoryId: subCategory.id,
        },
      });
      createdCount++;
      console.log(`Kreiran/Ažuriran: ${product.name}`);
    } catch (error: any) {
      if (error.code === 'P2002') console.warn(`Proizvod sa šifrom '${p.sifra}' već postoji.`);
      else console.error(`Greška pri unosu '${p.naziv}':`, error);
    }
  }
  console.log(`Unos specifičnih proizvoda završen. Kreirano: ${createdCount}.`);
}

const vehicleData = {
  "Volkswagen": {
    "type": "PASSENGER",
    "models": {
      "Passat": [
        {
          "name": "B6",
          "vinCode": "3C",
          "period": "2005–2011",
          "bodyStyles": ["Sedan", "Variant", "CC"],
          "engines": ["1.4 TSI", "1.6 FSI", "1.8 TSI", "2.0 TSI", "3.2 VR6", "1.6 TDI", "1.9 TDI", "2.0 TDI"]
        },
        {
          "name": "B8",
          "vinCode": "3G",
          "period": "2014–2023",
          "bodyStyles": ["Sedan", "Variant"],
          "engines": ["1.4 TSI", "1.5 TSI evo", "1.8 TSI", "2.0 TSI", "1.6 TDI", "2.0 TDI", "plug‑in hybrid (e-Hybrid)"]
        }
      ],
      "Golf": [
        {
          "name": "Mk5/Mk6",
          "vinCode": "1K/5K",
          "period": "2003–2012",
          "bodyStyles": ["Hatchback", "Estate"],
          "engines": ["1.4 TSI", "1.6 FSI", "2.0 TSI", "1.9/2.0 TDI"]
        },
        {
          "name": "Mk7",
          "vinCode": "AU/5G",
          "period": "2012–2020",
          "bodyStyles": ["Hatchback", "Estate", "Sportsvan"],
          "engines": ["1.0 TSI", "1.4 TSI", "2.0 TSI (GTI/R)", "1.6/2.0 TDI"]
        }
      ]
    }
  }
};

async function seedVehicles() {
  console.log('Početak unosa podataka o vozilima...');
  for (const brandName in vehicleData) {
    const brandInfo = vehicleData[brandName as keyof typeof vehicleData];
    const brand = await db.vehicleBrand.upsert({
      where: { name: brandName },
      update: {},
      create: { name: brandName, type: brandInfo.type as any },
    });
    console.log(`Kreiran/ažuriran brend: ${brand.name}`);

    for (const modelName in brandInfo.models) {
      const model = await db.vehicleModel.upsert({
        where: { name_brandId: { name: modelName, brandId: brand.id } },
        update: {},
        create: { name: modelName, brandId: brand.id },
      });
      console.log(`  Kreiran/ažuriran model: ${model.name}`);

      const generations = brandInfo.models[modelName as keyof typeof brandInfo.models];
      for (const gen of generations) {
        await db.vehicleGeneration.upsert({
          where: { modelId_name: { modelId: model.id, name: gen.name } },
          update: { ...gen },
          create: { modelId: model.id, ...gen },
        });
        console.log(`    Kreirana/ažurirana generacija: ${gen.name}`);
      }
    }
  }
  console.log('Unos podataka o vozilima završen.');
}

async function linkProductsToVehicles() {
  console.log('Početak povezivanja proizvoda s vozilima...');

  try {
    // Veza 1: ATE Pločice za Golf Mk7
    const atePločice = await db.product.findUnique({
      where: { catalogNumber: 'PV-KOC-ATE001' },
    });
    const golfMk7 = await db.vehicleGeneration.findFirst({
      where: {
        name: 'Mk7',
        model: { name: 'Golf', brand: { name: 'Volkswagen' } },
      },
    });

    if (atePločice && golfMk7) {
      await db.product.update({
        where: { id: atePločice.id },
        data: {
          vehicleGenerations: {
            connect: { id: golfMk7.id },
          },
        },
      });
      console.log(`Povezano: '${atePločice.name}' sa 'VW Golf Mk7'`);
    } else {
      console.warn('Nije moguće povezati ATE pločice sa Golfom Mk7. Proizvod ili generacija nisu pronađeni.');
    }

    // Veza 2: VARTA Akumulator za Passat B8
    const vartaAku = await db.product.findUnique({
      where: { catalogNumber: 'PV-ELK-VARTA74' },
    });
    const passatB8 = await db.vehicleGeneration.findFirst({
      where: {
        name: 'B8',
        model: { name: 'Passat', brand: { name: 'Volkswagen' } },
      },
    });

    if (vartaAku && passatB8) {
      await db.product.update({
        where: { id: vartaAku.id },
        data: {
          vehicleGenerations: {
            connect: { id: passatB8.id },
          },
        },
      });
      console.log(`Povezano: '${vartaAku.name}' sa 'VW Passat B8'`);
    } else {
      console.warn('Nije moguće povezati Varta akumulator sa Passatom B8. Proizvod ili generacija nisu pronađeni.');
    }

  } catch (error) {
    console.error('Greška pri povezivanju proizvoda s vozilima:', error);
  }

  console.log('Povezivanje proizvoda s vozilima završeno.');
}

// --- GLAVNA FUNKCIJA ---

async function main() {
  const flags = process.argv.slice(2).reduce((acc, arg) => {
    if (arg.startsWith('--')) {
      acc[arg.slice(2)] = true;
    }
    return acc;
  }, {} as Record<string, boolean>);

  if (flags.vehicles) {
    await seedVehicles();
  }

  if (flags.products) {
    await seedSpecificProducts();
  }

  if (flags.csv) {
    await seedCsvProducts();
  }

  if (flags.link) {
    await linkProductsToVehicles();
  }

  if (!flags.vehicles && !flags.products && !flags.link && !flags.csv) {
    console.log('Molimo navedite flag za seedanje: --vehicles, --products, --link ili --csv');
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await db.$disconnect(); });
