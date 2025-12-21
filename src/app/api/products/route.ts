import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { SIMILARITY_THRESHOLD, NAME_WEIGHT, CATALOG_WEIGHT } from '@/lib/search-constants';
import { calculateB2BPrice, getUserDiscountProfile } from '@/lib/b2b/discount-service';
import { productApiSchema } from '@/lib/validations/product';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';
import { markExactMatches, sortWithExactMatchesFirst } from '@/lib/exact-match-utils';

// Enable ISR-style caching for this route per-URL for 60 seconds
export const revalidate = 60;

// Pomoćna funkcija za dohvat kategorije i svih njenih podkategorija (potomaka)
type CategoryTreeCache = {
  expires: number;
  childrenByParent: Map<string, string[]>;
};

type CategoryIdsCacheEntry = {
  expires: number;
  ids: string[];
};

const CATEGORY_CACHE_TTL = 60_000; // 60s
const ENABLE_QUERY_LOG = process.env.PRISMA_LOG_QUERIES === 'true';
let categoryTreeCache: CategoryTreeCache | null = null;
const categoryIdsCache = new Map<string, CategoryIdsCacheEntry>();

async function getCategoryTree(): Promise<Map<string, string[]>> {
  const now = Date.now();
  if (!categoryTreeCache || categoryTreeCache.expires < now) {
    const categoryArgs = {
      select: { id: true, parentId: true },
    } as const;
    logQuery('Category', 'findMany', categoryArgs);
    const categories = await db.category.findMany(categoryArgs);

    const childrenByParent = new Map<string, string[]>();
    for (const cat of categories) {
      if (!cat.parentId) continue;
      const arr = childrenByParent.get(cat.parentId) ?? [];
      arr.push(cat.id);
      childrenByParent.set(cat.parentId, arr);
    }

    categoryTreeCache = {
      expires: now + CATEGORY_CACHE_TTL,
      childrenByParent,
    };
    categoryIdsCache.clear();
  }

  return categoryTreeCache.childrenByParent;
}

async function getCategoryAndChildrenIds(categoryId: string): Promise<string[]> {
  const now = Date.now();
  const cached = categoryIdsCache.get(categoryId);
  if (cached && cached.expires > now) {
    return cached.ids;
  }

  const childrenByParent = await getCategoryTree();
  const stack = [categoryId];
  const idSet = new Set<string>();

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    if (!idSet.has(current)) {
      idSet.add(current);
    }
    const children = childrenByParent.get(current);
    if (children && children.length) {
      for (const child of children) {
        if (!idSet.has(child)) stack.push(child);
      }
    }
  }

  const ids = Array.from(idSet);
  categoryIdsCache.set(categoryId, { ids, expires: now + CATEGORY_CACHE_TTL });
  return ids;
}

function logQuery(model: string, operation: string, args: unknown) {
  if (!ENABLE_QUERY_LOG) return;
  console.info(`[PRISMA][${model}.${operation}]`, JSON.stringify(args));
}

