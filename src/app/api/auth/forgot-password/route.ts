import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { forgotPasswordSchema } from '@/lib/validations/auth';
import { sendPasswordResetEmail } from '@/lib/mail';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validation = forgotPasswordSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { email } = validation.data;

    const user = await db.user.findUnique({
      where: { email },
    });

    // Iz sigurnosnih razloga, vraćamo uspješan odgovor čak i ako korisnik ne postoji,
    // kako bi se spriječilo pogađanje email adresa (email enumeration).
    if (user) {
      // Generisanje sigurnog tokena
      const resetToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = await bcrypt.hash(resetToken, 12);

      // Postavljanje roka trajanja tokena (npr. 1 sat)
      const expires = new Date();
      expires.setHours(expires.getHours() + 1);

      // Pohranjivanje tokena u bazu
      await db.passwordResetToken.create({
        data: {
          userId: user.id,
          token: hashedToken,
          expires,
        },
      });

      // Slanje emaila sa ne-hashiranim tokenom
      await sendPasswordResetEmail(email, resetToken);
    }

    return NextResponse.json({ message: 'Ako nalog sa ovom email adresom postoji, poslan Vam je link za resetovanje lozinke.' }, { status: 200 });

  } catch (error) {
    console.error('[FORGOT_PASSWORD_POST]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
