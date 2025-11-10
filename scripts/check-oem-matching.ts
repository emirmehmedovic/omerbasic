import { PrismaClient } from '@/generated/prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

function normalizeToken(value: string | null | undefined): string {
  if (!value) return '';
  return value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

async function main() {
  console.log('🔍 Provjera OEM brojeva i slika...\n');

  // Dohvati prvih 20 slika
  const imagesDir = 'public/images/products_pictures';
  const files = fs.readdirSync(imagesDir)
    .filter(f => ['.jpg', '.jpeg', '.png', '.webp'].includes(path.extname(f).toLowerCase()))
    .slice(0, 20);

  console.log('📸 Prvih 20 slika:\n');
  files.forEach((f, i) => {
    const baseName = path.basename(f, path.extname(f));
    const normalized = normalizeToken(baseName);
    console.log(`${i + 1}. ${f} -> Normalized: ${normalized}`);
  });

  // Dohvati prvih 20 proizvoda sa OEM brojevima
  console.log('\n\n📦 Prvih 20 proizvoda sa OEM brojevima:\n');
  
  const products = await prisma.product.findMany({
    where: {
      oemNumber: { not: null }
    },
    select: {
      catalogNumber: true,
      name: true,
      oemNumber: true,
    },
    take: 20
  });

  products.forEach((p, i) => {
    const normalized = normalizeToken(p.oemNumber);
    console.log(`${i + 1}. [${p.catalogNumber}] OEM: ${p.oemNumber} -> Normalized: ${normalized}`);
    console.log(`   ${p.name}`);
  });

  // Provjeri da li postoje matchevi
  console.log('\n\n🔍 Tražim matcheve...\n');
  
  const imageTokens = new Set(
    fs.readdirSync(imagesDir)
      .filter(f => ['.jpg', '.jpeg', '.png', '.webp'].includes(path.extname(f).toLowerCase()))
      .map(f => normalizeToken(path.basename(f, path.extname(f))))
  );

  console.log(`📸 Ukupno slika: ${imageTokens.size}`);

  const allProducts = await prisma.product.findMany({
    where: {
      oemNumber: { not: null }
    },
    select: {
      catalogNumber: true,
      name: true,
      oemNumber: true,
    }
  });

  console.log(`📦 Proizvoda sa OEM: ${allProducts.length}\n`);

  let matches = 0;
  const matchedProducts: any[] = [];

  for (const product of allProducts) {
    const normalized = normalizeToken(product.oemNumber);
    if (imageTokens.has(normalized)) {
      matches++;
      if (matchedProducts.length < 10) {
        matchedProducts.push({
          catalogNumber: product.catalogNumber,
          name: product.name,
          oemNumber: product.oemNumber,
          normalized
        });
      }
    }
  }

  console.log(`✅ Pronađeno ${matches} matcheva!\n`);

  if (matchedProducts.length > 0) {
    console.log('Primjeri matcheva:\n');
    matchedProducts.forEach((p, i) => {
      console.log(`${i + 1}. [${p.catalogNumber}] OEM: ${p.oemNumber}`);
      console.log(`   ${p.name}`);
      console.log(`   Slika: ${p.normalized}.jpg\n`);
    });
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
