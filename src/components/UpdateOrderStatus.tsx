'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import type { Order, OrderStatus } from '@/generated/prisma';

interface UpdateOrderStatusProps {
  order: Order;
}

const orderStatuses: OrderStatus[] = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

export default function UpdateOrderStatus({ order }: UpdateOrderStatusProps) {
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleUpdateStatus = async () => {
    setIsLoading(true);
    try {
      await axios.patch(`/api/orders/${order.id}`, { status });
      toast.success('Status narudžbe je ažuriran!');
      router.refresh(); // Osvježava podatke na stranici (Server Component)
    } catch (error) {
      console.error('Greška prilikom ažuriranja statusa:', error);
      toast.error('Došlo je do greške.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Ažuriraj status</h2>
        <div className="flex items-center gap-4">
            <select 
                value={status}
                onChange={(e) => setStatus(e.target.value as OrderStatus)}
                className="flex-grow rounded-md border-gray-300 shadow-sm"
            >
                {orderStatuses.map(s => (
                    <option key={s} value={s}>{s}</option>
                ))}
            </select>
            <button 
                onClick={handleUpdateStatus}
                disabled={isLoading || status === order.status}
                className="rounded-md bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
                {isLoading ? 'Spremanje...' : 'Spremi'}
            </button>
        </div>
    </div>
  );
}
