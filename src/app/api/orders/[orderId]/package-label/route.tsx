import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { renderToStream } from '@react-pdf/renderer';
import { PackageLabelDocument } from '@/components/pdf/PackageLabelDocument';

export async function GET(
  req: Request,
  { params }: { params: { orderId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const order = await db.order.findUnique({
      where: {
        id: params.orderId,
      },
    });

    if (!order) {
      return new NextResponse('Order not found', { status: 404 });
    }

    // Parsiramo JSON polje
    const orderWithShipping = {
      ...order,
      shippingAddress: order.shippingAddress as any, // Pretpostavljamo da je struktura ispravna
    };

    const pdfStream = await renderToStream(<PackageLabelDocument order={orderWithShipping} />);

    const headers = new Headers();
    headers.set('Content-Type', 'application/pdf');
    headers.set('Content-Disposition', `attachment; filename="label_${order.id}.pdf"`);

    return new Response(pdfStream as any, { headers });

  } catch (error) {
    console.error('[PACKAGE_LABEL_GET]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
