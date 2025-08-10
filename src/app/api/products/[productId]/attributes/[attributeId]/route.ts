import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

// Schema za validaciju vrijednosti atributa proizvoda
const productAttributeValueSchema = z.object({
  value: z.string().min(1, "Vrijednost atributa je obavezna"),
});

// GET - Dohvat pojedinačne vrijednosti atributa za proizvod
export async function GET(
  req: Request,
  { params }: { params: Promise<{ productId: string; attributeId: string }> }
) {
  try {
    const { productId, attributeId } = await params;

    // Dohvat vrijednosti atributa
    const attributeValue = await db.productAttributeValue.findFirst({
      where: {
        productId,
        attributeId,
      },
      include: {
        attribute: true,
      },
    });

    if (!attributeValue) {
      return NextResponse.json(
        { error: "Vrijednost atributa nije pronađena" },
        { status: 404 }
      );
    }

    return NextResponse.json(attributeValue);
  } catch (error) {
    console.error("Error fetching product attribute value:", error);
    return NextResponse.json(
      { error: "Greška prilikom dohvata vrijednosti atributa proizvoda" },
      { status: 500 }
    );
  }
}

// PUT - Ažuriranje pojedinačne vrijednosti atributa
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ productId: string; attributeId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Nemate dozvolu za ovu akciju" },
        { status: 403 }
      );
    }

    const { productId, attributeId } = await params;
    const body = await req.json();
    
    // Validacija podataka
    const validatedData = productAttributeValueSchema.parse(body);
    
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
    
    // Provjera da li atribut postoji
    const attribute = await db.categoryAttribute.findUnique({
      where: { id: attributeId },
    });
    
    if (!attribute) {
      return NextResponse.json(
        { error: "Atribut nije pronađen" },
        { status: 404 }
      );
    }
    
    // Dohvat postojeće vrijednosti atributa
    const existingValue = await db.productAttributeValue.findFirst({
      where: {
        productId,
        attributeId,
      },
    });
    
    let updatedValue;
    
    if (existingValue) {
      // Ažuriranje postojeće vrijednosti
      updatedValue = await db.productAttributeValue.update({
        where: { id: existingValue.id },
        data: { value: validatedData.value },
        include: {
          attribute: true,
        },
      });
    } else {
      // Kreiranje nove vrijednosti
      updatedValue = await db.productAttributeValue.create({
        data: {
          productId,
          attributeId,
          value: validatedData.value,
        },
        include: {
          attribute: true,
        },
      });
    }
    
    return NextResponse.json(updatedValue);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.format() },
        { status: 400 }
      );
    }
    
    console.error("Error updating product attribute value:", error);
    return NextResponse.json(
      { error: "Greška prilikom ažuriranja vrijednosti atributa proizvoda" },
      { status: 500 }
    );
  }
}

// DELETE - Brisanje pojedinačne vrijednosti atributa
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ productId: string; attributeId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Nemate dozvolu za ovu akciju" },
        { status: 403 }
      );
    }

    const { productId, attributeId } = await params;
    
    // Dohvat postojeće vrijednosti atributa
    const existingValue = await db.productAttributeValue.findFirst({
      where: {
        productId,
        attributeId,
      },
    });
    
    if (!existingValue) {
      return NextResponse.json(
        { error: "Vrijednost atributa nije pronađena" },
        { status: 404 }
      );
    }
    
    // Brisanje vrijednosti atributa
    await db.productAttributeValue.delete({
      where: { id: existingValue.id },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting product attribute value:", error);
    return NextResponse.json(
      { error: "Greška prilikom brisanja vrijednosti atributa proizvoda" },
      { status: 500 }
    );
  }
}
