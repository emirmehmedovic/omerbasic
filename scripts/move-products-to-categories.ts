import { PrismaClient } from '@/generated/prisma/client';

const prisma = new PrismaClient();

/**
 * Skripta za premještanje proizvoda iz "Ostalo" kategorije u odgovarajuće TecDoc kategorije
 * 
 * Primjer korištenja:
 * npx tsx scripts/move-products-to-categories.ts --from-category <OSTALO_ID> --to-category <TECDOC_ID> --keyword "filter"
 * 
 * Ili za batch premještanje:
 * npx tsx scripts/move-products-to-categories.ts --batch
 */

function argValue(flag: string): string | null {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return null;
  const val = process.argv[idx + 1];
  if (!val || val.startsWith('--')) return null;
  return val;
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

async function moveByKeyword(fromCategoryId: string, toCategoryId: string, keyword: string, dryRun: boolean = true) {
  console.log(`\n🔍 Tražim proizvode u kategoriji "Ostalo" sa ključnom riječi: "${keyword}"\n`);

  const products = await prisma.product.findMany({
    where: {
      categoryId: fromCategoryId,
      name: {
        contains: keyword,
        mode: 'insensitive'
      }
    },
    select: {
      id: true,
      name: true,
      catalogNumber: true,
      category: {
        select: { name: true }
      }
    }
  });

  console.log(`📦 Pronađeno ${products.length} proizvoda\n`);

  if (products.length === 0) {
    console.log('✅ Nema proizvoda za premještanje.');
    return { moved: 0, total: 0 };
  }

  // Prikaži prvih 10
  console.log('Primjeri proizvoda:');
  products.slice(0, 10).forEach((p, i) => {
    console.log(`  ${i + 1}. [${p.catalogNumber}] ${p.name}`);
  });

  if (products.length > 10) {
    console.log(`  ... i još ${products.length - 10} proizvoda\n`);
  }

  if (dryRun) {
    console.log('\n⚠️  DRY RUN - Proizvodi neće biti premješteni.');
    console.log('Ukloni --dry-run za pravo premještanje.\n');
    return { moved: 0, total: products.length };
  }

  // Premjesti proizvode
  const result = await prisma.product.updateMany({
    where: {
      id: { in: products.map(p => p.id) }
    },
    data: {
      categoryId: toCategoryId
    }
  });

  console.log(`\n✅ Premješteno ${result.count} proizvoda`);
  return { moved: result.count, total: products.length };
}

async function batchMove(dryRun: boolean = true) {
  console.log('🔄 Batch premještanje proizvoda po ključnim riječima...\n');

  // Dohvati kategorije
  const ostaloCategory = await prisma.category.findFirst({
    where: { name: 'Ostalo' }
  });

  if (!ostaloCategory) {
    console.error('❌ Kategorija "Ostalo" nije pronađena!');
    return;
  }

  // Dohvati TecDoc kategorije
  const tecdocCategories = await prisma.category.findMany({
    where: {
      externalId: { not: null }
    },
    select: {
      id: true,
      name: true,
      externalId: true
    }
  });

  console.log(`📁 Pronađeno ${tecdocCategories.length} TecDoc kategorija\n`);

  // Mapiranje ključnih riječi na kategorije
  const mappings = [
    { keywords: ['filter ulja', 'filter za ulje'], categoryName: 'Filteri', externalId: '100005' },
    { keywords: ['filter goriva', 'filter nafte'], categoryName: 'Filteri', externalId: '100005' },
    { keywords: ['filter zraka', 'zračni filter'], categoryName: 'Filteri', externalId: '100005' },
    { keywords: ['filter kabine', 'polenski'], categoryName: 'Filteri', externalId: '100005' },
    { keywords: ['pločice', 'kočione pločice'], categoryName: 'Kočioni sistem', externalId: '100006' },
    { keywords: ['disk kočioni', 'kočioni disk'], categoryName: 'Kočioni sistem', externalId: '100006' },
    { keywords: ['amortizer', 'amortiser'], categoryName: 'Ovjes', externalId: '100011' },
    { keywords: ['opruga', 'vijčana opruga'], categoryName: 'Ovjes', externalId: '100011' },
    { keywords: ['ulje motor', 'motorno ulje', '5w', '10w', '0w'], categoryName: 'Motor', externalId: '100002' },
    { keywords: ['kvačilo', 'set kvačila'], categoryName: 'Kvačilo / dijelovi', externalId: '100050' },
    { keywords: ['svjetlo', 'far', 'stop'], categoryName: 'Električni sistem', externalId: '100010' },
  ];

  let totalMoved = 0;

  for (const mapping of mappings) {
    const targetCategory = tecdocCategories.find(c => c.externalId === mapping.externalId);
    
    if (!targetCategory) {
      console.log(`⚠️  Kategorija "${mapping.categoryName}" (${mapping.externalId}) nije pronađena, preskačem...`);
      continue;
    }

    console.log(`\n📂 Premještanje u: ${targetCategory.name} (${targetCategory.externalId})`);
    
    for (const keyword of mapping.keywords) {
      const result = await moveByKeyword(ostaloCategory.id, targetCategory.id, keyword, dryRun);
      totalMoved += result.moved;
    }
  }

  console.log(`\n\n📊 Ukupno premješteno: ${totalMoved} proizvoda`);
}

async function main() {
  const fromCategoryId = argValue('--from-category');
  const toCategoryId = argValue('--to-category');
  const keyword = argValue('--keyword');
  const dryRun = !hasFlag('--no-dry-run');
  const batch = hasFlag('--batch');

  if (batch) {
    await batchMove(dryRun);
    return;
  }

  if (!fromCategoryId || !toCategoryId || !keyword) {
    console.log('❌ Nedostaju parametri!\n');
    console.log('Primjeri korištenja:\n');
    console.log('1. Pojedinačno premještanje:');
    console.log('   npx tsx scripts/move-products-to-categories.ts --from-category <ID> --to-category <ID> --keyword "filter" --no-dry-run\n');
    console.log('2. Batch premještanje:');
    console.log('   npx tsx scripts/move-products-to-categories.ts --batch --no-dry-run\n');
    process.exit(1);
  }

  await moveByKeyword(fromCategoryId, toCategoryId, keyword, dryRun);
}

main()
  .catch((error) => {
    console.error('❌ Greška:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
