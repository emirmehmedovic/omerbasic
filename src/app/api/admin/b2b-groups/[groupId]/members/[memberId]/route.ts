import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAdminSession } from '@/lib/api/admin-auth';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ groupId: string; memberId: string }> }
) {
  const admin = await getAdminSession();
  if (!admin) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const { groupId, memberId } = await params;

    await db.b2BGroupMember.delete({
      where: { id: memberId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[ADMIN_B2B_GROUP_MEMBER_DELETE]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
