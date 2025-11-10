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

  console.log('⚡⚡⚡ ULTRA BRZO ažuriranje stanja proizvoda...\n');
  console.log(`📂 Fajl: ${filePath}\n`);

  const startTime = Date.now();

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

  console.log(`✅ Parsirano ${raw.length} redova (${Date.now() - startTime}ms)\n`);

  const stockUpdates = raw
    .map((r: any) => ({
      sku: (r.sifart ?? '').toString(),
      stock: toNum(r.stanje0) ?? 0,
      purchasePrice: toNum(r.nabizn),
    }))
    .filter((r: any) => r.sku && r.sku !== '');

  console.log(`📊 Validnih redova: ${stockUpdates.length}\n`);

  // Kreiraj temporary table i bulk insert
  console.log('🚀 Kreiranje temporary table...');
  
  await prisma.$executeRaw`
    CREATE TEMP TABLE IF NOT EXISTS temp_stock_updates (
      sku TEXT PRIMARY KEY,
      stock INTEGER NOT NULL,
      purchase_price DECIMAL(10,2)
    );
  `;

  console.log('✅ Temp table kreiran\n');

  // Bulk insert u temp table - mnogo brže od pojedinačnih insert-a
  console.log('📥 Bulk insert u temp table...');
  
  const BATCH_SIZE = 5000;
  let inserted = 0;

  for (let i = 0; i < stockUpdates.length; i += BATCH_SIZE) {
    const batch = stockUpdates.slice(i, i + BATCH_SIZE);
    
    // Generiši VALUES za bulk insert
    const values = batch
      .map(u => {
        const price = u.purchasePrice !== undefined ? u.purchasePrice : 'NULL';
        return `('${u.sku.replace(/'/g, "''")}', ${u.stock}, ${price})`;
      })
      .join(',');

    await prisma.$executeRawUnsafe(`
      INSERT INTO temp_stock_updates (sku, stock, purchase_price)
      VALUES ${values}
      ON CONFLICT (sku) DO UPDATE SET
        stock = EXCLUDED.stock,
        purchase_price = EXCLUDED.purchase_price;
    `);

    inserted += batch.length;
    console.log(`   Insertovano: ${inserted}/${stockUpdates.length}`);
  }

  console.log(`✅ Bulk insert završen (${Date.now() - startTime}ms)\n`);

  // Jedan veliki UPDATE sa JOIN - ULTRA BRZO!
  console.log('⚡ Izvršavam bulk UPDATE...');
  
  const updateStart = Date.now();
  
  const result = await prisma.$executeRaw`
    UPDATE "Product" p
    SET 
      stock = t.stock,
      "purchasePrice" = COALESCE(t.purchase_price, p."purchasePrice"),
      "updatedAt" = NOW()
    FROM temp_stock_updates t
    WHERE p.sku = t.sku
      AND (p.stock != t.stock OR p."purchasePrice" != t.purchase_price);
  `;

  const updateTime = Date.now() - updateStart;
  console.log(`✅ UPDATE završen za ${updateTime}ms!\n`);

  // Statistika
  console.log('📊 Dohvaćanje statistike...');
  
  const stats = await prisma.$queryRaw<Array<{ 
    total_in_csv: bigint;
    matched: bigint;
    not_found: bigint;
  }>>`
    SELECT 
      COUNT(*) as total_in_csv,
      COUNT(p.id) as matched,
      COUNT(*) - COUNT(p.id) as not_found
    FROM temp_stock_updates t
    LEFT JOIN "Product" p ON p.sku = t.sku;
  `;

  const stat = stats[0];
  
  // Cleanup
  await prisma.$executeRaw`DROP TABLE temp_stock_updates;`;

  const totalTime = Date.now() - startTime;

  console.log('\n✅ Ažuriranje završeno!\n');
  console.log(`📊 Statistika:`);
  console.log(`   ✅ Ažurirano: ${result} proizvoda`);
  console.log(`   📦 Ukupno u CSV: ${stat.total_in_csv}`);
  console.log(`   ✓  Pronađeno u bazi: ${stat.matched}`);
  console.log(`   ❌ Nije pronađeno: ${stat.not_found}`);
  console.log(`\n⏱️  Ukupno vrijeme: ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)`);
  console.log(`⚡ Brzina: ${Math.round(Number(result) / (totalTime / 1000))} proizvoda/s`);
}

main()
  .catch((error) => {
    console.error('❌ Greška:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
