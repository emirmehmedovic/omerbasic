import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { profileFormSchema } from '@/lib/validations/account';

export async function PATCH(req: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { name, email, companyName, taxId } = profileFormSchema.parse(body);

    // Provjeri da li novi email već postoji, ako se mijenja
    if (email && email !== user.email) {
      const existingUser = await db.user.findUnique({
        where: { email },
      });
      if (existingUser) {
        return new NextResponse('Email already in use', { status: 409 });
      }
    }

    const updatedUser = await db.user.update({
      where: {
        id: user.id,
      },
      data: {
        name: name || undefined,
        email: email || undefined,
        companyName: companyName || undefined,
        taxId: taxId || undefined,
      },
    });

    return NextResponse.json(updatedUser);

  } catch (error) {
    console.error('[PROFILE_PATCH]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
