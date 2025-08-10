import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ engineType: string }>}
) {
  try {
    const { engineType } = await params;

    // Provjera je li engineType validan
    if (!engineType) {
      return new NextResponse('Engine type is required', { status: 400 });
    }

    // Dohvat snaga motora za odabrani tip motora iz baze
    const engines = await db.vehicleEngine.findMany({
      where: {
        engineType: engineType,
      },
      select: {
        enginePowerHP: true,
      },
      distinct: ['enginePowerHP'],
      orderBy: {
        enginePowerHP: 'asc',
      },
    });

    // Izdvajanje jedinstvenih snaga motora i filtriranje null vrijednosti
    const enginePowers = engines
      .map(engine => engine.enginePowerHP)
      .filter(power => power !== null) as number[];

    return NextResponse.json(enginePowers);
  } catch (error) {
    console.error('[ENGINE_POWERS_GET]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
