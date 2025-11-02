import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAdminSession } from '@/lib/api/admin-auth';
import { groupManufacturerDiscountSchema } from '@/lib/validations/b2b-group';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ groupId: string; discountId: string }> }
) {
  const admin = await getAdminSession();
  if (!admin) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const { groupId, discountId } = await params;
    const json = await req.json();
    const payload = groupManufacturerDiscountSchema.parse(json);

    const discount = await db.b2BGroupManufacturerDiscount.update({
      where: { id: discountId },
      data: {
        manufacturerId: payload.manufacturerId,
        discountPercentage: payload.discountPercentage,
      },
      include: {
        manufacturer: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return NextResponse.json(discount);
  } catch (error) {
    if ((error as any)?.issues) {
      return NextResponse.json((error as any).issues, { status: 422 });
    }

    if ((error as any)?.code === 'P2002') {
      return NextResponse.json(
        { message: 'Popust za ovog proizvođača već postoji u grupi.' },
        { status: 409 }
      );
    }

    console.error('[ADMIN_B2B_GROUP_MANUFACTURER_DISCOUNT_PATCH]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ groupId: string; discountId: string }> }
) {
  const admin = await getAdminSession();
  if (!admin) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const { discountId } = await params;

    await db.b2BGroupManufacturerDiscount.delete({
      where: { id: discountId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[ADMIN_B2B_GROUP_MANUFACTURER_DISCOUNT_DELETE]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
