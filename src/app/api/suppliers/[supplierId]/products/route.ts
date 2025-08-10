import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { db } from "@/lib/db";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// GET - Dohvaćanje proizvoda za dobavljača
export async function GET(
  req: Request,
  context: { params: { supplierId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const { supplierId } = await context.params;

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    if (!supplierId) {
      return new NextResponse("Supplier ID is required", { status: 400 });
    }

    const supplierProducts = await db.supplierProduct.findMany({
      where: {
        supplierId: supplierId,
      },
      include: {
        product: {
          include: {
            category: true,
          },
        },
      },
      orderBy: {
        priority: "asc",
      },
    });

    // Transformiraj podatke da vratimo samo product objekte s dodatnim informacijama iz supplierProduct
    const products = supplierProducts.map(sp => ({
      ...sp.product,
      price: sp.price, // Koristimo cijenu od dobavljača umjesto standardne cijene proizvoda
      supplierSku: sp.supplierSku,
      priority: sp.priority,
      minOrderQty: sp.minOrderQty,
      leadTime: sp.leadTime,
    }));

    return NextResponse.json(products);
  } catch (error) {
    console.error("[SUPPLIER_PRODUCTS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// POST - Dodavanje proizvoda dobavljaču
export async function POST(
  req: Request,
  context: { params: { supplierId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const { supplierId } = await context.params;

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    if (!supplierId) {
      return new NextResponse("Supplier ID is required", { status: 400 });
    }

    const body = await req.json();

    const schema = z.object({
      productId: z.string().min(1, "Product ID is required"),
      supplierSku: z.string().optional(),
      priority: z.number().int().min(1).default(1),
      price: z.number().min(0, "Price must be a positive number"),
      minOrderQty: z.number().int().min(1).optional(),
      leadTime: z.number().int().min(0).optional(),
      notes: z.string().optional(),
    });

    const validatedData = schema.parse(body);

    // Provjera postoji li dobavljač
    const supplier = await db.supplier.findUnique({
      where: {
        id: supplierId,
      },
    });

    if (!supplier) {
      return new NextResponse("Supplier not found", { status: 404 });
    }

    // Provjera postoji li proizvod
    const product = await db.product.findUnique({
      where: {
        id: validatedData.productId,
      },
    });

    if (!product) {
      return new NextResponse("Product not found", { status: 404 });
    }

    // Provjera postoji li već veza
    const existingLink = await db.supplierProduct.findUnique({
      where: {
        supplierId_productId: {
          supplierId: supplierId,
          productId: validatedData.productId,
        },
      },
    });

    if (existingLink) {
      return new NextResponse("This product is already linked to the supplier", { status: 400 });
    }

    // Kreiranje veze
    const supplierProduct = await db.supplierProduct.create({
      data: {
        supplierId: supplierId,
        productId: validatedData.productId,
        supplierSku: validatedData.supplierSku,
        priority: validatedData.priority,
        price: validatedData.price,
        minOrderQty: validatedData.minOrderQty,
        leadTime: validatedData.leadTime,
        notes: validatedData.notes,
      },
      include: {
        product: {
          include: {
            category: true,
          },
        },
      },
    });

    return NextResponse.json(supplierProduct);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ errors: error.format() }, { status: 400 });
    }

    console.error("[SUPPLIER_PRODUCT_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
