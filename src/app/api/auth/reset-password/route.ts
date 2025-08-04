import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { resetPasswordSchema } from '@/lib/validations/auth';
import bcrypt from 'bcrypt';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validation = resetPasswordSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { password, token: rawToken } = validation.data;

    // Pronalazimo sve aktivne tokene
    const activeTokens = await db.passwordResetToken.findMany({
      where: {
        expires: { gt: new Date() },
      },
    });

    let dbToken = null;
    for (const tokenRecord of activeTokens) {
      const isMatch = await bcrypt.compare(rawToken, tokenRecord.token);
      if (isMatch) {
        dbToken = tokenRecord;
        break;
      }
    }

    if (!dbToken) {
      return NextResponse.json({ message: 'Token je nevažeći ili je istekao.' }, { status: 400 });
    }

    // Hashiranje nove lozinke
    const hashedPassword = await bcrypt.hash(password, 12);

    // Ažuriranje lozinke korisnika
    await db.user.update({
      where: { id: dbToken.userId },
      data: { password: hashedPassword },
    });

    // Brisanje svih tokena za resetovanje lozinke za ovog korisnika
    await db.passwordResetToken.deleteMany({
      where: { userId: dbToken.userId },
    });

    return NextResponse.json({ message: 'Lozinka je uspješno promijenjena.' }, { status: 200 });

  } catch (error) {
    console.error('[RESET_PASSWORD_POST]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
