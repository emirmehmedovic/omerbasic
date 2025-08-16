'use client';

import type { Order, OrderItem, Product } from '@/generated/prisma/client';
import type { DateRange } from 'react-day-picker';
import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon } from 'lucide-react';
import DownloadOrderDocument from '@/components/DownloadOrderDocument';

// Proširujemo tip narudžbe da uključuje stavke s proizvodima
type OrderWithItemsAndProducts = Order & {
  items: (OrderItem & {
    product: Product;
  })[];
};

interface OrdersClientProps {
  orders: OrderWithItemsAndProducts[];
}

// Koristimo fiksni format za cijene kako bismo izbjegli hidracijske greške
const formatPrice = (price: number) => {
  // Formatiramo cijenu ručno umjesto korištenja Intl.NumberFormat
  // jer Intl.NumberFormat može dati različite rezultate na serveru i klijentu
  const formattedPrice = price.toFixed(2).replace('.', ',');
  return `${formattedPrice} KM`;
};

export const OrdersClient = ({ orders }: OrdersClientProps) => {
  const [date, setDate] = useState<[Date, Date] | undefined>();

  const handleDateChange = (value: any) => {
    if (Array.isArray(value) && value.length === 2) {
      setDate(value as [Date, Date]);
    } else {
      setDate(undefined);
    }
  };

  const [status, setStatus] = useState('all');

  const orderStatuses = ['all', 'PENDING', 'COMPLETED', 'SHIPPED', 'CANCELED'];

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const orderDate = new Date(order.createdAt);

      if (date && date.length === 2) {
        const fromDate = date[0];
        const toDate = date[1];
        // Set hours to 0 to compare dates only
        fromDate.setHours(0, 0, 0, 0);
        // Set hours to end of day
        toDate.setHours(23, 59, 59, 999);

        if (orderDate < fromDate || orderDate > toDate) {
          return false;
        }
      }

      if (status !== 'all' && order.status !== status) {
        return false;
      }

      return true;
    });
  }, [orders, date, status]);

  const getStatusClasses = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PENDING':
        return 'bg-yellow-500/10 text-yellow-300';
      case 'COMPLETED':
        return 'bg-green-500/10 text-green-300';
      case 'SHIPPED':
        return 'bg-blue-500/10 text-blue-300';
      case 'CANCELED':
        return 'bg-red-500/10 text-red-300';
      default:
        return 'bg-slate-700 text-slate-300';
    }
  };

  return (
    <div className="min-h-screen text-slate-200 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8">
          <h1 className="text-4xl font-bold text-white">Moje narudžbe</h1>
          <div className="flex items-center gap-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-[280px] justify-start text-left font-normal bg-slate-800/50 border-slate-700 hover:bg-slate-800 text-white hover:text-white"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date && date.length === 2 ? (
                    <>
                      {format(date[0], "LLL dd, y")} -{" "}
                      {format(date[1], "LLL dd, y")}
                    </>
                  ) : (
                    <span>Odaberite period</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-slate-900/80 backdrop-blur-xl border-slate-700 text-white" align="end">
                <Calendar
                  onChange={handleDateChange}
                  value={date}
                  selectRange={true}
                  locale="hr-HR"
                  className="react-calendar-dark"
                />
              </PopoverContent>
            </Popover>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="bg-slate-800/50 border-slate-700 rounded-md px-3 py-2 text-white focus:ring-sunfire-500 focus:border-sunfire-500"
            >
              {orderStatuses.map(s => (
                <option key={s} value={s} className="bg-slate-900 text-white">{s === 'all' ? 'Svi statusi' : s.charAt(0) + s.slice(1).toLowerCase()}</option>
              ))}
            </select>
          </div>
        </div>
        
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12 rounded-2xl bg-slate-900/70 backdrop-blur-xl shadow-lg p-8 border border-slate-800">
            <h2 className="text-2xl font-semibold text-white">
              {orders.length === 0 ? 'Nemate nijednu narudžbu.' : 'Nema narudžbi koje odgovaraju filterima.'}
            </h2>
            <p className="text-slate-400 mt-2">
              {orders.length === 0 ? 'Kada napravite prvu narudžbu, vidjet ćete je ovdje.' : 'Pokušajte promijeniti filtere ili obrisati postojeće.'}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {filteredOrders.map((order: OrderWithItemsAndProducts) => (
              <div key={order.id} className="rounded-2xl bg-slate-900/70 backdrop-blur-xl shadow-lg border border-slate-800 overflow-hidden">
                <div className="bg-slate-800/50 p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                  <div>
                    <p className="font-semibold text-white">Narudžba: <span className="font-normal text-slate-300">#{order.id.substring(0, 8)}</span></p>
                    <p className="text-sm text-slate-400">Datum: {format(new Date(order.createdAt), 'dd.MM.yyyy')}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="font-semibold text-white">Ukupno: {formatPrice(order.total)}</p>
                    <p className={`text-sm capitalize font-medium px-3 py-1 rounded-full inline-block mt-2 sm:mt-0 ${getStatusClasses(order.status)}`}>
                      {order.status.toLowerCase().replace('_', ' ')}
                    </p>
                  </div>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {order.items.map((item: OrderItem & { product: Product }) => (
                      <div key={item.id} className="flex items-center gap-4 border-b border-slate-800 pb-4 last:pb-0 last:border-b-0">
                        <div className="w-16 h-16 rounded-md bg-slate-800 flex-shrink-0 overflow-hidden">
                          <img src={item.product.imageUrl || 'https://placehold.co/400x400/020617/334155?text=Slika'} alt={item.product.name} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <p className="font-semibold text-white">{item.product.name}</p>
                          <p className="text-sm text-slate-400">Količina: {item.quantity}</p>
                          <p className="text-sm text-slate-400">Cijena: {formatPrice(item.price)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-end gap-4">
                    <DownloadOrderDocument orderId={order.id} documentType="invoice" buttonText="Preuzmi fakturu" />
                    <DownloadOrderDocument orderId={order.id} documentType="packing-slip" buttonText="Preuzmi otpremnicu" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
