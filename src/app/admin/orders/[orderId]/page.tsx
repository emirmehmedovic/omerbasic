import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import type { OrderItem, Product } from '@/generated/prisma/client';
import Image from 'next/image';
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
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Detalji narudžbe</h1>
      <p className="text-sm text-gray-500 mb-6">ID: {order.id}</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Naručeni proizvodi</h2>
            <ul className="divide-y divide-gray-200">
              {order.items.map((item: OrderItem & { product: Product }) => (
                <li key={item.id} className="flex py-4">
                  <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-md border border-gray-200">
                    <Image
                      src={item.product.imageUrl || 'https://placehold.co/600x400.png?text=Slika+nije+dostupna'}
                      alt={item.product.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="ml-4 flex flex-1 flex-col">
                    <div>
                      <div className="flex justify-between text-base font-medium text-gray-900">
                        <h3>{item.product.name}</h3>
                        <p className="ml-4">{formatPrice(item.price * item.quantity)}</p>
                      </div>
                      <p className="mt-1 text-sm text-gray-500">Cijena po komadu: {formatPrice(item.price)}</p>
                    </div>
                    <div className="flex flex-1 items-end justify-between text-sm">
                      <p className="text-gray-500">Količina: {item.quantity}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <UpdateOrderStatus order={order as any} />
            <DownloadPackingSlip orderId={order.id} />
            <DownloadInvoice orderId={order.id} />
            <DownloadPackageLabel orderId={order.id} />
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Informacije o narudžbi</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="font-medium">Status:</span> <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>{order.status}</span></div>
              <div className="flex justify-between"><span className="font-medium">Datum:</span> <span>{formatDate(order.createdAt)}</span></div>
              <div className="flex justify-between font-bold text-base pt-2 border-t mt-2"><span className="">Ukupno:</span> <span>{formatPrice(order.total)}</span></div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Podaci o kupcu</h2>
            <div className="space-y-1 text-sm">
              <p><span className="font-medium">Ime:</span> {order.customerName}</p>
              <p><span className="font-medium">Email:</span> {order.customerEmail}</p>
            </div>
            <h3 className="text-lg font-semibold mt-4 mb-2">Adresa za dostavu</h3>
            <div className="space-y-1 text-sm">
              <p>{shippingAddress.street}</p>
              <p>{shippingAddress.postalCode} {shippingAddress.city}</p>
              <p>{shippingAddress.country}</p>
            </div>
          </div>
        </div>
      </div>
      <OrderComments orderId={order.id} initialComments={order.comments as any} />
    </div>
  );
}
