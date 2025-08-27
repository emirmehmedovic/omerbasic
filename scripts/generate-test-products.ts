import process from 'process';
import { db } from '../src/lib/db';

/**
 * Generate one idempotent test Product per leaf category under a given root category
 * (default: all supported roots). Modified to generate 5 products for every
 * category and subcategory (not only leaves). Additionally:
 * - For the "Putnička vozila" root: link each created product to a few RANDOM
 *   passenger vehicle generations (engine-agnostic).
 * - For the "Teretna vozila" root: link each created product to a few RANDOM
 *   commercial vehicle generations (engine-agnostic).
 * - For other roots (ADR, Autopraonice): do not create vehicle fitments.
 *
 * Usage:
 *   npx tsx scripts/generate-test-products.ts [rootName|--all]
 *   npx ts-node scripts/generate-test-products.ts [rootName|--all]
 *
 * If no argument is provided, the script will process all known roots:
 *   - "Putnička vozila"
 *   - "Teretna vozila"
 *   - "ADR"
 *   - "Autopraonice"
 */

const KNOWN_ROOTS = ['Putnička vozila', 'Teretna vozila', 'ADR', 'Autopraonice'] as const;
const PRODUCTS_PER_CATEGORY = 5;
const PASSENGER_FITMENTS_PER_PRODUCT = 3; // how many random generations per product
const COMMERCIAL_FITMENTS_PER_PRODUCT = 2;

async function getRootCategoryId(rootName: string): Promise<string> {
  const root = await db.category.findFirst({ where: { name: rootName, parentId: null } });
  if (!root) throw new Error(`Root category "${rootName}" not found. Run category import first.`);
  return root.id;
}

async function getChildCategories(parentId: string) {
  return db.category.findMany({ where: { parentId }, select: { id: true, name: true } });
}

async function collectAllCategories(rootId: string): Promise<Array<{ id: string; name: string }>> {
  // Collect all descendant categories (both internal and leaf). Excludes the root node itself.
  const all: Array<{ id: string; name: string }> = [];
  const queue: Array<{ id: string; name: string }> = [{ id: rootId, name: 'ROOT' }];

  while (queue.length) {
    const node = queue.shift()!;
    const children = await getChildCategories(node.id);
    for (const child of children) {
      all.push(child);
      queue.push(child);
    }
  }

  return all;
}

async function findBrandId(brandName: string) {
  const brand = await db.vehicleBrand.findFirst({ where: { name: brandName } });
  if (!brand) throw new Error(`Vehicle brand not found: ${brandName}`);
  return brand.id;
}

async function getGenerationsForModel(brandId: string, modelName: string) {
  const model = await db.vehicleModel.findFirst({ where: { brandId, name: modelName } });
  if (!model) throw new Error(`Vehicle model not found for brandId=${brandId}: ${modelName}`);
  const generations = await db.vehicleGeneration.findMany({ where: { modelId: model.id } });
  return generations.map((g) => ({ id: g.id, name: g.name }));
}

async function getGenerationsByBrandType(type: 'PASSENGER' | 'COMMERCIAL') {
  const brands = await db.vehicleBrand.findMany({ where: { type } , select: { id: true } });
  if (!brands.length) return [] as Array<{ id: string; name: string }>;
  const models = await db.vehicleModel.findMany({ where: { brandId: { in: brands.map(b => b.id) } }, select: { id: true } });
  if (!models.length) return [] as Array<{ id: string; name: string }>;
  const gens = await db.vehicleGeneration.findMany({ where: { modelId: { in: models.map(m => m.id) } } });
  return gens.map(g => ({ id: g.id, name: g.name }));
}

function pickRandom<T>(arr: T[], count: number): T[] {
  if (count <= 0 || arr.length === 0) return [];
  const copy = [...arr];
  // Fisher-Yates shuffle up to count
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(count, copy.length));
}

async function upsertMultipleTestProductsForCategory(categoryId: string, categoryName: string, count: number) {
  const created: Array<{ id: string; catalogNumber: string }> = [];
  for (let i = 1; i <= count; i++) {
    const catalogNumber = `TEST-${categoryId}-${i}`;
    const existing = await db.product.findUnique({ where: { catalogNumber } });
    if (existing) {
      created.push({ id: existing.id, catalogNumber: existing.catalogNumber });
      continue;
    }

    const product = await db.product.create({
      data: {
        name: `${categoryName} – Test proizvod #${i}`,
        description: `Automatski generiran testni proizvod #${i} za kategoriju ${categoryName}.`,
        price: 49.99 + i, // small variation
        stock: 10 + i,
        imageUrl: '/images/mockup.png',
        catalogNumber,
        categoryId,
        isFeatured: false,
        isArchived: false,
      },
    });
    console.log(`Created test product ${product.catalogNumber} for category "${categoryName}"`);
    created.push({ id: product.id, catalogNumber: product.catalogNumber });
  }
  return created;
}

async function ensureGenerationFitments(productId: string, generations: Array<{ id: string; name: string }>, tag: string) {
  for (const gen of generations) {
    const existing = await db.productVehicleFitment.findFirst({
      where: { productId, generationId: gen.id, engineId: null },
    });
    if (existing) continue;
    await db.productVehicleFitment.create({
      data: {
        productId,
        generationId: gen.id,
        engineId: null,
        fitmentNotes: `Auto-linked for ${tag}`,
        isUniversal: false,
      },
    });
    console.log(`  Linked to generation ${tag}: ${gen.name}`);
  }
}

async function main() {
  const arg = process.argv[2];
  const rootsToProcess: string[] = !arg || arg === '--all' || arg.toUpperCase() === 'ALL' ? [...KNOWN_ROOTS] : [arg];

  console.log(`Generating ${PRODUCTS_PER_CATEGORY} test products for every category under roots: ${rootsToProcess.join(', ')}`);

  // Prepare generation pools per vehicle type on demand
  let passengerPool: Array<{ id: string; name: string }> = [];
  let commercialPool: Array<{ id: string; name: string }> = [];

  for (const rootName of rootsToProcess) {
    const rootId = await getRootCategoryId(rootName);
    const categories = await collectAllCategories(rootId);
    console.log(`[${rootName}] Found ${categories.length} categories (including non-leaf).`);

    const isPassenger = rootName === 'Putnička vozila';
    const isCommercial = rootName === 'Teretna vozila';
    if (isPassenger && passengerPool.length === 0) {
      passengerPool = await getGenerationsByBrandType('PASSENGER');
      if (!passengerPool.length) console.warn('No passenger vehicle generations found to link.');
    }
    if (isCommercial && commercialPool.length === 0) {
      commercialPool = await getGenerationsByBrandType('COMMERCIAL');
      if (!commercialPool.length) console.warn('No commercial vehicle generations found to link.');
    }

    let totalCreatedOrFound = 0;
    for (const cat of categories) {
      const products = await upsertMultipleTestProductsForCategory(cat.id, cat.name, PRODUCTS_PER_CATEGORY);
      totalCreatedOrFound += products.length;
      if (isPassenger) {
        for (const p of products) {
          const sample = pickRandom(passengerPool, PASSENGER_FITMENTS_PER_PRODUCT);
          await ensureGenerationFitments(p.id, sample, 'PASSENGER');
        }
      } else if (isCommercial) {
        for (const p of products) {
          const sample = pickRandom(commercialPool, COMMERCIAL_FITMENTS_PER_PRODUCT);
          await ensureGenerationFitments(p.id, sample, 'COMMERCIAL');
        }
      }
    }

    console.log(`[${rootName}] Done. Ensured ${totalCreatedOrFound} products across ${categories.length} categories.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

