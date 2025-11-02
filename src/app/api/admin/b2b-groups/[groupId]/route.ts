import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAdminSession } from '@/lib/api/admin-auth';
import { updateB2bDiscountGroupSchema } from '@/lib/validations/b2b-group';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const admin = await getAdminSession();
  if (!admin) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { groupId } = await params;

  try {
    const group = await db.b2BDiscountGroup.findUnique({
      where: { id: groupId },
      include: {
        members: {
          select: {
            id: true,
            assignedAt: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                companyName: true,
              },
            },
          },
        },
        categoryDiscounts: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        manufacturerDiscounts: {
          include: {
            manufacturer: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        categoryManufacturerDiscounts: {
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
        },
      },
    });

    if (!group) {
      return new NextResponse('Not Found', { status: 404 });
    }

    return NextResponse.json(group);
  } catch (error) {
    console.error('[ADMIN_B2B_GROUP_GET]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function PATCH(
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
    const payload = updateB2bDiscountGroupSchema.parse(json);

    const group = await db.b2BDiscountGroup.update({
      where: { id: groupId },
      data: payload,
    });

    return NextResponse.json(group);
  } catch (error) {
    if ((error as any)?.issues) {
      return NextResponse.json((error as any).issues, { status: 422 });
    }

    console.error('[ADMIN_B2B_GROUP_PATCH]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const admin = await getAdminSession();
  if (!admin) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const { groupId } = await params;

    await db.b2BDiscountGroup.delete({ where: { id: groupId } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[ADMIN_B2B_GROUP_DELETE]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
