import { db } from "@/lib/db";
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
    sort
  } = params;
  
  // Osnovni where uvjet
  const where: any = {};
  const whereConditions: any[] = [];
  
  // Dodavanje uvjeta za tekstualno pretraživanje
  if (query) {
    whereConditions.push({
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { catalogNumber: { contains: query, mode: 'insensitive' } }
      ]
    });
  }
  
  // Dodavanje uvjeta za kategoriju
  if (categoryId) {
    where.categoryId = categoryId;
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
