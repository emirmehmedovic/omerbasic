import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { VehicleType } from '@/generated/prisma/client';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') as VehicleType | null;

    const whereClause = type ? { type } : {};

    const brands = await db.vehicleBrand.findMany({
      where: whereClause,
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json(brands);
  } catch (error) {
    console.error('[API_BRANDS_GET]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
