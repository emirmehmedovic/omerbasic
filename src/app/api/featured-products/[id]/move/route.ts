import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await req.json();
    const { direction } = body;

    if (!direction || !["up", "down"].includes(direction)) {
      return NextResponse.json(
        { error: "Neispravan smjer premještanja" },
        { status: 400 }
      );
    }

    // Dohvati sve featured products sortirane po displayOrder
    const allFeaturedProducts = await db.featuredProduct.findMany({
      orderBy: { displayOrder: "asc" },
    });

    const resolvedParams = await params;
    const currentIndex = allFeaturedProducts.findIndex(p => p.id === resolvedParams.id);
    if (currentIndex === -1) {
      return NextResponse.json(
        { error: "Proizvod nije pronađen" },
        { status: 404 }
      );
    }

    let newIndex: number;
    if (direction === "up" && currentIndex > 0) {
      newIndex = currentIndex - 1;
    } else if (direction === "down" && currentIndex < allFeaturedProducts.length - 1) {
      newIndex = currentIndex + 1;
    } else {
      return NextResponse.json(
        { error: "Ne može se premjestiti u tom smjeru" },
        { status: 400 }
      );
    }

    // Zamijeni displayOrder vrijednosti
    const currentProduct = allFeaturedProducts[currentIndex];
    const targetProduct = allFeaturedProducts[newIndex];

    await db.$transaction([
      db.featuredProduct.update({
        where: { id: currentProduct.id },
        data: { displayOrder: targetProduct.displayOrder },
      }),
      db.featuredProduct.update({
        where: { id: targetProduct.id },
        data: { displayOrder: currentProduct.displayOrder },
      }),
    ]);

    // Dohvati ažuriranu listu
    const updatedProducts = await db.featuredProduct.findMany({
      include: {
        product: true,
      },
      orderBy: {
        displayOrder: "asc",
      },
    });

    return NextResponse.json(updatedProducts);
  } catch (error) {
    console.error("Greška pri premještanju featured proizvoda:", error);
    return NextResponse.json(
      { error: "Greška pri premještanju proizvoda" },
      { status: 500 }
    );
  }
}
