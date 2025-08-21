import { db } from "@/lib/db";
import { SIMILARITY_THRESHOLD, NAME_WEIGHT, CATALOG_WEIGHT } from "@/lib/search-constants";
import { Prisma } from "@prisma/client";
import { 
  SearchParams, 
  AttributeFilter, 
  JsonFilter, 
  ComparisonOperator,
  SearchResult
} from "@/lib/types/search";

/**
 * Izračunava Levenshtein udaljenost između dva stringa
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  // Inicijalizacija matrice
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Popunjavanje matrice
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // zamjena
          matrix[i][j - 1] + 1,     // umetanje
          matrix[i - 1][j] + 1      // brisanje
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Izračunava sličnost između dva stringa (0-1)
 */
export function calculateSimilarity(query: string, productName: string): number {
  const distance = levenshteinDistance(query.toLowerCase(), productName.toLowerCase());
  const maxLength = Math.max(query.length, productName.length);
  return 1 - distance / maxLength;
}

/**
 * Parsira string parametar atributa u niz AttributeFilter objekata
 * Format: name:operator:value,name2:operator2:value2
 * Primjer: diameter:gt:100,material:eq:metal
 */
export function parseAttributeFilters(attributesParam: string): AttributeFilter[] {
  if (!attributesParam) return [];
  
  return attributesParam.split(',').map(filter => {
    const [name, operator, value] = filter.split(':');
    
    if (!name || !operator) return null;
    
    const result: AttributeFilter = {
      name,
      operator: operator as ComparisonOperator,
    };
    
    if (operator === 'between') {
      const [min, max] = value.split('-');
      result.min = parseFloat(min);
      result.max = parseFloat(max);
    } else {
      // Pokušaj pretvoriti u broj ako je moguće
      const numValue = parseFloat(value);
      result.value = isNaN(numValue) ? value : numValue;
    }
    
    return result;
  }).filter(Boolean) as AttributeFilter[];
}

/**
 * Parsira string parametar dimenzija u niz JsonFilter objekata
 * Format: path:operator:value,path2:operator2:value2
 * Primjer: width:eq:100,height:lt:50
 */
export function parseJsonFilters(
  param: string, 
  field: 'dimensions' | 'technicalSpecs'
): JsonFilter[] {
  if (!param) return [];
  
  return param.split(',').map(filter => {
    const [path, operator, value] = filter.split(':');
    
    if (!path || !operator) return null;
    
    const result: JsonFilter = {
      field,
      path,
      operator: operator as ComparisonOperator,
    };
    
    if (operator === 'between') {
      const [min, max] = value.split('-');
      result.min = parseFloat(min);
      result.max = parseFloat(max);
    } else {
      // Pokušaj pretvoriti u broj ako je moguće
      const numValue = parseFloat(value);
      result.value = isNaN(numValue) ? value : numValue;
    }
    
    return result;
  }).filter(Boolean) as JsonFilter[];
}

/**
 * Parsira string parametar sortiranja
 * Format: field:direction
 * Primjer: price:desc
 */
export function parseSortParam(sortParam: string) {
  if (!sortParam) return undefined;
  
  const [field, direction] = sortParam.split(':');
  
  if (!field || !['asc', 'desc'].includes(direction)) {
    return undefined;
  }
  
  return {
    field,
    direction: direction as 'asc' | 'desc'
  };
}

/**
 * Kreira Prisma where uvjet za pretraživanje po atributima
 */
