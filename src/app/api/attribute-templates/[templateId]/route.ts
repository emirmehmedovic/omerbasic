import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { attributeTemplateSchema } from "@/lib/validations/category-attribute";
import { z } from "zod";

// GET - Dohvat pojedinačnog predloška atributa
export async function GET(
  req: Request,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    // Dohvaćamo templateId iz params - koristimo await
    const { templateId } = await params;

    const attributeTemplate = await db.attributeTemplate.findUnique({
      where: {
        id: templateId,
      },
    });

    if (!attributeTemplate) {
      return NextResponse.json(
        { error: "Predložak atributa nije pronađen" },
        { status: 404 }
      );
    }

    return NextResponse.json(attributeTemplate);
  } catch (error) {
    console.error("Error fetching attribute template:", error);
    return NextResponse.json(
      { error: "Greška prilikom dohvata predloška atributa" },
      { status: 500 }
    );
  }
}

// PUT - Ažuriranje predloška atributa
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Nemate dozvolu za ovu akciju" },
        { status: 403 }
      );
    }

    // Dohvaćamo templateId iz params - koristimo await
    const { templateId } = await params;
    const body = await req.json();
    
    // Validacija podataka
    const validatedData = attributeTemplateSchema.parse(body);
    
    // Provjera da li predložak postoji
    const existingTemplate = await db.attributeTemplate.findUnique({
      where: {
        id: templateId,
      },
    });
    
    if (!existingTemplate) {
      return NextResponse.json(
        { error: "Predložak atributa nije pronađen" },
        { status: 404 }
      );
    }
    
    // Provjera da li već postoji drugi predložak s istim imenom
    const duplicateTemplate = await db.attributeTemplate.findFirst({
      where: {
        name: validatedData.name,
        id: { not: templateId },
      },
    });
    
    if (duplicateTemplate) {
      return NextResponse.json(
        { error: "Drugi predložak s ovim imenom već postoji" },
        { status: 400 }
      );
    }
    
    // Ažuriranje predloška atributa
    const updatedTemplate = await db.attributeTemplate.update({
      where: {
        id: templateId,
      },
      data: {
        name: validatedData.name,
        description: validatedData.description,
        attributes: validatedData.attributes,
      },
    });
    
    return NextResponse.json(updatedTemplate);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.format() },
        { status: 400 }
      );
    }
    
    console.error("Error updating attribute template:", error);
    return NextResponse.json(
      { error: "Greška prilikom ažuriranja predloška atributa" },
      { status: 500 }
    );
  }
}

// DELETE - Brisanje predloška atributa
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Nemate dozvolu za ovu akciju" },
        { status: 403 }
      );
    }

    // Dohvaćamo templateId iz params - koristimo await
    const { templateId } = await params;
    
    // Provjera da li predložak postoji
    const existingTemplate = await db.attributeTemplate.findUnique({
      where: {
        id: templateId,
      },
    });
    
    if (!existingTemplate) {
      return NextResponse.json(
        { error: "Predložak atributa nije pronađen" },
        { status: 404 }
      );
    }
    
    // Brisanje predloška atributa
    await db.attributeTemplate.delete({
      where: {
        id: templateId,
      },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting attribute template:", error);
    return NextResponse.json(
      { error: "Greška prilikom brisanja predloška atributa" },
      { status: 500 }
    );
  }
}
