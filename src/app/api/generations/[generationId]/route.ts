import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: { generationId: string } }
) {
  try {
    if (!params.generationId) {
      return new NextResponse('Generation ID is required', { status: 400 });
    }

    const generation = await db.vehicleGeneration.findUnique({
      where: {
        id: params.generationId,
      },
      include: {
        model: {
          include: {
            brand: true,
          },
        },
      },
    });

    if (!generation) {
      return new NextResponse('Generation not found', { status: 404 });
    }

    return NextResponse.json(generation);
  } catch (error) {
    console.error('[API_GENERATION_GET]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
