import { db } from '@/lib/db';
import { StatCard } from '@/components/admin/StatCard';
import { DollarSign, Package, ShoppingCart, Users, Plus, Settings, BarChart3, TrendingUp, Users2, ShoppingBag, MessageSquare } from 'lucide-react';
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
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-br from-white via-gray-50/80 to-blue-50/60 backdrop-blur-sm rounded-2xl p-6 border border-amber/20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-sm rounded-lg border border-amber/30">
            <BarChart3 className="w-6 h-6 text-amber" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-amber to-orange bg-clip-text text-transparent">
              Dashboard
            </h1>
            <p className="text-gray-600 mt-1">Pregled ključnih metrika i brzi pristup</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Ukupan Prihod" 
          value={formatPrice(totalRevenue)} 
          icon={DollarSign}
          description="Ukupan prihod od isporučenih narudžbi"
        />
        <StatCard 
          title="Ukupno Prodaja" 
          value={totalSales} 
          icon={Package}
          description="Broj uspješnih narudžbi"
        />
        <StatCard 
          title="Ukupno Proizvoda" 
          value={productCount} 
          icon={ShoppingCart}
          description="Broj proizvoda u katalogu"
        />
        <StatCard 
          title="Ukupno Kupaca" 
          value={customerCount} 
          icon={Users}
          description="Broj registriranih korisnika"
        />
      </div>
      
      {/* Quick Links Section */}
      <div className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm rounded-2xl border border-amber/20 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="w-5 h-5 text-amber" />
          <h2 className="text-xl font-semibold text-gray-900">Brzi linkovi</h2>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Link 
            href="/admin/products/new" 
            className="group flex items-center p-4 bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-sm rounded-xl border border-amber/20 shadow-sm hover:shadow-lg hover:border-amber/30 transition-all duration-200"
          >
            <div className="p-3 rounded-lg bg-gradient-to-r from-amber/10 to-orange/10 border border-amber/20 mr-4 group-hover:from-amber/20 group-hover:to-orange/20 transition-all duration-200">
              <Plus className="h-6 w-6 text-amber group-hover:text-orange transition-colors duration-200" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 group-hover:text-gray-800 transition-colors duration-200">Dodaj novi proizvod</h3>
              <p className="text-sm text-gray-600">Kreiraj novi proizvod u katalogu</p>
            </div>
          </Link>
          
          <Link 
            href="/admin/products" 
            className="group flex items-center p-4 bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-sm rounded-xl border border-amber/20 shadow-sm hover:shadow-lg hover:border-amber/30 transition-all duration-200"
          >
            <div className="p-3 rounded-lg bg-gradient-to-r from-amber/10 to-orange/10 border border-amber/20 mr-4 group-hover:from-amber/20 group-hover:to-orange/20 transition-all duration-200">
              <ShoppingBag className="h-6 w-6 text-amber group-hover:text-orange transition-colors duration-200" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 group-hover:text-gray-800 transition-colors duration-200">Upravljaj proizvodima</h3>
              <p className="text-sm text-gray-600">Pregledaj i uredi postojeće proizvode</p>
            </div>
          </Link>
          
          <Link 
            href="/admin/categories" 
            className="group flex items-center p-4 bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-sm rounded-xl border border-amber/20 shadow-sm hover:shadow-lg hover:border-amber/30 transition-all duration-200"
          >
            <div className="p-3 rounded-lg bg-gradient-to-r from-amber/10 to-orange/10 border border-amber/20 mr-4 group-hover:from-amber/20 group-hover:to-orange/20 transition-all duration-200">
              <Settings className="h-6 w-6 text-amber group-hover:text-orange transition-colors duration-200" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 group-hover:text-gray-800 transition-colors duration-200">Upravljaj kategorijama</h3>
              <p className="text-sm text-gray-600">Uredi kategorije i njihove atribute</p>
            </div>
          </Link>

          <Link 
            href="/admin/users" 
            className="group flex items-center p-4 bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-sm rounded-xl border border-amber/20 shadow-sm hover:shadow-lg hover:border-amber/30 transition-all duration-200"
          >
            <div className="p-3 rounded-lg bg-gradient-to-r from-amber/10 to-orange/10 border border-amber/20 mr-4 group-hover:from-amber/20 group-hover:to-orange/20 transition-all duration-200">
              <Users2 className="h-6 w-6 text-amber group-hover:text-orange transition-colors duration-200" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 group-hover:text-gray-800 transition-colors duration-200">Upravljaj korisnicima</h3>
              <p className="text-sm text-gray-600">Pregledaj i uredi korisničke račune</p>
            </div>
          </Link>

          <Link 
            href="/admin/orders" 
            className="group flex items-center p-4 bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-sm rounded-xl border border-amber/20 shadow-sm hover:shadow-lg hover:border-amber/30 transition-all duration-200"
          >
            <div className="p-3 rounded-lg bg-gradient-to-r from-amber/10 to-orange/10 border border-amber/20 mr-4 group-hover:from-amber/20 group-hover:to-orange/20 transition-all duration-200">
              <Package className="h-6 w-6 text-amber group-hover:text-orange transition-colors duration-200" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 group-hover:text-gray-800 transition-colors duration-200">Pregled narudžbi</h3>
              <p className="text-sm text-gray-600">Upravljaj narudžbama i statusima</p>
            </div>
          </Link>

          <Link
            href="/admin/suppliers"
            className="group flex items-center p-4 bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-sm rounded-xl border border-amber/20 shadow-sm hover:shadow-lg hover:border-amber/30 transition-all duration-200"
          >
            <div className="p-3 rounded-lg bg-gradient-to-r from-amber/10 to-orange/10 border border-amber/20 mr-4 group-hover:from-amber/20 group-hover:to-orange/20 transition-all duration-200">
              <Users className="h-6 w-6 text-amber group-hover:text-orange transition-colors duration-200" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 group-hover:text-gray-800 transition-colors duration-200">Upravljaj dobavljačima</h3>
              <p className="text-sm text-gray-600">Pregledaj i uredi dobavljače</p>
            </div>
          </Link>

          <Link
            href="/admin/transport-requests"
            className="group flex items-center p-4 bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-sm rounded-xl border border-amber/20 shadow-sm hover:shadow-lg hover:border-amber/30 transition-all duration-200"
          >
            <div className="p-3 rounded-lg bg-gradient-to-r from-orange/10 to-orange/20 border border-orange/30 mr-4 group-hover:from-orange/20 group-hover:to-orange/30 transition-all duration-200">
              <ShoppingCart className="h-6 w-6 text-orange-600 group-hover:text-orange-700 transition-colors duration-200" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 group-hover:text-gray-800 transition-colors duration-200">Transport zahtjevi</h3>
              <p className="text-sm text-gray-600">Pregled i upravljanje transport zahtjevima</p>
            </div>
          </Link>

          <Link
            href="/admin/requests"
            className="group flex items-center p-4 bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-sm rounded-xl border border-amber/20 shadow-sm hover:shadow-lg hover:border-amber/30 transition-all duration-200"
          >
            <div className="p-3 rounded-lg bg-gradient-to-r from-amber/10 to-orange/10 border border-amber/20 mr-4 group-hover:from-amber/20 group-hover:to-orange/20 transition-all duration-200">
              <MessageSquare className="h-6 w-6 text-amber group-hover:text-orange transition-colors duration-200" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 group-hover:text-gray-800 transition-colors duration-200">Kontakt zahtjevi</h3>
              <p className="text-sm text-gray-600">Pregled kontakt zahtjeva i B2B aplikacija</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
