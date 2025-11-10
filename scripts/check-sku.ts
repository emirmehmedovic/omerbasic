import { PrismaClient } from '@/generated/prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Provjera SKU polja...\n');

  const totalProducts = await prisma.product.count();
  const productsWithSku = await prisma.product.count({
    where: { sku: { not: null } }
  });
  const productsWithoutSku = totalProducts - productsWithSku;

  console.log(`📦 Ukupno proizvoda: ${totalProducts}`);
  console.log(`✅ Sa SKU: ${productsWithSku}`);
  console.log(`❌ Bez SKU: ${productsWithoutSku}\n`);

  // Prikaži prvih 5 proizvoda
  const samples = await prisma.product.findMany({
    take: 5,
    select: {
      catalogNumber: true,
      name: true,
      sku: true,
      stock: true
    }
  });

  console.log('📋 Primjeri proizvoda:');
  samples.forEach((p, i) => {
    console.log(`  ${i + 1}. [${p.catalogNumber}] SKU: ${p.sku || 'N/A'} - Stanje: ${p.stock}`);
    console.log(`     ${p.name}`);
  });
}

main()
  .catch((error) => {
    console.error('❌ Greška:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
