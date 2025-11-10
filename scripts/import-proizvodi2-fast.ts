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

  console.log('🚀 Brzi import proizvoda...\n');
  console.log(`📂 Fajl: ${filePath}`);
  console.log(`📁 Kategorija: ${categoryId}\n`);

  let content = fs.readFileSync(filePath, 'utf8');
  
  // Ukloni BOM ako postoji
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
    console.log('✅ BOM uklonjen iz CSV-a\n');
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
    const firstRow: any = raw[0];
    console.log(`   SIFART: ${firstRow.SIFART}`);
    console.log(`   katbro: ${firstRow.katbro}`);
    console.log(`   IMEART: ${firstRow.IMEART}\n`);
  }

  const mapped = raw.map((r: any) => {
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
      _imemal: imemal,
    };
  });

  // Provjeri koliko ima SKU-ova
  const withSku = mapped.filter(m => m.sku).length;
  console.log(`📊 Proizvoda sa SKU: ${withSku}/${mapped.length}\n`);

  console.log('🔍 Provjera postojećih proizvoda...');
  
  // Dohvati sve postojeće catalogNumber-e odjednom
  const existingProducts = await prisma.product.findMany({
    where: {
      catalogNumber: {
        in: mapped.map(m => m.catalogNumber)
      }
    },
    select: {
      catalogNumber: true,
      id: true,
      description: true
    }
  });

  const existingMap = new Map(existingProducts.map(p => [p.catalogNumber, p]));
  console.log(`✅ Pronađeno ${existingProducts.length} postojećih proizvoda\n`);

  const toCreate: any[] = [];
  const toUpdate: any[] = [];

  for (const rec of mapped) {
    if (!rec.name || !rec.catalogNumber || !rec.price || rec.price <= 0) {
      continue;
    }

    const existing = existingMap.get(rec.catalogNumber);

    if (existing) {
      // Update
      let newDesc = rec.description;
      if (rec._imemal) {
        const alreadyHas = (existing.description || '').includes(rec._imemal);
        if (!alreadyHas) {
          newDesc = [existing.description, rec._imemal].filter(Boolean).join('\n');
        } else {
          newDesc = existing.description || rec.description;
        }
      }

      toUpdate.push({
        where: { id: existing.id },
        data: {
          name: rec.name,
          description: newDesc,
          price: rec.price,
          oemNumber: rec.oemNumber,
          unitOfMeasure: rec.unitOfMeasure,
          purchasePrice: rec.purchasePrice,
          sku: rec.sku,
        }
      });
    } else {
      // Create
      toCreate.push({
        name: rec.name,
        description: rec.description,
        price: rec.price,
        catalogNumber: rec.catalogNumber,
        oemNumber: rec.oemNumber,
        unitOfMeasure: rec.unitOfMeasure,
        purchasePrice: rec.purchasePrice,
        sku: rec.sku,
        categoryId: categoryId,
      });
    }
  }

  console.log(`📊 Statistika:`);
  console.log(`   ✨ Za kreiranje: ${toCreate.length}`);
  console.log(`   🔄 Za ažuriranje: ${toUpdate.length}\n`);

  // Batch create - 1000 po batch-u
  const BATCH_SIZE = 1000;
  let created = 0;

  console.log('✨ Kreiranje novih proizvoda...');
  for (let i = 0; i < toCreate.length; i += BATCH_SIZE) {
    const batch = toCreate.slice(i, i + BATCH_SIZE);
    await prisma.product.createMany({
      data: batch,
      skipDuplicates: true
    });
    created += batch.length;
    console.log(`   Kreirano: ${created}/${toCreate.length}`);
  }

  // Batch update - mora biti pojedinačno zbog različitih where uslova
  let updated = 0;
  console.log('\n🔄 Ažuriranje postojećih proizvoda...');
  for (const update of toUpdate) {
    await prisma.product.update(update);
    updated++;
    if (updated % 100 === 0) {
      console.log(`   Ažurirano: ${updated}/${toUpdate.length}`);
    }
  }

  console.log(`\n✅ Import završen!`);
  console.log(`   ✨ Kreirano: ${created}`);
  console.log(`   🔄 Ažurirano: ${updated}`);
  console.log(`   📦 Ukupno: ${created + updated}`);
}

main()
  .catch((error) => {
    console.error('❌ Greška:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
