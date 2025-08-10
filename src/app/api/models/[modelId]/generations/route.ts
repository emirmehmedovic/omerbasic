import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ modelId: string }>}
) {
    try {
    const { modelId } = await params;
    const generations = await db.vehicleGeneration.findMany({
      where: {
        modelId,
      },
      orderBy: {
        period: 'desc',
      },
    });

    return NextResponse.json(generations);
  } catch (error) {
    console.error('[API_GENERATIONS_GET]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
