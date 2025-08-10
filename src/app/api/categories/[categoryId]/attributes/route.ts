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

// GET - Dohvat svih atributa za kategoriju
export async function GET(
  req: Request,
  context: { params: { categoryId: string } }
) {
  try {
    // Dohvaćamo categoryId iz context.params - koristimo await
    const { categoryId } = await context.params;

    const attributes = await db.categoryAttribute.findMany({
      where: {
        categoryId,
      },
      orderBy: {
        sortOrder: "asc",
      },
    });

    return NextResponse.json(attributes);
  } catch (error) {
    console.error("Error fetching category attributes:", error);
    return NextResponse.json(
      { error: "Greška prilikom dohvata atributa kategorije" },
      { status: 500 }
    );
  }
}

// POST - Kreiranje novog atributa za kategoriju
export async function POST(
  req: Request,
  context: { params: { categoryId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Nemate dozvolu za ovu akciju" },
        { status: 403 }
      );
    }

    // Dohvaćamo categoryId iz context.params - koristimo await
    const { categoryId } = await context.params;
    const body = await req.json();
    
    // Validacija podataka
    const validatedData = categoryAttributeSchema.parse(body);
    
    // Provjera da li kategorija postoji
    const category = await db.category.findUnique({
      where: { id: categoryId },
    });
    
    if (!category) {
      return NextResponse.json(
        { error: "Kategorija nije pronađena" },
        { status: 404 }
      );
    }
    
    // Provjera da li već postoji atribut s istim imenom za ovu kategoriju
    const existingAttribute = await db.categoryAttribute.findFirst({
      where: {
        categoryId,
        name: validatedData.name,
      },
    });
    
    if (existingAttribute) {
      return NextResponse.json(
        { error: "Atribut s ovim imenom već postoji za ovu kategoriju" },
        { status: 400 }
      );
    }
    
    // Kreiranje novog atributa
    const attribute = await db.categoryAttribute.create({
      data: {
        ...validatedData,
        categoryId,
      },
    });
    
    return NextResponse.json(attribute, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.format() },
        { status: 400 }
      );
    }
    
    console.error("Error creating category attribute:", error);
    return NextResponse.json(
      { error: "Greška prilikom kreiranja atributa kategorije" },
      { status: 500 }
    );
  }
}
