import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAdminSession } from '@/lib/api/admin-auth';
import { groupMemberSchema } from '@/lib/validations/b2b-group';

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
    const { userId } = groupMemberSchema.parse(json);

    const group = await db.b2BDiscountGroup.findUnique({ where: { id: groupId } });
    if (!group) {
      return new NextResponse('Group not found', { status: 404 });
    }

    const member = await db.b2BGroupMember.create({
      data: {
        groupId,
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            companyName: true,
          },
        },
      },
    });

    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    if ((error as any)?.issues) {
      return NextResponse.json((error as any).issues, { status: 422 });
    }

    if ((error as any)?.code === 'P2002') {
      return NextResponse.json(
        { message: 'Korisnik je već član ove grupe.' },
        { status: 409 }
      );
    }

    console.error('[ADMIN_B2B_GROUP_MEMBER_POST]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
