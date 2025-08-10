import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';

import { db } from '@/lib/db';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// Shema za validaciju
const vehicleGenerationSchema = z.object({
  name: z.string().min(1, { message: 'Naziv generacije je obavezan' }),
  period: z.string().optional().nullable(),
  vinCode: z.string().optional().nullable(),
  bodyStyles: z.array(z.string()).optional().nullable(),
  engines: z.array(z.string()).optional().nullable(),
  // Uklonjeni atributi motora jer se sada koristi VehicleEngine model
  constructionType: z.string().optional().nullable(),
  wheelbase: z.number().optional().nullable(),
  brakeSystem: z.string().optional().nullable(),
  driveType: z.string().optional().nullable(),
  fuelType: z.string().optional().nullable(),
  transmission: z.string().optional().nullable(),
  doors: z.number().optional().nullable(),
  axles: z.number().optional().nullable(),
  weight: z.number().optional().nullable(),
  productionStart: z.string().optional().nullable(),
  productionEnd: z.string().optional().nullable()
});

export async function GET(
  req: Request,
  context: { params: { brandId: string, modelId: string } }
) {
  try {
    // Dohvaćanje parametara na asinkroni način
    const { brandId, modelId } = await context.params;
    
    // Provjera postoji li model
    const model = await db.vehicleModel.findUnique({
      where: { 
        id: modelId,
        brandId
      }
    });

    if (!model) {
      return NextResponse.json({ error: 'Model vozila nije pronađen' }, { status: 404 });
    }

    const generations = await db.vehicleGeneration.findMany({
      where: { modelId },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json(generations);
  } catch (error) {
    console.error('Error fetching vehicle generations:', error);
    return NextResponse.json({ error: 'Greška prilikom dohvaćanja generacija vozila' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  context: { params: { brandId: string, modelId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Dohvaćanje parametara na asinkroni način
    const { brandId, modelId } = await context.params;

    // Provjera postoji li model
    const model = await db.vehicleModel.findUnique({
      where: { 
        id: modelId,
        brandId
      }
    });

    if (!model) {
      return NextResponse.json({ error: 'Model vozila nije pronađen' }, { status: 404 });
    }

    const body = await req.json();
    const result = vehicleGenerationSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.format() }, { status: 400 });
    }

    const { 
      name, period, vinCode, bodyStyles, engines,
      constructionType, wheelbase, brakeSystem, driveType,
      fuelType, transmission, doors, axles, weight,
      productionStart, productionEnd
    } = result.data;

    // Provjera postoji li već generacija s istim imenom za ovaj model
    const existingGeneration = await db.vehicleGeneration.findFirst({
      where: {
        name,
        modelId
      }
    });

    if (existingGeneration) {
      return NextResponse.json({ error: 'Generacija vozila s ovim imenom već postoji za ovaj model' }, { status: 400 });
    }

    // Pretvaranje datuma iz string formata u Date objekt ako postoje
    // Koristimo any za privremeno zaobilaženje TypeScript grešaka
    let prodStart: any = productionStart ? new Date(productionStart) : null;
    let prodEnd: any = productionEnd ? new Date(productionEnd) : null;

    const vehicleGeneration = await db.vehicleGeneration.create({
      data: {
        name,
        modelId,
        period,
        vinCode,
        bodyStyles: bodyStyles ? bodyStyles : undefined,
        engines: engines ? engines : undefined,
        // Uklonjeni atributi motora jer se sada koristi VehicleEngine model
        constructionType,
        wheelbase,
        brakeSystem,
        driveType,
        fuelType,
        transmission,
        doors,
        axles,
        weight,
        productionStart: prodStart,
        productionEnd: prodEnd
      }
    });

    return NextResponse.json(vehicleGeneration, { status: 201 });
  } catch (error) {
    console.error('Error creating vehicle generation:', error);
    return NextResponse.json({ error: 'Greška prilikom kreiranja generacije vozila' }, { status: 500 });
  }
}
