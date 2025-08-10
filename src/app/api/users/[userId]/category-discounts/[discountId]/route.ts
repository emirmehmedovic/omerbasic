import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { z } from 'zod';

// Schema za validaciju podataka za ažuriranje popusta
const updateCategoryDiscountSchema = z.object({
  discountPercentage: z.number().min(0).max(100),
});

// GET - dohvat pojedinačnog popusta
export async function GET(
  req: Request,
  context: { params: { userId: string; discountId: string } }
) {
  try {
    // Dohvati userId i discountId iz parametara rute
    const { userId, discountId } = context.params;
    
    const currentUser = await getCurrentUser();

    // Samo admin može vidjeti popuste drugih korisnika
    if (!currentUser || (currentUser.id !== userId && currentUser.role !== 'ADMIN')) {
      return new NextResponse('Unauthorized', { status: 403 });
    }

    const categoryDiscount = await db.categoryDiscount.findUnique({
      where: {
        id: discountId,
        userId: userId,
      },
      include: {
        category: true,
      },
    });

    if (!categoryDiscount) {
      return new NextResponse('Discount not found', { status: 404 });
    }

    return NextResponse.json(categoryDiscount);
  } catch (error) {
    console.error('[CATEGORY_DISCOUNT_GET]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}

// PATCH - ažuriranje postojećeg popusta
export async function PATCH(
  req: Request,
  context: { params: { userId: string, discountId: string } }
) {
  try {
    // Dohvati userId i discountId iz parametara rute
    const { userId, discountId } = context.params;
    
    const currentUser = await getCurrentUser();

    // Samo admin može ažurirati popuste
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return new NextResponse('Unauthorized', { status: 403 });
    }

    const body = await req.json();
    
    const { discountPercentage } = updateCategoryDiscountSchema.parse(body);

    // Provjeri postoji li popust
    const existingDiscount = await db.categoryDiscount.findUnique({
      where: {
        id: discountId,
        userId: userId,
      }
    });

    if (!existingDiscount) {
      return new NextResponse('Discount not found', { status: 404 });
    }

    // Ažuriraj popust
    const updatedDiscount = await db.categoryDiscount.update({
      where: {
        id: discountId,
      },
      data: {
        discountPercentage,
      },
    });

    return NextResponse.json(updatedDiscount);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.format()), { status: 400 });
    }
    
    console.error('[CATEGORY_DISCOUNT_PATCH]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}

// DELETE - brisanje popusta
export async function DELETE(
  req: Request,
  context: { params: { userId: string, discountId: string } }
) {
  try {
    // Dohvati userId i discountId iz parametara rute
    const { userId, discountId } = context.params;
    
    const currentUser = await getCurrentUser();

    // Samo admin može brisati popuste
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return new NextResponse('Unauthorized', { status: 403 });
    }

    // Provjeri postoji li popust
    const existingDiscount = await db.categoryDiscount.findUnique({
      where: {
        id: discountId,
        userId: userId,
      }
    });

    if (!existingDiscount) {
      return new NextResponse('Discount not found', { status: 404 });
    }

    // Obriši popust
    await db.categoryDiscount.delete({
      where: {
        id: discountId,
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[CATEGORY_DISCOUNT_DELETE]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
