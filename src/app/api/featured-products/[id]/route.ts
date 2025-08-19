import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await req.json();
    const { customTitle, customImageUrl, displayOrder, isActive } = body;
    const resolvedParams = await params;

    const featuredProduct = await db.featuredProduct.update({
      where: { id: resolvedParams.id },
      data: {
        customTitle,
        customImageUrl,
        displayOrder,
        isActive,
      },
      include: {
        product: true,
      },
    });

    return NextResponse.json(featuredProduct);
  } catch (error) {
    console.error("Greška pri ažuriranju featured proizvoda:", error);
    return NextResponse.json(
      { error: "Greška pri ažuriranju proizvoda" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    await db.featuredProduct.delete({
      where: { id: resolvedParams.id },
    });

    return NextResponse.json({ message: "Proizvod uspješno obrisan" });
  } catch (error) {
    console.error("Greška pri brisanju featured proizvoda:", error);
    return NextResponse.json(
      { error: "Greška pri brisanju proizvoda" },
      { status: 500 }
    );
  }
}
