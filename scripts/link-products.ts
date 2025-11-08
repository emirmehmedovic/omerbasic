import { readFileSync } from 'fs';
import path from 'path';
import process from 'process';
import { db } from '../src/lib/db';
import { slugify } from '../src/lib/utils';

type Catalog = {
  metadata?: Record<string, unknown>;
  parts?: CatalogPart[];
};

type CatalogPart = {
  part_number: string;
  search_timestamp?: string;
  found?: boolean;
  articles?: CatalogArticle[];
  compatible_vehicles?: CatalogCompatibleVehicles[];
};

type CatalogArticle = {
  articleId: number;
  articleNo: string;
  articleProductName?: string;
  supplierName?: string;
  supplierId?: number;
  articleMediaType?: string | null;
  articleMediaFileName?: string | null;
  s3image?: string | null;
};

type CatalogCompatibleVehicles = {
  articleId: number;
  articleNo: string;
  articleProductName?: string;
  supplierName?: string;
  supplierId?: number;
  compatibleCars?: CatalogCompatibleCar[];
};

type CatalogCompatibleCar = {
  vehicleId?: number;
  modelId?: number;
  manufacturerName?: string;
  modelName?: string;
  typeEngineName?: string | null;
  constructionIntervalStart?: string | null;
  constructionIntervalEnd?: string | null;
};

type ScriptOptions = {
  dryRun: boolean;
  limitParts?: number;
  limitVehicles?: number;
};

type FitmentInput = {
  productId: string;
  generationId: string;
  engineId?: string | null;
  yearFrom?: number | null;
  yearTo?: number | null;
  externalVehicleId?: string | null;
  externalModelId?: string | null;
  externalManufacturer?: string | null;
  externalEngineName?: string | null;
};

const DRY_PREFIX = '__dry__:';

function parseArgs(argv: string[]): { filePath: string; options: ScriptOptions } {
  if (argv.length === 0) {
    console.error('Usage: tsx scripts/link-products.ts <path-to-json> [--dry-run] [--limit-parts=N] [--limit-vehicles=N]');
    process.exit(1);
  }

  const filePath = argv[0];
  const options: ScriptOptions = { dryRun: false };

  for (const arg of argv.slice(1)) {
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg.startsWith('--limit-parts=')) {
      options.limitParts = Number(arg.split('=')[1]);
    } else if (arg.startsWith('--limit-vehicles=')) {
      options.limitVehicles = Number(arg.split('=')[1]);
    }
  }

  return { filePath, options };
}

function readCatalog(filePath: string): CatalogPart[] {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  const content = readFileSync(absolutePath, 'utf8');
  const parsed = JSON.parse(content) as Catalog;
  if (!Array.isArray(parsed.parts)) {
    throw new Error('JSON file does not contain a parts array');
  }
  return parsed.parts;
}

function normalizeName(value?: string | null): string {
  return (value ?? '').trim();
}

function normalizeKey(value?: string | number | null): string | null {
  if (value == null) return null;
  return String(value).trim();
}

function parseYear(value?: string | null): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const year = Number(trimmed.slice(0, 4));
  return Number.isNaN(year) ? null : year;
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

function isImageArticle(article: CatalogArticle): boolean {
  return Boolean(article.s3image && (article.articleMediaType ?? '').toLowerCase() === 'jpeg');
}

type ManufacturerCacheEntry = {
  id: string;
  name: string;
};

