import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';

import { db } from '@/lib/db';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// Shema za validaciju
const vehicleModelSchema = z.object({
  name: z.string().min(1, { message: 'Naziv modela je obavezan' })
});

export async function GET(
  req: Request,
  context: { params: { brandId: string } }
) {
  try {
    // Dohvaćanje parametara na asinkroni način
    const { brandId } = await context.params;
    
    // Provjera postoji li marka
    const brand = await db.vehicleBrand.findUnique({
      where: { id: brandId }
    });

    if (!brand) {
      return NextResponse.json({ error: 'Marka vozila nije pronađena' }, { status: 404 });
    }

    const models = await db.vehicleModel.findMany({
      where: { brandId },
      include: {
        generations: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json(models);
  } catch (error) {
    console.error('Error fetching vehicle models:', error);
    return NextResponse.json({ error: 'Greška prilikom dohvaćanja modela vozila' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  context: { params: { brandId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Dohvaćanje parametara na asinkroni način
    const { brandId } = await context.params;
    
    // Provjera postoji li marka
    const brand = await db.vehicleBrand.findUnique({
      where: { id: brandId }
    });

    if (!brand) {
      return NextResponse.json({ error: 'Marka vozila nije pronađena' }, { status: 404 });
    }

    const body = await req.json();
    const result = vehicleModelSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.format() }, { status: 400 });
    }

    const { name } = result.data;

    // Provjera postoji li već model s istim imenom za ovu marku
    const existingModel = await db.vehicleModel.findFirst({
      where: {
        name,
        brandId
      }
    });

    if (existingModel) {
      return NextResponse.json({ error: 'Model vozila s ovim imenom već postoji za ovu marku' }, { status: 400 });
    }

    const vehicleModel = await db.vehicleModel.create({
      data: {
        name,
        brandId
      }
    });

    return NextResponse.json(vehicleModel, { status: 201 });
  } catch (error) {
    console.error('Error creating vehicle model:', error);
    return NextResponse.json({ error: 'Greška prilikom kreiranja modela vozila' }, { status: 500 });
  }
}
