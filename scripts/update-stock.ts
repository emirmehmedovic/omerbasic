import fs from 'fs';
import path from 'path';
import process from 'process';
import { parse } from 'csv-parse/sync';
import { db } from '../src/lib/db';

type CliOptions = {
  file: string;
  dryRun: boolean;
  outPath: string | null;
  batchSize: number;
  chunkSize: number;
  catalogMapFile: string | null;
};

type StockSummary = {
  totalRows: number;
  uniqueSkus: number;
  updated: number;
  duplicates: number;
  invalidSku: number;
  invalidStock: number;
  missingSkus: string[];
  dryRun: boolean;
  matchedBySku: number;
  matchedByCatalog: number;
};

type UpdateEntry = {
  id: string;
  stock: number;
};

const DEFAULT_FILE = 'stanje/stanje201.csv';
const DEFAULT_BATCH_SIZE = 200;
const DEFAULT_CHUNK_SIZE = 1000;
const DEFAULT_CATALOG_MAP = 'proizvodi-csv/proizvodi-2.csv';

function parseCli(): CliOptions {
  const args = process.argv.slice(2);
  const opts: CliOptions = {
    file: DEFAULT_FILE,
    dryRun: false,
    outPath: null,
    batchSize: DEFAULT_BATCH_SIZE,
    chunkSize: DEFAULT_CHUNK_SIZE,
    catalogMapFile: DEFAULT_CATALOG_MAP,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--file' && args[i + 1]) {
      opts.file = args[++i];
    } else if (arg === '--dry-run') {
      opts.dryRun = true;
    } else if (arg === '--out' && args[i + 1]) {
      opts.outPath = args[++i];
    } else if (arg === '--batch-size' && args[i + 1]) {
      const parsed = Number(args[++i]);
      if (!Number.isNaN(parsed) && parsed > 0) opts.batchSize = parsed;
    } else if (arg === '--chunk-size' && args[i + 1]) {
      const parsed = Number(args[++i]);
      if (!Number.isNaN(parsed) && parsed > 0) opts.chunkSize = parsed;
    } else if (arg === '--map-file' && args[i + 1]) {
      opts.catalogMapFile = args[++i];
    } else if (arg === '--no-map-file') {
      opts.catalogMapFile = null;
    }
  }

  return opts;
}

function resolvePath(file: string): string {
  return path.isAbsolute(file) ? file : path.join(process.cwd(), file);
}

function parseStockValue(raw: unknown): number | null {
  if (raw === undefined || raw === null) return null;
  const str = String(raw).trim();
  if (!str) return null;
  const normalized = str.replace(/\./g, '').replace(/,/g, '.');
  const num = Number(normalized);
  if (!Number.isFinite(num)) return null;
  return Math.round(num);
}

function normalizeSku(row: Record<string, unknown>): string | null {
  const possibleKeys = ['sifart', 'SIFART', 'sifArt', 'Sifart'];
  for (const key of possibleKeys) {
    const value = row[key];
    if (value !== undefined && value !== null) {
      const sku = String(value).trim();
      if (sku) return sku;
    }
  }
  return null;
}

function extractStockValue(row: Record<string, unknown>): number | null {
  const possibleKeys = ['stanje0', 'STANJE0', 'stanje', 'STANJE'];
  for (const key of possibleKeys) {
    if (row[key] !== undefined) {
      return parseStockValue(row[key]);
    }
  }
  return null;
}

function sanitizeRow(row: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
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

function readCsv(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf8');
  const parsed = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    delimiter: ';',
  }) as Record<string, unknown>[];

  return parsed.map(sanitizeRow);
}

function buildCatalogMap(filePath: string): Map<string, string> {
  const map = new Map<string, string>();
  if (!filePath) return map;
  const fullPath = resolvePath(filePath);
  if (!fs.existsSync(fullPath)) {
    console.warn(`Catalog map file not found: ${fullPath}`);
    return map;
  }
  try {
    const rows = readCsv(fullPath);
    for (const row of rows) {
      const sku = normalizeSku(row);
      const catalog = row['katbro'] ?? row['KATBRO'] ?? row['catalogNumber'] ?? row['CATALOGNUMBER'];
      if (!sku || catalog === undefined || catalog === null) continue;
      const catalogNumber = String(catalog).trim();
      if (!catalogNumber) continue;
      if (!map.has(sku)) {
        map.set(sku, catalogNumber);
      }
    }
  } catch (err) {
    console.error(`Failed to build catalog map from ${fullPath}:`, err);
  }
  console.log(`Catalog map entries loaded: ${map.size}`);
  return map;
}

async function flushUpdates(batch: UpdateEntry[], dryRun: boolean) {
  if (!batch.length) return;
  if (dryRun) return;
  await db.$transaction(
    batch.map((entry) => db.product.update({ where: { id: entry.id }, data: { stock: entry.stock } })),
  );
}

