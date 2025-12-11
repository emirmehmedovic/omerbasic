import { db } from '../src/lib/db';

function normalizeBosnianChars(input: string): string {
  return input
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .replace(/č/g, 'c')
    .replace(/Č/g, 'c')
    .replace(/ć/g, 'c')
    .replace(/Ć/g, 'c')
    .replace(/š/g, 's')
    .replace(/Š/g, 's')
    .replace(/ž/g, 'z')
    .replace(/Ž/g, 'z');
}

function slugify(raw: string): string {
  const normalized = normalizeBosnianChars(raw)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) return '';

  return normalized
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

async function main() {
  console.log('Generating slugs for products without slug...');

  const existing = await db.product.findMany({
    where: { slug: { not: null } },
    select: { slug: true },
  });

  const usedSlugs = new Set<string>();
  for (const row of existing) {
    if (row.slug) usedSlugs.add(row.slug.toLowerCase());
  }

  const products = await db.product.findMany({
    where: { slug: null },
    select: {
      id: true,
      name: true,
      catalogNumber: true,
      manufacturer: { select: { name: true } },
    },
  });

  if (!products.length) {
    console.log('No products without slug found. Nothing to do.');
    return;
  }

  console.log(`Found ${products.length} products without slug.`);

  const updates: { id: string; slug: string }[] = [];

  for (const product of products) {
    const parts: string[] = [];

    if (product.manufacturer?.name) {
      parts.push(product.manufacturer.name);
    }
    if (product.name) {
      parts.push(product.name);
    }
    if (product.catalogNumber) {
      parts.push(product.catalogNumber);
    }

    let base = slugify(parts.join(' '));

    if (!base) {
      base = slugify(product.catalogNumber || product.id);
    }

    if (!base) {
      console.warn(`Could not generate base slug for product ${product.id}. Skipping.`);
      continue;
    }

    let candidate = base;
    let counter = 2;

    while (usedSlugs.has(candidate.toLowerCase())) {
      candidate = `${base}-${counter++}`;
    }

    usedSlugs.add(candidate.toLowerCase());
    updates.push({ id: product.id, slug: candidate });
  }

  if (!updates.length) {
    console.log('No updates generated. Nothing to do.');
    return;
  }

  console.log(`Updating ${updates.length} products with generated slugs...`);

  const batchSize = 200;
  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);
    await db.$transaction(
      batch.map((u) =>
        db.product.update({ where: { id: u.id }, data: { slug: u.slug } }),
      ),
    );
    console.log(`Updated ${Math.min(i + batchSize, updates.length)} / ${updates.length}`);
  }

  console.log('Done generating product slugs.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
