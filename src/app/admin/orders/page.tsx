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

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ status?: OrderStatus; page?: string }> }) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'ADMIN') {
    redirect('/login');
  }

  const { status, page: pageParam } = await searchParams;
  const page = parseInt(pageParam || '1') || 1;
  const limit = 50; // 50 narudžbi po stranici
  const skip = (page - 1) * limit;

  const whereClause = status ? { status } : {};

  const getOrders = async () => {
    const [orders, total] = await Promise.all([
      db.order.findMany({
        where: whereClause,
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          items: {
            select: {
              id: true,
              quantity: true,
              price: true,
              productId: true,
              product: {
                select: {
                  id: true,
                  name: true,
                  imageUrl: true,
                },
              },
            },
          },
        },
      }),
      db.order.count({ where: whereClause }),
    ]);
    return { orders, total };
  };

  // Izvedeni tip za narudžbu s uključenim relacijama
  type OrderWithIncludes = Prisma.PromiseReturnType<typeof getOrders>['orders'][0];

  const { orders, total } = await getOrders();
  const totalPages = Math.ceil(total / limit);

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
      <OrdersTable
        orders={orders}
        currentPage={page}
        totalPages={totalPages}
        total={total}
      />
    </div>
  );
}
