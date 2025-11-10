import { PrismaClient } from '@/generated/prisma/client';
import * as fs from 'fs';
import { parse } from 'csv-parse/sync';

const prisma = new PrismaClient();

async function main() {
  const filePath = '/Users/emir_mw/omerbasic/proizvodi-csv/proizvodi-2.csv';

  console.log('🔄 Backfill SKU iz CSV-a...\n');
  console.log(`📂 Fajl: ${filePath}\n`);

  let content = fs.readFileSync(filePath, 'utf8');
  
  // Ukloni BOM ako postoji
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }
  
  console.log('📋 Parsiranje CSV-a...');
  const raw = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    delimiter: ';',
  });

  console.log(`✅ Parsirano ${raw.length} redova\n`);

  const mapped = raw
    .map((r: any) => ({
      catalogNumber: (r.katbro ?? '').toString(),
      sku: (r.SIFART ?? '').toString(),
    }))
    .filter((r: any) => r.catalogNumber && r.sku);

  console.log(`📊 Redova sa catalogNumber i SKU: ${mapped.length}\n`);

  let updated = 0;
  let notFound = 0;
  let alreadyHasSku = 0;

  console.log('🔄 Ažuriranje SKU polja...\n');

  const BATCH_SIZE = 100;
  for (let i = 0; i < mapped.length; i += BATCH_SIZE) {
    const batch = mapped.slice(i, i + BATCH_SIZE);
    
    for (const item of batch) {
      const product = await prisma.product.findUnique({
        where: { catalogNumber: item.catalogNumber },
        select: { id: true, sku: true, catalogNumber: true, name: true }
      });

      if (!product) {
        notFound++;
        continue;
      }

      if (product.sku) {
        alreadyHasSku++;
        continue;
      }

      await prisma.product.update({
        where: { id: product.id },
        data: { sku: item.sku }
      });

      updated++;

      if (updated <= 20) {
        console.log(`  ✅ [${product.catalogNumber}] SKU: ${item.sku}`);
        console.log(`     ${product.name}`);
      }
    }

    if ((i + BATCH_SIZE) % 1000 === 0 || i + BATCH_SIZE >= mapped.length) {
      console.log(`\n📊 Progres: ${Math.min(i + BATCH_SIZE, mapped.length)}/${mapped.length}`);
      console.log(`   ✅ Ažurirano: ${updated}`);
      console.log(`   ⏭️  Već ima SKU: ${alreadyHasSku}`);
      console.log(`   ❌ Nije pronađeno: ${notFound}\n`);
    }
  }

  console.log('\n✅ Backfill završen!');
  console.log(`   ✅ Ažurirano: ${updated}`);
  console.log(`   ⏭️  Već ima SKU: ${alreadyHasSku}`);
  console.log(`   ❌ Nije pronađeno: ${notFound}`);
}

main()
  .catch((error) => {
    console.error('❌ Greška:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
