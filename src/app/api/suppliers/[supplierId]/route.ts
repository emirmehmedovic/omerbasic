import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth";

// GET - Dohvaćanje pojedinačnog dobavljača
export async function GET(
  req: Request,
  { params }: { params: Promise<{ supplierId: string }>}
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const { supplierId } = await params;
    if (!supplierId) {
      return new NextResponse("Supplier ID is required", { status: 400 });
    }

    const supplier = await db.supplier.findUnique({
      where: {
        id: supplierId,
      },
      include: {
        categories: {
          include: {
            category: true,
          },
        },
        products: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!supplier) {
      return new NextResponse("Supplier not found", { status: 404 });
    }

    return NextResponse.json(supplier);
  } catch (error) {
    console.error("[SUPPLIER_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// PATCH - Ažuriranje dobavljača
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ supplierId: string }>}
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const { supplierId } = await params;
    if (!supplierId) {
      return new NextResponse("Supplier ID is required", { status: 400 });
    }

    const body = await req.json();

    const supplierSchema = z.object({
      name: z.string().min(1, "Naziv je obavezan"),
      companyName: z.string().min(1, "Naziv tvrtke je obavezan"),
      address: z.string().min(1, "Adresa je obavezna"),
      city: z.string().min(1, "Grad je obavezan"),
      postalCode: z.string().min(1, "Poštanski broj je obavezan"),
      country: z.string().min(1, "Država je obavezna"),
      email: z.string().email("Neispravan format e-maila"),
      phone: z.string().min(1, "Telefon je obavezan"),
      contactPerson: z.string().optional(),
      taxId: z.string().optional(),
      notes: z.string().optional(),
      isActive: z.boolean().default(true),
    });

    const validatedData = supplierSchema.parse(body);

    // Provjera postoji li dobavljač
    const existingSupplier = await db.supplier.findUnique({
      where: {
        id: supplierId,
      },
    });

    if (!existingSupplier) {
      return new NextResponse("Supplier not found", { status: 404 });
    }

    const updatedSupplier = await db.supplier.update({
      where: {
        id: supplierId,
      },
      data: validatedData,
    });

    return NextResponse.json(updatedSupplier);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ errors: error.format() }, { status: 400 });
    }

    console.error("[SUPPLIER_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// DELETE - Brisanje dobavljača
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ supplierId: string }>}
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const { supplierId } = await params;
    if (!supplierId) {
      return new NextResponse("Supplier ID is required", { status: 400 });
    }

    // Provjera postoji li dobavljač
    const existingSupplier = await db.supplier.findUnique({
      where: {
        id: supplierId,
      },
    });

    if (!existingSupplier) {
      return new NextResponse("Supplier not found", { status: 404 });
    }

    // Brisanje dobavljača i svih povezanih podataka (kaskadno brisanje)
    await db.supplier.delete({
      where: {
        id: supplierId,
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[SUPPLIER_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
