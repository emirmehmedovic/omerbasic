import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { db } from "@/lib/db";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// PATCH - Ažuriranje veze dobavljača s kategorijom
export async function PATCH(
  req: Request,
  { params }: { params: { supplierId: string; categoryId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    if (!params.supplierId || !params.categoryId) {
      return new NextResponse("Supplier ID and Category ID are required", { status: 400 });
    }

    const body = await req.json();

    const schema = z.object({
      priority: z.number().int().min(1),
      notes: z.string().optional(),
    });

    const { priority, notes } = schema.parse(body);

    // Provjera postoji li veza
    const existingLink = await db.supplierCategory.findUnique({
      where: {
        supplierId_categoryId: {
          supplierId: params.supplierId,
          categoryId: params.categoryId,
        },
      },
    });

    if (!existingLink) {
      return new NextResponse("Supplier-Category link not found", { status: 404 });
    }

    // Ažuriranje veze
    const updatedLink = await db.supplierCategory.update({
      where: {
        supplierId_categoryId: {
          supplierId: params.supplierId,
          categoryId: params.categoryId,
        },
      },
      data: {
        priority,
        notes,
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json(updatedLink);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ errors: error.format() }, { status: 400 });
    }

    console.error("[SUPPLIER_CATEGORY_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// DELETE - Brisanje veze dobavljača s kategorijom
export async function DELETE(
  req: Request,
  { params }: { params: { supplierId: string; categoryId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    if (!params.supplierId || !params.categoryId) {
      return new NextResponse("Supplier ID and Category ID are required", { status: 400 });
    }

    // Provjera postoji li veza
    const existingLink = await db.supplierCategory.findUnique({
      where: {
        supplierId_categoryId: {
          supplierId: params.supplierId,
          categoryId: params.categoryId,
        },
      },
    });

    if (!existingLink) {
      return new NextResponse("Supplier-Category link not found", { status: 404 });
    }

    // Brisanje veze
    await db.supplierCategory.delete({
      where: {
        supplierId_categoryId: {
          supplierId: params.supplierId,
          categoryId: params.categoryId,
        },
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[SUPPLIER_CATEGORY_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
