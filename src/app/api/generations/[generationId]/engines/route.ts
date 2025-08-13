import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  _req: Request,
  { params }: { params: { generationId: string } }
) {
  try {
    const { generationId } = params;

    if (!generationId) {
      return new NextResponse('Generation ID is required', { status: 400 });
    }

    // Ensure generation exists (optional but helpful)
    const generation = await db.vehicleGeneration.findUnique({
      where: { id: generationId },
      select: { id: true },
    });

    if (!generation) {
      return new NextResponse('Generation not found', { status: 404 });
    }

    // Return full engine records for the generation
    const engines = await db.vehicleEngine.findMany({
      where: { generationId },
      orderBy: [{ engineType: 'asc' }, { enginePowerKW: 'asc' }, { engineCode: 'asc' }],
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

    return NextResponse.json(engines);
  } catch (error) {
    console.error('[ENGINES_BY_GENERATION_GET]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
