import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { UserRole } from '@/generated/prisma/client';
import { rateLimit, keyFromIpAndPath } from '@/lib/ratelimit';

// Stream CSV export of products for admin
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== UserRole.ADMIN) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // Rate limit: e.g., 3 exports per 10 minutes per IP
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || (req as any).ip || null;
  const key = keyFromIpAndPath(ip, '/api/admin/products/export');
  const rl = await rateLimit(key, 3, 10 * 60 * 1000);
  if (!rl.ok) {
    return new NextResponse('Too Many Requests', {
      status: 429,
      headers: {
        'Retry-After': Math.ceil(rl.resetInMs / 1000).toString(),
        'X-RateLimit-Remaining': rl.remaining.toString(),
      },
    });
  }

  const encoder = new TextEncoder();

  // Parse filters
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim() || '';
  const categoryId = searchParams.get('categoryId')?.trim() || '';

  // Build category filter including descendants if provided
  let categoryWhere: { in: string[] } | { equals: string } | undefined = undefined;
  if (categoryId) {
    try {
      const cats = await db.$queryRaw<{ id: string }[]>`
        WITH RECURSIVE cte AS (
          SELECT ${categoryId}::uuid AS id
          UNION ALL
          SELECT c."id" FROM "Category" c JOIN cte ON c."parentId" = cte.id
        )
        SELECT id FROM cte
      `;
      const catIds = cats.map(c => c.id);
      categoryWhere = catIds.length > 0 ? { in: catIds } : { equals: categoryId };
    } catch {
      categoryWhere = { equals: categoryId };
    }
  }

  function escapeCsv(value: any): string {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (/[",\n]/.test(str)) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  const headersRow = [
    'id',
    'name',
    'catalogNumber',
    'oemNumber',
    'price',
    'stock',
    'categoryId',
    'categoryName',
    'createdAt',
    'updatedAt'
  ].join(',') + '\n';

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      type ExportProduct = {
        id: string;
        name: string;
        catalogNumber: string;
        oemNumber: string | null;
        price: number;
        stock: number;
        categoryId: string;
        category: { id: string; name: string } | null;
        createdAt: Date;
        updatedAt: Date;
      };
      // write header
      controller.enqueue(encoder.encode(headersRow));

      const PAGE_SIZE = 1000;
      let lastId: string | null = null;

      while (true) {
        const whereClause: any = {};
        if (lastId) whereClause.id = { gt: lastId };
        if (categoryWhere) whereClause.categoryId = categoryWhere as any;
        if (q) {
          whereClause.OR = [
            { name: { contains: q, mode: 'insensitive' } },
            { catalogNumber: { contains: q, mode: 'insensitive' } },
            { oemNumber: { contains: q, mode: 'insensitive' } },
          ];
        }

        const batch: ExportProduct[] = await db.product.findMany({
          where: Object.keys(whereClause).length ? whereClause : undefined,
          orderBy: { id: 'asc' },
          take: PAGE_SIZE,
          include: { category: { select: { id: true, name: true } } },
        });

        if (batch.length === 0) break;

        for (const p of batch) {
          const row = [
            escapeCsv(p.id),
            escapeCsv(p.name),
            escapeCsv(p.catalogNumber),
            escapeCsv(p.oemNumber ?? ''),
            escapeCsv(p.price),
            escapeCsv(p.stock),
            escapeCsv(p.categoryId),
            escapeCsv(p.category?.name ?? ''),
            escapeCsv(p.createdAt.toISOString()),
            escapeCsv(p.updatedAt.toISOString()),
          ].join(',') + '\n';
          controller.enqueue(encoder.encode(row));
        }

        lastId = batch[batch.length - 1].id;

        // Yield to event loop to keep stream responsive
        await new Promise((r) => setTimeout(r, 0));
      }

      controller.close();
    },
  });

  const filename = `products-export-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`;

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      // Prevent caching of potentially sensitive admin export
      'Cache-Control': 'no-store',
      'X-RateLimit-Remaining': rl.remaining.toString(),
    },
  });
}
