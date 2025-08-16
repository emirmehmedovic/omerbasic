import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const suggestionQuerySchema = z.object({
  categoryIds: z.array(z.string()).min(1),
  excludeProductIds: z.array(z.string()).optional(),
  take: z.number().optional().default(4),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsedQuery = suggestionQuerySchema.safeParse(body);

    if (!parsedQuery.success) {
      return new NextResponse('Invalid request body', { status: 400 });
    }

    const { categoryIds, excludeProductIds, take } = parsedQuery.data;

    const suggestions = await db.product.findMany({
      where: {
        categoryId: {
          in: categoryIds,
        },
        id: {
          notIn: excludeProductIds,
        },
      },
      take,
      include: {
        category: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(suggestions);
  } catch (error) {
    console.error('[PRODUCTS_SUGGESTIONS_POST]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
