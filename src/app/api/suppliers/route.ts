import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { db } from "@/lib/db";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// GET - Dohvaćanje svih dobavljača
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const suppliers = await db.supplier.findMany({
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(suppliers);
  } catch (error) {
    console.error("[SUPPLIERS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// POST - Kreiranje novog dobavljača
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
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

    const supplier = await db.supplier.create({
      data: validatedData,
    });

    return NextResponse.json(supplier);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ errors: error.format() }, { status: 400 });
    }

    console.error("[SUPPLIER_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
