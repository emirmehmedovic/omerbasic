import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { attributeGroupSchema } from "@/lib/validations/category-attribute";
import { z } from "zod";

// GET - Dohvat pojedinačne grupe atributa
export async function GET(
  req: Request,
  { params }: { params: Promise<{ categoryId: string; groupId: string }> }
) {
  try {
    // Dohvaćamo parametre iz params - koristimo await
    const { categoryId, groupId } = await params;

    const attributeGroup = await db.attributeGroup.findUnique({
      where: {
        id: groupId,
        categoryId,
      },
      include: {
        attributes: true,
      },
    });

    if (!attributeGroup) {
      return NextResponse.json(
        { error: "Grupa atributa nije pronađena" },
        { status: 404 }
      );
    }

    return NextResponse.json(attributeGroup);
  } catch (error) {
    console.error("Error fetching attribute group:", error);
    return NextResponse.json(
      { error: "Greška prilikom dohvata grupe atributa" },
      { status: 500 }
    );
  }
}

// PUT - Ažuriranje grupe atributa
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ categoryId: string; groupId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Nemate dozvolu za ovu akciju" },
        { status: 403 }
      );
    }

    // Dohvaćamo parametre iz params - koristimo await
    const { categoryId, groupId } = await params;
    const body = await req.json();
    
    // Validacija podataka
    const validatedData = attributeGroupSchema.parse(body);
    
    // Provjera da li grupa postoji
    const existingGroup = await db.attributeGroup.findUnique({
      where: {
        id: groupId,
        categoryId,
      },
    });
    
    if (!existingGroup) {
      return NextResponse.json(
        { error: "Grupa atributa nije pronađena" },
        { status: 404 }
      );
    }
    
    // Provjera da li već postoji druga grupa s istim imenom za ovu kategoriju
    const duplicateGroup = await db.attributeGroup.findFirst({
      where: {
        categoryId,
        name: validatedData.name,
        id: { not: groupId },
      },
    });
    
    if (duplicateGroup) {
      return NextResponse.json(
        { error: "Druga grupa s ovim imenom već postoji za ovu kategoriju" },
        { status: 400 }
      );
    }
    
    // Ažuriranje grupe atributa
    const updatedGroup = await db.attributeGroup.update({
      where: {
        id: groupId,
      },
      data: {
        name: validatedData.name,
        label: validatedData.label,
        sortOrder: validatedData.sortOrder,
      },
    });
    
    return NextResponse.json(updatedGroup);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.format() },
        { status: 400 }
      );
    }
    
    console.error("Error updating attribute group:", error);
    return NextResponse.json(
      { error: "Greška prilikom ažuriranja grupe atributa" },
      { status: 500 }
    );
  }
}

// DELETE - Brisanje grupe atributa
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ categoryId: string; groupId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Nemate dozvolu za ovu akciju" },
        { status: 403 }
      );
    }

    // Dohvaćamo parametre iz params - koristimo await
    const { categoryId, groupId } = await params;
    
    // Provjera da li grupa postoji
    const existingGroup = await db.attributeGroup.findUnique({
      where: {
        id: groupId,
        categoryId,
      },
    });
    
    if (!existingGroup) {
      return NextResponse.json(
        { error: "Grupa atributa nije pronađena" },
        { status: 404 }
      );
    }
    
    // Brisanje grupe atributa
    await db.attributeGroup.delete({
      where: {
        id: groupId,
      },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting attribute group:", error);
    return NextResponse.json(
      { error: "Greška prilikom brisanja grupe atributa" },
      { status: 500 }
    );
  }
}
