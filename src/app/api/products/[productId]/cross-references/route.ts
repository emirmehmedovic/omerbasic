import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

// Schema za validaciju cross-reference
const productCrossReferenceSchema = z.object({
  referenceType: z.string().min(1, "Tip reference je obavezan"),
  referenceNumber: z.string().min(1, "Broj reference je obavezan"),
  manufacturer: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  replacementId: z.string().optional().nullable(),
});

// Schema za validaciju batch unosa cross-referenci
const batchCrossReferencesSchema = z.array(productCrossReferenceSchema);

// GET - Dohvat svih cross-referenci za proizvod
export async function GET(
  req: Request,
  context: { params: { productId: string } }
) {
  try {
    const params = await context.params;
    const { productId } = params;

    // Provjera da li proizvod postoji
    const product = await db.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Proizvod nije pronađen" },
        { status: 404 }
      );
    }

    // Dohvat cross-referenci s informacijama o zamjenskim proizvodima ako postoje
    const crossReferences = await db.productCrossReference.findMany({
      where: {
        productId,
      },
      include: {
        replacement: {
          select: {
            id: true,
            name: true,
            catalogNumber: true,
            oemNumber: true,
          },
        },
      },
      orderBy: {
        referenceType: "asc",
      },
    });

    return NextResponse.json(crossReferences);
  } catch (error) {
    console.error("Error fetching product cross references:", error);
    return NextResponse.json(
      { error: "Greška prilikom dohvata cross-referenci proizvoda" },
      { status: 500 }
    );
  }
}

// POST - Dodavanje cross-reference za proizvod
export async function POST(
  req: Request,
  context: { params: { productId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Nemate dozvolu za ovu akciju" },
        { status: 403 }
      );
    }

    const params = await context.params;
    const { productId } = params;
    const body = await req.json();
    
    // Validacija podataka
    const validatedData = productCrossReferenceSchema.parse(body);
    
    // Provjera da li proizvod postoji
    const product = await db.product.findUnique({
      where: { id: productId },
    });
    
    if (!product) {
      return NextResponse.json(
        { error: "Proizvod nije pronađen" },
        { status: 404 }
      );
    }
    
    // Provjera da li zamjenski proizvod postoji ako je naveden
    if (validatedData.replacementId) {
      const replacement = await db.product.findUnique({
        where: { id: validatedData.replacementId },
      });
      
      if (!replacement) {
        return NextResponse.json(
          { error: "Zamjenski proizvod nije pronađen" },
          { status: 404 }
        );
      }
    }
    
    // Kreiranje cross-reference
    const newReference = await db.productCrossReference.create({
      data: {
        ...validatedData,
        productId,
      },
      include: {
        replacement: {
          select: {
            id: true,
            name: true,
            catalogNumber: true,
            oemNumber: true,
          },
        },
      },
    });
    
    return NextResponse.json(newReference, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.format() },
        { status: 400 }
      );
    }
    
    console.error("Error creating product cross reference:", error);
    return NextResponse.json(
      { error: "Greška prilikom kreiranja cross-reference proizvoda" },
      { status: 500 }
    );
  }
}

// PUT - Batch ažuriranje cross-referenci za proizvod
export async function PUT(
  req: Request,
  context: { params: { productId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Nemate dozvolu za ovu akciju" },
        { status: 403 }
      );
    }

    const params = await context.params;
    const { productId } = params;
    const body = await req.json();
    
    // Validacija podataka
    const validatedData = batchCrossReferencesSchema.parse(body);
    
    // Provjera da li proizvod postoji
    const product = await db.product.findUnique({
      where: { id: productId },
    });
    
    if (!product) {
      return NextResponse.json(
        { error: "Proizvod nije pronađen" },
        { status: 404 }
      );
    }
    
    // Brisanje svih postojećih cross-referenci za proizvod
    await db.productCrossReference.deleteMany({
      where: {
        productId,
      },
    });
    
    // Kreiranje novih cross-referenci
    await db.productCrossReference.createMany({
      data: validatedData.map(item => ({
        ...item,
        productId,
      })),
    });
    
    // Dohvat ažuriranih cross-referenci s informacijama o zamjenskim proizvodima
    const updatedReferences = await db.productCrossReference.findMany({
      where: {
        productId,
      },
      include: {
        replacement: {
          select: {
            id: true,
            name: true,
            catalogNumber: true,
            oemNumber: true,
          },
        },
      },
      orderBy: {
        referenceType: "asc",
      },
    });
    
    return NextResponse.json(updatedReferences);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.format() },
        { status: 400 }
      );
    }
    
    console.error("Error updating product cross references:", error);
    return NextResponse.json(
      { error: "Greška prilikom ažuriranja cross-referenci proizvoda" },
      { status: 500 }
    );
  }
}

// DELETE - Brisanje svih cross-referenci za proizvod
export async function DELETE(
  req: Request,
  context: { params: { productId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Nemate dozvolu za ovu akciju" },
        { status: 403 }
      );
    }

    const params = await context.params;
    const { productId } = params;
    
    // Provjera da li proizvod postoji
    const product = await db.product.findUnique({
      where: { id: productId },
    });
    
    if (!product) {
      return NextResponse.json(
        { error: "Proizvod nije pronađen" },
        { status: 404 }
      );
    }
    
    // Brisanje svih cross-referenci za proizvod
    await db.productCrossReference.deleteMany({
      where: {
        productId,
      },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting product cross references:", error);
    return NextResponse.json(
      { error: "Greška prilikom brisanja cross-referenci proizvoda" },
      { status: 500 }
    );
  }
}
