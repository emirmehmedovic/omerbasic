import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth";

// PATCH - Ažuriranje veze dobavljača s proizvodom
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ supplierId: string; productId: string }>}
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const { supplierId, productId } = await params;
    if (!supplierId || !productId) {
      return new NextResponse("Supplier ID and Product ID are required", { status: 400 });
    }

    const body = await req.json();

    const schema = z.object({
      supplierSku: z.string().optional(),
      priority: z.number().int().min(1),
      price: z.number().min(0, "Price must be a positive number"),
      minOrderQty: z.number().int().min(1).optional(),
      leadTime: z.number().int().min(0).optional(),
      notes: z.string().optional(),
    });

    const validatedData = schema.parse(body);

    // Provjera postoji li veza
    const existingLink = await db.supplierProduct.findUnique({
      where: {
        supplierId_productId: {
          supplierId,
          productId,
        },
      },
    });

    if (!existingLink) {
      return new NextResponse("Supplier-Product link not found", { status: 404 });
    }

    // Ažuriranje veze
    const updatedLink = await db.supplierProduct.update({
      where: {
        supplierId_productId: {
          supplierId,
          productId,
        },
      },
      data: validatedData,
      include: {
        product: {
          include: {
            category: true,
          },
        },
      },
    });

    return NextResponse.json(updatedLink);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ errors: error.format() }, { status: 400 });
    }

    console.error("[SUPPLIER_PRODUCT_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// DELETE - Brisanje veze dobavljača s proizvodom
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ supplierId: string; productId: string }>}
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const { supplierId, productId } = await params;
    if (!supplierId || !productId) {
      return new NextResponse("Supplier ID and Product ID are required", { status: 400 });
    }

    // Provjera postoji li veza
    const existingLink = await db.supplierProduct.findUnique({
      where: {
        supplierId_productId: {
          supplierId,
          productId,
        },
      },
    });

    if (!existingLink) {
      return new NextResponse("Supplier-Product link not found", { status: 404 });
    }

    // Brisanje veze
    await db.supplierProduct.delete({
      where: {
        supplierId_productId: {
          supplierId,
          productId,
        },
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[SUPPLIER_PRODUCT_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
