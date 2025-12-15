import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { registerSchema } from '@/lib/validations/auth';
import bcrypt from 'bcrypt';

export async function POST(req: Request) {
  try {
    // Dozvoli kreiranje korisnika samo ADMIN korisnicima (preko middleware token headera)
    const tokenHeader = req.headers.get('x-nextauth-token');
    if (!tokenHeader) {
      return new NextResponse('Zabranjeno: potrebna je administratorska autentikacija.', { status: 403 });
    }

    let token: any = null;
    try {
      // Token je enkodiran u Base64 zbog Unicode karaktera u HTTP headerima
      const tokenJson = Buffer.from(tokenHeader, 'base64').toString('utf-8');
      token = JSON.parse(tokenJson);
    } catch (e) {
      return new NextResponse('Nevažeći token header.', { status: 400 });
    }

    if (!token || token.role !== 'ADMIN') {
      return new NextResponse('Zabranjeno: samo administrator može kreirati korisnike.', { status: 403 });
    }

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

    // Kreiranje korisnika (inicijalno kao USER, admin može kasnije promijeniti ulogu)
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
