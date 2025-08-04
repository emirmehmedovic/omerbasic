const { PrismaClient } = require('../src/generated/prisma/client');
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

const randomCategoryData = [
    { naziv: "Teretna vozila", podkategorije: [ { naziv: "Dijelovi šasije", stavke: ["Opruge i amortizeri", "Poluosovine", "Zračni jastuci", "Spojnice i vučni sistemi"] }, { naziv: "Motor i dijelovi motora", stavke: ["Klipovi", "Ležajevi radilice", "Brtve i zaptivke", "Turbine", "Interkuleri"] }, { naziv: "Sistem kočenja", stavke: ["Kočione obloge", "Diskovi", "Doboši", "Pneumatski sistemi kočenja"] }, { naziv: "Elektrika i elektronika", stavke: ["Alternatori", "Akumulatori", "Senzori", "Kablovi"] }, { naziv: "Karoserija i kabina", stavke: ["Retrovizori", "Farovi", "Zadnja svjetla", "Brisači"] }, { naziv: "Prijenos snage", stavke: ["Mjenjači", "Kvačila", "Diferencijali"] }, { naziv: "Rashladni sistem", stavke: ["Hladnjaci", "Crijeva", "Vodene pumpe"] } ] },
    { naziv: "Putnička vozila", podkategorije: [ { naziv: "Motor i dijelovi motora", stavke: ["Filteri", "Remeni", "Brtve", "Uljne pumpe"] }, { naziv: "Podvozje i šasija", stavke: ["Amortizeri", "Vilice", "Krajnice", "Stabilizatori"] }, { naziv: "Kočioni sistem", stavke: ["Disk pločice", "Diskovi", "Kočne čeljusti", "ABS senzori"] }, { naziv: "Električni sistem", stavke: ["Akumulatori", "Svjećice", "Grijači", "ECU moduli"] }, { naziv: "Unutrašnjost vozila", stavke: ["Presvlake", "Patosnice", "Upravljači", "Instrument table"] }, { naziv: "Karoserijski dijelovi", stavke: ["Branici", "Vrata", "Haube", "Farovi", "Stop svjetla"] }, { naziv: "Izduvni sistem", stavke: ["Auspusi", "Lambda sonde", "Katalizatori"] } ] },
    { naziv: "ADR oprema", podkategorije: [ { naziv: "Zaštitna oprema", stavke: ["Prsluci", "Rukavice", "Zaštitne naočale"] }, { naziv: "Oprema za označavanje", stavke: ["ADR tablice", "Naljepnice", "Reflektirajuće trake"] }, { naziv: "Prva pomoć i sigurnost", stavke: ["Kutije prve pomoći", "Aparati za gašenje", "Dekontaminacija"] }, { naziv: "Spremnici i posude", stavke: ["Kanisteri", "Torbe za otpad"] }, { naziv: "Dokumentacija i pribor", stavke: ["Držači dokumenata", "Ploče za signalizaciju", "Uputstva"] } ] },
    { naziv: "Autopraonice", podkategorije: [ { naziv: "Detergenti i hemikalije", stavke: ["Šamponi", "Aktivne pjene", "Sredstva za felge", "Vosak"] }, { naziv: "Oprema i pribor", stavke: ["Četke", "Spužve", "Mikrofiber krpe", "Pištolji"] }, { naziv: "Mašine i uređaji", stavke: ["Visokotlačni perači", "Usisivači", "Automatske četke"] }, { naziv: "Održavanje i servis", stavke: ["Rezervni dijelovi", "Filteri", "Crijeva", "Pumpe"] }, { naziv: "Zaštita i dodatna oprema", stavke: ["Pregrade", "PVC zavjese", "LED rasvjeta"] } ] }
];

// --- FUNKCIJE ZA SEEDANJE ---

async function seedSpecificProducts() {
  console.log('Početak unosa specifičnih proizvoda...');
  let createdCount = 0;
  for (const p of specificProductsData) {
    try {
      const subCategory = await db.category.findFirst({ where: { name: p.podkategorija, parent: { name: p.kategorija } } });
      if (!subCategory) {
        console.warn(`Kategorija '${p.podkategorija}' unutar '${p.kategorija}' nije pronađena. Preskačem: ${p.naziv}`);
        continue;
      }
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

async function seedRandomData() {
  console.log('Početak seedanja nasumičnih podataka...');
  console.log('Brisanje postojećih podataka...');
  await db.product.deleteMany({});
  await db.category.deleteMany({});

  console.log('Kreiranje kategorija...');
  for (const cat of randomCategoryData) {
    const parent = await db.category.create({ data: { name: cat.naziv } });
    for (const subCat of cat.podkategorije) {
      await db.category.create({ data: { name: subCat.naziv, parentId: parent.id } });
    }
  }

  console.log('Kreiranje 100 nasumičnih proizvoda...');
  const subCategories = await db.category.findMany({ where: { parentId: { not: null } } });
  const allItems = randomCategoryData.flatMap(c => c.podkategorije.flatMap(s => s.stavke));
  const brands = ['VW', 'Mercedes', 'BMW', 'Audi', 'MAN', 'Scania', 'Volvo'];
  const models = ['Golf', 'Passat', 'C-Class', 'A4', 'TGX', 'R-serija', 'FH'];
  const products = Array.from({ length: 100 }, () => {
    const brand = brands[Math.floor(Math.random() * brands.length)];
    const model = models[Math.floor(Math.random() * models.length)];
    const name = allItems[Math.floor(Math.random() * allItems.length)];
    return {
      name: `${name} za ${brand} ${model}`,
      description: `Kvalitetan ${name.toLowerCase()} za ${brand} ${model}.`,
      price: parseFloat((Math.random() * 450 + 5).toFixed(2)),
      stock: Math.floor(Math.random() * 100),
      imageUrl: `/images/placeholders/placeholder.png`,
      categoryId: subCategories[Math.floor(Math.random() * subCategories.length)].id,
      catalogNumber: `CAT-${Math.random().toString(36).substring(2, 11).toUpperCase()}`,
    };
  });
  await db.product.createMany({ data: products });
  console.log('Seedanje nasumičnih podataka završeno.');
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

  if (flags.link) {
    await linkProductsToVehicles();
  }

  if (!flags.vehicles && !flags.products && !flags.link) {
    console.log('Molimo navedite flag za seedanje: --vehicles, --products, ili --link');
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await db.$disconnect(); });
