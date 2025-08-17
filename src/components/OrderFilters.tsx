'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { OrderStatus } from '@/generated/prisma';

const statuses: OrderStatus[] = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

export default function OrderFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentStatus = searchParams.get('status');

  const handleFilter = (status: OrderStatus | null) => {
    const params = new URLSearchParams(searchParams);
    if (status) {
      params.set('status', status);
    } else {
      params.delete('status');
    }
    router.push(`/admin/orders?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => handleFilter(null)}
        className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
          !currentStatus 
            ? 'bg-gradient-to-r from-amber via-orange to-brown text-white shadow-lg' 
            : 'bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm text-gray-700 border border-amber/30 hover:border-amber/50'
        }`}
      >
        Sve
      </button>
      {statuses.map(status => (
        <button
          key={status}
          onClick={() => handleFilter(status)}
          className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
            currentStatus === status 
              ? 'bg-gradient-to-r from-amber via-orange to-brown text-white shadow-lg' 
              : 'bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm text-gray-700 border border-amber/30 hover:border-amber/50'
          }`}
        >
          {status}
        </button>
      ))}
    </div>
  );
}
