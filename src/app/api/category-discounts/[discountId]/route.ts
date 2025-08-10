import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';

// DELETE - brisanje popusta
export async function DELETE(
  req: Request,
  context: { params: { discountId: string } }
) {
  try {
    // Dohvati params objekt i izvuci discountId
    const { discountId } = await context.params;
    
    // Dohvati userId iz query parametra
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return new NextResponse('User ID is required', { status: 400 });
    }
    
    console.log('[CATEGORY_DISCOUNT_DELETE] discountId:', discountId, 'userId:', userId);
    
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

// GET - dohvat pojedinačnog popusta
export async function GET(
  req: Request,
  context: { params: { discountId: string } }
) {
  try {
    // Dohvati params objekt i izvuci discountId
    const { discountId } = await context.params;
    
    // Dohvati userId iz query parametra
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return new NextResponse('User ID is required', { status: 400 });
    }
    
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
