import { PrismaClient } from '@/generated/prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Provjera TecDoc kategorija...\n');

  // Pronađi parent kategorije
  const parentCategories = await prisma.category.findMany({
    where: {
      name: {
        in: ['Putnička vozila', 'Teretna vozila']
      }
    },
    include: {
      _count: {
        select: { children: true, products: true }
      }
    }
  });

  for (const parent of parentCategories) {
    console.log(`\n📁 ${parent.name}`);
    console.log(`   ID: ${parent.id}`);
    console.log(`   External ID: ${parent.externalId || 'N/A'}`);
    console.log(`   Podkategorija: ${parent._count.children}`);
    console.log(`   Proizvoda: ${parent._count.products}`);

    // Prikaži prvih 10 podkategorija
    const children = await prisma.category.findMany({
      where: { parentId: parent.id },
      orderBy: { externalId: 'asc' },
      take: 10,
      include: {
        _count: {
          select: { products: true }
        }
      }
    });

    console.log(`\n   Prvih 10 podkategorija:`);
    for (const child of children) {
      console.log(`   • ${child.externalId || 'N/A'} - ${child.name} (${child._count.products} proizvoda)`);
    }
  }

  // Statistika
  console.log('\n\n📊 Ukupna statistika:');
  
  const totalWithExternalId = await prisma.category.count({
    where: { externalId: { not: null } }
  });
  
  const totalCategories = await prisma.category.count();
  
  console.log(`   Ukupno kategorija: ${totalCategories}`);
  console.log(`   Sa External ID: ${totalWithExternalId}`);
  console.log(`   Bez External ID: ${totalCategories - totalWithExternalId}`);

  // Provjera duplikata External ID
  const duplicates = await prisma.$queryRaw<Array<{ externalId: string; count: bigint }>>`
    SELECT "externalId", COUNT(*) as count
    FROM "Category"
    WHERE "externalId" IS NOT NULL
    GROUP BY "externalId"
    HAVING COUNT(*) > 1
  `;

  if (duplicates.length > 0) {
    console.log('\n⚠️  Pronađeni duplikati External ID:');
    for (const dup of duplicates) {
      console.log(`   • ${dup.externalId}: ${dup.count} puta`);
    }
  } else {
    console.log('\n✅ Nema duplikata External ID');
  }
}

main()
  .catch((error) => {
    console.error('❌ Greška:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
