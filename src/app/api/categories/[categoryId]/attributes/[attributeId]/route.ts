import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

// Schema za validaciju atributa kategorije
const categoryAttributeSchema = z.object({
  name: z.string().min(1, "Naziv atributa je obavezan"),
  label: z.string().min(1, "Oznaka atributa je obavezna"),
  type: z.enum(["string", "number", "boolean", "enum"]),
  unit: z.string().optional().nullable(),
  options: z.any().optional().nullable(),
  isRequired: z.boolean().default(false),
  isFilterable: z.boolean().default(false),
  sortOrder: z.number().default(0),
});

// GET - Dohvat pojedinačnog atributa
export async function GET(
  req: Request,
  { params }: { params: { categoryId: string; attributeId: string } }
) {
  try {
    const { attributeId } = params;

    const attribute = await db.categoryAttribute.findUnique({
      where: {
        id: attributeId,
      },
    });

    if (!attribute) {
      return NextResponse.json(
        { error: "Atribut nije pronađen" },
        { status: 404 }
      );
    }

    return NextResponse.json(attribute);
  } catch (error) {
    console.error("Error fetching category attribute:", error);
    return NextResponse.json(
      { error: "Greška prilikom dohvata atributa kategorije" },
      { status: 500 }
    );
  }
}

// PUT - Ažuriranje postojećeg atributa
export async function PUT(
  req: Request,
  { params }: { params: { categoryId: string; attributeId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Nemate dozvolu za ovu akciju" },
        { status: 403 }
      );
    }

    const { attributeId, categoryId } = params;
    const body = await req.json();
    
    // Validacija podataka
    const validatedData = categoryAttributeSchema.parse(body);
    
    // Provjera da li atribut postoji
    const existingAttribute = await db.categoryAttribute.findUnique({
      where: { id: attributeId },
    });
    
    if (!existingAttribute) {
      return NextResponse.json(
        { error: "Atribut nije pronađen" },
        { status: 404 }
      );
    }
    
    // Provjera da li već postoji drugi atribut s istim imenom za ovu kategoriju
    const duplicateAttribute = await db.categoryAttribute.findFirst({
      where: {
        categoryId,
        name: validatedData.name,
        id: { not: attributeId },
      },
    });
    
    if (duplicateAttribute) {
      return NextResponse.json(
        { error: "Atribut s ovim imenom već postoji za ovu kategoriju" },
        { status: 400 }
      );
    }
    
    // Ažuriranje atributa
    const updatedAttribute = await db.categoryAttribute.update({
      where: { id: attributeId },
      data: validatedData,
    });
    
    return NextResponse.json(updatedAttribute);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.format() },
        { status: 400 }
      );
    }
    
    console.error("Error updating category attribute:", error);
    return NextResponse.json(
      { error: "Greška prilikom ažuriranja atributa kategorije" },
      { status: 500 }
    );
  }
}

// DELETE - Brisanje atributa
export async function DELETE(
  req: Request,
  { params }: { params: { categoryId: string; attributeId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Nemate dozvolu za ovu akciju" },
        { status: 403 }
      );
    }

    const { attributeId } = params;
    
    // Provjera da li atribut postoji
    const existingAttribute = await db.categoryAttribute.findUnique({
      where: { id: attributeId },
    });
    
    if (!existingAttribute) {
      return NextResponse.json(
        { error: "Atribut nije pronađen" },
        { status: 404 }
      );
    }
    
    // Provjera da li postoje vrijednosti atributa za proizvode
    const attributeValues = await db.productAttributeValue.findMany({
      where: { attributeId },
      take: 1,
    });
    
    if (attributeValues.length > 0) {
      return NextResponse.json(
        { error: "Nije moguće obrisati atribut koji se koristi u proizvodima" },
        { status: 400 }
      );
    }
    
    // Brisanje atributa
    await db.categoryAttribute.delete({
      where: { id: attributeId },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting category attribute:", error);
    return NextResponse.json(
      { error: "Greška prilikom brisanja atributa kategorije" },
      { status: 500 }
    );
  }
}
