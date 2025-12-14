import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { generateInvoicePDF } from '@/lib/pdf-generators';

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

    // Konvertujemo podatke u plain JavaScript objekat da bi bili kompatibilni sa @react-pdf/renderer
    const serializedOrder = JSON.parse(JSON.stringify({
      id: order.id,
      subtotal: order.subtotal,
      shippingCost: order.shippingCost,
      total: order.total,
      status: order.status,
      shippingMethod: order.shippingMethod,
      paymentMethod: order.paymentMethod,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      shippingAddress: order.shippingAddress,
      billingAddress: order.billingAddress,
      isB2BOrder: order.isB2BOrder,
      discountPercentage: order.discountPercentage,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      items: order.items.map(item => ({
        id: item.id,
        quantity: item.quantity,
        price: item.price,
        originalPrice: item.originalPrice,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        product: {
          id: item.product.id,
          name: item.product.name,
          sku: item.product.sku,
          oemNumber: item.product.oemNumber,
          price: item.product.price,
          imageUrl: item.product.imageUrl,
        },
      })),
    }));

    // Generišemo PDF koristeći pdf-lib
    const pdfBytes = await generateInvoicePDF(serializedOrder);

    // Konvertujemo Uint8Array u ArrayBuffer da bi bio kompatibilan sa NextResponse BodyInit tipom
    const pdfArrayBuffer = pdfBytes.buffer as ArrayBuffer;

    // Vraćamo buffer kao response sa odgovarajućim headerima
    const headers = new Headers();
    headers.set('Content-Type', 'application/pdf');
    headers.set('Content-Disposition', `attachment; filename="faktura_${orderId.substring(0,8)}.pdf"`);

    return new NextResponse(pdfArrayBuffer, { headers });

  } catch (error) {
    console.error('[INVOICE_GET] Error:', error);
    console.error('[INVOICE_GET] Error stack:', error instanceof Error ? error.stack : 'N/A');
    console.error('[INVOICE_GET] Error message:', error instanceof Error ? error.message : String(error));
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
