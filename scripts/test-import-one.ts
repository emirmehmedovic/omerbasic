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
  const filePath = '/Users/emir_mw/omerbasic/proizvodi-csv/proizvodi-2.csv';
  const categoryId = 'cmhqhuxu90000om9bc1m41laz'; // Ostalo

  console.log('🧪 Test import - prvih 5 proizvoda...\n');

  let content = fs.readFileSync(filePath, 'utf8');
  
  // Ukloni BOM ako postoji
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
    console.log('✅ BOM uklonjen\n');
  }
  
  const raw = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    delimiter: ';',
  });

  console.log(`📋 CSV ima ${raw.length} redova\n`);

  // Uzmi samo prvih 5
  const testRows = raw.slice(0, 5);

  console.log('🔍 Prvih 5 redova iz CSV-a:\n');
  testRows.forEach((r: any, i: number) => {
    console.log(`${i + 1}. SIFART: ${r.SIFART} | katbro: ${r.katbro} | IMEART: ${r.IMEART}`);
  });

  console.log('\n📦 Mapirani podaci za import:\n');

  const mapped = testRows.map((r: any) => {
    const name = (r.IMEART ?? '').toString();
    const imemal = (r.imemal ?? '').toString();
    const sku = r.SIFART ? r.SIFART.toString() : undefined;
    
    return {
      name,
      description: imemal || undefined,
      price: toNum(r.CIJART) ?? 0,
      catalogNumber: (r.katbro ?? '').toString(),
      oemNumber: r.oem ? r.oem.toString() : undefined,
      unitOfMeasure: r.JEDMJE ? r.JEDMJE.toString() : undefined,
      purchasePrice: toNum(r.CIJNAB),
      sku: sku,
      categoryId: categoryId,
    };
  });

  mapped.forEach((m, i) => {
    console.log(`${i + 1}. SKU: ${m.sku || 'N/A'}`);
    console.log(`   Katalog: ${m.catalogNumber}`);
    console.log(`   Naziv: ${m.name}`);
    console.log(`   Cijena: ${m.price} KM`);
    console.log(`   Nabavna: ${m.purchasePrice || 'N/A'} KM`);
    console.log('');
  });

  console.log('💾 Spremanje u bazu...\n');

  for (const product of mapped) {
    if (!product.name || !product.catalogNumber || !product.price || product.price <= 0) {
      console.log(`⏭️  Preskačem: ${product.catalogNumber} (nedostaju podaci)`);
      continue;
    }

    const created = await prisma.product.create({
      data: product
    });

    console.log(`✅ Kreiran: [${created.catalogNumber}] SKU: ${created.sku || 'N/A'}`);
    console.log(`   ${created.name}`);
  }

  console.log('\n🔍 Provjera u bazi...\n');

  const products = await prisma.product.findMany({
    where: {
      catalogNumber: {
        in: mapped.map(m => m.catalogNumber)
      }
    },
    select: {
      catalogNumber: true,
      name: true,
      sku: true,
      price: true,
      purchasePrice: true,
      stock: true
    }
  });

  console.log('📦 Proizvodi u bazi:\n');
  products.forEach((p, i) => {
    console.log(`${i + 1}. [${p.catalogNumber}] SKU: ${p.sku || '❌ NEMA SKU!'}`);
    console.log(`   ${p.name}`);
    console.log(`   Cijena: ${p.price} KM | Nabavna: ${p.purchasePrice || 'N/A'} KM | Stanje: ${p.stock}`);
    console.log('');
  });

  if (products.every(p => p.sku)) {
    console.log('✅ SVI PROIZVODI IMAJU SKU - Možeš pokrenuti puni import!');
  } else {
    console.log('❌ NEKI PROIZVODI NEMAJU SKU - Provjeri skriptu!');
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
