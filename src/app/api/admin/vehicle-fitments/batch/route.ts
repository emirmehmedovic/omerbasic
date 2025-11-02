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

async function expandEnginesForGeneration(generationId: string) {
  const engines = await db.vehicleEngine.findMany({ where: { generationId }, select: { id: true } });
  return engines.map(e => e.id);
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    requireAdmin(session);

    const body = await req.json();
    const { productIds, generationId, engineIds, linkAllEngines } = body as {
      productIds: string[];
      generationId?: string;
      engineIds?: string[];
      linkAllEngines?: boolean;
    };

    if (!productIds || productIds.length === 0) {
      return new NextResponse('productIds required', { status: 400 });
    }

    if (!generationId) {
      return new NextResponse('generationId required', { status: 400 });
    }

    let targetEngineIds: string[] = [];
    if (generationId) {
      if (linkAllEngines) {
        targetEngineIds = await expandEnginesForGeneration(generationId);
      } else if (engineIds && engineIds.length > 0) {
        targetEngineIds = engineIds;
      } else {
        targetEngineIds = [];
      }
    }

    let created = 0, skipped = 0;
    for (const productId of productIds) {
      if (targetEngineIds.length === 0) {
        // generation-level only
        const exists = await db.productVehicleFitment.findFirst({ where: { productId, generationId, engineId: null } });
        if (exists) { skipped++; continue; }
        await db.productVehicleFitment.create({ data: { productId, generationId: generationId!, engineId: null } });
        created++;
      } else {
        for (const engId of targetEngineIds) {
          const exists = await db.productVehicleFitment.findFirst({ where: { productId, generationId, engineId: engId } });
          if (exists) { skipped++; continue; }
          await db.productVehicleFitment.create({ data: { productId, generationId: generationId!, engineId: engId } });
          created++;
        }
      }
    }

    return NextResponse.json({ created, skipped });
  } catch (e: any) {
    if (e instanceof NextResponse) return e;
    console.error('[ADMIN_FITMENTS_POST]', e);
    return new NextResponse('Internal error', { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    requireAdmin(session);

    const body = await req.json();
    const { productIds, generationId, engineIds, linkAllEngines, isUniversal } = body as {
      productIds: string[];
      generationId?: string;
      engineIds?: string[];
      linkAllEngines?: boolean;
      isUniversal?: boolean;
    };

    if (!productIds || productIds.length === 0) {
      return new NextResponse('productIds required', { status: 400 });
    }

    if (!generationId) return new NextResponse('generationId required', { status: 400 });

    let targetEngineIds: string[] | null = null;
    if (linkAllEngines) targetEngineIds = await expandEnginesForGeneration(generationId);
    else if (engineIds && engineIds.length > 0) targetEngineIds = engineIds;
    else targetEngineIds = [];

    if (targetEngineIds.length === 0) {
      const del = await db.productVehicleFitment.deleteMany({ where: { productId: { in: productIds }, generationId, engineId: null } });
      return NextResponse.json({ deleted: del.count });
    } else {
      const del = await db.productVehicleFitment.deleteMany({ where: { productId: { in: productIds }, generationId, engineId: { in: targetEngineIds } } });
      return NextResponse.json({ deleted: del.count });
    }
  } catch (e: any) {
    if (e instanceof NextResponse) return e;
    console.error('[ADMIN_FITMENTS_DELETE]', e);
    return new NextResponse('Internal error', { status: 500 });
  }
}
