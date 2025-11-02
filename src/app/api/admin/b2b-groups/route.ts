import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAdminSession } from '@/lib/api/admin-auth';
import { b2bDiscountGroupSchema } from '@/lib/validations/b2b-group';

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const groups = await db.b2BDiscountGroup.findMany({
      orderBy: [{ priority: 'asc' }, { name: 'asc' }],
      include: {
        members: {
          select: {
            id: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                companyName: true,
                discountPercentage: true,
              },
            },
            assignedAt: true,
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

    return NextResponse.json(groups);
  } catch (error) {
    console.error('[ADMIN_B2B_GROUPS_GET]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST(req: Request) {
  const admin = await getAdminSession();
  if (!admin) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const json = await req.json();
    const payload = b2bDiscountGroupSchema.parse(json);

    const group = await db.b2BDiscountGroup.create({
      data: payload,
    });

    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    if ((error as any)?.issues) {
      return NextResponse.json((error as any).issues, { status: 422 });
    }

    console.error('[ADMIN_B2B_GROUPS_POST]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
