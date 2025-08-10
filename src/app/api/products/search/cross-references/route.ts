import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

// Shema za validaciju parametara pretrage
const searchParamsSchema = z.object({
  query: z.string().min(1, { message: 'Upit za pretragu je obavezan' }).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(10)
});

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const query = url.searchParams.get('query') || '';
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');

    // Validacija parametara
    const result = searchParamsSchema.safeParse({ query, page, limit });
    if (!result.success) {
      return NextResponse.json({ error: result.error.format() }, { status: 400 });
    }

    const { query: validatedQuery, page: validatedPage, limit: validatedLimit } = result.data;
    const skip = (validatedPage - 1) * validatedLimit;

    // Ako nema upita, vrati praznu listu
    if (!validatedQuery) {
      return NextResponse.json({ 
        products: [], 
        total: 0, 
        page: validatedPage, 
        limit: validatedLimit,
        totalPages: 0 
      });
    }

    // Pretraga po cross-referencama (OEM i aftermarket brojevima)
    const [products, total] = await Promise.all([
      db.product.findMany({
        where: {
          OR: [
            // Pretraga po OEM broju proizvoda
            {
              oemNumber: {
                contains: validatedQuery,
                mode: 'insensitive'
              }
            },
            // Pretraga po originalnim referencama
            {
              originalReferences: {
                some: {
                  referenceNumber: {
                    contains: validatedQuery,
                    mode: 'insensitive'
                  }
                }
              }
            },
            // Pretraga po zamjenskim referencama
            {
              replacementFor: {
                some: {
                  referenceNumber: {
                    contains: validatedQuery,
                    mode: 'insensitive'
                  }
                }
              }
            }
          ]
        },
        select: {
          id: true,
          name: true,
          catalogNumber: true,
          oemNumber: true,
          price: true,
          imageUrl: true,
          originalReferences: {
            select: {
              id: true,
              referenceNumber: true,
              referenceType: true
            }
          },
          replacementFor: {
            select: {
              id: true,
              referenceNumber: true,
              referenceType: true
            }
          }
        },
        skip,
        take: validatedLimit,
        orderBy: {
          name: 'asc'
        }
      }),
      db.product.count({
        where: {
          OR: [
            {
              oemNumber: {
                contains: validatedQuery,
                mode: 'insensitive'
              }
            },
            {
              originalReferences: {
                some: {
                  referenceNumber: {
                    contains: validatedQuery,
                    mode: 'insensitive'
                  }
                }
              }
            },
            {
              replacementFor: {
                some: {
                  referenceNumber: {
                    contains: validatedQuery,
                    mode: 'insensitive'
                  }
                }
              }
            }
          ]
        }
      })
    ]);

    const totalPages = Math.ceil(total / validatedLimit);

    return NextResponse.json({
      products,
      total,
      page: validatedPage,
      limit: validatedLimit,
      totalPages
    });

  } catch (error) {
    console.error('Error searching products by cross-references:', error);
    return NextResponse.json(
      { error: 'Greška prilikom pretrage proizvoda po cross-referencama' },
      { status: 500 }
    );
  }
}
