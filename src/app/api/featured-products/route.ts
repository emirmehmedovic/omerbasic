import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const featuredProducts = await db.featuredProduct.findMany({
      include: {
        product: { 
          include: { 
            category: true,
            vehicleFitments: {
              select: {
                id: true,
                isUniversal: true,
                generation: {
                  select: {
                    id: true,
                    name: true,
                    model: {
                      select: {
                        id: true,
                        name: true,
                        brand: {
                          select: {
                            id: true,
                            name: true,
                          }
                        }
                      }
                    }
                  }
                },
                engine: {
                  select: {
                    id: true,
                    engineCode: true,
                    enginePowerKW: true,
                    enginePowerHP: true,
                    engineCapacity: true,
                  }
                }
              }
            }
          } 
        },
      },
      orderBy: {
        displayOrder: "asc",
      },
    });

    // Post-process to apply featured discount pricing override
    const now = new Date();
    const processed = featuredProducts.map((fp: any) => {
      const p = fp.product;
      if (!p) return fp;
      const isActive = fp.isActive !== false;
      const discountActive = !!fp.isDiscountActive;
      const withinWindow = (!fp.startsAt || new Date(fp.startsAt) <= now) && (!fp.endsAt || new Date(fp.endsAt) >= now);

      if (isActive && discountActive && withinWindow && fp.discountType && fp.discountValue) {
        const original = Number(p.price);
        let discounted = original;
        if (fp.discountType === 'PERCENTAGE') {
          discounted = Math.max(0, original * (1 - Number(fp.discountValue) / 100));
        } else if (fp.discountType === 'FIXED') {
          discounted = Math.max(0, original - Number(fp.discountValue));
        }
        // Round to 2 decimals
        discounted = Math.round(discounted * 100) / 100;

        fp = {
          ...fp,
          product: {
            ...p,
            originalPrice: original,
            price: discounted,
            pricingSource: 'FEATURED',
          },
        };
      }
      return fp;
    });

    return NextResponse.json(processed);
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
    const { productId, customTitle, customImageUrl, displayOrder, isDiscountActive, discountType, discountValue, startsAt, endsAt } = body;

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

    // Validacija popusta
    let dto: any = {};
    if (isDiscountActive) {
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
    } else {
      dto.isDiscountActive = false;
      dto.discountType = null;
      dto.discountValue = null;
      dto.startsAt = null;
      dto.endsAt = null;
    }

    // Kreiraj featured product
    const featuredProduct = await db.featuredProduct.create({
      data: {
        productId,
        customTitle,
        customImageUrl,
        displayOrder: displayOrder || 0,
        isActive: true,
        ...dto,
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