const BRAND_ALIASES: Record<string, string> = {
  vw: 'Volkswagen',
  volkswagen: 'Volkswagen',
  vag: 'Volkswagen',
  mercedes: 'Mercedes-Benz',
  'mercedes-benz': 'Mercedes-Benz',
  'mercedes-benz-ag': 'Mercedes-Benz',
  'mercedes-benz-group': 'Mercedes-Benz',
  'mercedes-benz-cars': 'Mercedes-Benz',
  'mercedes-benz-aktiengesellschaft': 'Mercedes-Benz',
  'mercedes-benz-croatia': 'Mercedes-Benz',
  'mercedes-benz-buses': 'Mercedes-Benz',
  'mercedes-benz-vans': 'Mercedes-Benz',
  'mercedes-benz-trucks': 'Mercedes-Benz',
  'mercedes-benz-do-brasil': 'Mercedes-Benz',
  daimler: 'Mercedes-Benz',
  'daimler-benz': 'Mercedes-Benz',
  'daimler-ag': 'Mercedes-Benz',
  vauxhall: 'Opel',
  'vauxhall-motors': 'Opel',
  citroen: 'Citroën',
  'citroen-automobiles': 'Citroën',
  'citroen-sa': 'Citroën',
  bmw: 'BMW',
};

function resolveBrandAlias(name: string): string {
  const slug = slugify(name);
  const alias = BRAND_ALIASES[slug];
  if (alias) return alias;
  return name;
}

const manufacturerCache = new Map<string, ManufacturerCacheEntry | null>();
const brandCache = new Map<string, Awaited<ReturnType<typeof db.vehicleBrand.findFirst>> | null>();
const modelCache = new Map<string, Awaited<ReturnType<typeof db.vehicleModel.findFirst>> | null>();
const generationCache = new Map<string, Awaited<ReturnType<typeof db.vehicleGeneration.findFirst>> | null>();
const engineCache = new Map<string, Awaited<ReturnType<typeof db.vehicleEngine.findMany>> | null>();

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
  // Ensure slug uniqueness
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

async function findBrandId(manufacturerName?: string | null): Promise<string | null> {
  const originalName = normalizeName(manufacturerName);
  const name = resolveBrandAlias(originalName);
  if (!name) return null;
  const key = normalizeLabel(name);
  if (brandCache.has(key)) {
    return brandCache.get(key)?.id ?? null;
  }

  const candidateNames = new Set<string>();
  const registerCandidate = (value?: string | null) => {
    const trimmed = (value ?? '').trim();
    if (!trimmed) return;

    const variants = new Set<string>([trimmed]);
    variants.add(stripDiacritics(trimmed));

    const hyphenToSpace = trimmed.replace(/[-–—]+/g, ' ');
    variants.add(hyphenToSpace);
    variants.add(stripDiacritics(hyphenToSpace));

    const spaceToHyphen = trimmed.replace(/\s+/g, '-');
    variants.add(spaceToHyphen);
    variants.add(stripDiacritics(spaceToHyphen));

    const collapsed = trimmed.replace(/[-–—\s]+/g, '');
    variants.add(collapsed);
    variants.add(stripDiacritics(collapsed));

    for (const variant of variants) {
      const normalizedVariant = variant.trim();
      if (normalizedVariant) {
        candidateNames.add(normalizedVariant);
      }
    }
  };

  registerCandidate(name);
  if (originalName && originalName !== name) {
    registerCandidate(originalName);
  }

  const candidates = Array.from(candidateNames);

  const nameFilters = candidates.map((value) => ({
    name: {
      equals: value,
      mode: 'insensitive' as const,
    },
  }));

  const externalIdFilters = candidates.map((value) => ({ externalId: value }));

  const brand = await db.vehicleBrand.findFirst({
    where: {
      OR: [...nameFilters, ...externalIdFilters],
    },
  });

  brandCache.set(key, brand ?? null);
  return brand?.id ?? null;
}

async function findModel(brandId: string, modelId?: number) {
  const externalId = normalizeKey(modelId);
  const modelKey = `${brandId}:${externalId ?? 'null'}`;
  if (modelCache.has(modelKey)) {
    return modelCache.get(modelKey) ?? null;
  }

  if (!externalId) {
    modelCache.set(modelKey, null);
    return null;
  }

  const model = await db.vehicleModel.findFirst({
    where: {
      brandId,
      externalId,
    },
  });

  modelCache.set(modelKey, model ?? null);
  return model ?? null;
}

