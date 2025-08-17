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
    <div className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm rounded-xl border border-amber/20 shadow-sm p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <svg className="w-4 h-4 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Ažuriraj status
        </h3>
        <div className="flex flex-col gap-3">
            <select 
                value={status}
                onChange={(e) => setStatus(e.target.value as OrderStatus)}
                className="bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 px-3 py-2 text-sm"
            >
                {orderStatuses.map(s => (
                    <option key={s} value={s} className="text-gray-900">{s}</option>
                ))}
            </select>
            <button 
                onClick={handleUpdateStatus}
                disabled={isLoading || status === order.status}
                className="bg-gradient-to-r from-amber via-orange to-brown text-white hover:from-amber/90 hover:via-orange/90 hover:to-brown/90 shadow-lg hover:scale-105 transition-all duration-200 rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:hover:scale-100"
            >
                {isLoading ? 'Spremanje...' : 'Spremi'}
            </button>
        </div>
    </div>
  );
}
