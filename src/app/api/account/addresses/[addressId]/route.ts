import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { addressFormSchema } from '@/lib/validations/account';

// PATCH /api/account/addresses/{addressId}
export async function PATCH(req: Request, { params }: { params: { addressId: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { addressId } = params;
    const body = await req.json();
    const data = addressFormSchema.parse(body);

    // Provjeri da li adresa pripada korisniku
    const addressToUpdate = await db.address.findFirst({
      where: {
        id: addressId,
        userId: user.id,
      },
    });

    if (!addressToUpdate) {
      return new NextResponse('Address not found or you do not have permission', { status: 404 });
    }

    const updatedAddress = await db.address.update({
      where: {
        id: addressId,
      },
      data,
    });

    return NextResponse.json(updatedAddress);

  } catch (error) {
    console.error('[ADDRESS_PATCH]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// DELETE /api/account/addresses/{addressId}
export async function DELETE(req: Request, { params }: { params: { addressId: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { addressId } = params;

    // Provjeri da li adresa pripada korisniku
    const addressToDelete = await db.address.findFirst({
      where: {
        id: addressId,
        userId: user.id,
      },
    });

    if (!addressToDelete) {
      return new NextResponse('Address not found or you do not have permission', { status: 404 });
    }

    await db.address.delete({
      where: {
        id: addressId,
      },
    });

    return new NextResponse(null, { status: 204 }); // No Content

  } catch (error) {
    console.error('[ADDRESS_DELETE]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
