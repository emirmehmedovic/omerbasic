import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

const articleOENumberSchema = z.object({
  oemNumber: z.string().min(1, 'OEM broj je obavezan'),
  manufacturer: z.string().optional().nullable(),
  referenceType: z.enum(['Original', 'Equivalent', 'Compatible']).optional().nullable(),
  notes: z.string().optional().nullable(),
});

// GET - Dohvati sve OEM brojeve za proizvod
export async function GET(
  req: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session as any).user?.role !== 'ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { productId } = await params;

    const oemNumbers = await db.articleOENumber.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(oemNumbers);
  } catch (error) {
    console.error('[OEM_NUMBERS_GET]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}

// POST - Kreiraj novi OEM broj
export async function POST(
  req: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session as any).user?.role !== 'ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { productId } = await params;
    const body = await req.json();

    const validation = articleOENumberSchema.safeParse(body);
    if (!validation.success) {
      return new NextResponse(JSON.stringify(validation.error.flatten()), { status: 400 });
    }

    const { oemNumber, manufacturer, referenceType, notes } = validation.data;

    // Provjeri da li proizvod postoji
    const product = await db.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return new NextResponse('Proizvod nije pronađen', { status: 404 });
    }

    // Provjeri da li već postoji isti OEM broj za ovaj proizvod
    const existing = await db.articleOENumber.findUnique({
      where: {
        productId_oemNumber: {
          productId,
          oemNumber,
        },
      },
    });

    if (existing) {
      return new NextResponse('OEM broj već postoji za ovaj proizvod', { status: 409 });
    }

    const newOEM = await db.articleOENumber.create({
      data: {
        productId,
        oemNumber,
        manufacturer: manufacturer || null,
        referenceType: referenceType || 'Original',
        notes: notes || null,
      },
    });

    return NextResponse.json(newOEM);
  } catch (error) {
    console.error('[OEM_NUMBERS_POST]', error);
    if ((error as any).code === 'P2002') {
      return new NextResponse('OEM broj već postoji za ovaj proizvod', { status: 409 });
    }
    return new NextResponse('Internal error', { status: 500 });
  }
}

// PUT - Ažuriraj OEM broj
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session as any).user?.role !== 'ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { productId } = await params;
    const body = await req.json();

    const updateSchema = articleOENumberSchema.extend({
      id: z.string().min(1),
    });

    const validation = updateSchema.safeParse(body);
    if (!validation.success) {
      return new NextResponse(JSON.stringify(validation.error.flatten()), { status: 400 });
    }

    const { id, oemNumber, manufacturer, referenceType, notes } = validation.data;

    // Provjeri da li OEM broj pripada ovom proizvodu
    const existing = await db.articleOENumber.findUnique({
      where: { id },
    });

    if (!existing) {
      return new NextResponse('OEM broj nije pronađen', { status: 404 });
    }

    if (existing.productId !== productId) {
      return new NextResponse('OEM broj ne pripada ovom proizvodu', { status: 403 });
    }

    // Ako se mijenja oemNumber, provjeri da li već postoji
    if (oemNumber !== existing.oemNumber) {
      const duplicate = await db.articleOENumber.findUnique({
        where: {
          productId_oemNumber: {
            productId,
            oemNumber,
          },
        },
      });

      if (duplicate) {
        return new NextResponse('OEM broj već postoji za ovaj proizvod', { status: 409 });
      }
    }

    const updated = await db.articleOENumber.update({
      where: { id },
      data: {
        oemNumber,
        manufacturer: manufacturer || null,
        referenceType: referenceType || 'Original',
        notes: notes || null,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[OEM_NUMBERS_PUT]', error);
    if ((error as any).code === 'P2002') {
      return new NextResponse('OEM broj već postoji za ovaj proizvod', { status: 409 });
    }
    return new NextResponse('Internal error', { status: 500 });
  }
}

// DELETE - Obriši OEM broj
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session as any).user?.role !== 'ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { productId } = await params;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return new NextResponse('ID je obavezan', { status: 400 });
    }

    // Provjeri da li OEM broj pripada ovom proizvodu
    const existing = await db.articleOENumber.findUnique({
      where: { id },
    });

    if (!existing) {
      return new NextResponse('OEM broj nije pronađen', { status: 404 });
    }

    if (existing.productId !== productId) {
      return new NextResponse('OEM broj ne pripada ovom proizvodu', { status: 403 });
    }

    await db.articleOENumber.delete({
      where: { id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[OEM_NUMBERS_DELETE]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}



