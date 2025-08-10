import { db } from '@/lib/db';
import { StatCard } from '@/components/admin/StatCard';
import { DollarSign, Package, ShoppingCart, Users, Plus, Settings } from 'lucide-react';
import Link from 'next/link';
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
      
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Brzi linkovi</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Link href="/admin/products/new" className="flex items-center p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600 mr-4">
              <Plus className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-medium">Dodaj novi proizvod</h3>
              <p className="text-sm text-gray-500">Kreiraj novi proizvod u katalogu</p>
            </div>
          </Link>
          
          <Link href="/admin/products" className="flex items-center p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow">
            <div className="p-3 rounded-full bg-green-100 text-green-600 mr-4">
              <ShoppingCart className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-medium">Upravljaj proizvodima</h3>
              <p className="text-sm text-gray-500">Pregledaj i uredi postojeće proizvode</p>
            </div>
          </Link>
          
          <Link href="/admin/categories" className="flex items-center p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow">
            <div className="p-3 rounded-full bg-purple-100 text-purple-600 mr-4">
              <Settings className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-medium">Upravljaj kategorijama</h3>
              <p className="text-sm text-gray-500">Uredi kategorije i njihove atribute</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
