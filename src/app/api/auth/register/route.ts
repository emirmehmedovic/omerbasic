import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { registerSchema } from '@/lib/validations/auth';
import bcrypt from 'bcrypt';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validation = registerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { name, email, password } = validation.data;

    // Provjera da li korisnik već postoji
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ message: 'Korisnik s ovom email adresom već postoji.' }, { status: 409 });
    }

    // Hashiranje lozinke
    const hashedPassword = await bcrypt.hash(password, 12);

    // Kreiranje korisnika
    const user = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'USER', // Svi registrovani korisnici su standardni korisnici
      },
    });

    return NextResponse.json({ message: 'Korisnik je uspješno kreiran.', user: { id: user.id, name: user.name, email: user.email } }, { status: 201 });

  } catch (error) {
    console.error('[REGISTER_POST]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
