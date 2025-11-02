import fs from 'fs';
import path from 'path';
import process from 'process';
import { db } from '../src/lib/db';

type CliOptions = {
  imagesDir: string;
  dryRun: boolean;
  batchSize: number;
  limit?: number;
  verbose: boolean;
};

type ImageEntry = {
  filename: string;
  publicPath: string;
  absolutePath: string;
};

type Candidate = {
  token: string;
  source: 'product-oem' | 'crossref';
  entry: ImageEntry;
};

type Summary = {
  totalProducts: number;
  processedProducts: number;
  productsWithTokens: number;
  withoutTokens: number;
  matchesFound: number;
  matchedFromCrossRef: number;
  alreadySet: number;
  updated: number;
  skippedNoImage: number;
  duplicateImageKeys: number;
  dryRun: boolean;
};

const DEFAULTS: CliOptions = {
  imagesDir: 'public/images/products_pictures',
  dryRun: true,
  batchSize: 250,
  limit: undefined,
  verbose: false,
};

function parseCli(): CliOptions {
  const args = process.argv.slice(2);
  const opts: CliOptions = { ...DEFAULTS };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--dir' && args[i + 1]) {
      opts.imagesDir = args[++i];
    } else if (arg === '--apply' || arg === '--no-dry-run') {
      opts.dryRun = false;
    } else if (arg === '--dry-run') {
      opts.dryRun = true;
    } else if (arg === '--batch' && args[i + 1]) {
      const parsed = Number(args[++i]);
      if (!Number.isNaN(parsed) && parsed > 0) {
        opts.batchSize = parsed;
      }
    } else if (arg === '--limit' && args[i + 1]) {
      const parsed = Number(args[++i]);
      if (!Number.isNaN(parsed) && parsed > 0) {
        opts.limit = parsed;
      }
    } else if (arg === '--verbose' || arg === '-v') {
      opts.verbose = true;
    }
  }

  return opts;
}

function normalizeToken(value: string | null | undefined): string {
  if (!value) return '';
  return value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

function splitOemField(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[\s,;|\\/]+/)
    .map((part) => normalizeToken(part))
    .filter((part) => part.length > 0);
}

function loadImageMap(imagesDir: string) {
  if (!fs.existsSync(imagesDir)) {
    throw new Error(`Images directory not found: ${imagesDir}`);
  }

  const entries = fs.readdirSync(imagesDir, { withFileTypes: true });
  const buckets = new Map<string, ImageEntry[]>();

  for (const entry of entries) {
    if (!entry.isFile()) continue;

    const ext = path.extname(entry.name).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) continue;

    const baseName = path.basename(entry.name, ext);
    const token = normalizeToken(baseName);
    if (!token) continue;

    const info: ImageEntry = {
      filename: entry.name,
      publicPath: `/images/products_pictures/${entry.name}`,
      absolutePath: path.join(imagesDir, entry.name),
    };

    const bucket = buckets.get(token);
    if (bucket) {
      bucket.push(info);
    } else {
      buckets.set(token, [info]);
    }
  }

  const uniqueMap = new Map<string, ImageEntry>();
  const duplicates: Record<string, ImageEntry[]> = {};

  for (const [token, list] of buckets.entries()) {
    if (!list.length) continue;
    uniqueMap.set(token, list[0]);
    if (list.length > 1) {
      duplicates[token] = list;
    }
  }

  return {
    imageMap: uniqueMap,
    duplicates,
  };
}

async function flushUpdates(updates: { id: string; imageUrl: string }[], dryRun: boolean) {
  if (!updates.length) return 0;
  if (dryRun) return updates.length;

  await db.$transaction(
    updates.map((item) =>
      db.product.update({
        where: { id: item.id },
        data: { imageUrl: item.imageUrl },
      })
    )
  );

  return updates.length;
}

