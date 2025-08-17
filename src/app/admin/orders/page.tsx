import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { OrderStatus, Prisma } from '@/generated/prisma';
import OrderFilters from '@/components/OrderFilters';
import OrdersTable from '@/components/admin/OrdersTable';

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
    <div className="p-6 space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-br from-white via-gray-50/80 to-blue-50/60 backdrop-blur-sm rounded-2xl p-6 border border-amber/20 shadow-sm">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-sm rounded-xl border border-amber/30">
              <svg className="w-8 h-8 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-amber via-orange to-brown bg-clip-text text-transparent">
                Narudžbe
              </h1>
              <p className="text-gray-600 mt-1">
                Upravljajte svim narudžbama i praćite njihov status
              </p>
            </div>
          </div>
          <OrderFilters />
        </div>
      </div>

      {/* Orders Table */}
      <OrdersTable orders={orders} />
    </div>
  );
}
