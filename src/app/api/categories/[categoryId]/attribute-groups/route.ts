import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { attributeGroupSchema } from "@/lib/validations/category-attribute";
import { z } from "zod";

// GET - Dohvat svih grupa atributa za kategoriju
export async function GET(
  req: Request,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  try {
    // Dohvaćamo categoryId iz params - koristimo await
    const { categoryId } = await params;

    const attributeGroups = await db.attributeGroup.findMany({
      where: {
        categoryId,
      },
      orderBy: {
        sortOrder: "asc",
      },
      include: {
        attributes: true,
      },
    });

    return NextResponse.json(attributeGroups);
  } catch (error) {
    console.error("Error fetching attribute groups:", error);
    return NextResponse.json(
      { error: "Greška prilikom dohvata grupa atributa" },
      { status: 500 }
    );
  }
}

// POST - Kreiranje nove grupe atributa za kategoriju
export async function POST(
  req: Request,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Nemate dozvolu za ovu akciju" },
        { status: 403 }
      );
    }

    // Dohvaćamo categoryId iz params - koristimo await
    const { categoryId } = await params;
    const body = await req.json();
    
    // Validacija podataka
    const validatedData = attributeGroupSchema.parse(body);
    
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
    
    // Provjera da li već postoji grupa s istim imenom za ovu kategoriju
    const existingGroup = await db.attributeGroup.findFirst({
      where: {
        categoryId,
        name: validatedData.name,
      },
    });
    
    if (existingGroup) {
      return NextResponse.json(
        { error: "Grupa s ovim imenom već postoji za ovu kategoriju" },
        { status: 400 }
      );
    }
    
    // Kreiranje nove grupe atributa
    const attributeGroup = await db.attributeGroup.create({
      data: {
        name: validatedData.name,
        label: validatedData.label,
        sortOrder: validatedData.sortOrder,
        categoryId,
      },
    });
    
    return NextResponse.json(attributeGroup, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.format() },
        { status: 400 }
      );
    }
    
    console.error("Error creating attribute group:", error);
    return NextResponse.json(
      { error: "Greška prilikom kreiranja grupe atributa" },
      { status: 500 }
    );
  }
}
