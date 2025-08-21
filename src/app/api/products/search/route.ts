import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { 
  advancedSearch, 
  parseAttributeFilters, 
  parseJsonFilters, 
  parseSortParam 
} from "@/lib/search-utils";
import { SearchParams } from "@/lib/types/search";

// Helper: collect a category and all of its descendants' IDs
async function getCategoryAndChildrenIds(categoryId: string): Promise<string[]> {
  const allIds: string[] = [categoryId];
  const queue: string[] = [categoryId];
  while (queue.length > 0) {
    const currentId = queue.shift();
    if (!currentId) continue;
    const children = await db.category.findMany({
      where: { parentId: currentId },
      select: { id: true },
    });
    const childrenIds = children.map((c) => c.id);
    if (childrenIds.length > 0) {
      allIds.push(...childrenIds);
      queue.push(...childrenIds);
    }
  }
  return allIds;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");
    const mode = searchParams.get("mode") || "basic";

    // Osnovna pretraga (kompatibilnost s postojećim kodom)
    if (mode === "basic") {
      if (!query || query.length < 3) {
        return NextResponse.json(
          { error: "Upit za pretragu mora sadržavati najmanje 3 znaka" },
          { status: 400 }
        );
      }

      const categoryId = searchParams.get("categoryId");
      let where: any = {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { catalogNumber: { contains: query, mode: "insensitive" } },
          { oemNumber: { contains: query, mode: "insensitive" } },
        ],
      };
      if (categoryId) {
        const ids = await getCategoryAndChildrenIds(categoryId);
        where.categoryId = { in: ids };
      }

      // Pretraživanje proizvoda po nazivu, kataloškom broju ili OEM broju
      const products = await db.product.findMany({
        where,
        select: {
          id: true,
          name: true,
          catalogNumber: true,
          oemNumber: true,
          price: true,
        },
        take: 20, // Ograničenje broja rezultata
      });

      return NextResponse.json(products);
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
        sort: parseSortParam(searchParams.get("sort") || "")
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
