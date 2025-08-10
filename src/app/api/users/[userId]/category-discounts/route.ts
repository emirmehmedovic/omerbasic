import { NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma/client';
import { getCurrentUser } from '@/lib/session';
import { z } from 'zod';

// Inicijaliziraj Prisma klijenta direktno
const db = new PrismaClient();

// Schema za validaciju podataka za kreiranje/ažuriranje popusta
const categoryDiscountSchema = z.object({
  categoryId: z.string(),
  discountPercentage: z.number().min(0).max(100),
});

// GET - dohvat svih popusta za korisnika
export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string }>}
) {
  try {
    // Dohvati userId iz parametara rute
    const { userId } = await params;
    console.log('[CATEGORY_DISCOUNTS_GET] userId:', userId);
    
    const currentUser = await getCurrentUser();
    console.log('[CATEGORY_DISCOUNTS_GET] currentUser:', currentUser?.id, currentUser?.role);

    // Samo admin može vidjeti popuste drugih korisnika
    if (!currentUser || (currentUser.id !== userId && currentUser.role !== 'ADMIN')) {
      return new NextResponse('Unauthorized', { status: 403 });
    }

    // Koristimo try-catch za dohvat popusta
    try {
      console.log('[CATEGORY_DISCOUNTS_GET] Pokušavam dohvatiti popuste za korisnika:', userId);
      
      const categoryDiscounts = await db.categoryDiscount.findMany({
        where: {
          userId: userId,
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              level: true,
              parentId: true,
            }
          }
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      
      console.log('[CATEGORY_DISCOUNTS_GET] Uspješno dohvaćeni popusti:', categoryDiscounts.length);
      return NextResponse.json(categoryDiscounts);
    } catch (dbError) {
      console.error('[CATEGORY_DISCOUNTS_GET] Greška pri dohvatu iz baze:', dbError);
      return new NextResponse('Database query error', { status: 500 });
    }
  } catch (error) {
    console.error('[CATEGORY_DISCOUNTS_GET]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}

// POST - kreiranje novog popusta za kategoriju
export async function POST(
  req: Request,
  { params }: { params: Promise<{ userId: string }>}
) {
  try {
    // Dohvati userId iz parametara rute
    const { userId } = await params;
    
    const currentUser = await getCurrentUser();

    // Samo admin može kreirati popuste
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return new NextResponse('Unauthorized', { status: 403 });
    }

    const body = await req.json();
    
    const { categoryId, discountPercentage } = categoryDiscountSchema.parse(body);

    // Provjeri postoji li već popust za ovu kategoriju i korisnika
    const existingDiscount = await db.categoryDiscount.findUnique({
      where: {
        userId_categoryId: {
          userId: userId,
          categoryId,
        }
      }
    });

    if (existingDiscount) {
      return new NextResponse('Discount for this category already exists', { status: 400 });
    }

    // Kreiraj novi popust
    const categoryDiscount = await db.categoryDiscount.create({
      data: {
        userId: userId,
        categoryId,
        discountPercentage,
      },
    });

    return NextResponse.json(categoryDiscount);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.format()), { status: 400 });
    }
    
    console.error('[CATEGORY_DISCOUNTS_POST]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