async function main() {
  const opts = parseCli();
  const imagesDir = path.isAbsolute(opts.imagesDir)
    ? opts.imagesDir
    : path.resolve(process.cwd(), opts.imagesDir);

  console.log(`Linking product images from: ${imagesDir}`);
  console.log(`Mode: ${opts.dryRun ? 'DRY-RUN (no db writes)' : 'APPLY (will update imageUrl)'}`);

  const { imageMap, duplicates } = loadImageMap(imagesDir);
  const summary: Summary = {
    totalProducts: 0,
    processedProducts: 0,
    productsWithTokens: 0,
    withoutTokens: 0,
    matchesFound: 0,
    matchedFromCrossRef: 0,
    alreadySet: 0,
    updated: 0,
    skippedNoImage: 0,
    duplicateImageKeys: Object.keys(duplicates).length,
    dryRun: opts.dryRun,
  };

  if (summary.duplicateImageKeys > 0) {
    console.warn(
      `Warning: found ${summary.duplicateImageKeys} duplicate image keys (same normalized name with multiple files). First file will be used.`
    );
    if (opts.verbose) {
      for (const [token, files] of Object.entries(duplicates)) {
        console.warn(`  Token ${token} -> files: ${files.map((f) => f.filename).join(', ')}`);
      }
    }
  }

  const updates: { id: string; imageUrl: string }[] = [];
  const batchSize = Math.max(1, opts.batchSize);
  const take = Math.min(batchSize, 500);

  let processed = 0;
  let cursor: string | undefined;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const products = await db.product.findMany({
      select: {
        id: true,
        name: true,
        oemNumber: true,
        imageUrl: true,
        originalReferences: {
          select: {
            referenceType: true,
            referenceNumber: true,
          },
        },
      },
      orderBy: { id: 'asc' },
      take,
      ...(cursor
        ? {
            skip: 1,
            cursor: { id: cursor },
          }
        : {}),
    });

    if (!products.length) break;

    for (const product of products) {
      summary.totalProducts += 1;
      processed += 1;

      if (opts.limit && processed > opts.limit) {
        console.log(`Limit reached (${opts.limit}). Stopping early.`);
        break;
      }

      const tokenCandidates: Candidate[] = [];
      const tokensSeen = new Set<string>();

      const productTokens = splitOemField(product.oemNumber);
      for (const token of productTokens) {
        if (!token || tokensSeen.has(token)) continue;
        tokensSeen.add(token);
        const entry = imageMap.get(token);
        if (entry) {
          tokenCandidates.push({ token, source: 'product-oem', entry });
        }
      }

      const crossRefTokens: string[] = [];
      for (const ref of product.originalReferences || []) {
        if (ref.referenceType?.toUpperCase() !== 'OEM') continue;
        const parts = splitOemField(ref.referenceNumber);
        for (const token of parts) {
          if (!token || tokensSeen.has(token)) continue;
          tokensSeen.add(token);
          const entry = imageMap.get(token);
          if (entry) {
            crossRefTokens.push(token);
            tokenCandidates.push({ token, source: 'crossref', entry });
          }
        }
      }

      if (tokensSeen.size > 0) {
        summary.productsWithTokens += 1;
      } else {
        summary.withoutTokens += 1;
      }

      if (!tokenCandidates.length) {
        if (tokensSeen.size > 0) {
          summary.skippedNoImage += 1;
        }
        continue;
      }

      summary.matchesFound += 1;

      const preferred = tokenCandidates.find((c) => c.source === 'product-oem') || tokenCandidates[0];
      if (preferred.source === 'crossref') {
        summary.matchedFromCrossRef += 1;
      }

      const newImageUrl = preferred.entry.publicPath;
      if (product.imageUrl && product.imageUrl === newImageUrl) {
        summary.alreadySet += 1;
        continue;
      }

      updates.push({ id: product.id, imageUrl: newImageUrl });

      if (updates.length >= 25) {
        const applied = await flushUpdates(updates.splice(0, updates.length), opts.dryRun);
        summary.updated += applied;
      }

      if (opts.verbose) {
        console.log(
          `${opts.dryRun ? '[dry-run] ' : ''}Product ${product.id} (${product.name}) -> ${newImageUrl} via token ${preferred.token} (${preferred.source})`
        );
      }
    }

    if (opts.limit && processed >= (opts.limit ?? 0)) {
      break;
    }

    cursor = products[products.length - 1]?.id;
    if (!cursor) break;
  }

  if (updates.length) {
    const applied = await flushUpdates(updates, opts.dryRun);
    summary.updated += applied;
  }

  summary.processedProducts = processed;

  console.log(
    JSON.stringify(
      {
        totalProducts: summary.totalProducts,
        processed: summary.processedProducts,
        productsWithTokens: summary.productsWithTokens,
        withoutTokens: summary.withoutTokens,
        matchesFound: summary.matchesFound,
        matchedFromCrossRef: summary.matchedFromCrossRef,
        alreadySet: summary.alreadySet,
        updated: summary.updated,
        skippedNoImage: summary.skippedNoImage,
        duplicateImageKeys: summary.duplicateImageKeys,
        dryRun: summary.dryRun,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
