import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { addressSchema } from '@/lib/validations/address';

// Ažuriraj adresu
export async function PATCH(req: Request, { params }: { params: { addressId: string } }) {
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

    const addressToUpdate = await db.address.findFirst({
      where: { id: params.addressId, userId: session.user.id },
    });

    if (!addressToUpdate) {
      return new NextResponse('Address not found', { status: 404 });
    }

    const updatedAddress = await db.$transaction(async (tx) => {
      if (isDefaultShipping) {
        await tx.address.updateMany({
          where: { userId: session.user.id, isDefaultShipping: true },
          data: { isDefaultShipping: false },
        });
      }

      if (isDefaultBilling) {
        await tx.address.updateMany({
          where: { userId: session.user.id, isDefaultBilling: true },
          data: { isDefaultBilling: false },
        });
      }

      const updated = await tx.address.update({
        where: { id: params.addressId },
        data: {
          ...addressData,
          isDefaultBilling: isDefaultBilling ?? false,
          isDefaultShipping: isDefaultShipping ?? false,
        },
      });

      return updated;
    });

    return NextResponse.json(updatedAddress);

  } catch (error) {
    console.error('[ADDRESS_PATCH]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// Obriši adresu
export async function DELETE(req: Request, { params }: { params: { addressId: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const addressToDelete = await db.address.findFirst({
      where: { id: params.addressId, userId: session.user.id },
    });

    if (!addressToDelete) {
      return new NextResponse('Address not found', { status: 404 });
    }

    await db.address.delete({
      where: { id: params.addressId },
    });

    return new NextResponse(null, { status: 204 }); // No Content

  } catch (error) {
    console.error('[ADDRESS_DELETE]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
