import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { generatePackageLabelPDF } from '@/lib/pdf-generators';

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

    // Allow access if user is an admin or if the order belongs to the user
    if (session.user.role !== 'ADMIN' && order.userId !== session.user.id) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Serialize order data
    const serializedOrder = JSON.parse(JSON.stringify({
      id: order.id,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      shippingAddress: order.shippingAddress,
      createdAt: order.createdAt.toISOString(),
    }));

    // Generate package label PDF
    const pdfBytes = await generatePackageLabelPDF(serializedOrder);

    const pdfArrayBuffer = pdfBytes.buffer as ArrayBuffer;

    // Return PDF
    const headers = new Headers();
    headers.set('Content-Type', 'application/pdf');
    headers.set('Content-Disposition', `attachment; filename="etiketa_${orderId.substring(0,8)}.pdf"`);

    return new NextResponse(pdfArrayBuffer, { headers });

  } catch (error) {
    console.error('[PACKAGE_LABEL_GET] Error:', error);
    console.error('[PACKAGE_LABEL_GET] Error stack:', error instanceof Error ? error.stack : 'N/A');
    console.error('[PACKAGE_LABEL_GET] Error message:', error instanceof Error ? error.message : String(error));
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
