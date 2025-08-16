import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { renderToStream } from '@react-pdf/renderer';
import { PackingSlipDocument } from '@/components/pdf/PackingSlipDocument';
import React from 'react';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ orderId: string }>}
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { orderId } = await params;

    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        user: true, // Also include user to check ownership
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      return new NextResponse('Order not found', { status: 404 });
    }

    // Allow access if user is an admin or if the order belongs to the user
    if (session.user.role !== 'ADMIN' && order.userId !== session.user.id) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Renderujemo React komponentu u PDF stream
    const pdfStream = await renderToStream(<PackingSlipDocument order={order as any} />);

    // Vraćamo stream kao response sa odgovarajućim headerima
    const headers = new Headers();
    headers.set('Content-Type', 'application/pdf');
    headers.set('Content-Disposition', `attachment; filename="otpremnica_${orderId.substring(0,8)}.pdf"`);

    return new NextResponse(pdfStream as any, { headers });

  } catch (error) {
    console.error('[PACKING_SLIP_GET]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
