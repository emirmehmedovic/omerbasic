import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { changePasswordSchema } from '@/lib/validations/auth';
import bcrypt from 'bcrypt';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const validation = changePasswordSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { currentPassword, newPassword } = validation.data;

    const user = await db.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || !user.password) {
      return new NextResponse('Korisnik nije pronađen.', { status: 404 });
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isPasswordValid) {
      return NextResponse.json({ message: 'Trenutna lozinka nije ispravna.' }, { status: 403 });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    await db.user.update({
      where: { id: user.id },
      data: { password: hashedNewPassword },
    });

    return NextResponse.json({ message: 'Lozinka je uspješno promijenjena.' }, { status: 200 });

  } catch (error) {
    console.error('[CHANGE_PASSWORD_POST]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
