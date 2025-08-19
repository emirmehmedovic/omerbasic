import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const featuredProducts = await db.featuredProduct.findMany({
      include: {
        product: true,
      },
      orderBy: {
        displayOrder: "asc",
      },
    });

    return NextResponse.json(featuredProducts);
  } catch (error) {
    console.error("Greška pri dohvaćanju featured proizvoda:", error);
    return NextResponse.json(
      { error: "Greška pri dohvaćanju proizvoda" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productId, customTitle, customImageUrl, displayOrder } = body;

    // Validacija
    if (!productId) {
      return NextResponse.json(
        { error: "Product ID je obavezan" },
        { status: 400 }
      );
    }

    // Provjeri da li proizvod već postoji u featured listi
    const existingFeatured = await db.featuredProduct.findUnique({
      where: { productId },
    });

    if (existingFeatured) {
      return NextResponse.json(
        { error: "Proizvod je već u featured listi" },
        { status: 400 }
      );
    }

    // Provjeri da li proizvod postoji
    const product = await db.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Proizvod nije pronađen" },
        { status: 404 }
      );
    }

    // Kreiraj featured product
    const featuredProduct = await db.featuredProduct.create({
      data: {
        productId,
        customTitle,
        customImageUrl,
        displayOrder: displayOrder || 0,
        isActive: true,
      },
      include: {
        product: true,
      },
    });

    return NextResponse.json(featuredProduct, { status: 201 });
  } catch (error) {
    console.error("Greška pri kreiranju featured proizvoda:", error);
    return NextResponse.json(
      { error: "Greška pri kreiranju proizvoda" },
      { status: 500 }
    );
  }
}
