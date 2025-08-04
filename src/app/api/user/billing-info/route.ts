import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { billingInfoSchema } from '@/lib/validations/billing';

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const validation = billingInfoSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { companyName, taxId } = validation.data;

    await db.user.update({
      where: { id: session.user.id },
      data: {
        companyName: companyName || null, // Spremi null ako je string prazan
        taxId: taxId || null,             // Spremi null ako je string prazan
      },
    });

    return NextResponse.json({ message: 'Podaci za fakturisanje su uspješno ažurirani.' }, { status: 200 });

  } catch (error) {
    console.error('[BILLING_INFO_PATCH]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
