import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';

import { db } from '@/lib/db';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// Shema za validaciju
const vehicleBrandSchema = z.object({
  name: z.string().min(1, { message: 'Naziv marke je obavezan' }),
  type: z.enum(['PASSENGER', 'COMMERCIAL']).describe('Tip vozila (PASSENGER ili COMMERCIAL)')
});

export async function GET() {
  try {
    const vehicleBrands = await db.vehicleBrand.findMany({
      include: {
        models: {
          include: {
            generations: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json(vehicleBrands);
  } catch (error) {
    console.error('Error fetching vehicle brands:', error);
    return NextResponse.json({ error: 'Greška prilikom dohvaćanja marki vozila' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const result = vehicleBrandSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.format() }, { status: 400 });
    }

    const { name, type } = result.data;

    // Provjera postoji li već marka s istim imenom
    const existingBrand = await db.vehicleBrand.findUnique({
      where: { name }
    });

    if (existingBrand) {
      return NextResponse.json({ error: 'Marka vozila s ovim imenom već postoji' }, { status: 400 });
    }

    const vehicleBrand = await db.vehicleBrand.create({
      data: {
        name,
        type
      }
    });

    return NextResponse.json(vehicleBrand, { status: 201 });
  } catch (error) {
    console.error('Error creating vehicle brand:', error);
    return NextResponse.json({ error: 'Greška prilikom kreiranja marke vozila' }, { status: 500 });
  }
}
