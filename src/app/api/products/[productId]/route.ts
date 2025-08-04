import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { updateProductSchema } from '@/lib/validations/product';
import { z } from 'zod';

interface IParams {
  params: {
    productId: string;
  };
}

export async function GET(req: Request, { params }: IParams) {
  try {
    const { productId } = params;
    const product = await db.product.findUnique({
      where: { id: productId },
      include: { category: true },
    });

    if (!product) {
      return new NextResponse('Proizvod nije pronađen', { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('[PRODUCT_GET]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: IParams) {
  try {
    const { productId } = params;
    const body = await req.json();

    const validation = updateProductSchema.safeParse(body);

    if (!validation.success) {
      return new NextResponse(JSON.stringify(validation.error.flatten()), { status: 400 });
    }

    const product = await db.product.update({
      where: { id: productId },
      data: validation.data,
    });

    return NextResponse.json(product);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.issues), { status: 400 });
    }
    console.error('[PRODUCT_PATCH]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: IParams) {
  try {
    const { productId } = params;

    await db.product.delete({
      where: { id: productId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[PRODUCT_DELETE]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
