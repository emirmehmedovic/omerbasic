import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { EngineType } from '@/lib/types';

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

    // U stvarnoj implementaciji, ovdje bismo dohvatili tipove motora iz baze
    // Za sada vraćamo fiksne vrijednosti iz EngineType enuma
    const engineTypes = Object.values(EngineType);

    return NextResponse.json(engineTypes);
  } catch (error) {
    console.error('[ENGINE_TYPES_GET]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
