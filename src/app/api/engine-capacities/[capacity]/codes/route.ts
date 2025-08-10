import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ capacity: string }>}
) {
  try {
    const { capacity } = await params;

    // Provjera je li capacity validan
    if (!capacity) {
      return new NextResponse('Engine capacity is required', { status: 400 });
    }

    // Pretvaranje capacity u broj
    const capacityValue = parseInt(capacity, 10);
    if (isNaN(capacityValue)) {
      return new NextResponse('Invalid engine capacity value', { status: 400 });
    }

    // Dohvat kodova motora za odabranu zapreminu motora iz baze
    const engines = await db.vehicleEngine.findMany({
      where: {
        engineCapacity: capacityValue,
      },
      select: {
        engineCode: true,
      },
      distinct: ['engineCode'],
    });

    // Izdvajanje jedinstvenih kodova motora i filtriranje null vrijednosti
    const engineCodes = engines
      .map(engine => engine.engineCode)
      .filter(code => code !== null && code !== '') as string[];

    return NextResponse.json(engineCodes);
  } catch (error) {
    console.error('[ENGINE_CODES_GET]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
