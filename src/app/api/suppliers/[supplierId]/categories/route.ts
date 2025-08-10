import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth";

// GET - Dohvaćanje kategorija za dobavljača
export async function GET(
  req: Request,
  { params }: { params: { supplierId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    if (!params.supplierId) {
      return new NextResponse("Supplier ID is required", { status: 400 });
    }

    const supplierCategories = await db.supplierCategory.findMany({
      where: {
        supplierId: params.supplierId,
      },
      include: {
        category: true,
      },
      orderBy: {
        priority: "asc",
      },
    });

    return NextResponse.json(supplierCategories);
  } catch (error) {
    console.error("[SUPPLIER_CATEGORIES_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// POST - Dodavanje kategorije dobavljaču
export async function POST(
  req: Request,
  { params }: { params: { supplierId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    if (!params.supplierId) {
      return new NextResponse("Supplier ID is required", { status: 400 });
    }

    const body = await req.json();

    const schema = z.object({
      categoryId: z.string().min(1, "Category ID is required"),
      priority: z.number().int().min(1).default(1),
      notes: z.string().optional(),
    });

    const { categoryId, priority, notes } = schema.parse(body);

    // Provjera postoji li dobavljač
    const supplier = await db.supplier.findUnique({
      where: {
        id: params.supplierId,
      },
    });

    if (!supplier) {
      return new NextResponse("Supplier not found", { status: 404 });
    }

    // Provjera postoji li kategorija
    const category = await db.category.findUnique({
      where: {
        id: categoryId,
      },
    });

    if (!category) {
      return new NextResponse("Category not found", { status: 404 });
    }

    // Provjera postoji li već veza
    const existingLink = await db.supplierCategory.findUnique({
      where: {
        supplierId_categoryId: {
          supplierId: params.supplierId,
          categoryId,
        },
      },
    });

    if (existingLink) {
      return new NextResponse("This category is already linked to the supplier", { status: 400 });
    }

    // Kreiranje veze
    const supplierCategory = await db.supplierCategory.create({
      data: {
        supplierId: params.supplierId,
        categoryId,
        priority,
        notes,
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json(supplierCategory);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ errors: error.format() }, { status: 400 });
    }

    console.error("[SUPPLIER_CATEGORY_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
