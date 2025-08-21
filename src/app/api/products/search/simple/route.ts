import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth";

// Cache per-URL for 30s
export const revalidate = 30;

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query");

    if (!query || query.length < 2) {
      return NextResponse.json([]);
    }

    // Trigram similarity ranking for faster, more relevant admin search
    const q = `%${query}%`;
    const rows = await db.$queryRaw<any>`
      SELECT id, name, "catalogNumber", "oemNumber", price, "imageUrl", "categoryId"
      FROM "Product"
      WHERE (name ILIKE ${q} OR "catalogNumber" ILIKE ${q} OR COALESCE("oemNumber", '') ILIKE ${q})
      ORDER BY GREATEST(similarity(name, ${query}), similarity("catalogNumber", ${query})) DESC, "createdAt" DESC
      LIMIT 20
    `;

    return NextResponse.json(rows);
  } catch (error) {
    console.error("[PRODUCTS_SEARCH_SIMPLE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