export function buildAttributeWhereCondition(filters: AttributeFilter[]) {
  if (!filters || filters.length === 0) return undefined;
  
  return {
    attributeValues: {
      some: {
        OR: filters.map(filter => {
          const condition: any = {
            attribute: {
              name: filter.name
            }
          };
          
          switch (filter.operator) {
            case 'eq':
              condition.value = String(filter.value);
              break;
            case 'contains':
              condition.value = { contains: String(filter.value), mode: 'insensitive' };
              break;
            case 'gt':
              condition.numericValue = { gt: Number(filter.value) };
              break;
            case 'lt':
              condition.numericValue = { lt: Number(filter.value) };
              break;
            case 'gte':
              condition.numericValue = { gte: Number(filter.value) };
              break;
            case 'lte':
              condition.numericValue = { lte: Number(filter.value) };
              break;
            case 'between':
              condition.numericValue = { 
                gte: Number(filter.min), 
                lte: Number(filter.max) 
              };
              break;
          }
          
          return condition;
        })
      }
    }
  };
}

/**
 * Kreira Prisma where uvjet za pretraživanje po JSON poljima
 */
export function buildJsonWhereCondition(filters: JsonFilter[]) {
  if (!filters || filters.length === 0) return undefined;
  
  return {
    OR: filters.map(filter => {
      const condition: any = {};
      const jsonField = filter.field;
      
      switch (filter.operator) {
        case 'eq':
          condition[jsonField] = {
            path: [filter.path],
            equals: filter.value
          };
          break;
        case 'contains':
          condition[jsonField] = {
            path: [filter.path],
            string_contains: String(filter.value)
          };
          break;
        case 'gt':
          condition[jsonField] = {
            path: [filter.path],
            gt: Number(filter.value)
          };
          break;
        case 'lt':
          condition[jsonField] = {
            path: [filter.path],
            lt: Number(filter.value)
          };
          break;
        case 'gte':
          condition[jsonField] = {
            path: [filter.path],
            gte: Number(filter.value)
          };
          break;
        case 'lte':
          condition[jsonField] = {
            path: [filter.path],
            lte: Number(filter.value)
          };
          break;
        case 'between':
          condition[jsonField] = {
            AND: [
              { path: [filter.path], gte: Number(filter.min) },
              { path: [filter.path], lte: Number(filter.max) }
            ]
          };
          break;
      }
      
      return condition;
    })
  };
}

/**
 * Kreira Prisma where uvjet za pretraživanje po referencama
 */
export function buildReferenceWhereCondition(reference: string, type?: string) {
  if (!reference) return undefined;
  
  const conditions: any[] = [];
  
  if (!type || type === 'all' || type === 'oem') {
    conditions.push({ oemNumber: { contains: reference, mode: 'insensitive' } });
  }
  
  if (!type || type === 'all' || type === 'original') {
    conditions.push({ originalReferences: { has: reference } });
  }
  
  if (!type || type === 'all' || type === 'replacement') {
    conditions.push({ replacementFor: { has: reference } });
  }
  
  return { OR: conditions };
}

/**
 * Izvršava napredno pretraživanje proizvoda
 */
