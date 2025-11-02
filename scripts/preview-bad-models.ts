import fs from 'fs';
import path from 'path';
import process from 'process';
import { db } from '../src/lib/db';

/**
 * Preview and optionally delete VehicleModels that embed generation tokens in the model name.
 * Examples of bad names: "Passat B3/B4", "Golf Mk2/Mk3", "A4 II".
 *
 * Usage examples:
 *   npx tsx scripts/preview-bad-models.ts --report bad-models.csv
 *   npx tsx scripts/preview-bad-models.ts --brand Volkswagen --report vw-bad-models.csv
 *   npx tsx scripts/preview-bad-models.ts --delete --report deleted.csv
 */

type CliOptions = {
  brand?: string | null;
  report?: string | null;
  deleteMode: boolean;
};

function parseCli(): CliOptions {
  const args = process.argv.slice(2);
  const opts: CliOptions = { brand: null, report: null, deleteMode: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--brand' && args[i + 1]) opts.brand = args[++i];
    else if (a === '--report' && args[i + 1]) opts.report = args[++i];
    else if (a === '--delete') opts.deleteMode = true;
  }
  return opts;
}

function upperNoDia(s: string) {
  return s.normalize('NFKD').replace(/\p{Diacritic}/gu, '').toUpperCase();
}

function isBadModelName(name: string): { bad: boolean; reason?: string } {
  const n = name.trim();
  if (!n) return { bad: false };
  if (n.includes('/')) return { bad: true, reason: 'slash' };
  // Match tokens like: space + (B\d(.\d)?, Mk\d(.\d+)?, Roman numerals I/V/X)
  const genToken = /(\s|^)(B\d(?:\.\d)?|MK\d(?:\.\d+)?|[IVX]{1,4})(\s|$)/i;
  if (genToken.test(n)) return { bad: true, reason: 'gen-token' };
  return { bad: false };
}

type Row = { id: string; brand: string; model: string; reason: string };

function writeReport(file: string, rows: Row[]) {
  const header = 'id,brand,model,reason\n';
  const body = rows
    .map(r => [r.id, r.brand, r.model, r.reason]
      .map(v => String(v).replace(/"/g, '""'))
      .join(','))
    .join('\n');
  fs.writeFileSync(path.resolve(process.cwd(), file), header + body);
}

async function run() {
  const opts = parseCli();
  console.log(`Scanning VehicleModels${opts.brand ? ` for brand=${opts.brand}` : ''}...`);

  // Query scope by brand if provided to reduce load
  let models = await db.vehicleModel.findMany({
    where: opts.brand ? { brand: { name: { equals: opts.brand } } } : undefined,
    select: { id: true, name: true, brand: { select: { name: true } } }
  });

  const bad: Row[] = [];
  for (const m of models) {
    const check = isBadModelName(m.name);
    if (check.bad) bad.push({ id: m.id, brand: m.brand.name, model: m.name, reason: check.reason || '' });
  }

  console.log(`Found ${bad.length} bad models out of ${models.length}.`);

  if (opts.report) {
    writeReport(opts.report, bad);
    console.log(`Report written: ${opts.report}`);
  }

  if (opts.deleteMode && bad.length) {
    console.log(`Deleting ${bad.length} models...`);
    for (const r of bad) {
      await db.vehicleModel.delete({ where: { id: r.id } });
    }
    console.log('Delete complete.');
  } else if (opts.deleteMode) {
    console.log('Nothing to delete.');
  }
}

run()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await db.$disconnect(); });
