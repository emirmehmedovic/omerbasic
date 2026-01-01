/**
 * Admin endpoint to manually sync product compatible brands from vehicle fitments
 *
 * This endpoint extracts unique vehicle brands from each product's fitments
 * and updates the Product.compatibleBrands relationship.
 *
 * Usage: POST /api/admin/sync-vehicle-brands
 * Optional query params:
 *   - productId: Sync specific product only
 *   - batchSize: Number of products to process per batch (default: 100)
 *   - stream: Enable streaming response for real-time progress (default: true)
 */

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

// Helper to send log messages through stream
function sendLog(controller: ReadableStreamDefaultController, message: string, type: 'info' | 'success' | 'error' | 'progress' = 'info') {
  const data = JSON.stringify({ type, message, timestamp: new Date().toISOString() });
  controller.enqueue(`data: ${data}\n\n`);
}

export async function POST(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const productId = searchParams.get('productId');
  const batchSize = Number(searchParams.get('batchSize')) || 100;
  const useStream = searchParams.get('stream') !== 'false';

  // Create streaming response
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        sendLog(controller, '🚀 Starting vehicle brands synchronization...', 'info');

        // If specific productId provided, sync only that product
        if (productId) {
          sendLog(controller, `🔍 Fetching product ${productId}...`, 'info');

          const product = await db.product.findUnique({
            where: { id: productId },
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
              }
            }
          });

          if (!product) {
            sendLog(controller, `❌ Product not found: ${productId}`, 'error');
            controller.close();
            return;
          }

          sendLog(controller, `✓ Product found: ${product.name}`, 'success');
          sendLog(controller, `📊 Extracting brands from ${product.vehicleFitments.length} fitments...`, 'info');

          // Extract unique brand IDs
          const brandIds = new Set<string>();
          for (const fitment of product.vehicleFitments) {
            if (fitment.isUniversal) continue;
            const brandId = fitment.generation?.model?.brand?.id;
            if (brandId) brandIds.add(brandId);
          }

          sendLog(controller, `✓ Found ${brandIds.size} unique brands`, 'success');
          sendLog(controller, `💾 Updating product...`, 'info');

          // Update product
          await db.product.update({
            where: { id: productId },
            data: {
              compatibleBrands: {
                set: Array.from(brandIds).map(id => ({ id }))
              }
            }
          });

          sendLog(controller, `✅ Successfully updated product with ${brandIds.size} brands`, 'success');

          const result = JSON.stringify({
            type: 'complete',
            data: {
              success: true,
              productId,
              brandsCount: brandIds.size
            }
          });
          controller.enqueue(`data: ${result}\n\n`);
          controller.close();
          return;
        }

        // Sync all products in batches
        sendLog(controller, '📊 Counting total products...', 'info');
        const totalProducts = await db.product.count();
        sendLog(controller, `✓ Found ${totalProducts.toLocaleString()} products to process`, 'success');

        let processedCount = 0;
        let updatedCount = 0;
        let errorCount = 0;
        const totalBatches = Math.ceil(totalProducts / batchSize);

        sendLog(controller, `📦 Processing in ${totalBatches} batches of ${batchSize}...`, 'info');
        sendLog(controller, '─'.repeat(60), 'info');

        for (let skip = 0; skip < totalProducts; skip += batchSize) {
          const currentBatch = Math.floor(skip / batchSize) + 1;
          const batchStart = skip + 1;
          const batchEnd = Math.min(skip + batchSize, totalProducts);

          sendLog(controller, `📦 Batch ${currentBatch}/${totalBatches}: Processing products ${batchStart}-${batchEnd}...`, 'progress');

          const products = await db.product.findMany({
            skip,
            take: batchSize,
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

          let batchUpdated = 0;
          let batchErrors = 0;

          for (const product of products) {
            try {
              // Extract unique brand IDs
              const brandIds = new Set<string>();
              for (const fitment of product.vehicleFitments) {
                if (fitment.isUniversal) continue;
                const brandId = fitment.generation?.model?.brand?.id;
                if (brandId) brandIds.add(brandId);
              }

              // Check if update is needed
              const currentBrandIds = new Set(product.compatibleBrands.map(b => b.id));
              const brandsArray = Array.from(brandIds);
              const needsUpdate =
                brandsArray.length !== currentBrandIds.size ||
                brandsArray.some(id => !currentBrandIds.has(id));

              if (needsUpdate) {
                await db.product.update({
                  where: { id: product.id },
                  data: {
                    compatibleBrands: {
                      set: brandsArray.map(id => ({ id }))
                    }
                  }
                });
                updatedCount++;
                batchUpdated++;
              }

              processedCount++;
            } catch (error) {
              errorCount++;
              batchErrors++;
              console.error(`Error syncing product ${product.id}:`, error);
            }
          }

          const percentage = Math.round((processedCount / totalProducts) * 100);
          sendLog(
            controller,
            `✓ Batch ${currentBatch} complete: ${batchUpdated} updated, ${batchErrors} errors | Progress: ${processedCount}/${totalProducts} (${percentage}%)`,
            batchErrors > 0 ? 'error' : 'success'
          );

          // Send progress update
          const progressData = JSON.stringify({
            type: 'progress',
            data: {
              processedCount,
              updatedCount,
              errorCount,
              totalProducts,
              percentage,
              currentBatch,
              totalBatches
            }
          });
          controller.enqueue(`data: ${progressData}\n\n`);
        }

        sendLog(controller, '─'.repeat(60), 'info');
        sendLog(controller, '✅ Synchronization completed successfully!', 'success');
        sendLog(controller, '', 'info');
        sendLog(controller, '📊 Summary:', 'info');
        sendLog(controller, `   • Total products: ${totalProducts.toLocaleString()}`, 'info');
        sendLog(controller, `   • Processed: ${processedCount.toLocaleString()}`, 'success');
        sendLog(controller, `   • Updated: ${updatedCount.toLocaleString()}`, 'success');
        sendLog(controller, `   • Skipped (already up-to-date): ${(processedCount - updatedCount).toLocaleString()}`, 'info');
        sendLog(controller, `   • Errors: ${errorCount}`, errorCount > 0 ? 'error' : 'success');

        // Send final result
        const result = JSON.stringify({
          type: 'complete',
          data: {
            success: true,
            totalProducts,
            processedCount,
            updatedCount,
            errorCount,
            skippedCount: processedCount - updatedCount
          }
        });
        controller.enqueue(`data: ${result}\n\n`);
        controller.close();

      } catch (error) {
        console.error('Error syncing vehicle brands:', error);
        sendLog(controller, `❌ Fatal error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');

        const errorResult = JSON.stringify({
          type: 'error',
          data: {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        });
        controller.enqueue(`data: ${errorResult}\n\n`);
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
