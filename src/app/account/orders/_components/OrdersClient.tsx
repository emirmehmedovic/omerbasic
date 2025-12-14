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
        return 'bg-yellow-100 border border-yellow-200 text-yellow-700';
      case 'COMPLETED':
        return 'bg-green-100 border border-green-200 text-green-700';
      case 'SHIPPED':
        return 'bg-blue-100 border border-blue-200 text-blue-700';
      case 'CANCELED':
        return 'bg-red-100 border border-red-200 text-red-700';
      default:
        return 'bg-slate-100 border border-slate-200 text-slate-700';
    }
  };

  return (
    <div className="min-h-screen bg-app p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8">
          <h1 className="text-4xl font-bold text-slate-900">Moje narudžbe</h1>
          <div className="flex items-center gap-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-[280px] justify-start text-left font-normal bg-white border-slate-200 hover:bg-slate-50 text-slate-900"
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
              <PopoverContent className="w-auto p-0 bg-white border-slate-200" align="end">
                <Calendar
                  onChange={handleDateChange}
                  value={date}
                  selectRange={true}
                  locale="hr-HR"
                  className="react-calendar-light"
                />
              </PopoverContent>
            </Popover>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="bg-white border-slate-200 rounded-md px-3 py-2 text-slate-900 focus:ring-primary focus:border-primary"
            >
              {orderStatuses.map(s => (
                <option key={s} value={s} className="bg-white text-slate-900">{s === 'all' ? 'Svi statusi' : s.charAt(0) + s.slice(1).toLowerCase()}</option>
              ))}
            </select>
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="text-center py-12 rounded-2xl bg-white shadow-sm p-8 border border-slate-200">
            <h2 className="text-2xl font-semibold text-slate-900">
              {orders.length === 0 ? 'Nemate nijednu narudžbu.' : 'Nema narudžbi koje odgovaraju filterima.'}
            </h2>
            <p className="text-slate-600 mt-2">
              {orders.length === 0 ? 'Kada napravite prvu narudžbu, vidjet ćete je ovdje.' : 'Pokušajte promijeniti filtere ili obrisati postojeće.'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredOrders.map((order: OrderWithItemsAndProducts) => (
              <div key={order.id} className="rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all duration-200">
                <div className="bg-slate-50 border-b border-slate-200 p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                  <div>
                    <p className="font-semibold text-slate-900">Narudžba: <span className="font-normal text-slate-700">#{order.id.substring(0, 8)}</span></p>
                    <p className="text-sm text-slate-600">Datum: {format(new Date(order.createdAt), 'dd.MM.yyyy')}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="font-semibold text-slate-900">Ukupno: {formatPrice(order.total)}</p>
                    <p className={`text-sm capitalize font-medium px-3 py-1 rounded-full inline-block mt-2 sm:mt-0 ${getStatusClasses(order.status)}`}>
                      {order.status.toLowerCase().replace('_', ' ')}
                    </p>
                  </div>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {order.items.map((item: OrderItem & { product: Product }) => (
                      <div key={item.id} className="flex items-start gap-4 border-b border-slate-200 pb-4 last:pb-0 last:border-b-0">
                        <div className="w-20 h-20 rounded-md bg-slate-50 border border-slate-200 flex-shrink-0 overflow-hidden">
                          <img src={item.product.imageUrl || 'https://placehold.co/400x400/f8fafc/cbd5e1?text=Slika'} alt={item.product.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-slate-900 mb-1">{item.product.name}</p>
                          {item.product.sku && (
                            <p className="text-xs text-slate-500 mb-1">SKU: {item.product.sku}</p>
                          )}
                          {item.product.oemNumber && (
                            <p className="text-xs text-slate-500 mb-1">OEM: {item.product.oemNumber}</p>
                          )}
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                            <p className="text-sm text-slate-600">Količina: <span className="font-medium text-slate-900">{item.quantity}</span></p>
                            <p className="text-sm text-slate-600">Cijena: <span className="font-medium text-slate-900">{formatPrice(item.price)}</span></p>
                            <p className="text-sm text-slate-600">Ukupno: <span className="font-semibold text-slate-900">{formatPrice(item.price * item.quantity)}</span></p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Sažetak narudžbe */}
                  <div className="mt-6 pt-4 border-t border-slate-200">
                    <div className="flex justify-end">
                      <div className="w-full sm:w-80 space-y-2">
                        <div className="flex justify-between text-sm text-slate-600">
                          <span>Subtotal:</span>
                          <span className="font-medium text-slate-900">{formatPrice(order.subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-slate-600">
                          <span>Dostava:</span>
                          <span className="font-medium text-slate-900">{formatPrice(order.shippingCost)}</span>
                        </div>
                        <div className="flex justify-between text-base font-semibold text-slate-900 pt-2 border-t border-slate-200">
                          <span>Ukupno:</span>
                          <span>{formatPrice(order.total)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-end gap-4">
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
