import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { OrderStatusUpdateEmail } from '@/components/emails/OrderStatusUpdateEmail';
import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

const resend = new Resend(process.env.RESEND_API_KEY);

const updateStatusSchema = z.object({
  status: z.enum(['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
});

export async function PATCH(
  req: Request,
  { params }: { params: { orderId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { orderId } = params;
    const body = await req.json();
    const validation = updateStatusSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { status } = validation.data;

    const updatedOrder = await db.order.update({
      where: { id: orderId },
      data: { status },
    });

    // Slanje emaila nakon uspješne promjene statusa
    try {
      await resend.emails.send({
        from: 'onboarding@resend.dev', // Promijenite u vašu verificiranu domenu
        to: updatedOrder.customerEmail,
        subject: `Status vaše narudžbe #${updatedOrder.id.substring(0, 8)} je ažuriran`,
        react: <OrderStatusUpdateEmail order={updatedOrder} newStatus={status} />,
      });
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // Ne zaustavljamo proces ako email ne uspije, samo logiramo grešku
    }

    return NextResponse.json(updatedOrder);

  } catch (error) {
    console.error('[ORDER_PATCH]', error);
    if (error instanceof z.ZodError) {
      return new NextResponse('Invalid request data passed', { status: 422 });
    }
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
