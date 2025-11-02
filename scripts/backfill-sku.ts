import fs from 'fs';
import path from 'path';
import process from 'process';
import { parse } from 'csv-parse/sync';
import { db } from '../src/lib/db';

type CliOptions = {
  file: string;
  dryRun: boolean;
  batchSize: number;
  chunkSize: number;
};

type Row = Record<string, unknown>;

type Summary = {
  totalRows: number;
  usableRows: number;
  missingCatalogNumber: number;
  missingSku: number;
  noChange: number;
  updated: number;
  dryRun: boolean;
};

const DEFAULT_FILE = 'proizvodi-csv/proizvodi-2.csv';
const DEFAULT_BATCH_SIZE = 200;
const DEFAULT_CHUNK_SIZE = 1000;

function parseCli(): CliOptions {
  const args = process.argv.slice(2);
  const opts: CliOptions = {
    file: DEFAULT_FILE,
    dryRun: false,
    batchSize: DEFAULT_BATCH_SIZE,
    chunkSize: DEFAULT_CHUNK_SIZE,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--file' && args[i + 1]) {
      opts.file = args[++i];
    } else if (arg === '--dry-run') {
      opts.dryRun = true;
    } else if (arg === '--batch-size' && args[i + 1]) {
      const parsed = Number(args[++i]);
      if (!Number.isNaN(parsed) && parsed > 0) opts.batchSize = parsed;
    } else if (arg === '--chunk-size' && args[i + 1]) {
      const parsed = Number(args[++i]);
      if (!Number.isNaN(parsed) && parsed > 0) opts.chunkSize = parsed;
    }
  }

  return opts;
}

function resolvePath(file: string): string {
  return path.isAbsolute(file) ? file : path.join(process.cwd(), file);
}

function sanitizeRow(row: Row): Row {
  const sanitized: Row = {};
  for (const [key, value] of Object.entries(row)) {
    const cleanKey = key.replace(/^\uFEFF/, '');
    sanitized[cleanKey] = value;
    const lowerKey = cleanKey.toLowerCase();
    if (!Object.prototype.hasOwnProperty.call(sanitized, lowerKey)) {
      sanitized[lowerKey] = value;
    }
  }
  return sanitized;
}

function readCsv(filePath: string): Row[] {
  const content = fs.readFileSync(filePath, 'utf8');
  const parsed = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    delimiter: ';',
  }) as Row[];
  return parsed.map(sanitizeRow);
}

function extractCatalog(row: Row): string | null {
  const raw = row['katbro'] ?? row['KATBRO'] ?? row['catalogNumber'] ?? row['catalognumber'];
  if (raw === undefined || raw === null) return null;
  const value = String(raw).trim();
  return value || null;
}

function extractSku(row: Row): string | null {
  const raw = row['sifart'] ?? row['SIFART'] ?? row['sku'];
  if (raw === undefined || raw === null) return null;
  const value = String(raw).trim();
  return value || null;
}

async function flushUpdates(batch: { id: string; sku: string }[], dryRun: boolean) {
  if (!batch.length || dryRun) return;
  await db.$transaction(
    batch.map(({ id, sku }) =>
      db.product.update({ where: { id }, data: { sku } })
    ),
  );
}

async function main() {
  const opts = parseCli();
  const csvPath = resolvePath(opts.file);

  if (!fs.existsSync(csvPath)) {
    console.error(`CSV file not found: ${csvPath}`);
    process.exit(1);
  }

  console.log(`Loading CSV: ${csvPath}`);
  const rows = readCsv(csvPath);
  console.log(`Parsed ${rows.length} rows.`);

  const catalogToSku = new Map<string, string>();
  const summary: Summary = {
    totalRows: rows.length,
    usableRows: 0,
    missingCatalogNumber: 0,
    missingSku: 0,
    noChange: 0,
    updated: 0,
    dryRun: opts.dryRun,
  };

  for (const row of rows) {
    const catalogNumber = extractCatalog(row);
    if (!catalogNumber) {
      summary.missingCatalogNumber++;
      continue;
    }
    const sku = extractSku(row);
    if (!sku) {
      summary.missingSku++;
      continue;
    }
    summary.usableRows++;
    if (!catalogToSku.has(catalogNumber)) {
      catalogToSku.set(catalogNumber, sku);
    }
  }

  if (!catalogToSku.size) {
    console.log('No usable rows with both catalogNumber and SIFART values. Nothing to do.');
    return;
  }

  console.log(`Usable catalog entries: ${catalogToSku.size}`);

  const catalogNumbers = Array.from(catalogToSku.keys());
  const pending: { id: string; sku: string }[] = [];

  for (let i = 0; i < catalogNumbers.length; i += opts.chunkSize) {
    const chunk = catalogNumbers.slice(i, i + opts.chunkSize);
    const products = await db.product.findMany({
      where: { catalogNumber: { in: chunk } },
      select: { id: true, catalogNumber: true, sku: true },
    });
    const byCatalog = new Map(products.map(p => [p.catalogNumber, p] as const));

    for (const catalog of chunk) {
      const sku = catalogToSku.get(catalog)!;
      const product = byCatalog.get(catalog);
      if (!product) continue;
      const current = product.sku?.trim();
      if (current === sku) {
        summary.noChange++;
        continue;
      }
      pending.push({ id: product.id, sku });
      if (pending.length >= opts.batchSize) {
        await flushUpdates(pending, opts.dryRun);
        summary.updated += pending.length;
        pending.length = 0;
      }
    }
  }

  if (pending.length) {
    await flushUpdates(pending, opts.dryRun);
    summary.updated += pending.length;
    pending.length = 0;
  }

  console.log(
    JSON.stringify(
      {
        totalRows: summary.totalRows,
        usableRows: summary.usableRows,
        missingCatalogNumber: summary.missingCatalogNumber,
        missingSku: summary.missingSku,
        noChange: summary.noChange,
        updated: summary.updated,
        dryRun: summary.dryRun,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
