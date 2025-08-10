import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getServerSession } from 'next-auth';

export async function GET(
  req: Request,
  context: { params: { generationId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    // Provjera autentikacije
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { generationId } = context.params;

    // Dohvati generaciju s povezanim modelom i brendom
    const generation = await db.vehicleGeneration.findUnique({
      where: {
        id: generationId,
      },
      include: {
        model: {
          include: {
            brand: true
          }
        }
      }
    });

    if (!generation) {
      return new NextResponse("Generation not found", { status: 404 });
    }

    // Pripremi podatke za odgovor
    const response = {
      id: generation.id,
      name: generation.name,
      period: generation.period,
      model: {
        id: generation.model.id,
        name: generation.model.name
      },
      brand: {
        id: generation.model.brand.id,
        name: generation.model.brand.name
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[GENERATION_DETAILS_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
