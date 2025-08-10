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
  { params }: { params: Promise<{ brandId: string; modelId: string; generationId: string; engineId: string }> }
) {
  try {
    const { engineId } = await params;

    const engine = await db.vehicleEngine.findUnique({
      where: { id: engineId },
    });

    if (!engine) {
      return NextResponse.json({ error: 'Motor vozila nije pronađen' }, { status: 404 });
    }

    return NextResponse.json(engine);
  } catch (error) {
    console.error('Error fetching vehicle engine:', error);
    return NextResponse.json({ error: 'Greška prilikom dohvaćanja motora vozila' }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ brandId: string; modelId: string; generationId: string; engineId: string }> }
) {
  try {
    // Provjera autentikacije
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nemate dozvolu za ovu akciju' }, { status: 403 });
    }

    const { generationId, engineId } = await params;

    // Provjera postoji li motor
    const engine = await db.vehicleEngine.findUnique({
      where: { id: engineId },
    });

    if (!engine) {
      return NextResponse.json({ error: 'Motor vozila nije pronađen' }, { status: 404 });
    }

    // Provjera pripada li motor ovoj generaciji
    if (engine.generationId !== generationId) {
      return NextResponse.json({ error: 'Motor ne pripada ovoj generaciji vozila' }, { status: 400 });
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

    // Ažuriranje motora
    const updatedEngine = await db.vehicleEngine.update({
      where: { id: engineId },
      data: {
        engineType,
        enginePowerKW,
        enginePowerHP,
        engineCapacity,
        engineCode,
        description,
      }
    });

    return NextResponse.json(updatedEngine);
  } catch (error) {
    console.error('Error updating vehicle engine:', error);
    return NextResponse.json({ error: 'Greška prilikom ažuriranja motora vozila' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ brandId: string; modelId: string; generationId: string; engineId: string }> }
) {
  try {
    // Provjera autentikacije
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nemate dozvolu za ovu akciju' }, { status: 403 });
    }

    const { generationId, engineId } = await params;

    // Provjera postoji li motor
    const engine = await db.vehicleEngine.findUnique({
      where: { id: engineId },
    });

    if (!engine) {
      return NextResponse.json({ error: 'Motor vozila nije pronađen' }, { status: 404 });
    }

    // Provjera pripada li motor ovoj generaciji
    if (engine.generationId !== generationId) {
      return NextResponse.json({ error: 'Motor ne pripada ovoj generaciji vozila' }, { status: 400 });
    }

    // Brisanje motora
    await db.vehicleEngine.delete({
      where: { id: engineId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting vehicle engine:', error);
    return NextResponse.json({ error: 'Greška prilikom brisanja motora vozila' }, { status: 500 });
  }
}
