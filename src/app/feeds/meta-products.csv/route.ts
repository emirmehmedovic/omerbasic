import { db } from '@/lib/db';

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://tp-omerbasic.ba';
const BRAND_NAME = 'TP Omerbašić';

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Escape quotes and wrap in quotes if contains special characters
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Meta/Facebook Product Feed CSV
// Docs: https://www.facebook.com/business/help/120325381656392
export async function GET() {
  const encoder = new TextEncoder();

  // CSV headers as per Meta requirements
  const headersRow = [
    'id',
    'title',
    'description',
    'availability',
    'condition',
    'price',
    'link',
    'image_link',
    'brand',
  ].join(',') + '\n';

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        controller.enqueue(encoder.encode(headersRow));

        const PAGE_SIZE = 2000;
        let offset = 0;
        let processedCount = 0;

        while (true) {
          // Use raw SQL for maximum performance
          // Include category imageUrl for fallback
          const batch = await db.$queryRawUnsafe<any[]>(`
            SELECT 
              p."id",
              p."name",
              p."description",
              p."slug",
              p."price",
              p."stock",
              p."imageUrl",
              p."catalogNumber",
              m."name" as "manufacturerName",
              c."imageUrl" as "categoryImageUrl"
            FROM "Product" p
            LEFT JOIN "Manufacturer" m ON p."manufacturerId" = m."id"
            LEFT JOIN "Category" c ON p."categoryId" = c."id"
            WHERE p."isArchived" = false
            ORDER BY p."id" ASC
            LIMIT $1 OFFSET $2
          `, PAGE_SIZE, offset);

          if (!batch.length) break;

          for (const product of batch) {
            // Build product URL - use slug if available, otherwise catalogNumber
            const productPath = product.slug || product.catalogNumber;
            const productUrl = `${SITE_URL}/products/${encodeURIComponent(productPath)}`;

            // Build image URL - fallback to category image if product has no image
            const rawImageUrl = product.imageUrl || product.categoryImageUrl;
            let imageUrl = '';
            if (rawImageUrl) {
              // If it's a relative URL, make it absolute
              imageUrl = rawImageUrl.startsWith('http')
                ? rawImageUrl
                : `${SITE_URL}${rawImageUrl.startsWith('/') ? '' : '/'}${rawImageUrl}`;
            }

            // Availability based on stock
            const availability = product.stock > 0 ? 'in stock' : 'out of stock';

            // Price formatted with EUR
            const price = `${Number(product.price).toFixed(2)} BAM`;

            // Description - use product description or fallback to name
            const description = product.description || product.name;

            // Brand - use manufacturer name if available, otherwise default brand
            const brand = product.manufacturerName || BRAND_NAME;

            const row = [
              escapeCsv(product.id),
              escapeCsv(product.name),
              escapeCsv(description),
              escapeCsv(availability),
              escapeCsv('new'),
              escapeCsv(price),
              escapeCsv(productUrl),
              escapeCsv(imageUrl),
              escapeCsv(brand),
            ].join(',') + '\n';

            controller.enqueue(encoder.encode(row));
          }

          offset += batch.length;
          processedCount += batch.length;

          // Log progress every 10k products
          if (processedCount % 10000 === 0) {
            console.log(`[META_FEED] Processed ${processedCount} products...`);
          }

          // Yield to event loop
          await new Promise((resolve) => setTimeout(resolve, 1));
        }

        console.log(`[META_FEED] Export completed: ${processedCount} products`);
        controller.close();
      } catch (error) {
        console.error('[META_FEED] Stream error:', error);
        controller.error(error);
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      // No caching - Meta should always get fresh data
      'Cache-Control': 'no-store',
    },
  });
}
