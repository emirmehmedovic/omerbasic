import { readFileSync } from 'fs';
import path from 'path';
import process from 'process';
import { db } from '../src/lib/db';
import { slugify } from '../src/lib/utils';

const DRY_PREFIX = '__dry__:';

type BatchFile = {
  results?: TempPart[];
};

type TempPart = {
  part_number: string;
  found?: boolean;
  article_count?: number;
  articles?: TempArticle[];
};

type TempArticle = {
  article_id: number;
  article_number?: string | null;
  supplier_name?: string | null;
  has_image?: boolean;
  image_url?: string | null;
  compatible_engines?: TempCompatibleEngine[];
};

type TempCompatibleEngine = {
  engine_id?: number | string | null;
  model_id?: number | string | null;
  manufacturer?: string | null;
  engine_name?: string | null;
  year_from?: string | null;
  year_to?: string | null;
};

type ScriptOptions = {
  dryRun: boolean;
  limitParts?: number;
  limitEngines?: number;
};

type Stats = {
  partsProcessed: number;
  fitmentsCreated: number;
  fitmentsUpdated: number;
  productsUpdated: number;
};

type ManufacturerCacheEntry = {
  id: string;
  name: string;
};

function parseArgs(argv: string[]): { filePath: string; options: ScriptOptions } {
  if (argv.length === 0) {
    console.error('Usage: tsx scripts/link-products-from-temp.ts <path-to-temp-json> [--dry-run] [--limit-parts=N] [--limit-engines=N]');
    process.exit(1);
  }

  const filePath = argv[0];
  const options: ScriptOptions = { dryRun: false };

  for (const arg of argv.slice(1)) {
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg.startsWith('--limit-parts=')) {
      options.limitParts = Number(arg.split('=')[1]);
    } else if (arg.startsWith('--limit-engines=')) {
      options.limitEngines = Number(arg.split('=')[1]);
    }
  }

  return { filePath, options };
}

function readBatch(filePath: string): TempPart[] {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  const raw = readFileSync(absolutePath, 'utf8');
  const parsed = JSON.parse(raw) as BatchFile;
  if (!Array.isArray(parsed.results)) {
    throw new Error('Batch file missing results array');
  }
  return parsed.results;
}

function normalizeKey(value?: string | number | null): string | null {
  if (value == null) return null;
  return String(value).trim();
}

function normalizeName(value?: string | null): string {
  return (value ?? '').trim();
}

