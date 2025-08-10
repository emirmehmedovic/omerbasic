import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { updateUserApiSchema } from '@/lib/validations/admin';
import bcrypt from 'bcrypt';
import { UserRole } from '@/generated/prisma/client';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== UserRole.ADMIN) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { userId } = await params;
    if (!userId) {
      return new NextResponse('User ID is required', { status: 400 });
    }

    // Spriječi admina da obriše sam sebe
    if (session.user.id === userId) {
      return new NextResponse('Ne možete obrisati vlastiti račun.', { status: 403 });
    }

    await db.user.delete({
      where: { id: userId },
    });

    return new NextResponse(null, { status: 204 }); // No Content

  } catch (error) {
    console.error('[ADMIN_USER_DELETE]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== UserRole.ADMIN) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { userId } = await params;
    if (!userId) {
      return new NextResponse('User ID is required', { status: 400 });
    }

    const body = await req.json();
    const validation = updateUserApiSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { password, ...userData } = validation.data;

    let hashedPassword = undefined;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 12);
    }

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: {
        ...userData,
        ...(hashedPassword && { password: hashedPassword }),
      },
    });

    const { password: _, ...userWithoutPassword } = updatedUser;

    return NextResponse.json(userWithoutPassword);

  } catch (error) {
    console.error('[ADMIN_USER_PATCH]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
