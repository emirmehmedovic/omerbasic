import { db } from '../src/lib/db';

/**
 * Ensure pg_trgm + unaccent extensions and create GIN trigram indexes
 * including functional indexes on unaccent(lower(...)) for better fuzzy search.
 *
 * Usage:
 *   npx tsx scripts/create-trgm-indexes.ts
 */
async function main() {
  console.log('Ensuring pg_trgm + unaccent extensions and trigram indexes...');

  // Create extension
  await db.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS pg_trgm');
  await db.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS unaccent');

  // Create GIN trigram indexes
  await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS product_name_trgm_idx ON "Product" USING GIN ("name" gin_trgm_ops)');
  await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS product_catalog_trgm_idx ON "Product" USING GIN ("catalogNumber" gin_trgm_ops)');

  // Functional trigram indexes using unaccent + lower for accent-insensitive search
  await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS product_name_unaccent_trgm_idx ON "Product" USING GIN ((unaccent(lower("name"))) gin_trgm_ops)');
  await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS product_catalog_unaccent_trgm_idx ON "Product" USING GIN ((unaccent(lower("catalogNumber"))) gin_trgm_ops)');
  await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS product_oem_unaccent_trgm_idx ON "Product" USING GIN ((unaccent(lower(COALESCE("oemNumber", \'\')))) gin_trgm_ops)');

  console.log('Done creating trigram indexes.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
