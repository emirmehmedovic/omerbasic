import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';

import { db } from '@/lib/db';

const payloadSchema = z.object({
  productIds: z.array(z.string().cuid()).min(1, 'Potrebno je odabrati barem jedan proizvod.'),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  try {
    const { productIds } = payloadSchema.parse(await req.json());
    const { categoryId } = await params;

    const categoryExists = await db.category.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });

    if (!categoryExists) {
      return new NextResponse('Kategorija nije pronađena.', { status: 404 });
    }

    await db.product.updateMany({
      where: { id: { in: productIds } },
      data: { categoryId },
    });

    try {
      revalidateTag('products');
      revalidateTag('categories');
    } catch {}

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.format()), { status: 400 });
    }
    console.error('[CATEGORY_ASSIGN_PRODUCTS]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