async function getTrigramPrefilterIdsForListing(query: string, limit: number): Promise<string[] | null> {
  if (!query || query.length < 3) return null;
  try {
    const rows = await db.$queryRaw<{ id: string }[]>`
      SELECT DISTINCT p.id, p."createdAt",
        (
          ${NAME_WEIGHT} * similarity(immutable_unaccent(lower(p.name)), immutable_unaccent(lower(${query}))) +
          ${CATALOG_WEIGHT} * similarity(immutable_unaccent(lower(p."catalogNumber")), immutable_unaccent(lower(${query})))
        ) as similarity_score
      FROM "Product" p
      LEFT JOIN "ArticleOENumber" aoe ON aoe."productId" = p.id
      WHERE (
        immutable_unaccent(lower(p.name)) % immutable_unaccent(lower(${query}))
        OR immutable_unaccent(lower(p."catalogNumber")) % immutable_unaccent(lower(${query}))
        OR immutable_unaccent(lower(COALESCE(p."oemNumber", ''))) % immutable_unaccent(lower(${query}))
        OR immutable_unaccent(lower(COALESCE(aoe."oemNumber", ''))) % immutable_unaccent(lower(${query}))
        OR normalize_oem(COALESCE(p."oemNumber", '')) = normalize_oem(${query})
        OR normalize_oem(COALESCE(aoe."oemNumber", '')) = normalize_oem(${query})
      )
      AND (
        similarity(immutable_unaccent(lower(p.name)), immutable_unaccent(lower(${query}))) > ${SIMILARITY_THRESHOLD} OR
        similarity(immutable_unaccent(lower(p."catalogNumber")), immutable_unaccent(lower(${query}))) > ${SIMILARITY_THRESHOLD} OR
        similarity(immutable_unaccent(lower(COALESCE(p."oemNumber", ''))), immutable_unaccent(lower(${query}))) > ${SIMILARITY_THRESHOLD} OR
        similarity(immutable_unaccent(lower(COALESCE(aoe."oemNumber", ''))), immutable_unaccent(lower(${query}))) > ${SIMILARITY_THRESHOLD} OR
        normalize_oem(COALESCE(p."oemNumber", '')) = normalize_oem(${query}) OR
        normalize_oem(COALESCE(aoe."oemNumber", '')) = normalize_oem(${query})
      )
      ORDER BY similarity_score DESC, p."createdAt" DESC
      LIMIT ${Number(limit)}
    `;
    return rows.map(r => r.id);
  } catch (error) {
    console.error('[PRODUCTS_TRIGRAM_PREFILTER_ERROR]', error);
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    // B2B session context
    const session = await getServerSession(authOptions);
    const isB2B = session?.user?.role === 'B2B';
    const profile = isB2B && session?.user?.id
      ? await getUserDiscountProfile(session.user.id)
      : null;
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");
    const categoryId = searchParams.get("categoryId");
    const generationId = searchParams.get("generationId");
    const rawEngineId = searchParams.get("engineId");
    const engineId = rawEngineId && rawEngineId !== 'all' && rawEngineId !== 'undefined' && rawEngineId !== 'null' && rawEngineId.trim() !== ''
      ? rawEngineId
      : null;
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const isAdminAssign = searchParams.get('adminAssign') === 'true';
    const rawLimit = parseInt(searchParams.get("limit") || "24");
    const limit = isAdminAssign
      ? Math.min(rawLimit || 24, 1000)
      : Math.min(rawLimit || 24, 100);
    const cursor = searchParams.get("cursor"); // keyset cursor = last item id
    const pageParam = searchParams.get('page');
    const page = pageParam ? Math.max(parseInt(pageParam || '1') || 1, 1) : null;
    const includeOutOfStock = searchParams.get('includeOutOfStock') === 'true';

    let where: any = { isArchived: false };

    if (!includeOutOfStock) {
      where.stock = { gt: 0 };
    }

    const useTrigramListingSearch = process.env.USE_TRIGRAM_LISTING_SEARCH === 'true';
    let prefilteredIds: string[] | null = null;

    if (useTrigramListingSearch && query && query.trim().length >= 3) {
      prefilteredIds = await getTrigramPrefilterIdsForListing(query.trim(), 5000);
      if (prefilteredIds) {
        where.id = { in: prefilteredIds };
      }
    }

    const searchableFields = ['name', 'catalogNumber', 'oemNumber', 'sku', 'description'] as const;
    const buildFieldFilters = (field: typeof searchableFields[number], token: string) => {
      const trimmed = token.trim();
      if (!trimmed) return [];

      const isShort = trimmed.length <= 2;
      const filters: any[] = [];

      if (!isShort) {
        filters.push({ [field]: { contains: trimmed, mode: "insensitive" } });
      }

      filters.push(
        { [field]: { equals: trimmed, mode: "insensitive" } },
        { [field]: { startsWith: `${trimmed} `, mode: "insensitive" } },
        { [field]: { endsWith: ` ${trimmed}`, mode: "insensitive" } },
        { [field]: { contains: ` ${trimmed} `, mode: "insensitive" } },
        { [field]: { contains: `(${trimmed})`, mode: "insensitive" } },
        { [field]: { contains: `/${trimmed}/`, mode: "insensitive" } },
        { [field]: { contains: `-${trimmed}-`, mode: "insensitive" } },
      );

      return filters;
    };

    const isShortQuery = !!(query && query.trim().length < 3);

    const buildSearchClauses = (token: string) => {
      const fields = isShortQuery
        ? (['catalogNumber', 'oemNumber', 'sku'] as const)
        : searchableFields;
      return fields.flatMap(field => buildFieldFilters(field as typeof searchableFields[number], token));
    };

    const searchTokens = !prefilteredIds && query
      ? query.trim().split(/\s+/).filter(Boolean)
      : [];
    if (searchTokens.length) {
      const tokenConditions = searchTokens.map(token => ({ OR: buildSearchClauses(token) }));
      where.AND = [...(where.AND ?? []), ...tokenConditions];
    }

    if (categoryId) {
      const categoryIds = await getCategoryAndChildrenIds(categoryId);
      where.categoryId = { in: categoryIds };
    }

    if (generationId && engineId) {
      where.vehicleFitments = {
        some: {
          OR: [
            { generationId, engineId },
            { generationId, engineId: null },
            { isUniversal: true },
          ],
        },
      } as any;
    } else if (generationId) {
      where.vehicleFitments = { some: { generationId } } as any;
    } else if (engineId) {
      where.vehicleFitments = { some: { engineId } } as any;
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice);
      if (maxPrice) where.price.lte = parseFloat(maxPrice);
    }

    // If "page" is provided, use offset pagination and return totals in headers
    if (page) {
      const skip = (page - 1) * limit;
      const productFindManyArgs: Parameters<typeof db.product.findMany>[0] = {
        where,
        select: {
          id: true,
          name: true,
          price: true,
          stock: true,
          imageUrl: true,
          catalogNumber: true,
          oemNumber: true,
          tecdocArticleId: true,
          categoryId: true,
          manufacturerId: true,
          createdAt: true,
          updatedAt: true,
          category: { select: { id: true, name: true, parentId: true, imageUrl: true } },
          articleOENumbers: {
            select: {
              id: true,
              oemNumber: true,
              manufacturer: true,
              referenceType: true,
            },
          },
        },
        orderBy: [
          { createdAt: 'desc' },
          { id: 'desc' },
        ],
        skip,
        take: limit,
      };
      logQuery('Product', 'findMany', productFindManyArgs);
      const countArgs: Parameters<typeof db.product.count>[0] = { where };
      logQuery('Product', 'count', countArgs);
      const [itemsRaw, total] = await Promise.all([
        db.product.findMany(productFindManyArgs),
        db.product.count(countArgs),
      ]);

      // Apply featured/B2B pricing
      const ids = itemsRaw.map(i => i.id);
      const featured = ids.length ? await db.featuredProduct.findMany({
        where: { productId: { in: ids }, isActive: true },
      }) : [];
      const fMap = new Map<string, any>();
      for (const f of featured as any[]) fMap.set(f.productId, f);
      const now = new Date();
      const applyPricing = (p: typeof itemsRaw[number]) => {
        const f = fMap.get(p.id) as any;
        if (f && f.isDiscountActive) {
          if (f.startsAt && now < new Date(f.startsAt)) {
            // not started yet
          } else if (f.endsAt && now > new Date(f.endsAt)) {
            // expired
          } else if (f.discountType && f.discountValue && f.discountValue > 0) {
            let newPrice = p.price;
            if (f.discountType === 'PERCENTAGE') newPrice = p.price * (1 - f.discountValue / 100);
            else if (f.discountType === 'FIXED') newPrice = p.price - f.discountValue;
            newPrice = Math.max(newPrice, 0);
            return { ...p, originalPrice: p.price, price: parseFloat(newPrice.toFixed(2)), pricingSource: 'FEATURED' as const };
          }
        }
        if (profile) {
          const resolved = calculateB2BPrice(p.price, profile, {
            categoryId: p.categoryId,
            manufacturerId: p.manufacturerId ?? null,
          });
          if (resolved) {
            return {
              ...p,
              originalPrice: p.price,
              price: resolved.price,
              pricingSource: resolved.source,
            } as any;
          }
        }
        return p;
      };
      const items = itemsRaw.map(applyPricing);

      // Označi egzaktne matchove i sortiraj ih na vrh
      const itemsWithExactMatches = markExactMatches(items, query);
      const sortedItems = sortWithExactMatchesFirst(itemsWithExactMatches);

      const totalPages = Math.max(Math.ceil(total / limit), 1);
      const res = NextResponse.json(sortedItems);
      res.headers.set('X-Total-Count', String(total));
      res.headers.set('X-Total-Pages', String(totalPages));
      res.headers.set('X-Page', String(page));
      res.headers.set('X-Limit', String(limit));
      return res;
    }

    // Otherwise fallback to keyset pagination with cursor
    const cursorFindManyArgs: Parameters<typeof db.product.findMany>[0] = {
      where,
      select: {
        id: true,
        name: true,
        price: true,
        stock: true,
        imageUrl: true,
        catalogNumber: true,
        oemNumber: true,
        tecdocArticleId: true,
        categoryId: true,
        manufacturerId: true,
        createdAt: true,
        updatedAt: true,
        category: { select: { id: true, name: true, parentId: true, imageUrl: true } },
        articleOENumbers: {
          select: {
            id: true,
            oemNumber: true,
            manufacturer: true,
            referenceType: true,
          },
        },
      },
      orderBy: [
        { createdAt: 'desc' },
        { id: 'desc' },
      ],
      take: limit + 1, // fetch one extra to know if there's next page
    };

    if (cursor) {
      cursorFindManyArgs.cursor = { id: cursor };
      cursorFindManyArgs.skip = 1;
    }

    logQuery('Product', 'findMany', cursorFindManyArgs);
    const products = await db.product.findMany(cursorFindManyArgs);

    let nextCursor: string | null = null;
    let items = products;
    if (products.length > limit) {
      const nextItem = products[products.length - 1];
      nextCursor = nextItem.id;
      items = products.slice(0, limit);
    }

    // Apply featured/B2B pricing
    const ids = items.map(i => i.id);
    const featured = ids.length ? await db.featuredProduct.findMany({
      where: { productId: { in: ids }, isActive: true },
    }) : [];
    const fMap = new Map<string, any>();
    for (const f of featured as any[]) fMap.set(f.productId, f);
    const now = new Date();
    const applyPricing = (p: typeof items[number]) => {
      const f = fMap.get(p.id) as any;
      if (f && f.isDiscountActive) {
        if (f.startsAt && now < new Date(f.startsAt)) {
          // not started
        } else if (f.endsAt && now > new Date(f.endsAt)) {
          // expired
        } else if (f.discountType && f.discountValue && f.discountValue > 0) {
          let newPrice = p.price;
          if (f.discountType === 'PERCENTAGE') newPrice = p.price * (1 - f.discountValue / 100);
          else if (f.discountType === 'FIXED') newPrice = p.price - f.discountValue;
          newPrice = Math.max(newPrice, 0);
          return { ...p, originalPrice: p.price, price: parseFloat(newPrice.toFixed(2)), pricingSource: 'FEATURED' as const };
        }
      }
      if (profile) {
        const resolved = calculateB2BPrice(p.price, profile, {
          categoryId: p.categoryId,
          manufacturerId: p.manufacturerId ?? null,
        });
        if (resolved) {
          return {
            ...p,
            originalPrice: p.price,
            price: resolved.price,
            pricingSource: resolved.source,
          } as any;
        }
      }
      return p;
    };
    const pricedItems = items.map(applyPricing);

    // Označi egzaktne matchove i sortiraj ih na vrh
    const itemsWithExactMatches = markExactMatches(pricedItems, query);
    const sortedItems = sortWithExactMatchesFirst(itemsWithExactMatches);

    const res = NextResponse.json(sortedItems);
    if (nextCursor) res.headers.set('X-Next-Cursor', nextCursor);
    return res;
  } catch (error) {
    console.error("Greška pri dohvaćanju proizvoda:", error);
    return NextResponse.json(
      { error: "Greška pri dohvaćanju proizvoda" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = productApiSchema.safeParse(body);

    if (!result.success) {
      console.error('[PRODUCTS_POST_VALIDATION_ERROR]', JSON.stringify(result.error.flatten(), null, 2));
      return new NextResponse(JSON.stringify(result.error.flatten()), { status: 400 });
    }

    const {
      name,
      description,
      price,
      imageUrl,
      categoryId,
      catalogNumber,
      oemNumber,
      generationIds, // Destrukturiramo ID-jeve generacija
      // Dodajemo ostala polja iz validacijske sheme
      weight,
      width,
      height,
      length,
      yearOfManufacture,
      vehicleBrand,
      vehicleModel,
      engineType,
      unitOfMeasure,
      stock,
      lowStockThreshold,
      categoryAttributes, // Dinamički atributi kategorije
    } = result.data;

    // Debug log za generationIds
    try { console.log('[PRODUCTS_POST] generationIds:', generationIds); } catch {}

    // Pripremamo dimensions JSON objekt
    const dimensions = {
      weight: weight || null,
      width: width || null,
      height: height || null,
      length: length || null
    };
    
    // Pripremamo technicalSpecs JSON objekt
    const technicalSpecs = {
      yearOfManufacture: yearOfManufacture || null,
      vehicleBrand: vehicleBrand || null,
      vehicleModel: vehicleModel || null,
      engineType: engineType || null,
      unitOfMeasure: unitOfMeasure || null
    };
    
    // Prvo kreiramo proizvod bez atributa
    const product = await db.product.create({
      data: {
        name,
        description,
        price,
        imageUrl: imageUrl || null,
        categoryId,
        catalogNumber,
        oemNumber,
        // Koristimo JSON polja za dimenzije i tehničke specifikacije
        dimensions,
        technicalSpecs,
        stock: stock || 0,
        lowStockThreshold: lowStockThreshold ?? null,
        // Ne povezujemo generacije ovdje, to ćemo napraviti nakon kreiranja proizvoda
      },
    });

    // Ako postoje dinamički atributi kategorije, kreiramo zapise u ProductAttributeValue tabeli
    if (categoryAttributes && Object.keys(categoryAttributes).length > 0) {
      try {
        // Dohvatimo sve atribute kategorije
        const categoryAttrs = await db.categoryAttribute.findMany({
          where: { categoryId }
        });
        
        // Za svaki atribut u categoryAttributes, kreiramo zapis u ProductAttributeValue
        for (const [attrName, attrValue] of Object.entries(categoryAttributes)) {
          // Pronađi atribut kategorije po imenu
          const attribute = categoryAttrs.find(attr => attr.name === attrName);
          
          if (attribute && attrValue) {
            await db.productAttributeValue.create({
              data: {
                value: attrValue,
                productId: product.id,
                attributeId: attribute.id
              }
            });
          }
        }
      } catch (error) {
        console.error('Error creating product attribute values:', error);
        // Ne prekidamo izvršavanje ako dođe do greške pri kreiranju atributa
      }
    }
    
    // Ako postoje generationIds, kreiramo ProductVehicleFitment zapise (podržava genId ili genId-engineId)
    if (generationIds && generationIds.length > 0) {
      try {
        // Za svaku generaciju/motor kreiramo zapis u ProductVehicleFitment tabeli
        for (const composite of generationIds) {
          let generationId = String(composite);
          let engineId: string | undefined;
          if (String(composite).includes('::')) {
            [generationId, engineId] = String(composite).split('::');
          } else if (String(composite).includes('-')) {
            // Back-compat for older delimiter
            [generationId, engineId] = String(composite).split('-');
          }
          await db.productVehicleFitment.create({
            data: {
              productId: product.id,
              generationId,
              engineId: engineId || null,
              // Ostala polja možemo ostaviti prazna ili postaviti default vrijednosti
              isUniversal: false
            }
          });
        }
      } catch (error) {
        console.error('Error creating product vehicle fitments:', error);
        // Ne prekidamo izvršavanje ako dođe do greške pri kreiranju fitment zapisa
      }
    }
    
    // Vratimo proizvod sa uključenim vehicleFitments kako bismo odmah vidjeli rezultat
    const productWithFitments = await db.product.findUnique({
      where: { id: product.id },
      include: {
        vehicleFitments: {
          include: {
            generation: {
              include: { model: { include: { brand: true } } }
            },
            engine: true,
          }
        }
      }
    });
    // Revalidate caches
    try {
      revalidateTag('products');
      revalidateTag('categories'); // product counts per category might appear in cached UIs
    } catch {}

    return NextResponse.json(productWithFitments ?? product, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.issues), { status: 400 });
    }
    console.error('[PRODUCTS_POST]', error instanceof Error ? error : JSON.stringify(error));
    return new NextResponse('Internal error', { status: 500 });
  }
}
