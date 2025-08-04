import { db } from '@/lib/db';
import { StatCard } from '@/components/admin/StatCard';
import { DollarSign, Package, ShoppingCart, Users } from 'lucide-react';
import { formatPrice } from '@/lib/utils';

async function getDashboardData() {
  const [totalRevenueData, totalSales, productCount, customerCount] = await Promise.all([
    db.order.aggregate({
      _sum: {
        total: true,
      },
      where: {
        status: 'DELIVERED',
      },
    }),
    db.order.count({
      where: {
        status: { not: 'CANCELLED' },
      },
    }),
    db.product.count(),
    db.user.count({
      where: {
        role: { in: ['USER', 'B2B'] },
      },
    }),
  ]);

  return {
    totalRevenue: totalRevenueData._sum?.total || 0,
    totalSales,
    productCount,
    customerCount,
  };
}

export default async function AdminDashboardPage() {
  const { totalRevenue, totalSales, productCount, customerCount } = await getDashboardData();

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Ukupan Prihod" value={formatPrice(totalRevenue)} icon={DollarSign} />
        <StatCard title="Ukupno Prodaja" value={totalSales} icon={Package} />
        <StatCard title="Ukupno Proizvoda" value={productCount} icon={ShoppingCart} />
        <StatCard title="Ukupno Kupaca" value={customerCount} icon={Users} />
      </div>
    </div>
  );
}
