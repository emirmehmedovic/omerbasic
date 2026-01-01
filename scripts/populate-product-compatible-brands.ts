/**
 * Populate Product.compatibleBrands from existing ProductVehicleFitments
 *
 * This script extracts unique vehicle brands from each product's fitments
 * and creates the many-to-many relationship in the _ProductToVehicleBrand junction table.
 *
 * Run with: npx tsx scripts/populate-product-compatible-brands.ts
 */

import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting to populate product compatible brands...\n');

  // Get total product count
  const totalProducts = await prisma.product.count();
  console.log(`📊 Total products in database: ${totalProducts}\n`);

  // Process products in batches to avoid memory issues
  const BATCH_SIZE = 100;
  let processedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (let skip = 0; skip < totalProducts; skip += BATCH_SIZE) {
    const products = await prisma.product.findMany({
      skip,
      take: BATCH_SIZE,
      include: {
        vehicleFitments: {
          include: {
            generation: {
              include: {
                model: {
                  include: {
                    brand: true
                  }
                }
              }
            }
          }
        },
        compatibleBrands: {
          select: { id: true }
        }
      }
    });

    console.log(`📦 Processing batch ${Math.floor(skip / BATCH_SIZE) + 1} (${skip + 1} - ${Math.min(skip + BATCH_SIZE, totalProducts)} of ${totalProducts})`);

    for (const product of products) {
      try {
        // Extract unique brand IDs from fitments
        const brandIds = new Set<string>();

        for (const fitment of product.vehicleFitments) {
          // Skip universal fitments (they don't have specific vehicle brands)
          if (fitment.isUniversal) continue;

          const brandId = fitment.generation?.model?.brand?.id;
          if (brandId) {
            brandIds.add(brandId);
          }
        }

        // Get currently connected brands
        const currentBrandIds = new Set(product.compatibleBrands.map(b => b.id));

        // Check if update is needed
        const brandsArray = Array.from(brandIds);
        const needsUpdate =
          brandsArray.length !== currentBrandIds.size ||
          brandsArray.some(id => !currentBrandIds.has(id));

        if (!needsUpdate) {
          skippedCount++;
          continue;
        }

        // Update product with compatible brands
        if (brandsArray.length > 0) {
          await prisma.product.update({
            where: { id: product.id },
            data: {
              compatibleBrands: {
                set: brandsArray.map(id => ({ id }))
              }
            }
          });

          updatedCount++;

          if (updatedCount % 10 === 0) {
            process.stdout.write(`  ✅ Updated ${updatedCount} products so far...\r`);
          }
        } else {
          // Product has no vehicle fitments, disconnect all brands
          if (currentBrandIds.size > 0) {
            await prisma.product.update({
              where: { id: product.id },
              data: {
                compatibleBrands: {
                  set: []
                }
              }
            });
          }
          skippedCount++;
        }

        processedCount++;

      } catch (error) {
        errorCount++;
        console.error(`  ❌ Error processing product ${product.id} (${product.name}):`, error);
      }
    }

    console.log(''); // New line after batch
  }

  console.log('\n✨ Populate completed!\n');
  console.log('📈 Summary:');
  console.log(`  • Total processed: ${processedCount}`);
  console.log(`  • Updated: ${updatedCount}`);
  console.log(`  • Skipped (already up-to-date): ${skippedCount}`);
  console.log(`  • Errors: ${errorCount}`);
  console.log('');

  // Show sample of products with most brands
  console.log('🏆 Top 10 products by number of compatible brands:\n');

  const topProducts = await prisma.product.findMany({
    take: 10,
    include: {
      compatibleBrands: {
        select: {
          id: true,
          name: true
        }
      }
    },
    orderBy: {
      compatibleBrands: {
        _count: 'desc'
      }
    }
  });

  topProducts.forEach((product, index) => {
    const brandNames = product.compatibleBrands.map(b => b.name).join(', ');
    console.log(`  ${index + 1}. ${product.name} (${product.sku || product.catalogNumber})`);
    console.log(`     └─ ${product.compatibleBrands.length} brands: ${brandNames}`);
  });

  console.log('');
}

main()
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
