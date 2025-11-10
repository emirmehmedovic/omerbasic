import { PrismaClient } from '@/generated/prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Dohvaćanje ID-jeva kategorija za mapping...\n');

  // Dohvati glavne kategorije
  const mainCategories = await prisma.category.findMany({
    where: {
      name: {
        in: ['Putnička vozila', 'Teretna vozila', 'Gume', 'Ulja i maziva', 'ADR oprema']
      }
    },
    select: { id: true, name: true, externalId: true }
  });

  console.log('📁 Glavne kategorije:\n');
  const mapping: Record<string, string> = {};
  
  for (const cat of mainCategories) {
    console.log(`${cat.name}: ${cat.id}`);
    const key = cat.name.toLowerCase().replace(/\s+/g, '_');
    mapping[key] = cat.id;
  }

  // Dohvati TecDoc kategorije po External ID
  const tecdocCategories = await prisma.category.findMany({
    where: {
      externalId: {
        in: [
          '100005', // Filteri - putnička
          '100006', // Kočioni sistem - putnička
          '100011', // Ovjes - putnička
          '200047', // Filteri - teretna
          '200058', // Kočioni sistem - teretna
          '200060', // Ovjes - teretna
        ]
      }
    },
    select: { id: true, name: true, externalId: true },
    orderBy: { externalId: 'asc' }
  });

  console.log('\n📂 TecDoc kategorije:\n');
  for (const cat of tecdocCategories) {
    console.log(`[${cat.externalId}] ${cat.name}: ${cat.id}`);
  }

  // Generiraj novi mapping JSON
  const newMapping = {
    topLevel: {
      gumeCategoryId: mapping['gume'] || null,
      uljaMazivaCategoryId: mapping['ulja_i_maziva'] || null,
      adrRootId: mapping['adr_oprema'] || null,
      putnickaVozilaId: mapping['putnička_vozila'] || null,
      teretnaVozilaId: mapping['teretna_vozila'] || null,
    },
    tecdoc: {
      passenger: {
        filteri: tecdocCategories.find(c => c.externalId === '100005')?.id || null,
        kocioni: tecdocCategories.find(c => c.externalId === '100006')?.id || null,
        ovjes: tecdocCategories.find(c => c.externalId === '100011')?.id || null,
      },
      truck: {
        filteri: tecdocCategories.find(c => c.externalId === '200047')?.id || null,
        kocioni: tecdocCategories.find(c => c.externalId === '200058')?.id || null,
        ovjes: tecdocCategories.find(c => c.externalId === '200060')?.id || null,
      }
    }
  };

  console.log('\n📋 Novi mapping JSON:\n');
  console.log(JSON.stringify(newMapping, null, 2));
}

main()
  .catch((error) => {
    console.error('❌ Greška:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
