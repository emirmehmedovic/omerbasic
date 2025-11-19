import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export async function GET(req: Request) {
  try {
    const encoder = new TextEncoder();
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim() || '';
    const categoryId = searchParams.get('categoryId')?.trim() || '';
    const inStockOnly = searchParams.get('inStockOnly') === 'true';

    let categoryWhere: { in: string[] } | { equals: string } | undefined;
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
        const catIds = cats.map(c => c.id);
        categoryWhere = catIds.length ? { in: catIds } : { equals: categoryId };
      } catch {
        categoryWhere = { equals: categoryId };
      }
    }

    const headersRow = [
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
      'technicalSpecs',
      'dimensions',
      'standards',
      'vehicleFitments',
      'attributeValues',
      'crossReferences',
    ].join(',') + '\n';

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          controller.enqueue(encoder.encode(headersRow));
          const PAGE_SIZE = 250;
          let lastId: string | null = null;

          while (true) {
            const whereClause: Record<string, any> = {};
            if (lastId) whereClause.id = { gt: lastId };
            if (categoryWhere) whereClause.categoryId = categoryWhere as any;
            if (inStockOnly) whereClause.stock = { gt: 0 };
            if (q) {
              whereClause.OR = [
                { name: { contains: q, mode: 'insensitive' } },
                { catalogNumber: { contains: q, mode: 'insensitive' } },
                { oemNumber: { contains: q, mode: 'insensitive' } },
              ];
            }

            const batch = await db.product.findMany({
              where: Object.keys(whereClause).length ? whereClause : undefined,
              orderBy: { id: 'asc' },
              take: PAGE_SIZE,
              include: {
                category: true,
                vehicleFitments: {
                  include: {
                    generation: {
                      include: {
                        model: {
                          include: {
                            brand: true,
                          },
                        },
                      },
                    },
                    engine: true,
                  },
                },
                attributeValues: {
                  include: {
                    attribute: true,
                  },
                },
                originalReferences: true,
                replacementFor: true,
              },
            });

            if (!batch.length) break;

            for (const product of batch) {
              const technicalSpecs = product.technicalSpecs
                ? JSON.stringify(product.technicalSpecs)
                : '';
              const dimensions = product.dimensions
                ? JSON.stringify(product.dimensions)
                : '';
              const standards = product.standards && product.standards.length > 0
                ? `[${product.standards.join(',')}]`
                : '';

              const vehicleFitments = product.vehicleFitments.map(fitment => ({
                generationId: fitment.generationId,
                engineId: fitment.engineId,
                fitmentNotes: fitment.fitmentNotes,
                position: fitment.position,
                bodyStyles: fitment.bodyStyles,
                yearFrom: fitment.yearFrom,
                yearTo: fitment.yearTo,
                isUniversal: fitment.isUniversal,
                vehicleInfo: {
                  brand: fitment.generation.model.brand.name,
                  model: fitment.generation.model.name,
                  generation: fitment.generation.name,
                  engine: fitment.engine
                    ? `${fitment.engine.engineType} ${fitment.engine.engineCapacity}ccm ${fitment.engine.enginePowerKW}kW`
                    : null,
                },
              }));

              const attributeValues = product.attributeValues.map(av => ({
                attributeId: av.attributeId,
                value: av.value,
                attributeInfo: {
                  name: av.attribute.name,
                  label: av.attribute.label,
                },
              }));

              const crossReferences = [
                ...product.originalReferences.map(ref => ({
                  referenceType: ref.referenceType,
                  referenceNumber: ref.referenceNumber,
                  manufacturer: ref.manufacturer,
                  notes: ref.notes,
                })),
                ...product.replacementFor.map(ref => ({
                  referenceType: ref.referenceType,
                  referenceNumber: ref.referenceNumber,
                  manufacturer: ref.manufacturer,
                  notes: ref.notes,
                })),
              ];

              const row = [
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
                technicalSpecs,
                dimensions,
                standards,
                JSON.stringify(vehicleFitments),
                JSON.stringify(attributeValues),
                JSON.stringify(crossReferences),
              ]
                .map(escapeCsv)
                .join(',') + '\n';

              controller.enqueue(encoder.encode(row));
            }

            lastId = batch[batch.length - 1].id;
            await new Promise((resolve) => setTimeout(resolve, 0));
          }

          controller.close();
        } catch (error) {
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