async function findGeneration(modelId: string) {
  if (generationCache.has(modelId)) {
    return generationCache.get(modelId) ?? null;
  }

  const generation = await db.vehicleGeneration.findFirst({
    where: { modelId },
    orderBy: { createdAt: 'asc' },
  });

  generationCache.set(modelId, generation ?? null);
  return generation ?? null;
}

async function findEngine(generationId: string, engineExternalId?: string | number | null, engineName?: string | null) {
  const normalizedExternalId = normalizeKey(engineExternalId);
  const normalizedName = normalizeLabel(engineName);

  if (!engineCache.has(generationId)) {
    const engines = await db.vehicleEngine.findMany({ where: { generationId } });
    engineCache.set(generationId, engines);
  }

  const engines = engineCache.get(generationId) ?? [];
  if (engines.length === 0) return null;

  if (normalizedExternalId) {
    const match = engines.find((engine) => normalizeKey(engine.externalId) === normalizedExternalId);
    if (match) {
      return match;
    }
  }

  if (normalizedName) {
    for (const engine of engines) {
      const desc = normalizeLabel(engine.description);
      if (desc && desc === normalizedName) {
        return engine;
      }
    }

    for (const engine of engines) {
      const code = normalizeLabel(engine.engineCode);
      if (code && normalizedName.includes(code)) {
        return engine;
      }
      if (Array.isArray(engine.engineCodes)) {
        for (const c of engine.engineCodes) {
          const normalizedCode = normalizeLabel(c);
          if (normalizedCode && normalizedName.includes(normalizedCode)) {
            return engine;
          }
        }
      }
    }
  }

  return null;
}

