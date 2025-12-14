import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAdminSession } from '@/lib/api/admin-auth';
import { generateUniqueProductSlug } from '@/lib/product-slug';

export async function POST(req: Request) {
  const admin = await getAdminSession();
  if (!admin) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {}

    const mode = body?.mode as 'all' | 'missing' | undefined;
    const productId = body?.productId as string | undefined;

    if (productId) {
      const product = await db.product.findUnique({
        where: { id: productId },
        include: {
          manufacturer: {
            select: { name: true },
          },
        },
      });

      if (!product) {
        return new NextResponse('Product not found', { status: 404 });
      }

      const slug = await generateUniqueProductSlug({
        productId: product.id,
        name: product.name,
        catalogNumber: product.catalogNumber,
        manufacturerName: product.manufacturer?.name ?? null,
      });

      const updated = await db.product.update({
        where: { id: product.id },
        data: { slug },
      });

      return NextResponse.json({ id: updated.id, slug: updated.slug });
    }

    const where = mode === 'missing' ? { slug: null as any } : {};

    const products = await db.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        catalogNumber: true,
        manufacturer: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const total = products.length;
    if (!total) {
      return NextResponse.json({ total: 0, updated: 0 });
    }

    let updatedCount = 0;
    const batchSize = 100;

    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (product) => {
          const slug = await generateUniqueProductSlug({
            productId: product.id,
            name: product.name,
            catalogNumber: product.catalogNumber,
            manufacturerName: product.manufacturer?.name ?? null,
          });

          await db.product.update({
            where: { id: product.id },
            data: { slug },
          });

          updatedCount += 1;
        })
      );
    }

    return NextResponse.json({ total, updated: updatedCount });
  } catch (error) {
    if (error instanceof Error) {
      console.error('[ADMIN_PRODUCTS_REGENERATE_SLUGS]', error.message);
    }
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
