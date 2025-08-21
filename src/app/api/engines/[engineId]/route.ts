import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ engineId: string }> }
) {
  try {
    const { engineId } = await params;
    if (!engineId) {
      return new NextResponse('Engine ID is required', { status: 400 });
    }

    const engine = await db.vehicleEngine.findUnique({
      where: { id: engineId },
      select: {
        id: true,
        engineType: true,
        enginePowerKW: true,
        enginePowerHP: true,
        engineCapacity: true,
        engineCode: true,
        description: true,
        generationId: true,
      },
    });

    if (!engine) {
      return new NextResponse('Engine not found', { status: 404 });
    }

    return NextResponse.json(engine);
  } catch (error) {
    console.error('[ENGINE_BY_ID_GET]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
