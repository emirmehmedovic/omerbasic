import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import type { OrderItem, Product } from '@/generated/prisma/client';
import Link from 'next/link';
import ProductImage from '@/components/ProductImage';
import UpdateOrderStatus from '@/components/UpdateOrderStatus';
import OrderComments from '@/components/OrderComments';
import DownloadPackingSlip from '@/components/DownloadPackingSlip';
import DownloadInvoice from '@/components/DownloadInvoice';
import DownloadPackageLabel from '@/components/DownloadPackageLabel';

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('bs-BA', { style: 'currency', currency: 'BAM' }).format(price);
};

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('bs-BA', { dateStyle: 'full', timeStyle: 'medium' }).format(date);
};

async function getOrderDetails(orderId: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: true, // Uključujemo podatke o proizvodu za svaku stavku
        },
      },
      comments: {
        include: {
          user: {
            select: {
              name: true,
              image: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      },
    },
  });
  return order;
}

export default async function OrderDetailsPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'ADMIN') {
    redirect('/login');
  }

  const order = await getOrderDetails(orderId);

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold">Narudžba nije pronađena</h1>
      </div>
    );
  }

  const shippingAddress = order.shippingAddress as { street: string; city: string; postalCode: string; country: string };

  return (
    <div className="p-6 space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-br from-white via-gray-50/80 to-blue-50/60 backdrop-blur-sm rounded-2xl p-6 border border-amber/20 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-sm rounded-xl border border-amber/30">
              <svg className="w-8 h-8 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-amber via-orange to-brown bg-clip-text text-transparent">
                Detalji narudžbe
              </h1>
              <p className="text-gray-600 mt-1">
                ID: <span className="font-mono text-gray-800">{order.id}</span>
              </p>
            </div>
          </div>
          <Link 
            href="/admin/orders"
            className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm text-gray-700 hover:from-white hover:to-gray-50 border-amber/30 hover:border-amber/50 rounded-xl transition-all duration-200 shadow-sm px-4 py-2 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Nazad na narudžbe
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <div className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm rounded-2xl border border-amber/20 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-white/90 to-gray-50/90 border-b border-amber/20 px-6 py-4">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                Naručeni proizvodi ({order.items.length})
              </h2>
            </div>
            <div className="p-6">
              <ul className="divide-y divide-amber/10">
                {order.items.map((item: OrderItem & { product: Product }) => (
                  <li key={item.id} className="flex py-4">
                    <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl border border-amber/20 bg-white">
                      <ProductImage
                        src={item.product.imageUrl}
                        alt={item.product.name}
                        className="absolute inset-0"
                      />
                    </div>
                    <div className="ml-4 flex flex-1 flex-col">
                      <div>
                        <div className="flex justify-between text-base font-medium text-gray-900">
                          <h3 className="text-lg">{item.product.name}</h3>
                          <p className="ml-4 text-lg font-bold text-sunfire-600">{formatPrice(item.price * item.quantity)}</p>
                        </div>
                        <p className="mt-1 text-sm text-gray-600">Cijena po komadu: {formatPrice(item.price)}</p>
                      </div>
                      <div className="flex flex-1 items-end justify-between text-sm">
                        <p className="text-gray-600">Količina: <span className="font-medium text-gray-900">{item.quantity}</span></p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Action Buttons */}
          <div className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm rounded-2xl border border-amber/20 shadow-sm p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Akcije
            </h3>
            <div className="flex flex-col gap-3">
              <UpdateOrderStatus order={order as any} />
              <DownloadPackingSlip orderId={order.id} />
              <DownloadInvoice orderId={order.id} />
              <DownloadPackageLabel orderId={order.id} />
            </div>
          </div>

          {/* Order Information */}
          <div className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm rounded-2xl border border-amber/20 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-white/90 to-gray-50/90 border-b border-amber/20 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Informacije o narudžbi
              </h2>
            </div>
            <div className="p-6 space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-700">Status:</span>
                <span 
                  className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full transition-all duration-200 ${
                    order.status === 'PENDING' 
                      ? 'bg-sunfire-600 text-white shadow-sm' 
                      : order.status === 'PROCESSING'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : order.status === 'SHIPPED'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : order.status === 'DELIVERED'
                      ? 'bg-green-600 text-white shadow-sm'
                      : order.status === 'CANCELLED'
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'bg-gray-600 text-white shadow-sm'
                  }`}
                  style={{
                    color: 'white',
                    backgroundColor: order.status === 'PENDING' ? '#d97706' : 
                                   order.status === 'PROCESSING' ? '#2563eb' :
                                   order.status === 'SHIPPED' ? '#7c3aed' :
                                   order.status === 'DELIVERED' ? '#16a34a' :
                                   order.status === 'CANCELLED' ? '#dc2626' : '#4b5563'
                  }}
                >
                  {order.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Datum:</span>
                <span className="text-gray-900">{formatDate(order.createdAt)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-3 border-t border-amber/20">
                <span className="text-gray-900">Ukupno:</span>
                <span className="text-sunfire-600">{formatPrice(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm rounded-2xl border border-amber/20 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-white/90 to-gray-50/90 border-b border-amber/20 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Podaci o kupcu
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <p className="text-sm">
                  <span className="font-medium text-gray-700">Ime:</span>
                  <span className="ml-2 text-gray-900">{order.customerName}</span>
                </p>
                <p className="text-sm">
                  <span className="font-medium text-gray-700">Email:</span>
                  <span className="ml-2 text-gray-900">{order.customerEmail}</span>
                </p>
                <p className="text-sm">
                  <span className="font-medium text-gray-700">Telefon:</span>
                  <span className="ml-2 text-gray-900">{order.customerPhone}</span>
                </p>
              </div>
              
              <div className="pt-4 border-t border-amber/20">
                <h3 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Adresa za dostavu
                </h3>
                <div className="space-y-1 text-sm text-gray-700">
                  <p>{shippingAddress.street}</p>
                  <p>{shippingAddress.postalCode} {shippingAddress.city}</p>
                  <p>{shippingAddress.country}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Comments Section */}
      <OrderComments orderId={order.id} initialComments={order.comments as any} />
    </div>
  );
}
