'use client';

import { useRouter } from 'next/navigation';
import { OrderStatus, Prisma } from '@/generated/prisma';

type OrderWithIncludes = {
  id: string;
  customerName: string;
  createdAt: Date;
  status: OrderStatus;
  total: number;
};

interface OrdersTableProps {
  orders: OrderWithIncludes[];
  currentPage?: number;
  totalPages?: number;
  total?: number;
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('bs-BA', { style: 'currency', currency: 'BAM' }).format(price);
};

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('bs-BA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

export default function OrdersTable({ orders, currentPage = 1, totalPages = 1, total = 0 }: OrdersTableProps) {
  const router = useRouter();

  const handleRowClick = (orderId: string) => {
    router.push(`/admin/orders/${orderId}`);
  };

  const handlePageChange = (newPage: number) => {
    const url = new URL(window.location.href);
    url.searchParams.set('page', String(newPage));
    router.push(url.pathname + url.search);
  };

  return (
    <div className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm rounded-2xl border border-amber/20 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-white/90 to-gray-50/90 border-b border-amber/20 px-6 py-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <svg className="w-5 h-5 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Lista narudžbi ({total > 0 ? total : orders.length})
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gradient-to-r from-white/80 to-gray-50/80 border-b border-amber/20">
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">ID Narudžbe</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Kupac</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Datum</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Status</th>
              <th className="px-6 py-4 text-right text-sm font-medium text-gray-700">Ukupno</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-amber/10">
            {orders.map((order) => (
              <tr 
                key={order.id} 
                className="hover:bg-gradient-to-r hover:from-amber/5 hover:to-orange/5 transition-all duration-200 cursor-pointer"
                onClick={() => handleRowClick(order.id)}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {order.id.substring(0, 8)}...
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{order.customerName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{formatDate(order.createdAt)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
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
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                  {formatPrice(order.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {orders.length === 0 && (
        <div className="text-center py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="p-3 bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-sm rounded-xl border border-amber/30">
              <svg className="w-8 h-8 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <p className="text-gray-600 font-medium">Nema narudžbi</p>
            <p className="text-gray-500 text-sm">Narudžbe će se ovdje prikazati kada budu kreirane</p>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="border-t border-amber/20 px-6 py-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Stranica {currentPage} od {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-amber/30 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Prethodna
            </button>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-amber/30 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Sljedeća
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
