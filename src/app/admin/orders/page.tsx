import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import Link from 'next/link';
import { OrderStatus, Prisma } from '@/generated/prisma';
import OrderFilters from '@/components/OrderFilters';

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('bs-BA', { style: 'currency', currency: 'BAM' }).format(price);
};

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('bs-BA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ status?: OrderStatus }> }) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'ADMIN') {
    redirect('/login');
  }

  const { status } = await searchParams;
  const whereClause = status ? { status } : {};

  const getOrders = async () => {
    const orders = await db.order.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });
    return orders;
  };

  // Izvedeni tip za narudžbu s uključenim relacijama
  type OrderWithIncludes = Prisma.PromiseReturnType<typeof getOrders>[0];

  const orders = await getOrders();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Narudžbe</h1>
        <OrderFilters />
      </div>
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID Narudžbe</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kupac</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Datum</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ukupno</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                            {orders.map((order: OrderWithIncludes) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <Link href={`/admin/orders/${order.id}`} className="text-indigo-600 hover:text-indigo-900">
                      {order.id.substring(0, 8)}...
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.customerName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(order.createdAt)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">{formatPrice(order.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
