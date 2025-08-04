import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: { brandId: string } }
) {
    try {
    const { brandId } = params;
    const models = await db.vehicleModel.findMany({
      where: {
        brandId,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json(models);
  } catch (error) {
    console.error('[API_MODELS_GET]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
