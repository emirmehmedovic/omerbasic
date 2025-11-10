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
  const filePath = process.argv[2] || '/Users/emir_mw/omerbasic/stanje/stanje201.csv';
  const dryRun = process.argv.includes('--dry-run');

  console.log('📦 Ažuriranje stanja proizvoda...\n');
  console.log(`📂 Fajl: ${filePath}`);
  console.log(`🔍 Mod: ${dryRun ? 'DRY RUN (pregled)' : 'PRAVO AŽURIRANJE'}\n`);

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Fajl ne postoji: ${filePath}`);
    process.exit(1);
  }

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

  // Debug: Prikaži prvu liniju
  if (raw.length > 0) {
    console.log('🔍 Primjer prvog reda:');
    console.log('   Kolone:', Object.keys(raw[0] as object));
    console.log('   Vrijednosti:', raw[0]);
    console.log('');
  }

  // Mapiraj podatke
  const stockUpdates = raw
    .map((r: any) => ({
      sku: (r.sifart ?? '').toString(),
      stock: toNum(r.stanje0) ?? 0,
      purchasePrice: toNum(r.nabizn), // nabizn = nabavna cijena
    }))
    .filter((r: any) => r.sku && r.sku !== ''); // Samo redovi sa SKU-om

  console.log(`📊 Validnih redova za ažuriranje: ${stockUpdates.length}`);

  // Dohvati sve proizvode sa ovim SKU-ovima
  console.log('🔍 Pretraga proizvoda u bazi...');
  const products = await prisma.product.findMany({
    where: {
      sku: {
        in: stockUpdates.map(u => u.sku)
      }
    },
    select: {
      id: true,
      sku: true,
      name: true,
      stock: true,
      catalogNumber: true,
    }
  });

  const productMap = new Map(products.map(p => [p.sku, p]));
  console.log(`✅ Pronađeno ${products.length} proizvoda u bazi\n`);

  // Statistika
  let found = 0;
  let notFound = 0;
  let updated = 0;
  let noChange = 0;
  const notFoundSkus: string[] = [];

  console.log('🔄 Ažuriranje stanja...\n');

  for (const update of stockUpdates) {
    const product = productMap.get(update.sku);

    if (!product) {
      notFound++;
      if (notFoundSkus.length < 10) {
        notFoundSkus.push(update.sku);
      }
      continue;
    }

    found++;

    // Provjeri da li se stanje promijenilo
    if (product.stock === update.stock) {
      noChange++;
      continue;
    }

    if (!dryRun) {
      const updateData: any = {
        stock: update.stock,
      };

      // Ažuriraj i nabavnu cijenu ako postoji
      if (update.purchasePrice !== undefined) {
        updateData.purchasePrice = update.purchasePrice;
      }

      await prisma.product.update({
        where: { id: product.id },
        data: updateData,
      });
    }

    updated++;

    // Prikaži prvih 20 ažuriranja
    if (updated <= 20) {
      console.log(`  ✅ [${product.catalogNumber}] ${product.name}`);
      console.log(`     Stanje: ${product.stock} → ${update.stock}`);
      if (update.purchasePrice !== undefined) {
        console.log(`     Nabavna cijena: ${update.purchasePrice} KM`);
      }
    }
  }

  if (updated > 20) {
    console.log(`  ... i još ${updated - 20} proizvoda\n`);
  }

  console.log('\n📊 Statistika:');
  console.log(`   ✅ Pronađeno u bazi: ${found}`);
  console.log(`   ❌ Nije pronađeno: ${notFound}`);
  console.log(`   🔄 Ažurirano: ${updated}`);
  console.log(`   ⏭️  Bez promjene: ${noChange}`);

  if (notFoundSkus.length > 0) {
    console.log(`\n⚠️  Primjeri SKU-ova koji nisu pronađeni:`);
    notFoundSkus.forEach(sku => console.log(`   - ${sku}`));
    if (notFound > notFoundSkus.length) {
      console.log(`   ... i još ${notFound - notFoundSkus.length}`);
    }
  }

  if (dryRun) {
    console.log('\n💡 Ovo je bio DRY RUN - ništa nije ažurirano u bazi.');
    console.log('   Pokreni bez --dry-run za pravo ažuriranje:\n');
    console.log(`   npx tsx scripts/update-stock-from-csv.ts "${filePath}"\n`);
  } else {
    console.log('\n✅ Stanje uspješno ažurirano!');
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
