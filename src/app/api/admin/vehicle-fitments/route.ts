import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

function requireAdmin(session: any) {
  const role = session?.user?.role;
  if (!role || (role !== 'ADMIN' && role !== 'SUPERADMIN')) {
    throw new NextResponse('Unauthorized', { status: 401 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    requireAdmin(session);

    const { searchParams } = new URL(req.url);
    const generationId = searchParams.get('generationId') || undefined;
    const engineId = searchParams.get('engineId') || undefined;

    if (!generationId) {
      return new NextResponse('generationId required', { status: 400 });
    }

    const fitments = await db.productVehicleFitment.findMany({
      where: {
        generationId,
        engineId: engineId ? engineId : undefined,
      },
      include: {
        product: {
          select: { id: true, name: true, oemNumber: true, catalogNumber: true, price: true }
        },
        engine: true,
        generation: {
          select: { id: true, name: true }
        },
      },
      orderBy: { productId: 'asc' }
    });

    return NextResponse.json(fitments);
  } catch (e) {
    if (e instanceof NextResponse) return e;
    console.error('[ADMIN_FITMENTS_GET]', e);
    return new NextResponse('Internal error', { status: 500 });
  }
}
