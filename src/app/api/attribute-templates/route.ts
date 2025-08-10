import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { attributeTemplateSchema } from "@/lib/validations/category-attribute";
import { z } from "zod";

// GET - Dohvat svih predložaka atributa
export async function GET() {
  try {
    const attributeTemplates = await db.attributeTemplate.findMany({
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(attributeTemplates);
  } catch (error) {
    console.error("Error fetching attribute templates:", error);
    return NextResponse.json(
      { error: "Greška prilikom dohvata predložaka atributa" },
      { status: 500 }
    );
  }
}

// POST - Kreiranje novog predloška atributa
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Nemate dozvolu za ovu akciju" },
        { status: 403 }
      );
    }

    const body = await req.json();
    
    // Validacija podataka
    const validatedData = attributeTemplateSchema.parse(body);
    
    // Provjera da li već postoji predložak s istim imenom
    const existingTemplate = await db.attributeTemplate.findFirst({
      where: {
        name: validatedData.name,
      },
    });
    
    if (existingTemplate) {
      return NextResponse.json(
        { error: "Predložak s ovim imenom već postoji" },
        { status: 400 }
      );
    }
    
    // Kreiranje novog predloška atributa
    const attributeTemplate = await db.attributeTemplate.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        attributes: validatedData.attributes,
      },
    });
    
    return NextResponse.json(attributeTemplate, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.format() },
        { status: 400 }
      );
    }
    
    console.error("Error creating attribute template:", error);
    return NextResponse.json(
      { error: "Greška prilikom kreiranja predloška atributa" },
      { status: 500 }
    );
  }
}
