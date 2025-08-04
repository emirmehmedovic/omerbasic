import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: { capacity: string } }
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

    // U stvarnoj implementaciji, ovdje bismo dohvatili kodove motora iz baze
    // Za sada vraćamo fiksne vrijednosti
    const engineCodes = ['CJXB', 'CJXC', 'CJXD', 'CZDA', 'CZDB', 'CZDC'];

    return NextResponse.json(engineCodes);
  } catch (error) {
    console.error('[ENGINE_CODES_GET]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
