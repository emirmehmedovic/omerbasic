import { PrismaClient } from '@/generated/prisma/client';
import * as fs from 'fs';
import { parse } from 'csv-parse/sync';

const prisma = new PrismaClient();

function toNum(val: any): number | undefined {
  if (val === undefined || val === null || val === '') return undefined;
  const s = String(val).replace(/\./g, '').replace(/,/g, '.');
  const n = Number(s);
  return isNaN(n) ? undefined : n;
}

async function main() {
  const filePath = '/Users/emir_mw/omerbasic/stanje/stanje201.csv';

  console.log('⚡ Brzo ažuriranje stanja proizvoda...\n');
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

  const stockUpdates = raw
    .map((r: any) => ({
      sku: (r.sifart ?? '').toString(),
      stock: toNum(r.stanje0) ?? 0,
      purchasePrice: toNum(r.nabizn),
    }))
    .filter((r: any) => r.sku && r.sku !== '');

  console.log(`📊 Validnih redova: ${stockUpdates.length}\n`);

  // Dohvati sve proizvode sa ovim SKU-ovima odjednom
  console.log('🔍 Dohvaćanje proizvoda iz baze...');
  const products = await prisma.product.findMany({
    where: {
      sku: {
        in: stockUpdates.map(u => u.sku)
      }
    },
    select: {
      id: true,
      sku: true,
      stock: true,
      catalogNumber: true,
    }
  });

  const productMap = new Map(products.map(p => [p.sku, p]));
  console.log(`✅ Pronađeno ${products.length} proizvoda\n`);

  // Pripremi batch update-e
  const updates: Array<{ id: string; stock: number; purchasePrice?: number }> = [];
  let notFound = 0;
  let noChange = 0;

  for (const update of stockUpdates) {
    const product = productMap.get(update.sku);

    if (!product) {
      notFound++;
      continue;
    }

    if (product.stock === update.stock) {
      noChange++;
      continue;
    }

    const updateData: any = {
      id: product.id,
      stock: update.stock,
    };

    if (update.purchasePrice !== undefined) {
      updateData.purchasePrice = update.purchasePrice;
    }

    updates.push(updateData);
  }

  console.log(`📊 Statistika prije ažuriranja:`);
  console.log(`   ✅ Za ažuriranje: ${updates.length}`);
  console.log(`   ⏭️  Bez promjene: ${noChange}`);
  console.log(`   ❌ Nije pronađeno: ${notFound}\n`);

  if (updates.length === 0) {
    console.log('✅ Nema ništa za ažurirati!');
    return;
  }

  console.log('🔄 Ažuriranje stanja...\n');

  // Batch update - 500 po batch-u
  const BATCH_SIZE = 500;
  let updated = 0;

  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = updates.slice(i, i + BATCH_SIZE);
    
    // Koristi transaction za batch
    await prisma.$transaction(
      batch.map(u => 
        prisma.product.update({
          where: { id: u.id },
          data: {
            stock: u.stock,
            ...(u.purchasePrice !== undefined && { purchasePrice: u.purchasePrice })
          }
        })
      )
    );

    updated += batch.length;
    console.log(`   Ažurirano: ${updated}/${updates.length}`);
  }

  console.log('\n✅ Ažuriranje završeno!');
  console.log(`   ✅ Ažurirano: ${updated}`);
  console.log(`   ⏭️  Bez promjene: ${noChange}`);
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
