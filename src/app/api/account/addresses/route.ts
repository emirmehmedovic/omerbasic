import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { addressFormSchema } from '@/lib/validations/account';

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const data = addressFormSchema.parse(body);

    const address = await db.address.create({
      data: {
        ...data,
        userId: user.id,
      },
    });

    return NextResponse.json(address);

  } catch (error) {
    console.error('[ADDRESSES_POST]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
