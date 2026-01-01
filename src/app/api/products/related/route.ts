import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Keširanje odgovora za kratko vrijeme je dovoljno za related proizvode
export const revalidate = 60;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get('categoryId');
  const currentProductId = searchParams.get('currentProductId');
  const rawLimit = searchParams.get('limit');

  const limit = Math.max(1, Math.min(parseInt(rawLimit || '8', 10) || 8, 12));

  if (!categoryId) {
    // Ako nemamo kategoriju, nema smisla vraćati related proizvode
    return NextResponse.json([]);
  }

  try {
    const products = await db.product.findMany({
      where: {
        isArchived: false,
        categoryId,
        id: currentProductId ? { not: currentProductId } : undefined,
        // Related proizvodi imaju smisla samo ako su dostupni
        stock: { gt: 0 },
      },
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        category: true,
        // Pre-computed compatible brands - much faster than vehicleFitments
        compatibleBrands: {
          select: {
            id: true,
            name: true,
          }
        },
      },
    });

    return NextResponse.json(products, { status: 200 });
  } catch (error) {
    console.error('[RELATED_PRODUCTS_ERROR]', error);
    return NextResponse.json([], { status: 200 });
  }
}
