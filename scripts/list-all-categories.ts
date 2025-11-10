import { PrismaClient } from '@/generated/prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📋 Lista svih kategorija u bazi:\n');

  // Pronađi sve top-level kategorije
  const topLevelCategories = await prisma.category.findMany({
    where: { parentId: null },
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: { children: true, products: true }
      }
    }
  });

  console.log(`🔝 Top-level kategorije (${topLevelCategories.length}):\n`);
  
  for (const cat of topLevelCategories) {
    console.log(`📁 ${cat.name}`);
    console.log(`   ID: ${cat.id}`);
    console.log(`   External ID: ${cat.externalId || 'N/A'}`);
    console.log(`   Podkategorija: ${cat._count.children}`);
    console.log(`   Proizvoda: ${cat._count.products}`);
    console.log('');
  }

  // Prikaži sve kategorije sa parentom
  const childCategories = await prisma.category.findMany({
    where: { parentId: { not: null } },
    orderBy: [{ parentId: 'asc' }, { name: 'asc' }],
    include: {
      parent: true,
      _count: {
        select: { products: true }
      }
    }
  });

  console.log(`\n📂 Podkategorije (${childCategories.length}):\n`);
  
  let currentParent = '';
  for (const cat of childCategories) {
    if (cat.parent && cat.parent.name !== currentParent) {
      currentParent = cat.parent.name;
      console.log(`\n  └─ ${currentParent}:`);
    }
    console.log(`     • ${cat.externalId || 'N/A'} - ${cat.name} (${cat._count.products} proizvoda)`);
  }

  console.log(`\n\n📊 Ukupno: ${topLevelCategories.length + childCategories.length} kategorija`);
}

main()
  .catch((error) => {
    console.error('❌ Greška:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
