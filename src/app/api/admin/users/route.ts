import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { createB2bUserApiSchema } from '@/lib/validations/admin';
import bcrypt from 'bcrypt';
import { UserRole } from '@/generated/prisma/client';

// Dohvati sve korisnike (samo za admina)
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== UserRole.ADMIN) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const users = await db.user.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(users);

  } catch (error) {
    console.error('[ADMIN_USERS_GET]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// Kreiraj novog B2B korisnika (samo za admina)
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== UserRole.ADMIN) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const validation = createB2bUserApiSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { email, password, ...userData } = validation.data;

    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ message: 'Korisnik s ovom email adresom već postoji.' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = await db.user.create({
      data: {
        ...userData,
        email,
        password: hashedPassword,
        role: UserRole.B2B, // Postavi ulogu na B2B
      },
    });

    // Ne vraćamo lozinku u odgovoru
    const { password: _, ...userWithoutPassword } = newUser;

    return NextResponse.json(userWithoutPassword, { status: 201 });

  } catch (error) {
    console.error('[ADMIN_USERS_POST]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
