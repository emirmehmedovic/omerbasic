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

    // U stvarnoj implementaciji, ovdje bismo dohvatili zapremine motora iz baze
    // Za sada vraćamo fiksne vrijednosti
    const engineCapacities = [1000, 1200, 1400, 1600, 1800, 2000, 2200, 2500, 3000];

    return NextResponse.json(engineCapacities);
  } catch (error) {
    console.error('[ENGINE_CAPACITIES_GET]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
