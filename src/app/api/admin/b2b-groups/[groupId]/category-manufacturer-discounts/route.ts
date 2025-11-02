import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAdminSession } from '@/lib/api/admin-auth';
import { groupCategoryManufacturerDiscountSchema } from '@/lib/validations/b2b-group';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const admin = await getAdminSession();
  if (!admin) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const { groupId } = await params;
    const json = await req.json();
    const payload = groupCategoryManufacturerDiscountSchema.parse(json);

    const discount = await db.b2BGroupCategoryManufacturerDiscount.create({
      data: {
        groupId,
        categoryId: payload.categoryId,
        manufacturerId: payload.manufacturerId,
        discountPercentage: payload.discountPercentage,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        manufacturer: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return NextResponse.json(discount, { status: 201 });
  } catch (error) {
    if ((error as any)?.issues) {
      return NextResponse.json((error as any).issues, { status: 422 });
    }

    if ((error as any)?.code === 'P2002') {
      return NextResponse.json(
        { message: 'Popust za zadanu kombinaciju već postoji u grupi.' },
        { status: 409 }
      );
    }

    console.error('[ADMIN_B2B_GROUP_CATEGORY_MANUFACTURER_DISCOUNT_POST]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
