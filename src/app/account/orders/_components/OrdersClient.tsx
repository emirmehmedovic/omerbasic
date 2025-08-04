'use client';

import type { Order, OrderItem, Product } from '@/generated/prisma/client';
import { format } from 'date-fns';

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
  if (orders.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Nemate nijednu narudžbu.</h2>
        <p className="text-gray-500 mt-2">Kada napravite prvu narudžbu, vidjet ćete je ovdje.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {orders.map((order) => (
        <div key={order.id} className="rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gray-50 p-4 flex justify-between items-center">
            <div>
              <p className="font-semibold">Narudžba: <span className="font-normal text-gray-600">#{order.id.substring(0, 8)}</span></p>
              <p className="text-sm text-gray-500">Datum: {format(new Date(order.createdAt), 'dd.MM.yyyy')}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold">Ukupno: {formatPrice(order.total)}</p>
              <p className="text-sm capitalize font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-800">{order.status.toLowerCase()}</p>
            </div>
          </div>
          <div className="p-4 space-y-4">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-md bg-gray-100 flex-shrink-0">
                   <img src={item.product.imageUrl || 'https://placehold.co/600x400.png?text=Slika+nije+dostupna'} alt={item.product.name} className="w-full h-full object-cover rounded-md" />
                </div>
                <div>
                  <p className="font-semibold">{item.product.name}</p>
                  <p className="text-sm text-gray-500">Količina: {item.quantity}</p>
                  <p className="text-sm text-gray-500">Cijena: {formatPrice(item.price)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