async function main() {
  const opts = parseCli();
  const fullPath = resolvePath(opts.file);

  if (!fs.existsSync(fullPath)) {
    console.error(`CSV file not found: ${fullPath}`);
    process.exit(1);
  }

  console.log(`Loading stock CSV: ${fullPath}`);
  const rows = readCsv(fullPath);
  console.log(`Parsed ${rows.length} rows.`);

  const stockMap = new Map<string, number>();
  let invalidSku = 0;
  let invalidStock = 0;
  let duplicates = 0;

  for (const row of rows) {
    const sku = normalizeSku(row);
    if (!sku) {
      invalidSku++;
      continue;
    }

    const stock = extractStockValue(row);
    if (stock === null) {
      invalidStock++;
      continue;
    }

    if (stockMap.has(sku)) {
      duplicates++;
    }
    stockMap.set(sku, stock);
  }

  console.log(`Unique SKUs extracted: ${stockMap.size}`);

  const summary: StockSummary = {
    totalRows: rows.length,
    uniqueSkus: stockMap.size,
    updated: 0,
    duplicates,
    invalidSku,
    invalidStock,
    missingSkus: [],
    dryRun: opts.dryRun,
    matchedBySku: 0,
    matchedByCatalog: 0,
  };

  const skuList = Array.from(stockMap.keys());
  const updatesBatch: UpdateEntry[] = [];
  const catalogMap = opts.catalogMapFile ? buildCatalogMap(opts.catalogMapFile) : new Map<string, string>();

  for (let i = 0; i < skuList.length; i += opts.chunkSize) {
    const skuChunk = skuList.slice(i, i + opts.chunkSize);
    const products = await db.product.findMany({
      where: { sku: { in: skuChunk } },
      select: { id: true, sku: true },
    });
    const foundMap = new Map(products.map((p) => [p.sku, p.id] as const));

    const remainingSkus: string[] = [];

    for (const sku of skuChunk) {
      const productId = foundMap.get(sku);
      if (!productId) {
        remainingSkus.push(sku);
        continue;
      }

      const stock = stockMap.get(sku)!;
      updatesBatch.push({ id: productId, stock });
      summary.matchedBySku++;
      if (updatesBatch.length >= opts.batchSize) {
        await flushUpdates(updatesBatch, opts.dryRun);
        summary.updated += updatesBatch.length;
        updatesBatch.length = 0;
      }
    }

    if (remainingSkus.length && catalogMap.size) {
      const catalogNumbers = remainingSkus
        .map((sku) => catalogMap.get(sku))
        .filter((catalog): catalog is string => Boolean(catalog));

      if (catalogNumbers.length) {
        const productsByCatalog = await db.product.findMany({
          where: { catalogNumber: { in: catalogNumbers } },
          select: { id: true, catalogNumber: true },
        });
        const catalogToId = new Map(productsByCatalog.map((p) => [p.catalogNumber, p.id] as const));

        for (const sku of remainingSkus) {
          const catalogNumber = catalogMap.get(sku);
          if (!catalogNumber) continue;
          const productId = catalogToId.get(catalogNumber);
          if (!productId) continue;

          const stock = stockMap.get(sku)!;
          updatesBatch.push({ id: productId, stock });
          summary.matchedByCatalog++;
          if (updatesBatch.length >= opts.batchSize) {
            await flushUpdates(updatesBatch, opts.dryRun);
            summary.updated += updatesBatch.length;
            updatesBatch.length = 0;
          }
        }

        const matchedCatalogSet = new Set(productsByCatalog.map((p) => p.catalogNumber));
        for (const sku of remainingSkus) {
          const catalogNumber = catalogMap.get(sku);
          if (!catalogNumber || !matchedCatalogSet.has(catalogNumber)) {
            summary.missingSkus.push(sku);
          }
        }
      } else {
        summary.missingSkus.push(...remainingSkus);
      }
    } else {
      summary.missingSkus.push(...remainingSkus);
    }
  }

  if (updatesBatch.length) {
    await flushUpdates(updatesBatch, opts.dryRun);
    summary.updated += updatesBatch.length;
    updatesBatch.length = 0;
  }

  if (summary.dryRun) {
    console.log(`DRY RUN: ${summary.updated} updates would be applied.`);
  } else {
    console.log(`Applied ${summary.updated} stock updates.`);
  }

  if (summary.missingSkus.length) {
    console.warn(`Missing products for ${summary.missingSkus.length} SKUs.`);
  }

  if (opts.outPath) {
    const outFullPath = resolvePath(opts.outPath);
    const outDir = path.dirname(outFullPath);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }
    fs.writeFileSync(outFullPath, JSON.stringify(summary, null, 2));
    console.log(`Summary written to ${outFullPath}`);
  } else {
    console.log(
      JSON.stringify(
        {
          totalRows: summary.totalRows,
          uniqueSkus: summary.uniqueSkus,
          updated: summary.updated,
          duplicates: summary.duplicates,
          invalidSku: summary.invalidSku,
          invalidStock: summary.invalidStock,
          missingSkus: summary.missingSkus.slice(0, 20),
          missingCount: summary.missingSkus.length,
          matchedBySku: summary.matchedBySku,
          matchedByCatalog: summary.matchedByCatalog,
          dryRun: summary.dryRun,
        },
        null,
        2,
      ),
    );
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
