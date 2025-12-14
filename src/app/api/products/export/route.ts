import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

// Optimized export - uses raw SQL for better performance on large datasets
export async function GET(req: Request) {
  try {
    const encoder = new TextEncoder();
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim() || '';
    const categoryId = searchParams.get('categoryId')?.trim() || '';
    const inStockOnly = searchParams.get('inStockOnly') === 'true';
    // Check if user wants full export with relations (slower) or basic export (fast)
    const fullExport = searchParams.get('full') === 'true';

    let categoryIds: string[] = [];
    if (categoryId) {
      try {
        const cats = await db.$queryRaw<{ id: string }[]>`
          WITH RECURSIVE cte AS (
            SELECT ${categoryId}::uuid AS id
            UNION ALL
            SELECT c."id" FROM "Category" c JOIN cte ON c."parentId" = cte.id
          )
          SELECT id FROM cte
        `;
        categoryIds = cats.map(c => c.id);
      } catch {
        categoryIds = [categoryId];
      }
    }

    // Basic export headers (fast mode)
    const basicHeaders = [
      'id',
      'name',
      'description',
      'price',
      'imageUrl',
      'stock',
      'catalogNumber',
      'oemNumber',
      'isFeatured',
      'isArchived',
      'categoryId',
      'categoryName',
      'technicalSpecs',
      'dimensions',
      'standards',
    ];

    // Full export headers (includes relations - slower)
    const fullHeaders = [
      ...basicHeaders,
      'vehicleFitments',
      'attributeValues',
      'crossReferences',
    ];

    const headersRow = (fullExport ? fullHeaders : basicHeaders).join(',') + '\n';

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          controller.enqueue(encoder.encode(headersRow));
          
          // Use larger batch size for basic export, smaller for full export
          const PAGE_SIZE = fullExport ? 100 : 2000;
          let offset = 0;
          let processedCount = 0;

          while (true) {
            let batch;
            
            if (fullExport) {
              // Full export with relations - use Prisma for complex includes
              const whereClause: Record<string, any> = {};
              if (categoryIds.length > 0) whereClause.categoryId = { in: categoryIds };
              if (inStockOnly) whereClause.stock = { gt: 0 };
              if (q) {
                whereClause.OR = [
                  { name: { contains: q, mode: 'insensitive' } },
                  { catalogNumber: { contains: q, mode: 'insensitive' } },
                  { oemNumber: { contains: q, mode: 'insensitive' } },
                ];
              }

              batch = await db.product.findMany({
                where: Object.keys(whereClause).length ? whereClause : undefined,
                orderBy: { id: 'asc' },
                skip: offset,
                take: PAGE_SIZE,
                include: {
                  category: { select: { name: true } },
                  vehicleFitments: {
                    select: {
                      generationId: true,
                      engineId: true,
                      fitmentNotes: true,
                      position: true,
                      bodyStyles: true,
                      yearFrom: true,
                      yearTo: true,
                      isUniversal: true,
                      generation: {
                        select: {
                          name: true,
                          model: {
                            select: {
                              name: true,
                              brand: { select: { name: true } },
                            },
                          },
                        },
                      },
                      engine: {
                        select: {
                          engineType: true,
                          engineCapacity: true,
                          enginePowerKW: true,
                        },
                      },
                    },
                  },
                  attributeValues: {
                    select: {
                      attributeId: true,
                      value: true,
                      attribute: { select: { name: true, label: true } },
                    },
                  },
                  originalReferences: {
                    select: {
                      referenceType: true,
                      referenceNumber: true,
                      manufacturer: true,
                      notes: true,
                    },
                  },
                  replacementFor: {
                    select: {
                      referenceType: true,
                      referenceNumber: true,
                      manufacturer: true,
                      notes: true,
                    },
                  },
                },
              });
            } else {
              // Basic export - use raw SQL for maximum performance
              const conditions: string[] = [];
              const params: any[] = [];
              let paramIndex = 1;

              if (categoryIds.length > 0) {
                conditions.push(`p."categoryId" = ANY($${paramIndex}::uuid[])`);
                params.push(categoryIds);
                paramIndex++;
              }
              if (inStockOnly) {
                conditions.push(`p."stock" > 0`);
              }
              if (q) {
                conditions.push(`(
                  p."name" ILIKE $${paramIndex} OR 
                  p."catalogNumber" ILIKE $${paramIndex} OR 
                  p."oemNumber" ILIKE $${paramIndex}
                )`);
                params.push(`%${q}%`);
                paramIndex++;
              }

              const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
              
              // Add LIMIT and OFFSET params
              const limitParamIndex = paramIndex;
              const offsetParamIndex = paramIndex + 1;
              params.push(PAGE_SIZE, offset);
              
              batch = await db.$queryRawUnsafe<any[]>(`
                SELECT 
                  p."id",
                  p."name",
                  p."description",
                  p."price",
                  p."imageUrl",
                  p."stock",
                  p."catalogNumber",
                  p."oemNumber",
                  p."isFeatured",
                  p."isArchived",
                  p."categoryId",
                  c."name" as "categoryName",
                  p."technicalSpecs",
                  p."dimensions",
                  p."standards"
                FROM "Product" p
                LEFT JOIN "Category" c ON p."categoryId" = c."id"
                ${whereClause}
                ORDER BY p."id" ASC
                LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}
              `, ...params);
            }

            if (!batch.length) break;

            for (const product of batch) {
              let row: string[];
              
              if (fullExport) {
                // Full export row with relations
                const technicalSpecs = product.technicalSpecs
                  ? JSON.stringify(product.technicalSpecs)
                  : '';
                const dimensions = product.dimensions
                  ? JSON.stringify(product.dimensions)
                  : '';
                const standards = product.standards?.length
                  ? `[${product.standards.join(',')}]`
                  : '';

                const vehicleFitments = product.vehicleFitments?.map((fitment: any) => ({
                  generationId: fitment.generationId,
                  engineId: fitment.engineId,
                  fitmentNotes: fitment.fitmentNotes,
                  position: fitment.position,
                  bodyStyles: fitment.bodyStyles,
                  yearFrom: fitment.yearFrom,
                  yearTo: fitment.yearTo,
                  isUniversal: fitment.isUniversal,
                  vehicleInfo: {
                    brand: fitment.generation?.model?.brand?.name,
                    model: fitment.generation?.model?.name,
                    generation: fitment.generation?.name,
                    engine: fitment.engine
                      ? `${fitment.engine.engineType} ${fitment.engine.engineCapacity}ccm ${fitment.engine.enginePowerKW}kW`
                      : null,
                  },
                })) || [];

                const attributeValues = product.attributeValues?.map((av: any) => ({
                  attributeId: av.attributeId,
                  value: av.value,
                  attributeInfo: {
                    name: av.attribute?.name,
                    label: av.attribute?.label,
                  },
                })) || [];

                const crossReferences = [
                  ...(product.originalReferences || []).map((ref: any) => ({
                    referenceType: ref.referenceType,
                    referenceNumber: ref.referenceNumber,
                    manufacturer: ref.manufacturer,
                    notes: ref.notes,
                  })),
                  ...(product.replacementFor || []).map((ref: any) => ({
                    referenceType: ref.referenceType,
                    referenceNumber: ref.referenceNumber,
                    manufacturer: ref.manufacturer,
                    notes: ref.notes,
                  })),
                ];

                row = [
                  product.id,
                  product.name,
                  product.description || '',
                  product.price,
                  product.imageUrl || '',
                  product.stock,
                  product.catalogNumber,
                  product.oemNumber || '',
                  product.isFeatured,
                  product.isArchived,
                  product.categoryId,
                  product.category?.name || '',
                  technicalSpecs,
                  dimensions,
                  standards,
                  JSON.stringify(vehicleFitments),
                  JSON.stringify(attributeValues),
                  JSON.stringify(crossReferences),
                ];
              } else {
                // Basic export row - simple and fast
                const technicalSpecs = product.technicalSpecs
                  ? JSON.stringify(product.technicalSpecs)
                  : '';
                const dimensions = product.dimensions
                  ? JSON.stringify(product.dimensions)
                  : '';
                const standards = product.standards?.length
                  ? `[${product.standards.join(',')}]`
                  : '';

                row = [
                  product.id,
                  product.name,
                  product.description || '',
                  product.price,
                  product.imageUrl || '',
                  product.stock,
                  product.catalogNumber,
                  product.oemNumber || '',
                  product.isFeatured,
                  product.isArchived,
                  product.categoryId,
                  product.categoryName || '',
                  technicalSpecs,
                  dimensions,
                  standards,
                ];
              }

              controller.enqueue(encoder.encode(row.map(escapeCsv).join(',') + '\n'));
            }

            offset += batch.length;
            processedCount += batch.length;
            
            // Log progress every 10k products
            if (processedCount % 10000 === 0) {
              console.log(`[PRODUCTS_EXPORT] Processed ${processedCount} products...`);
            }
            
            // Yield to event loop more frequently for large exports
            await new Promise((resolve) => setTimeout(resolve, 1));
          }

          console.log(`[PRODUCTS_EXPORT] Export completed: ${processedCount} products`);
          controller.close();
        } catch (error) {
          console.error('[PRODUCTS_EXPORT] Stream error:', error);
          controller.error(error);
        }
      },
    });

    const filename = `products-export-${new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[:T]/g, '-')}.csv`;

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[PRODUCTS_EXPORT]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
