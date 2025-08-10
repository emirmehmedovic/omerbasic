import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';

import { db } from '@/lib/db';
import { authOptions } from '@/lib/auth';

// Shema za validaciju
const vehicleEngineSchema = z.object({
  engineType: z.string().min(1, { message: 'Tip motora je obavezan' }),
  enginePowerKW: z.number().optional().nullable(),
  enginePowerHP: z.number().optional().nullable(),
  engineCapacity: z.number().optional().nullable(),
  engineCode: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

export async function GET(
  req: Request,
  context: { params: { brandId: string; modelId: string; generationId: string } }
) {
  try {
    const params = await context.params;
    const { generationId } = params;

    // Provjera postoji li generacija
    const generation = await db.vehicleGeneration.findUnique({
      where: { id: generationId },
    });

    if (!generation) {
      return NextResponse.json({ error: 'Generacija vozila nije pronađena' }, { status: 404 });
    }

    // Dohvaćanje svih motora za ovu generaciju
    const engines = await db.vehicleEngine.findMany({
      where: { generationId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(engines);
  } catch (error) {
    console.error('Error fetching vehicle engines:', error);
    return NextResponse.json({ error: 'Greška prilikom dohvaćanja motora vozila' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  context: { params: { brandId: string; modelId: string; generationId: string } }
) {
  try {
    // Provjera autentikacije
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nemate dozvolu za ovu akciju' }, { status: 403 });
    }

    const params = await context.params;
    const { generationId } = params;

    // Provjera postoji li generacija
    const generation = await db.vehicleGeneration.findUnique({
      where: { id: generationId },
    });

    if (!generation) {
      return NextResponse.json({ error: 'Generacija vozila nije pronađena' }, { status: 404 });
    }

    const body = await req.json();
    const result = vehicleEngineSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.format() }, { status: 400 });
    }

    const { 
      engineType, enginePowerKW, enginePowerHP, 
      engineCapacity, engineCode, description 
    } = result.data;

    // Kreiranje novog motora
    const vehicleEngine = await db.vehicleEngine.create({
      data: {
        generationId,
        engineType,
        enginePowerKW,
        enginePowerHP,
        engineCapacity,
        engineCode,
        description,
      }
    });

    return NextResponse.json(vehicleEngine, { status: 201 });
  } catch (error) {
    console.error('Error creating vehicle engine:', error);
    return NextResponse.json({ error: 'Greška prilikom kreiranja motora vozila' }, { status: 500 });
  }
}
