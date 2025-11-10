import { PrismaClient } from '@/generated/prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📊 Provjera progresa importa...\n');

  // Dohvati kategoriju Ostalo
  const ostaloCategory = await prisma.category.findFirst({
    where: { name: 'Ostalo' }
  });

  if (!ostaloCategory) {
    console.log('❌ Kategorija "Ostalo" nije pronađena!');
    return;
  }

  // Broji proizvode u kategoriji Ostalo
  const count = await prisma.product.count({
    where: { categoryId: ostaloCategory.id }
  });

  console.log(`📦 Proizvoda u kategoriji "Ostalo": ${count}`);

  // Ukupno proizvoda u bazi
  const totalProducts = await prisma.product.count();
  console.log(`📦 Ukupno proizvoda u bazi: ${totalProducts}`);

  // Prvih 5 najnovijih proizvoda
  const recentProducts = await prisma.product.findMany({
    where: { categoryId: ostaloCategory.id },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      catalogNumber: true,
      name: true,
      price: true,
      createdAt: true
    }
  });

  if (recentProducts.length > 0) {
    console.log('\n📋 Najnovijih 5 proizvoda:');
    recentProducts.forEach((p, i) => {
      console.log(`  ${i + 1}. [${p.catalogNumber}] ${p.name} - ${p.price} KM`);
    });
  }

  console.log('\n💡 Skripta još uvijek radi ako se broj proizvoda povećava.');
  console.log('   Pokreni ovu komandu ponovo za provjeru progresa.');
}

main()
  .catch((error) => {
    console.error('❌ Greška:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