async function upsertFitment(input: FitmentInput, dryRun: boolean): Promise<'created' | 'updated' | 'skipped'> {
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
      console.log(`[dry-run] Would create fitment for product ${productId} → generation ${generationId} (vehicle ${externalVehicleId ?? 'unknown'})`);
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

async function processPart(part: CatalogPart, options: ScriptOptions, stats: Stats): Promise<void> {
  if (!part.found) {
    console.warn(`Skipping part ${part.part_number}: not found in TecDoc response`);
    return;
  }

  const articles = part.articles ?? [];
  if (articles.length === 0) {
    console.warn(`No articles for part ${part.part_number}`);
    return;
  }

  const articleByNumber = new Map<string, CatalogArticle[]>();
  for (const article of articles) {
    const key = normalizeKey(article.articleNo);
    if (!key) continue;
    if (!articleByNumber.has(key)) {
      articleByNumber.set(key, []);
    }
    articleByNumber.get(key)!.push(article);
  }

  if (articleByNumber.size === 0) {
    console.warn(`No valid article numbers for part ${part.part_number}`);
    return;
  }

  const vehicles = new Map<string, CatalogCompatibleCar & { sourceArticleNo: string }>();
  for (const group of part.compatible_vehicles ?? []) {
    const articleNo = normalizeKey(group.articleNo);
    if (!articleNo) continue;
    for (const car of group.compatibleCars ?? []) {
      const vehicleKey = `${car.vehicleId ?? 'unknown'}|${car.typeEngineName ?? ''}|${car.modelId ?? 'unknown'}`;
      if (!vehicles.has(vehicleKey)) {
        vehicles.set(vehicleKey, { ...car, sourceArticleNo: articleNo });
      }
    }
  }

  if (vehicles.size === 0) {
    console.warn(`No compatible vehicles for part ${part.part_number}`);
  }

  let vehicleCounter = 0;

  for (const [articleNo, relatedArticles] of articleByNumber.entries()) {
    if (options.limitVehicles && vehicleCounter >= options.limitVehicles) break;

    const product = await db.product.findUnique({ where: { catalogNumber: articleNo } });
    if (!product) {
      console.warn(`Product with catalogNumber ${articleNo} not found, skipping.`);
      continue;
    }

    const primaryArticle = relatedArticles.find(isImageArticle) ?? relatedArticles[0];
    const supplierName = normalizeName(primaryArticle?.supplierName);

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

    if (primaryArticle && isImageArticle(primaryArticle)) {
      const shouldUpdateImage = !product.imageUrl || product.imageUrl.includes('placehold');
      if (primaryArticle.s3image && shouldUpdateImage) {
        if (options.dryRun) {
          console.log(`[dry-run] Would set image for product ${product.catalogNumber} → ${primaryArticle.s3image}`);
        } else {
          await db.product.update({
            where: { id: product.id },
            data: { imageUrl: primaryArticle.s3image },
          });
          stats.productsUpdated += 1;
          console.log(`Updated image for product ${product.catalogNumber}`);
        }
      }
    }

    for (const vehicle of vehicles.values()) {
      if (options.limitVehicles && vehicleCounter >= options.limitVehicles) break;
      vehicleCounter += 1;

      const brandId = await findBrandId(vehicle.manufacturerName);
      if (!brandId) {
        console.warn(`Brand not found for manufacturer ${vehicle.manufacturerName}, skipping vehicle ${vehicle.vehicleId}`);
        continue;
      }

      const model = await findModel(brandId, vehicle.modelId);
      if (!model) {
        console.warn(`Model not found for brand ${vehicle.manufacturerName} (${brandId}) with modelId ${vehicle.modelId}, vehicle ${vehicle.vehicleId}`);
        continue;
      }

      const generation = await findGeneration(model.id);
      if (!generation) {
        console.warn(`Generation not found for model ${model.name} (${model.id}), vehicle ${vehicle.vehicleId}`);
        continue;
      }

      const engine = await findEngine(generation.id, vehicle.vehicleId, vehicle.typeEngineName);
      const yearFrom = parseYear(vehicle.constructionIntervalStart);
      const yearTo = parseYear(vehicle.constructionIntervalEnd);

      const status = await upsertFitment(
        {
          productId: product.id,
          generationId: generation.id,
          engineId: engine?.id ?? null,
          yearFrom,
          yearTo,
          externalVehicleId: normalizeKey(vehicle.vehicleId),
          externalModelId: normalizeKey(vehicle.modelId),
          externalManufacturer: normalizeName(vehicle.manufacturerName),
          externalEngineName: normalizeName(vehicle.typeEngineName),
        },
        options.dryRun,
      );

      if (status === 'created') stats.fitmentsCreated += 1;
      if (status === 'updated') stats.fitmentsUpdated += 1;
    }
  }
}

type Stats = {
  partsProcessed: number;
  fitmentsCreated: number;
  fitmentsUpdated: number;
  productsUpdated: number;
};

async function main() {
  const { filePath, options } = parseArgs(process.argv.slice(2));
  const parts = readCatalog(filePath);
  const partsToProcess = typeof options.limitParts === 'number' ? parts.slice(0, options.limitParts) : parts;

  console.log(`Linking ${partsToProcess.length} parts from ${filePath}${options.dryRun ? ' (dry-run)' : ''}`);

  const stats: Stats = {
    partsProcessed: 0,
    fitmentsCreated: 0,
    fitmentsUpdated: 0,
    productsUpdated: 0,
  };

  try {
    for (const part of partsToProcess) {
      await processPart(part, options, stats);
      stats.partsProcessed += 1;
    }

    console.log('--- Summary ---');
    console.log(`Parts processed: ${stats.partsProcessed}`);
    console.log(`Fitments created: ${stats.fitmentsCreated}`);
    console.log(`Fitments updated: ${stats.fitmentsUpdated}`);
    console.log(`Products updated: ${stats.productsUpdated}`);
  } finally {
    await db.$disconnect();
  }
}

void main().catch((error) => {
  console.error('Linking script failed:', error);
  void db.$disconnect().finally(() => process.exit(1));
});
