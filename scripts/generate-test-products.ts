import process from 'process';
import { db } from '../src/lib/db';

/**
 * Generate one idempotent test Product per leaf category under a given root category
 * (default: all supported roots). Modified to generate 5 products for every
 * category and subcategory (not only leaves). For the "Putnička vozila" root,
 * link each created product to all generations of Volkswagen Golf and Passat
 * via ProductVehicleFitment (engine-agnostic).
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

  // Prepare target generations (Golf, Passat) only if needed later
  let vwId: string | null = null;
  let golfGens: Array<{ id: string; name: string }> = [];
  let passatGens: Array<{ id: string; name: string }> = [];

  for (const rootName of rootsToProcess) {
    const rootId = await getRootCategoryId(rootName);
    const categories = await collectAllCategories(rootId);
    console.log(`[${rootName}] Found ${categories.length} categories (including non-leaf).`);

    // Only prepare vehicle generations if we're handling Putnička vozila
    const shouldLinkVehicles = rootName === 'Putnička vozila';
    if (shouldLinkVehicles && golfGens.length === 0 && passatGens.length === 0) {
      vwId = await findBrandId('Volkswagen');
      golfGens = await getGenerationsForModel(vwId, 'Golf');
      passatGens = await getGenerationsForModel(vwId, 'Passat');
    }

    let totalCreatedOrFound = 0;
    for (const cat of categories) {
      const products = await upsertMultipleTestProductsForCategory(cat.id, cat.name, PRODUCTS_PER_CATEGORY);
      totalCreatedOrFound += products.length;
      if (shouldLinkVehicles) {
        for (const p of products) {
          await ensureGenerationFitments(p.id, golfGens, 'Golf');
          await ensureGenerationFitments(p.id, passatGens, 'Passat');
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

