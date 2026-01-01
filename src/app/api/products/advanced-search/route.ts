import { NextResponse } from 'next/server';
import { rateLimit, keyFromIpAndPath } from '@/lib/ratelimit';
import { z } from 'zod';
import { db } from '@/lib/db';
import { SIMILARITY_THRESHOLD, NAME_WEIGHT, CATALOG_WEIGHT } from '@/lib/search-constants';

// Shema za validaciju parametara napredne pretrage
const advancedSearchParamsSchema = z.object({
  query: z.string().optional(),
  categoryId: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  attributes: z.record(z.string(), z.string()).optional(), // { attributeId: value }
  crossReferenceNumber: z.string().optional(),
  vehicleGenerationId: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(10),
  sortBy: z.enum(['name', 'price', 'createdAt']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc')
});

async function getTrigramPrefilterIdsForAdvanced(query: string, limit: number): Promise<string[] | null> {
  if (!query || query.length < 3) return null;
  try {
    const rows = await db.$queryRaw<{ id: string }[]>`
      SELECT p.id
      FROM "Product" p
      WHERE (
        immutable_unaccent(lower(p.name)) % immutable_unaccent(lower(${query}))
        OR immutable_unaccent(lower(p."catalogNumber")) % immutable_unaccent(lower(${query}))
        OR immutable_unaccent(lower(COALESCE(p."oemNumber", ''))) % immutable_unaccent(lower(${query}))
      )
      AND (
        similarity(immutable_unaccent(lower(p.name)), immutable_unaccent(lower(${query}))) > ${SIMILARITY_THRESHOLD} OR
        similarity(immutable_unaccent(lower(p."catalogNumber")), immutable_unaccent(lower(${query}))) > ${SIMILARITY_THRESHOLD} OR
        similarity(immutable_unaccent(lower(COALESCE(p."oemNumber", ''))), immutable_unaccent(lower(${query}))) > ${SIMILARITY_THRESHOLD}
      )
      ORDER BY (
        ${NAME_WEIGHT} * similarity(immutable_unaccent(lower(p.name)), immutable_unaccent(lower(${query}))) +
        ${CATALOG_WEIGHT} * similarity(immutable_unaccent(lower(p."catalogNumber")), immutable_unaccent(lower(${query})))
      ) DESC, p."createdAt" DESC
      LIMIT ${Number(limit)}
    `;
    return rows.map(r => r.id);
  } catch (error) {
    console.error('[ADVANCED_PRODUCTS_TRIGRAM_PREFILTER_ERROR]', error);
    return null;
  }
}

export async function GET(req: Request) {
  try {
    // Rate limit advanced search
    const ip = (typeof (req as any).ip === 'string' && (req as any).ip)
      || (req.headers.get('x-forwarded-for')?.split(',')[0]?.trim())
      || req.headers.get('x-real-ip')
      || null;
    const key = keyFromIpAndPath(ip, '/api/products/advanced-search');
    const rl = await rateLimit(key, 10, 60_000);
    if (!rl.ok) {
      const res = NextResponse.json({ error: 'Previše zahtjeva. Pokušajte ponovo kasnije.' }, { status: 429 });
      res.headers.set('RateLimit-Limit', '10');
      res.headers.set('RateLimit-Remaining', String(rl.remaining));
      res.headers.set('RateLimit-Reset', String(Math.ceil(rl.resetInMs / 1000)));
      return res;
    }
    
    const url = new URL(req.url);
    
    // Osnovni parametri
    const query = url.searchParams.get('query') || '';
    const categoryId = url.searchParams.get('categoryId') || undefined;
    const minPrice = url.searchParams.get('minPrice') ? parseFloat(url.searchParams.get('minPrice')!) : undefined;
    const maxPrice = url.searchParams.get('maxPrice') ? parseFloat(url.searchParams.get('maxPrice')!) : undefined;
    const crossReferenceNumber = url.searchParams.get('crossReferenceNumber') || undefined;
    const vehicleGenerationId = url.searchParams.get('vehicleGenerationId') || undefined;
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const sortBy = (url.searchParams.get('sortBy') || 'name') as 'name' | 'price' | 'createdAt';
    const sortOrder = (url.searchParams.get('sortOrder') || 'asc') as 'asc' | 'desc';
    
    // Atributi - parsiranje iz JSON stringa
    let attributes: Record<string, string> = {};
    const attributesParam = url.searchParams.get('attributes');
    if (attributesParam) {
      try {
        attributes = JSON.parse(attributesParam);
      } catch (e) {
        return NextResponse.json({ error: 'Neispravan format atributa' }, { status: 400 });
      }
    }

    // Validacija parametara
    const result = advancedSearchParamsSchema.safeParse({
      query,
      categoryId,
      minPrice,
      maxPrice,
      attributes,
      crossReferenceNumber,
      vehicleGenerationId,
      page,
      limit,
      sortBy,
      sortOrder
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error.format() }, { status: 400 });
    }

    const {
      query: validatedQuery,
      categoryId: validatedCategoryId,
      minPrice: validatedMinPrice,
      maxPrice: validatedMaxPrice,
      attributes: validatedAttributes,
      crossReferenceNumber: validatedCrossReferenceNumber,
      vehicleGenerationId: validatedVehicleGenerationId,
      page: validatedPage,
      limit: validatedLimit,
      sortBy: validatedSortBy,
      sortOrder: validatedSortOrder
    } = result.data;

    const skip = (validatedPage - 1) * validatedLimit;

    // Izgradnja WHERE uvjeta za pretragu
    const whereConditions: any = {
      isArchived: false
    };

    const useTrigramAdvancedSearch = process.env.USE_TRIGRAM_ADVANCED_SEARCH === 'true';
    let prefilteredIds: string[] | null = null;

    if (useTrigramAdvancedSearch && validatedQuery && validatedQuery.length >= 3) {
      prefilteredIds = await getTrigramPrefilterIdsForAdvanced(validatedQuery.trim(), 5000);
      if (prefilteredIds && prefilteredIds.length > 0) {
        (whereConditions as any).id = { in: prefilteredIds };
      } else if (prefilteredIds && prefilteredIds.length === 0) {
        return NextResponse.json({
          products: [],
          total: 0,
          page: validatedPage,
          limit: validatedLimit,
          totalPages: 0
        });
      }
    }

    // Filtriranje po kategoriji
    if (validatedCategoryId) {
      whereConditions.categoryId = validatedCategoryId;
    }

    // Filtriranje po rasponu cijena
    if (validatedMinPrice !== undefined || validatedMaxPrice !== undefined) {
      whereConditions.price = {};
      if (validatedMinPrice !== undefined) {
        whereConditions.price.gte = validatedMinPrice;
      }
      if (validatedMaxPrice !== undefined) {
        whereConditions.price.lte = validatedMaxPrice;
      }
    }

    // Filtriranje po vozilu
    if (validatedVehicleGenerationId) {
      whereConditions.vehicleFitments = {
        some: {
          generationId: validatedVehicleGenerationId
        }
      };
    }

    // Filtriranje po tekstu pretrage (naziv, kataloški broj, OEM broj)
    if (validatedQuery && validatedQuery.length >= 2) {
      whereConditions.OR = [
        { name: { contains: validatedQuery, mode: 'insensitive' } },
        { catalogNumber: { contains: validatedQuery, mode: 'insensitive' } },
        { oemNumber: { contains: validatedQuery, mode: 'insensitive' } }
      ];
    }

    // Filtriranje po cross-reference broju
    if (validatedCrossReferenceNumber) {
      if (!whereConditions.OR) {
        whereConditions.OR = [];
      }
      
      whereConditions.OR.push(
        {
          originalReferences: {
            some: {
              referenceNumber: {
                contains: validatedCrossReferenceNumber,
                mode: 'insensitive'
              }
            }
          }
        },
        {
          replacementFor: {
            some: {
              referenceNumber: {
                contains: validatedCrossReferenceNumber,
                mode: 'insensitive'
              }
            }
          }
        }
      );
    }

    // Filtriranje po atributima
    if (validatedAttributes && Object.keys(validatedAttributes).length > 0) {
      const attributeConditions = Object.entries(validatedAttributes).map(([attributeId, value]) => ({
        attributeValues: {
          some: {
            attributeId,
            value: {
              contains: value,
              mode: 'insensitive'
            }
          }
        }
      }));

      if (attributeConditions.length > 0) {
        whereConditions.AND = attributeConditions;
      }
    }

    // Izvršavanje upita
    const [products, total] = await Promise.all([
      db.product.findMany({
        where: whereConditions,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              imageUrl: true,
            }
          },
          attributeValues: {
            include: {
              attribute: true
            }
          },
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
          },
          compatibleBrands: {
            select: {
              id: true,
              name: true,
            }
          }
        },
        skip,
        take: validatedLimit,
        orderBy: {
          [validatedSortBy]: validatedSortOrder
        }
      }),
      db.product.count({
        where: whereConditions
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
    console.error('Error in advanced product search:', error);
    return NextResponse.json(
      { error: 'Greška prilikom napredne pretrage proizvoda' },
      { status: 500 }
    );
  }
}
