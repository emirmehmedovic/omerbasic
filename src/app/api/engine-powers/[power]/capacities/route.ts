import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: { power: string } }
) {
  try {
    const { power } = await params;

    // Provjera je li power validan
    if (!power) {
      return new NextResponse('Engine power is required', { status: 400 });
    }

    // Pretvaranje power u broj
    const powerValue = parseInt(power, 10);
    if (isNaN(powerValue)) {
      return new NextResponse('Invalid engine power value', { status: 400 });
    }

    // Dohvat zapremina motora za odabranu snagu motora iz baze
    const engines = await db.vehicleEngine.findMany({
      where: {
        enginePowerHP: powerValue,
      },
      select: {
        engineCapacity: true,
      },
      distinct: ['engineCapacity'],
      orderBy: {
        engineCapacity: 'asc',
      },
    });

    // Izdvajanje jedinstvenih zapremina motora i filtriranje null vrijednosti
    const engineCapacities = engines
      .map(engine => engine.engineCapacity)
      .filter(capacity => capacity !== null) as number[];

    return NextResponse.json(engineCapacities);
  } catch (error) {
    console.error('[ENGINE_CAPACITIES_GET]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
