import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await req.json();
    const { customTitle, customImageUrl, displayOrder, isActive, isDiscountActive, discountType, discountValue, startsAt, endsAt } = body;
    const resolvedParams = await params;

    // Validacija popusta
    let dto: any = {};
    if (typeof isDiscountActive === 'boolean' && isDiscountActive) {
      if (!discountType || (discountType !== 'PERCENTAGE' && discountType !== 'FIXED')) {
        return NextResponse.json({ error: 'Neispravan tip popusta' }, { status: 400 });
      }
      if (typeof discountValue !== 'number' || discountValue <= 0) {
        return NextResponse.json({ error: 'Vrijednost popusta mora biti veća od 0' }, { status: 400 });
      }
      if (discountType === 'PERCENTAGE' && (discountValue <= 0 || discountValue > 100)) {
        return NextResponse.json({ error: 'Postotni popust mora biti između 0 i 100' }, { status: 400 });
      }
      if (startsAt && endsAt) {
        const s = new Date(startsAt);
        const e = new Date(endsAt);
        if (isNaN(s.getTime()) || isNaN(e.getTime()) || s > e) {
          return NextResponse.json({ error: 'Neispravan raspon datuma popusta' }, { status: 400 });
        }
        dto.startsAt = s;
        dto.endsAt = e;
      } else {
        if (startsAt) dto.startsAt = new Date(startsAt);
        if (endsAt) dto.endsAt = new Date(endsAt);
      }
      dto.isDiscountActive = true;
      dto.discountType = discountType;
      dto.discountValue = discountValue;
    } else if (typeof isDiscountActive === 'boolean' && !isDiscountActive) {
      dto.isDiscountActive = false;
      dto.discountType = null;
      dto.discountValue = null;
      dto.startsAt = null;
      dto.endsAt = null;
    }

    const featuredProduct = await db.featuredProduct.update({
      where: { id: resolvedParams.id },
      data: {
        customTitle,
        customImageUrl,
        displayOrder,
        isActive,
        ...dto,
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