export async function advancedSearch(params: SearchParams): Promise<SearchResult<any>> {
  const {
    query,
    fuzzy,
    categoryId,
    attributes,
    dimensions,
    specs,
    reference,
    referenceType,
    standards,
    page = 1,
    limit = 20,
    sort,
    cursorScore,
    cursorId,
  } = params;
  
  // Ako imamo dovoljno dugačak upit, koristimo relevance keyset pretragu
  if (query && query.length >= 3) {
    // 1) Sastavi CTE za kategorije ako je zadana kategorija
    // 2) Izračunaj score i primijeni keyset WHERE
    // 3) Vrati id, score; zatim dohvatiti detalje proizvoda i očuvati poredak
    type Row = { id: string; score: number };
    let rows: Row[] = [];
    if (categoryId) {
      rows = await db.$queryRaw<Row[]>`
        WITH RECURSIVE cte AS (
          SELECT ${categoryId}::uuid AS id
          UNION ALL
          SELECT c."id" FROM "Category" c JOIN cte ON c."parentId" = cte.id
        )
        SELECT p.id,
          (${NAME_WEIGHT} * similarity(immutable_unaccent(lower(p.name)), immutable_unaccent(lower(${query}))) +
           ${CATALOG_WEIGHT} * similarity(immutable_unaccent(lower(p."catalogNumber")), immutable_unaccent(lower(${query})))) AS score
        FROM "Product" p
        WHERE (
          immutable_unaccent(lower(p.name)) % immutable_unaccent(lower(${query}))
          OR immutable_unaccent(lower(p."catalogNumber")) % immutable_unaccent(lower(${query}))
          OR immutable_unaccent(lower(COALESCE(p."oemNumber", ''))) % immutable_unaccent(lower(${query}))
        )
        AND p."categoryId" IN (SELECT id FROM cte)
        AND (
          similarity(immutable_unaccent(lower(p.name)), immutable_unaccent(lower(${query}))) > ${SIMILARITY_THRESHOLD} OR
          similarity(immutable_unaccent(lower(p."catalogNumber")), immutable_unaccent(lower(${query}))) > ${SIMILARITY_THRESHOLD} OR
          similarity(immutable_unaccent(lower(COALESCE(p."oemNumber", ''))), immutable_unaccent(lower(${query}))) > ${SIMILARITY_THRESHOLD}
        )
        AND (
          ${cursorScore == null && cursorId == null}
          OR score < ${cursorScore as any}
          OR (score = ${cursorScore as any} AND p.id < ${cursorId as any})
        )
        ORDER BY score DESC, p.id DESC
        LIMIT ${Number(limit)}
      `;
    } else {
      rows = await db.$queryRaw<Row[]>`
        SELECT p.id,
          (${NAME_WEIGHT} * similarity(immutable_unaccent(lower(p.name)), immutable_unaccent(lower(${query}))) +
           ${CATALOG_WEIGHT} * similarity(immutable_unaccent(lower(p."catalogNumber")), immutable_unaccent(lower(${query})))) AS score
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
        AND (
          ${cursorScore == null && cursorId == null}
          OR score < ${cursorScore as any}
          OR (score = ${cursorScore as any} AND p.id < ${cursorId as any})
        )
        ORDER BY score DESC, p.id DESC
        LIMIT ${Number(limit)}
      `;
    }

    const ids = rows.map(r => r.id);
    if (ids.length === 0) {
      return { items: [], total: 0, page, limit, totalPages: 0, nextCursor: null };
    }

    // Dohvati detalje i očuvaj poredak
    const productsUnordered = await db.product.findMany({
      where: { id: { in: ids } },
      include: {
        category: true,
        attributeValues: { include: { attribute: true } },
      },
    });
    const map = new Map(productsUnordered.map(p => [p.id, p]));
    const items = ids.map(id => map.get(id)).filter(Boolean);

    // Sljedeći kursor
    const last = rows[rows.length - 1];
    const nextCursor = rows.length === Number(limit) ? { score: last.score, id: last.id } : null;

    // Procijeni total preko sličnih filtera (bez keyset)
    // Napomena: ovo može biti teže za DB, ali daje kompletan broj za UI
    let totalRows: Array<{ count: bigint }> = [];
    if (categoryId) {
      totalRows = await db.$queryRaw<Array<{ count: bigint }>>`
        WITH RECURSIVE cte AS (
          SELECT ${categoryId}::uuid AS id
          UNION ALL
          SELECT c."id" FROM "Category" c JOIN cte ON c."parentId" = cte.id
        )
        SELECT COUNT(*)::bigint AS count
        FROM "Product" p
        WHERE (
          immutable_unaccent(lower(p.name)) % immutable_unaccent(lower(${query}))
          OR immutable_unaccent(lower(p."catalogNumber")) % immutable_unaccent(lower(${query}))
          OR immutable_unaccent(lower(COALESCE(p."oemNumber", ''))) % immutable_unaccent(lower(${query}))
        )
        AND p."categoryId" IN (SELECT id FROM cte)
        AND (
          similarity(immutable_unaccent(lower(p.name)), immutable_unaccent(lower(${query}))) > ${SIMILARITY_THRESHOLD} OR
          similarity(immutable_unaccent(lower(p."catalogNumber")), immutable_unaccent(lower(${query}))) > ${SIMILARITY_THRESHOLD} OR
          similarity(immutable_unaccent(lower(COALESCE(p."oemNumber", ''))), immutable_unaccent(lower(${query}))) > ${SIMILARITY_THRESHOLD}
        )
      `;
    } else {
      totalRows = await db.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS count
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
      `;
    }
    const total = Number(totalRows[0]?.count ?? 0);
    const totalPages = Math.ceil(total / Number(limit));

    return { items: items as any[], total, page, limit: Number(limit), totalPages, nextCursor };
  }

  // Osnovni where uvjet (non-query i fallback)
  const where: any = {};
  const whereConditions: any[] = [];
  
  // Dodavanje uvjeta za tekstualno pretraživanje
  // Umjesto Prisma contains (koji ne koristi trigram GIN), prefiltriramo ID-jeve raw SQL-om sa unaccent+trigram
  let prefilteredIds: string[] | null = null;
  if (query && query.length >= 3) {
    try {
      if (categoryId) {
        const rows = await db.$queryRaw<{ id: string }[]>`
          WITH RECURSIVE cte AS (
            SELECT ${categoryId}::uuid AS id
            UNION ALL
            SELECT c."id" FROM "Category" c JOIN cte ON c."parentId" = cte.id
          )
          SELECT p.id
          FROM "Product" p
          WHERE (
            immutable_unaccent(lower(p.name)) % immutable_unaccent(lower(${query}))
            OR immutable_unaccent(lower(p."catalogNumber")) % immutable_unaccent(lower(${query}))
            OR immutable_unaccent(lower(COALESCE(p."oemNumber", ''))) % immutable_unaccent(lower(${query}))
          )
          AND p."categoryId" IN (SELECT id FROM cte)
          AND (
            similarity(immutable_unaccent(lower(p.name)), immutable_unaccent(lower(${query}))) > ${SIMILARITY_THRESHOLD} OR
            similarity(immutable_unaccent(lower(p."catalogNumber")), immutable_unaccent(lower(${query}))) > ${SIMILARITY_THRESHOLD} OR
            similarity(immutable_unaccent(lower(COALESCE(p."oemNumber", ''))), immutable_unaccent(lower(${query}))) > ${SIMILARITY_THRESHOLD}
          )
          ORDER BY (
            ${NAME_WEIGHT} * similarity(immutable_unaccent(lower(p.name)), immutable_unaccent(lower(${query}))) +
            ${CATALOG_WEIGHT} * similarity(immutable_unaccent(lower(p."catalogNumber")), immutable_unaccent(lower(${query})))
          ) DESC, p."createdAt" DESC
          LIMIT 5000
        `;
        prefilteredIds = rows.map(r => r.id);
      } else {
        const rows = await db.$queryRaw<{ id: string }[]>`
          SELECT p.id
          FROM "Product" p
          WHERE (
            immutable_unaccent(lower(p.name)) % immutable_unaccent(lower(${query}))
            OR immutable_unaccent(lower(p."catalogNumber")) % immutable_unaccent(lower(${query}))
            OR immutable_unaccent(lower(COALESCE(p."oemNumber", ''))) % immutable_unaccent(lower(${query}))
          )
          AND (
            similarity(immutable_unaccent(lower(p.name)), immutable_unaccent(lower(${query}))) > 0.1 OR
            similarity(immutable_unaccent(lower(p."catalogNumber")), immutable_unaccent(lower(${query}))) > 0.1 OR
            similarity(immutable_unaccent(lower(COALESCE(p."oemNumber", ''))), immutable_unaccent(lower(${query}))) > 0.1
          )
          ORDER BY (
            0.7 * similarity(immutable_unaccent(lower(p.name)), immutable_unaccent(lower(${query}))) +
            0.3 * similarity(immutable_unaccent(lower(p."catalogNumber")), immutable_unaccent(lower(${query})))
          ) DESC, p."createdAt" DESC
          LIMIT 5000
        `;
        prefilteredIds = rows.map(r => r.id);
      }
    } catch (e) {
      // Ako raw pretraga zakaže, fallback na Prisma contains filter (sporije)
      whereConditions.push({
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { catalogNumber: { contains: query, mode: 'insensitive' } }
        ]
      });
    }
  } else if (query) {
    // Za kratke upite (<3), koristi fallback zbog niske kvalitete trigram matcheva
    whereConditions.push({
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { catalogNumber: { contains: query, mode: 'insensitive' } }
      ]
    });
  }
  
  // Dodavanje uvjeta za kategoriju (uključi potomke)
  if (categoryId && !prefilteredIds) {
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
      if (catIds.length > 0) {
        where.categoryId = { in: catIds };
      } else {
        // Ako nema potomaka (ne bi se trebalo desiti), koristi samo zadanu kategoriju
        where.categoryId = categoryId;
      }
    } catch {
      // Fallback na strogo filtriranje ako CTE zakaže
      where.categoryId = categoryId;
    }
  }

  // Ako smo prefiltrirali ID-jeve, primijeni ih na where
  if (prefilteredIds) {
    if (prefilteredIds.length === 0) {
      return { items: [], total: 0, page, limit, totalPages: 0 };
    }
    where.id = { in: prefilteredIds };
  }
  
  // Dodavanje uvjeta za atribute
  if (attributes && attributes.length > 0) {
    whereConditions.push(buildAttributeWhereCondition(attributes));
  }
  
  // Dodavanje uvjeta za dimenzije
  if (dimensions && dimensions.length > 0) {
    whereConditions.push(buildJsonWhereCondition(dimensions));
  }
  
  // Dodavanje uvjeta za tehničke specifikacije
  if (specs && specs.length > 0) {
    whereConditions.push(buildJsonWhereCondition(specs));
  }
  
  // Dodavanje uvjeta za reference
  if (reference) {
    whereConditions.push(buildReferenceWhereCondition(reference, referenceType));
  }
  
  // Dodavanje uvjeta za standarde
  if (standards && standards.length > 0) {
    whereConditions.push({
      OR: [
        { standards: { hasSome: standards } },
        {
          attributeValues: {
            some: {
              attribute: {
                name: 'standard'
              },
              value: {
                in: standards
              }
            }
          }
        }
      ]
    });
  }
  
  // Kombiniranje svih uvjeta
  if (whereConditions.length > 0) {
    if (whereConditions.length === 1) {
      Object.assign(where, whereConditions[0]);
    } else {
      where.AND = whereConditions;
    }
  }
  
  // Definiranje sortiranja
  const orderBy: any = {};
  if (sort) {
    orderBy[sort.field] = sort.direction;
  } else {
    orderBy.createdAt = 'desc';
  }
  
  // Izvršavanje upita za ukupan broj rezultata
  const total = await db.product.count({ where });
  
  // Izvršavanje upita za dohvat proizvoda
  const products = await db.product.findMany({
    where,
    skip: (page - 1) * limit,
    take: limit,
    orderBy,
    include: {
      category: true,
      attributeValues: {
        include: {
          attribute: true
        }
      }
    }
  });
  
  // Ako je uključeno fuzzy pretraživanje, dodatno filtriraj rezultate
  let filteredProducts = products;
  if (query && fuzzy) {
    const similarityThreshold = 0.7; // 70% sličnost
    filteredProducts = products.filter(product => 
      calculateSimilarity(query, product.name) >= similarityThreshold
    );
  }
  
  // Izračunavanje ukupnog broja stranica
  const totalPages = Math.ceil(total / limit);
  
  return {
    items: filteredProducts,
    total,
    page,
    limit,
    totalPages
  };
}
