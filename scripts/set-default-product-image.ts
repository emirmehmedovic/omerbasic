import process from 'process';
import { db } from '../src/lib/db';

/**
 * Set a default image URL for products.
 * Default image path: /images/mockup.png (served from Next.js public/)
 *
 * Usage:
 *   npx tsx scripts/set-default-product-image.ts            # only products with NULL imageUrl
 *   npx tsx scripts/set-default-product-image.ts --force    # overwrite imageUrl for ALL products
 */

const DEFAULT_IMAGE_URL = '/images/mockup.png';

async function main() {
  const force = process.argv.includes('--force');
  console.log(`Setting default imageUrl to ${DEFAULT_IMAGE_URL} (${force ? 'force ALL' : 'only NULLs'})`);

  if (force) {
    const res = await db.product.updateMany({ data: { imageUrl: DEFAULT_IMAGE_URL } });
    console.log(`Updated ${res.count} products.`);
  } else {
    const res = await db.product.updateMany({ where: { imageUrl: null }, data: { imageUrl: DEFAULT_IMAGE_URL } });
    console.log(`Updated ${res.count} products (only those without image).`);
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
