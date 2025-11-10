import { PrismaClient } from '@/generated/prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Priprema za import proizvoda...\n');

  // Pronađi ili kreiraj kategoriju "Ostalo"
  let ostaloCategory = await prisma.category.findFirst({
    where: { name: 'Ostalo', parentId: null }
  });

  if (!ostaloCategory) {
    console.log('📝 Kreiranje kategorije "Ostalo"...');
    ostaloCategory = await prisma.category.create({
      data: {
        name: 'Ostalo',
        level: 1,
      }
    });
    console.log(`✅ Kategorija "Ostalo" kreirana: ${ostaloCategory.id}\n`);
  } else {
    console.log(`✅ Kategorija "Ostalo" već postoji: ${ostaloCategory.id}\n`);
  }

  console.log('📋 Komanda za import:\n');
  console.log(`node scripts/import-proizvodi2.js --file "/Users/emir_mw/omerbasic/proizvodi-csv/proizvodi-2.csv" --category ${ostaloCategory.id} --dry-run\n`);
  console.log('💡 Ukloni --dry-run kada budeš spreman za pravi import.\n');
}

main()
  .catch((error) => {
    console.error('❌ Greška:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
