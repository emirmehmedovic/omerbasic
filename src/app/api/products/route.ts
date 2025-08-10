import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { productApiSchema } from '@/lib/validations/product';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/session';

// Pomoćna funkcija za dohvat kategorije i svih njenih podkategorija (potomaka)
async function getCategoryAndChildrenIds(categoryId: string): Promise<string[]> {
  const allIds: string[] = [categoryId];
  let queue: string[] = [categoryId];

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

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  try {
    console.log('[PRODUCTS_GET] Headers:', JSON.stringify(Object.fromEntries([...req.headers.entries()]), null, 2));
    
    // Dohvati token iz headera koji je postavljen u middleware-u
    let token = null;
    const tokenHeader = req.headers.get('x-nextauth-token');
    
    console.log('[PRODUCTS_GET] x-nextauth-token header postoji:', tokenHeader ? 'DA' : 'NE');
    
    if (tokenHeader) {
      console.log('[PRODUCTS_GET] Raw token header:', tokenHeader);
      try {
        token = JSON.parse(tokenHeader);
        console.log('[PRODUCTS_GET] Token iz headera:', JSON.stringify(token, null, 2));
      } catch (error) {
        console.error('[PRODUCTS_GET] Greška pri parsiranju tokena:', error);
      }
    } else {
      // Pokušaj dohvatiti trenutnog korisnika kao fallback
      try {
        const currentUser = await getCurrentUser();
        console.log('[PRODUCTS_GET] Fallback - getCurrentUser:', JSON.stringify(currentUser, null, 2));
        if (currentUser) {
          token = {
            role: currentUser.role,
            discountPercentage: currentUser.discountPercentage
          };
        }
      } catch (error) {
        console.error('[PRODUCTS_GET] Greška pri dohvaćanju korisnika:', error);
      }
    }
    
    // Koristi token za B2B cijene
    const isB2B = token?.role === 'B2B';
    const discountPercentage = isB2B ? (token?.discountPercentage || 0) : 0;
    
    // Debugging info
    console.log('[PRODUCTS_GET] isB2B:', isB2B);
    console.log('[PRODUCTS_GET] discountPercentage:', discountPercentage);
    
    // Extract all potential filter parameters from the URL
    const categoryId = searchParams.get('categoryId') || undefined;
    const generationId = searchParams.get('generationId') || undefined;
    const catalogNumber = searchParams.get('catalogNumber') || undefined;
    const oemNumber = searchParams.get('oemNumber') || undefined;
    const minPrice = searchParams.get('minPrice') || undefined;
    const maxPrice = searchParams.get('maxPrice') || undefined;
    const q = searchParams.get('q') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;

    const filters: any[] = [];

    if (categoryId) {
      const categoryIds = await getCategoryAndChildrenIds(categoryId);
      filters.push({ categoryId: { in: categoryIds } });
    }
    if (catalogNumber) filters.push({ catalogNumber: { contains: catalogNumber, mode: 'insensitive' } });
    if (oemNumber) filters.push({ oemNumber: { contains: oemNumber, mode: 'insensitive' } });

    if (generationId) {
      filters.push({
        vehicleFitments: {
          some: {
            generationId: generationId,
          },
        },
      });
    }

    if (minPrice || maxPrice) {
      const priceFilter: any = {};
      if (minPrice) priceFilter.gte = parseFloat(minPrice);
      if (maxPrice) priceFilter.lte = parseFloat(maxPrice);
      filters.push({ price: priceFilter });
    }

    if (q) {
      filters.push({
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
          { oemNumber: { contains: q, mode: 'insensitive' } },
          { catalogNumber: { contains: q, mode: 'insensitive' } },
          {
            attributeValues: {
              some: {
                value: { contains: q, mode: 'insensitive' },
              },
            },
          },
        ],
      });
    }

    const where = filters.length > 0 ? { AND: filters } : {};

    const products = await db.product.findMany({
      where,
      include: {
        category: true,
        attributeValues: {
          include: {
            attribute: true
          }
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      ...(limit ? { take: limit } : {}),
    });

    // Ako je B2B korisnik, primijeni popust na cijene proizvoda
    if (isB2B) {
      // Dohvati ID korisnika iz tokena
      const userId = token?.id;
      
      if (userId) {
        // Dohvati kategorijske popuste za korisnika
        const categoryDiscounts = await db.categoryDiscount.findMany({
          where: {
            userId: userId,
          }
        });
        
        // Kreiraj mapu popusta po kategorijama za brži pristup
        const discountMap = new Map();
        categoryDiscounts.forEach(discount => {
          discountMap.set(discount.categoryId, discount.discountPercentage);
        });
        
        // Primijeni popuste specifične za kategorije ili globalni popust
        const productsWithDiscount = products.map(product => {
          const originalPrice = product.price;
          
          // Prvo provjeri postoji li specifični popust za kategoriju
          let categoryDiscount = discountMap.get(product.categoryId);
          
          // Ako ne postoji specifični popust, koristi globalni popust
          if (categoryDiscount === undefined) {
            categoryDiscount = discountPercentage || 0;
          }
          
          const discountedPrice = originalPrice * (1 - categoryDiscount / 100);
          
          return {
            ...product,
            originalPrice: originalPrice, // Sačuvaj originalnu cijenu ako treba za prikaz
            price: Number(discountedPrice.toFixed(2)), // Zaokruži na 2 decimale i konvertiraj natrag u broj
            appliedDiscount: categoryDiscount, // Dodaj informaciju o primijenjenom popustu
          };
        });
        
        return NextResponse.json(productsWithDiscount);
      } else if (discountPercentage > 0) {
        // Fallback na globalni popust ako nemamo userId
        const productsWithDiscount = products.map(product => {
          const originalPrice = product.price;
          const discountedPrice = originalPrice * (1 - discountPercentage / 100);
          
          return {
            ...product,
            originalPrice: originalPrice,
            price: Number(discountedPrice.toFixed(2)),
            appliedDiscount: discountPercentage,
          };
        });
        
        return NextResponse.json(productsWithDiscount);
      }
    }

    return NextResponse.json(products);
  } catch (error) {
    console.error('[PRODUCTS_GET]', error);
    return new NextResponse('Internal error', { status: 500 });
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
