import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: { engineType: string } }
) {
  try {
    const { engineType } = await params;

    // Provjera je li engineType validan
    if (!engineType) {
      return new NextResponse('Engine type is required', { status: 400 });
    }

    // U stvarnoj implementaciji, ovdje bismo dohvatili snage motora iz baze
    // Za sada vraćamo fiksne vrijednosti
    const enginePowers = [55, 66, 77, 85, 92, 110, 125, 140, 155, 170, 185, 200];

    return NextResponse.json(enginePowers);
  } catch (error) {
    console.error('[ENGINE_POWERS_GET]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
