import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { changePasswordFormSchema } from '@/lib/validations/account';
import * as bcrypt from 'bcrypt';

export async function PATCH(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const fullUser = await db.user.findUnique({ where: { id: user.id } });
    if (!fullUser || !fullUser.password) {
      return new NextResponse('User not found or password not set', { status: 404 });
    }

    const body = await req.json();
    const { currentPassword, newPassword } = changePasswordFormSchema.parse(body);

    const passwordsMatch = await bcrypt.compare(currentPassword, fullUser.password);

    if (!passwordsMatch) {
      return new NextResponse('Incorrect current password', { status: 403 });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    await db.user.update({
      where: { id: user.id },
      data: {
        password: hashedNewPassword,
      },
    });

    return new NextResponse('Password updated successfully', { status: 200 });

  } catch (error) {
    console.error('[CHANGE_PASSWORD_PATCH]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
