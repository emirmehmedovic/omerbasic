import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: { generationId: string } }
) {
  try {
    const { generationId } = params;

    // Provjera je li generationId validan
    if (!generationId) {
      return new NextResponse('Generation ID is required', { status: 400 });
    }

    // Dohvat generacije iz baze
    const generation = await db.vehicleGeneration.findUnique({
      where: {
        id: generationId,
      },
    });

    if (!generation) {
      return new NextResponse('Generation not found', { status: 404 });
    }

    // Dohvat tipova motora za ovu generaciju iz baze
    const engines = await db.vehicleEngine.findMany({
      where: {
        generationId: generationId,
      },
      distinct: ['engineType'],
      select: {
        engineType: true,
      },
    });

    // Izdvajanje jedinstvenih tipova motora
    const engineTypes = engines.map(engine => engine.engineType);

    return NextResponse.json(engineTypes);
  } catch (error) {
    console.error('[ENGINE_TYPES_GET]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
