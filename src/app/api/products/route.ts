import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { productApiSchema } from '@/lib/validations/product';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/session';

// Pomoćna funkcija za dohvat kategorije i svih njenih podkategorija (potomaka)
async function getCategoryAndChildrenIds(categoryId: string): Promise<string[]> {
  const allIds: string[] = [categoryId];
  const queue: string[] = [categoryId];

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (!currentId) continue;

    const children = await db.category.findMany({
      where: { parentId: currentId },
      select: { id: true },
    });

    const childrenIds = children.map(c => c.id);
    if (childrenIds.length > 0) {
        allIds.push(...childrenIds);
        queue.push(...childrenIds);
    }
  }

  return allIds;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");
    const categoryId = searchParams.get("categoryId");
    const generationId = searchParams.get("generationId");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const limit = parseInt(searchParams.get("limit") || "100");
    const skip = parseInt(searchParams.get("skip") || "0");

    let where: any = { isArchived: false };

    if (query) {
      where.OR = [
        { name: { contains: query, mode: "insensitive" } },
        { catalogNumber: { contains: query, mode: "insensitive" } },
        { oemNumber: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
      ];
    }

    if (categoryId) {
      const categoryIds = await getCategoryAndChildrenIds(categoryId);
      where.categoryId = { in: categoryIds };
    }

    if (generationId) {
      where.vehicleFitments = {
        some: {
          generationId: generationId,
        },
      };
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice);
      if (maxPrice) where.price.lte = parseFloat(maxPrice);
    }

    const products = await db.product.findMany({
      where,
      include: {
        category: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      skip: skip,
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error("Greška pri dohvaćanju proizvoda:", error);
    return NextResponse.json(
      { error: "Greška pri dohvaćanju proizvoda" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = productApiSchema.safeParse(body);

    if (!result.success) {
      console.error('[PRODUCTS_POST_VALIDATION_ERROR]', JSON.stringify(result.error.flatten(), null, 2));
      return new NextResponse(JSON.stringify(result.error.flatten()), { status: 400 });
    }

    const {
      name,
      description,
      price,
      imageUrl,
      categoryId,
      catalogNumber,
      oemNumber,
      generationIds, // Destrukturiramo ID-jeve generacija
      // Dodajemo ostala polja iz validacijske sheme
      weight,
      width,
      height,
      length,
      yearOfManufacture,
      vehicleBrand,
      vehicleModel,
      engineType,
      unitOfMeasure,
      stock,
      categoryAttributes, // Dinamički atributi kategorije
    } = result.data;

    // Pripremamo dimensions JSON objekt
    const dimensions = {
      weight: weight || null,
      width: width || null,
      height: height || null,
      length: length || null
    };
    
    // Pripremamo technicalSpecs JSON objekt
    const technicalSpecs = {
      yearOfManufacture: yearOfManufacture || null,
      vehicleBrand: vehicleBrand || null,
      vehicleModel: vehicleModel || null,
      engineType: engineType || null,
      unitOfMeasure: unitOfMeasure || null
    };
    
    // Prvo kreiramo proizvod bez atributa
    const product = await db.product.create({
      data: {
        name,
        description,
        price,
        imageUrl: imageUrl || null,
        categoryId,
        catalogNumber,
        oemNumber,
        // Koristimo JSON polja za dimenzije i tehničke specifikacije
        dimensions,
        technicalSpecs,
        stock: stock || 0,
        // Ne povezujemo generacije ovdje, to ćemo napraviti nakon kreiranja proizvoda
      },
    });

    // Ako postoje dinamički atributi kategorije, kreiramo zapise u ProductAttributeValue tabeli
    if (categoryAttributes && Object.keys(categoryAttributes).length > 0) {
      try {
        // Dohvatimo sve atribute kategorije
        const categoryAttrs = await db.categoryAttribute.findMany({
          where: { categoryId }
        });
        
        // Za svaki atribut u categoryAttributes, kreiramo zapis u ProductAttributeValue
        for (const [attrName, attrValue] of Object.entries(categoryAttributes)) {
          // Pronađi atribut kategorije po imenu
          const attribute = categoryAttrs.find(attr => attr.name === attrName);
          
          if (attribute && attrValue) {
            await db.productAttributeValue.create({
              data: {
                value: attrValue,
                productId: product.id,
                attributeId: attribute.id
              }
            });
          }
        }
      } catch (error) {
        console.error('Error creating product attribute values:', error);
        // Ne prekidamo izvršavanje ako dođe do greške pri kreiranju atributa
      }
    }
    
    // Ako postoje generationIds, kreiramo ProductVehicleFitment zapise
    if (generationIds && generationIds.length > 0) {
      try {
        // Za svaku generaciju kreiramo zapis u ProductVehicleFitment tabeli
        for (const generationId of generationIds) {
          await db.productVehicleFitment.create({
            data: {
              productId: product.id,
              generationId,
              // Ostala polja možemo ostaviti prazna ili postaviti default vrijednosti
              isUniversal: false
            }
          });
        }
      } catch (error) {
        console.error('Error creating product vehicle fitments:', error);
        // Ne prekidamo izvršavanje ako dođe do greške pri kreiranju fitment zapisa
      }
    }
    
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.issues), { status: 400 });
    }
    console.error('[PRODUCTS_POST]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
