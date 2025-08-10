import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { db } from "@/lib/db";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

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

    // Pretraživanje proizvoda po nazivu, kataloškom broju ili OEM broju
    const products = await db.product.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { catalogNumber: { contains: query, mode: "insensitive" } },
          { oemNumber: { contains: query, mode: "insensitive" } },
        ],
      },
      include: {
        category: true,
      },
      take: 20, // Ograničenje broja rezultata
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error("[PRODUCTS_SEARCH_SIMPLE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
