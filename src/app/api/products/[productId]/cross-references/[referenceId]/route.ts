import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
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

// GET - Dohvat pojedinačne cross-reference
export async function GET(
  req: Request,
  context: { params: { productId: string; referenceId: string } }
) {
  try {
    const params = await context.params;
    const { referenceId } = params;

    // Dohvat cross-reference s informacijama o zamjenskom proizvodu ako postoji
    const crossReference = await db.productCrossReference.findUnique({
      where: {
        id: referenceId,
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

    if (!crossReference) {
      return NextResponse.json(
        { error: "Cross-reference nije pronađena" },
        { status: 404 }
      );
    }

    return NextResponse.json(crossReference);
  } catch (error) {
    console.error("Error fetching product cross reference:", error);
    return NextResponse.json(
      { error: "Greška prilikom dohvata cross-reference proizvoda" },
      { status: 500 }
    );
  }
}

// PUT - Ažuriranje pojedinačne cross-reference
export async function PUT(
  req: Request,
  context: { params: { productId: string; referenceId: string } }
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
    const { referenceId } = params;
    const body = await req.json();
    
    // Validacija podataka
    const validatedData = productCrossReferenceSchema.parse(body);
    
    // Provjera da li cross-reference postoji
    const existingReference = await db.productCrossReference.findUnique({
      where: { id: referenceId },
    });
    
    if (!existingReference) {
      return NextResponse.json(
        { error: "Cross-reference nije pronađena" },
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
    
    // Ažuriranje cross-reference
    const updatedReference = await db.productCrossReference.update({
      where: { id: referenceId },
      data: validatedData,
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
    
    return NextResponse.json(updatedReference);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.format() },
        { status: 400 }
      );
    }
    
    console.error("Error updating product cross reference:", error);
    return NextResponse.json(
      { error: "Greška prilikom ažuriranja cross-reference proizvoda" },
      { status: 500 }
    );
  }
}

// DELETE - Brisanje pojedinačne cross-reference
export async function DELETE(
  req: Request,
  context: { params: { productId: string; referenceId: string } }
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
    const { referenceId } = params;
    
    // Provjera da li cross-reference postoji
    const existingReference = await db.productCrossReference.findUnique({
      where: { id: referenceId },
    });
    
    if (!existingReference) {
      return NextResponse.json(
        { error: "Cross-reference nije pronađena" },
        { status: 404 }
      );
    }
    
    // Brisanje cross-reference
    await db.productCrossReference.delete({
      where: { id: referenceId },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting product cross reference:", error);
    return NextResponse.json(
      { error: "Greška prilikom brisanja cross-reference proizvoda" },
      { status: 500 }
    );
  }
}
