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
        className={`px-3 py-1 text-sm font-medium rounded-full ${!currentStatus ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}`}
      >
        Sve
      </button>
      {statuses.map(status => (
        <button
          key={status}
          onClick={() => handleFilter(status)}
          className={`px-3 py-1 text-sm font-medium rounded-full ${currentStatus === status ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          {status}
        </button>
      ))}
    </div>
  );
}
