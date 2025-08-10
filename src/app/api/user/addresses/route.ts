import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { addressSchema } from '@/lib/validations/address';

// Dohvati sve adrese za korisnika
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const addresses = await db.address.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(addresses);

  } catch (error) {
    console.error('[ADDRESSES_GET]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// Kreiraj novu adresu
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const validation = addressSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { isDefaultBilling, isDefaultShipping, ...addressData } = validation.data;

    const newAddress = await db.$transaction(async (tx) => {
      // Ako je nova adresa postavljena kao zadana za dostavu, 
      // ukloni taj status sa svih ostalih adresa.
      if (isDefaultShipping) {
        await tx.address.updateMany({
          where: { userId: session.user.id, isDefaultShipping: true },
          data: { isDefaultShipping: false },
        });
      }

      // Ako je nova adresa postavljena kao zadana za naplatu, 
      // ukloni taj status sa svih ostalih adresa.
      if (isDefaultBilling) {
        await tx.address.updateMany({
          where: { userId: session.user.id, isDefaultBilling: true },
          data: { isDefaultBilling: false },
        });
      }

      // Kreiraj novu adresu
      const createdAddress = await tx.address.create({
        data: {
          ...addressData,
          isDefaultBilling: isDefaultBilling ?? false,
          isDefaultShipping: isDefaultShipping ?? false,
          userId: session.user.id,
        },
      });

      return createdAddress;
    });

    return NextResponse.json(newAddress, { status: 201 });

  } catch (error) {
    console.error('[ADDRESSES_POST]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
