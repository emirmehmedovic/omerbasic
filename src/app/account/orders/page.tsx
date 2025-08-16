import { getCurrentUser } from '@/lib/session';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { OrdersClient } from './_components/OrdersClient';

async function getOrders(userId: string) {
  const orders = await db.order.findMany({
    where: {
      userId: userId,
    },
    include: {
      items: {
        include: {
          product: true, // Uključujemo podatke o proizvodu za svaku stavku
        },
      },
    },
    orderBy: {
      createdAt: 'desc', // Najnovije narudžbe prve
    },
  });
  return orders;
}

export default async function OrdersPage() {
  const user = await getCurrentUser();

  console.log('[ORDERS_PAGE] User:', user ? 'postoji' : 'ne postoji');
  console.log('[ORDERS_PAGE] User ID:', user?.id || 'nije dostupan');
  console.log('[ORDERS_PAGE] User Email:', user?.email || 'nije dostupan');
  console.log('[ORDERS_PAGE] User Role:', user?.role || 'nije dostupan');

  if (!user) {
    redirect('/login');
  }

  const orders = await getOrders(user.id);
  console.log('[ORDERS_PAGE] Broj narudžbi:', orders.length);
  
  // Ako nema narudžbi, pokušajmo pronaći narudžbe po emailu
  let finalOrders = orders;
  if (orders.length === 0 && user.email) {
    console.log('[ORDERS_PAGE] Pokušavam pronaći narudžbe po emailu:', user.email);
    const ordersByEmail = await db.order.findMany({
      where: {
        customerEmail: user.email,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    console.log('[ORDERS_PAGE] Pronađeno narudžbi po emailu:', ordersByEmail.length);
    
    // Ako smo pronašli narudžbe po emailu, koristimo njih
    if (ordersByEmail.length > 0) {
      finalOrders = ordersByEmail;
    }
  }

  return <OrdersClient orders={finalOrders} />;
}
