import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { renderToStream } from '@react-pdf/renderer';
import { InvoiceDocument } from '@/components/pdf/InvoiceDocument';
import React from 'react';

export async function GET(
  req: Request,
  { params }: { params: { orderId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { orderId } = params;

    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
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

    // Renderujemo React komponentu u PDF stream
    const pdfStream = await renderToStream(<InvoiceDocument order={order as any} />);

    // Vraćamo stream kao response sa odgovarajućim headerima
    const headers = new Headers();
    headers.set('Content-Type', 'application/pdf');
    headers.set('Content-Disposition', `attachment; filename="faktura_${orderId.substring(0,8)}.pdf"`);

    return new NextResponse(pdfStream as any, { headers });

  } catch (error) {
    console.error('[INVOICE_GET]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
