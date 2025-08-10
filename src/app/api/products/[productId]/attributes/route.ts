import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

// Schema za validaciju vrijednosti atributa proizvoda
const productAttributeValueSchema = z.object({
  attributeId: z.string().min(1, "ID atributa je obavezan"),
  value: z.string().min(1, "Vrijednost atributa je obavezna"),
});

// Schema za validaciju batch unosa vrijednosti atributa
const batchAttributeValuesSchema = z.array(productAttributeValueSchema);

// GET - Dohvat svih vrijednosti atributa za proizvod
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

    // Dohvat vrijednosti atributa s informacijama o atributu
    const attributeValues = await db.productAttributeValue.findMany({
      where: {
        productId,
      },
      include: {
        attribute: true,
      },
      orderBy: {
        attribute: {
          sortOrder: "asc",
        },
      },
    });

    return NextResponse.json(attributeValues);
  } catch (error) {
    console.error("Error fetching product attribute values:", error);
    return NextResponse.json(
      { error: "Greška prilikom dohvata vrijednosti atributa proizvoda" },
      { status: 500 }
    );
  }
}

// POST - Dodavanje/ažuriranje vrijednosti atributa za proizvod (batch)
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
    const validatedData = batchAttributeValuesSchema.parse(body);
    
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
    
    // Provjera da li svi atributi postoje
    const attributeIds = validatedData.map(item => item.attributeId);
    const categoryAttributes = await db.categoryAttribute.findMany({
      where: {
        id: { in: attributeIds },
      },
    });
    
    if (categoryAttributes.length !== attributeIds.length) {
      return NextResponse.json(
        { error: "Neki od atributa nisu pronađeni" },
        { status: 400 }
      );
    }
    
    // Dohvat postojećih vrijednosti atributa za proizvod
    const existingValues = await db.productAttributeValue.findMany({
      where: {
        productId,
      },
    });
    
    // Kreiranje mape postojećih vrijednosti za lakši pristup
    const existingValuesMap = new Map(
      existingValues.map((item: { attributeId: string, id: string }) => [item.attributeId, item])
    );
    
    // Batch operacije za upsert vrijednosti atributa
    const operations = validatedData.map(item => {
      const existing = existingValuesMap.get(item.attributeId);
      
      if (existing) {
        // Ažuriranje postojeće vrijednosti
        return db.productAttributeValue.update({
          where: { id: existing.id },
          data: { value: item.value },
        });
      } else {
        // Kreiranje nove vrijednosti
        return db.productAttributeValue.create({
          data: {
            productId,
            attributeId: item.attributeId,
            value: item.value,
          },
        });
      }
    });
    
    // Izvršavanje svih operacija
    await db.$transaction(operations);
    
    // Dohvat ažuriranih vrijednosti atributa
    const updatedValues = await db.productAttributeValue.findMany({
      where: {
        productId,
      },
      include: {
        attribute: true,
      },
      orderBy: {
        attribute: {
          sortOrder: "asc",
        },
      },
    });
    
    return NextResponse.json(updatedValues);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.format() },
        { status: 400 }
      );
    }
    
    console.error("Error updating product attribute values:", error);
    return NextResponse.json(
      { error: "Greška prilikom ažuriranja vrijednosti atributa proizvoda" },
      { status: 500 }
    );
  }
}

// DELETE - Brisanje svih vrijednosti atributa za proizvod
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
    
    // Brisanje svih vrijednosti atributa za proizvod
    await db.productAttributeValue.deleteMany({
      where: {
        productId,
      },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting product attribute values:", error);
    return NextResponse.json(
      { error: "Greška prilikom brisanja vrijednosti atributa proizvoda" },
      { status: 500 }
    );
  }
}