function normalizeLabel(value?: string | null): string {
  return (value ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function stripDiacritics(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

function parseYear(value?: string | null): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const year = Number(trimmed.slice(0, 4));
  return Number.isNaN(year) ? null : year;
}

const manufacturerCache = new Map<string, ManufacturerCacheEntry | null>();

async function ensureManufacturer(name: string, dryRun: boolean): Promise<ManufacturerCacheEntry | null> {
  const normalized = normalizeLabel(name);
  if (!normalized) return null;
  if (manufacturerCache.has(normalized)) {
    return manufacturerCache.get(normalized) ?? null;
  }

  const existing = await db.manufacturer.findFirst({
    where: {
      name: { equals: name, mode: 'insensitive' },
    },
  });

  if (existing) {
    const entry = { id: existing.id, name: existing.name };
    manufacturerCache.set(normalized, entry);
    return entry;
  }

  if (dryRun) {
    console.log(`[dry-run] Would create manufacturer: ${name}`);
    const entry = { id: `${DRY_PREFIX}manufacturer:${slugify(name)}`, name };
    manufacturerCache.set(normalized, entry);
    return entry;
  }

  let baseSlug = slugify(name);
  if (!baseSlug) {
    baseSlug = `manufacturer-${Date.now()}`;
  }
  let slug = baseSlug;
  let suffix = 1;
  while (await db.manufacturer.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${suffix++}`;
  }

  const created = await db.manufacturer.create({
    data: {
      name,
      slug,
    },
  });
  console.log(`Created manufacturer: ${name}`);
  const entry = { id: created.id, name: created.name };
  manufacturerCache.set(normalized, entry);
  return entry;
}

type EngineWithGeneration = {
  id: string;
  externalId: string | null;
  generation: {
    id: string;
    model: {
      id: string;
      externalId: string | null;
    } | null;
  } | null;
};

const engineCache = new Map<string, EngineWithGeneration | null>();

async function findEngine(engineExternalId: string, modelExternalId: string | null) {
  const cacheKey = `${engineExternalId}|${modelExternalId ?? 'any'}`;
  if (engineCache.has(cacheKey)) {
    return engineCache.get(cacheKey) ?? null;
  }

  const engines = (await db.vehicleEngine.findMany({
    where: { externalId: engineExternalId },
    include: {
      generation: {
        include: {
          model: true,
        },
      },
    },
  })) as unknown as EngineWithGeneration[];

  if (engines.length === 0) {
    engineCache.set(cacheKey, null);
    return null;
  }

  let match = engines.find((engine) => {
    const modelExternal = normalizeKey(engine.generation?.model?.externalId);
    return modelExternal && modelExternal === modelExternalId;
  });

  if (!match && engines.length === 1) {
    match = engines[0];
  }

  engineCache.set(cacheKey, match ?? null);
  return match ?? null;
}

async function upsertFitment(
  input: {
    productId: string;
    generationId: string;
    engineId?: string | null;
    yearFrom?: number | null;
    yearTo?: number | null;
    externalVehicleId?: string | null;
    externalModelId?: string | null;
    externalManufacturer?: string | null;
    externalEngineName?: string | null;
  },
  dryRun: boolean,
): Promise<'created' | 'updated' | 'skipped'> {
  const {
    productId,
    generationId,
    engineId = null,
    yearFrom = null,
    yearTo = null,
    externalVehicleId = null,
    externalModelId = null,
    externalManufacturer = null,
    externalEngineName = null,
  } = input;

  const existing = await db.productVehicleFitment.findFirst({
    where: {
      productId,
      generationId,
      engineId,
      externalVehicleId,
    },
  });

  const data = {
    productId,
    generationId,
    engineId,
    yearFrom,
    yearTo,
    externalVehicleId,
    externalModelId,
    externalManufacturer,
    externalEngineName,
  } as const;

  if (!existing) {
    if (dryRun) {
      console.log(
        `[dry-run] Would create fitment for product ${productId} → generation ${generationId} (engine ${externalVehicleId ?? 'unknown'})`,
      );
      return 'created';
    }
    await db.productVehicleFitment.create({ data });
    return 'created';
  }

  const updates: Record<string, unknown> = {};
  if (existing.yearFrom !== yearFrom) updates.yearFrom = yearFrom;
  if (existing.yearTo !== yearTo) updates.yearTo = yearTo;
  if (existing.externalModelId !== externalModelId) updates.externalModelId = externalModelId;
  if (existing.externalManufacturer !== externalManufacturer) updates.externalManufacturer = externalManufacturer;
  if (existing.externalEngineName !== externalEngineName) updates.externalEngineName = externalEngineName;

  if (Object.keys(updates).length === 0) {
    return 'skipped';
  }

  if (dryRun) {
    console.log(`[dry-run] Would update fitment ${existing.id}:`, updates);
    return 'updated';
  }

  await db.productVehicleFitment.update({ where: { id: existing.id }, data: updates });
  return 'updated';
}

async function processArticle(
  productId: string,
  article: TempArticle,
  options: ScriptOptions,
  stats: Stats,
): Promise<void> {
  const engines = article.compatible_engines ?? [];
  if (engines.length === 0) {
    console.warn('No compatible engines listed for article');
    return;
  }

  let processedEngines = 0;

  for (const engineInfo of engines) {
    if (options.limitEngines && processedEngines >= options.limitEngines) break;

    const engineExternalId = normalizeKey(engineInfo.engine_id);
    if (!engineExternalId) {
      console.warn('Engine entry missing engine_id, skipping');
      continue;
    }

    const modelExternalId = normalizeKey(engineInfo.model_id);
    if (!modelExternalId) {
      console.warn(`Engine ${engineExternalId} missing model_id, skipping`);
      continue;
    }

    const engine = await findEngine(engineExternalId, modelExternalId);
    if (!engine) {
      console.warn(`Engine with externalId ${engineExternalId} (model ${modelExternalId}) not found in DB`);
      continue;
    }

    const generation = engine.generation;
    if (!generation) {
      console.warn(`Engine ${engine.id} missing generation relation, skipping`);
      continue;
    }

    const model = generation.model;
    if (!model) {
      console.warn(`Generation ${generation.id} missing model relation, skipping`);
      continue;
    }

    const generationId = generation.id;
    const engineId = engine.id;

    const yearFrom = parseYear(engineInfo.year_from);
    const yearTo = parseYear(engineInfo.year_to);

    const status = await upsertFitment(
      {
        productId,
        generationId,
        engineId,
        yearFrom,
        yearTo,
        externalVehicleId: engineExternalId,
        externalModelId: modelExternalId,
        externalManufacturer: normalizeName(engineInfo.manufacturer),
        externalEngineName: normalizeName(engineInfo.engine_name),
      },
      options.dryRun,
    );

    if (status === 'created') stats.fitmentsCreated += 1;
    if (status === 'updated') stats.fitmentsUpdated += 1;
    processedEngines += 1;
  }
}

async function main() {
  const { filePath, options } = parseArgs(process.argv.slice(2));
  const parts = readBatch(filePath);
  const partsToProcess = typeof options.limitParts === 'number' ? parts.slice(0, options.limitParts) : parts;

  console.log(`Linking ${partsToProcess.length} parts from ${filePath}${options.dryRun ? ' (dry-run)' : ''}`);

  const stats: Stats = {
    partsProcessed: 0,
    fitmentsCreated: 0,
    fitmentsUpdated: 0,
    productsUpdated: 0,
  };

  for (const part of partsToProcess) {
    stats.partsProcessed += 1;

    if (part.found === false) {
      console.warn(`Skipping part ${part.part_number}: not found`);
      continue;
    }

    const articles = part.articles ?? [];
    if (articles.length === 0) {
      console.warn(`No articles for part ${part.part_number}`);
      continue;
    }

    for (const article of articles) {
      const articleNumber = normalizeKey(article.article_number);
      if (!articleNumber) {
        console.warn(`Article in part ${part.part_number} missing article_number`);
        continue;
      }

      const product = await db.product.findUnique({ where: { catalogNumber: articleNumber } });
      if (!product) {
        console.warn(`Product with catalogNumber ${articleNumber} not found, skipping.`);
        continue;
      }

      const supplierName = normalizeName(article.supplier_name);
      if (supplierName && !product.manufacturerId) {
        const manufacturer = await ensureManufacturer(supplierName, options.dryRun);
        if (manufacturer && !options.dryRun) {
          await db.product.update({
            where: { id: product.id },
            data: { manufacturerId: manufacturer.id },
          });
          stats.productsUpdated += 1;
          console.log(`Set manufacturer for product ${product.catalogNumber} → ${manufacturer.name}`);
        } else if (manufacturer && options.dryRun) {
          console.log(`[dry-run] Would set manufacturer ${manufacturer.name} for product ${product.catalogNumber}`);
        }
      }

      const shouldUpdateImage = article.has_image && article.image_url && (!product.imageUrl || product.imageUrl.includes('placehold'));
      if (shouldUpdateImage) {
        if (options.dryRun) {
          console.log(`[dry-run] Would set image for product ${product.catalogNumber} → ${article.image_url}`);
        } else {
          await db.product.update({
            where: { id: product.id },
            data: { imageUrl: article.image_url },
          });
          stats.productsUpdated += 1;
          console.log(`Updated image for product ${product.catalogNumber}`);
        }
      }

      await processArticle(product.id, article, options, stats);
    }
  }

  console.log('--- Summary ---');
  console.log(`Parts processed: ${stats.partsProcessed}`);
  console.log(`Fitments created: ${stats.fitmentsCreated}`);
  console.log(`Fitments updated: ${stats.fitmentsUpdated}`);
  console.log(`Products updated: ${stats.productsUpdated}`);
}

main()
  .catch((error) => {
    console.error('Error linking products:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
