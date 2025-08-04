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

    const filters: any[] = [];

    if (categoryId) {
      const categoryIds = await getCategoryAndChildrenIds(categoryId);
      filters.push({ categoryId: { in: categoryIds } });
    }
    if (catalogNumber) filters.push({ catalogNumber: { contains: catalogNumber, mode: 'insensitive' } });
    if (oemNumber) filters.push({ oemNumber: { contains: oemNumber, mode: 'insensitive' } });

    if (generationId) {
      filters.push({
        vehicleGenerations: {
          some: {
            id: generationId,
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
        ],
      });
    }

    const where = filters.length > 0 ? { AND: filters } : {};

    const products = await db.product.findMany({
      where,
      include: {
        category: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Ako je B2B korisnik, primijeni popust na cijene proizvoda
    if (isB2B && discountPercentage > 0) {
      const productsWithDiscount = products.map(product => {
        const originalPrice = product.price;
        const discountedPrice = originalPrice * (1 - discountPercentage / 100);
        
        return {
          ...product,
          originalPrice: originalPrice, // Sačuvaj originalnu cijenu ako treba za prikaz
          price: Number(discountedPrice.toFixed(2)), // Zaokruži na 2 decimale i konvertiraj natrag u broj
        };
      });
      
      return NextResponse.json(productsWithDiscount);
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
    } = result.data;

    const product = await db.product.create({
      data: {
        name,
        description,
        price,
        imageUrl: imageUrl || null,
        categoryId,
        catalogNumber,
        oemNumber,
        // Ako postoje generationIds, poveži ih s proizvodom
        ...(generationIds && generationIds.length > 0 && {
          vehicleGenerations: {
            connect: generationIds.map((id: string) => ({ id }))
          }
        })
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.issues), { status: 400 });
    }
    console.error('[PRODUCTS_POST]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
