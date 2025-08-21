import { NextResponse } from "next/server";
import { SIMILARITY_THRESHOLD, NAME_WEIGHT, CATALOG_WEIGHT } from '@/lib/search-constants';
import { db } from "@/lib/db";
import { 
  advancedSearch, 
  parseAttributeFilters, 
  parseJsonFilters, 
  parseSortParam 
} from "@/lib/search-utils";
import { SearchParams } from "@/lib/types/search";
import { rateLimit, keyFromIpAndPath } from "@/lib/ratelimit";

// Cache per-URL for 30s to smooth traffic while keeping results fresh
export const revalidate = 30;

// We will use a recursive CTE in SQL for category descendants to avoid N+1

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");
    const mode = searchParams.get("mode") || "basic";

    // Simple per-IP rate limiting
    const ip = (typeof (req as any).ip === 'string' && (req as any).ip)
      || (req.headers.get('x-forwarded-for')?.split(',')[0]?.trim())
      || req.headers.get('x-real-ip')
      || null;
    const pathKey = mode === 'advanced' ? '/api/products/search:advanced' : '/api/products/search:basic';
    const limitConfig = mode === 'advanced' ? { limit: 10, windowMs: 60_000 } : { limit: 20, windowMs: 60_000 };
    const key = keyFromIpAndPath(ip, pathKey);
    const rl = rateLimit(key, limitConfig.limit, limitConfig.windowMs);
    if (!rl.ok) {
      const res = NextResponse.json({ error: 'Previše zahtjeva. Pokušajte ponovo kasnije.' }, { status: 429 });
      res.headers.set('RateLimit-Limit', String(limitConfig.limit));
      res.headers.set('RateLimit-Remaining', String(rl.remaining));
      res.headers.set('RateLimit-Reset', String(Math.ceil(rl.resetInMs / 1000)));
      return res;
    }

    // Osnovna pretraga (brža uz trigram + unaccent, indeksirano)
    if (mode === "basic") {
      if (!query || query.length < 3) {
        return NextResponse.json(
          { error: "Upit za pretragu mora sadržavati najmanje 3 znaka" },
          { status: 400 }
        );
      }

      const categoryId = searchParams.get("categoryId");

      // Normalize query once in SQL using lower+unaccent; use trigram % operator to leverage GIN indexes
      let rows: any[];
      if (categoryId) {
        rows = await db.$queryRaw<any>`
          WITH RECURSIVE cte AS (
            SELECT ${categoryId}::uuid AS id
            UNION ALL
            SELECT c."id"
            FROM "Category" c
            JOIN cte ON c."parentId" = cte.id
          )
          SELECT p.id, p.name, p."catalogNumber", p."oemNumber", p.price, p."imageUrl", p."categoryId"
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
          LIMIT 20
        `;
      } else {
        rows = await db.$queryRaw<any>`
          SELECT p.id, p.name, p."catalogNumber", p."oemNumber", p.price, p."imageUrl", p."categoryId"
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
          LIMIT 20
        `;
      }

      return NextResponse.json(rows);
    }
    
    // Napredna pretraga
    if (mode === "advanced") {
      // Parsiranje parametara pretrage
      const params: SearchParams = {
        query: searchParams.get("q") || undefined,
        fuzzy: searchParams.get("fuzzy") === "true",
        categoryId: searchParams.get("categoryId") || undefined,
        attributes: parseAttributeFilters(searchParams.get("attributes") || ""),
        dimensions: parseJsonFilters(searchParams.get("dimensions") || "", "dimensions"),
        specs: parseJsonFilters(searchParams.get("specs") || "", "technicalSpecs"),
        reference: searchParams.get("reference") || undefined,
        referenceType: searchParams.get("referenceType") as any || undefined,
        standards: searchParams.get("standards")?.split(",") || [],
        page: parseInt(searchParams.get("page") || "1"),
        limit: parseInt(searchParams.get("limit") || "20"),
        sort: parseSortParam(searchParams.get("sort") || ""),
        cursorScore: searchParams.get("cursorScore") ? Number(searchParams.get("cursorScore")) : undefined,
        cursorId: searchParams.get("cursorId") || undefined,
      };

      // Izvršavanje napredne pretrage
      const results = await advancedSearch(params);
      return NextResponse.json(results);
    }

    return NextResponse.json(
      { error: "Nevažeći način pretrage" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error searching products:", error);
    return NextResponse.json(
      { error: "Greška prilikom pretraživanja proizvoda" },
      { status: 500 }
    );
  }
}
