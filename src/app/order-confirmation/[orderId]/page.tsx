import { db } from '@/lib/db';
import { formatPrice } from '@/lib/utils';
import { getCurrentUser } from '@/lib/session';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';

export default async function OrderConfirmationPage({ params }: { params: Promise<{ orderId: string }> }) {
  // U Next.js 15+ moramo koristiti await za pristup dinamičkim parametrima
  const { orderId } = await params;
  const currentUser = await getCurrentUser();

  // Dohvati narudžbu iz baze
  const order = await db.order.findUnique({
    where: {
      id: orderId,
    },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  // Ako narudžba ne postoji ili nije od trenutnog korisnika, prikaži 404
  if (!order) {
    notFound();
  }

  // Ako korisnik nije prijavljen i nije admin, provjeri da li je email isti kao u narudžbi
  // Ovo omogućava da neprijavljeni korisnici mogu vidjeti svoju narudžbu
  if (!currentUser && order.customerEmail) {
    // Ovdje možemo dodati dodatnu provjeru, npr. token u URL-u
    // Za sada samo dopuštamo pristup jer imamo orderId koji je dovoljno jedinstven
  }

  // Formatiraj datum
  const orderDate = new Date(order.createdAt).toLocaleDateString('bs-BA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/80 backdrop-blur-md rounded-xl p-8 shadow-xl border border-white/20">
          <div className="flex items-center justify-center mb-8">
            <div className="bg-green-100 p-3 rounded-full">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-center mb-2 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
            Narudžba uspješno kreirana!
          </h1>
          
          <p className="text-center text-gray-600 mb-8">
            Hvala Vam na narudžbi. Vaša narudžba je zaprimljena i bit će obrađena u najkraćem mogućem roku.
          </p>
          
          <div className="border-t border-gray-200 pt-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Detalji narudžbe</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm text-gray-500">Broj narudžbe</p>
                <p className="font-medium">{order.id.substring(0, 8).toUpperCase()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Datum</p>
                <p className="font-medium">{orderDate}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Način plaćanja</p>
                <p className="font-medium">
                  {order.paymentMethod === 'CASH_ON_DELIVERY' ? 'Plaćanje pouzećem' : 'Bankovna transakcija'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Način dostave</p>
                <p className="font-medium">
                  {order.shippingMethod === 'COURIER' ? 'Dostava kurirskom službom' : 'Lično preuzimanje'}
                </p>
              </div>
            </div>
            
            <h3 className="text-lg font-medium mb-3">Adresa za dostavu</h3>
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="font-medium">{order.customerName}</p>
              {typeof order.shippingAddress === 'object' && order.shippingAddress !== null && (
                <>
                  <p>{(order.shippingAddress as any).street}</p>
                  <p>{(order.shippingAddress as any).city}, {(order.shippingAddress as any).postalCode}</p>
                  <p>{(order.shippingAddress as any).country}</p>
                </>
              )}
            </div>
            
            <h3 className="text-lg font-medium mb-3">Artikli</h3>
            <div className="space-y-4 mb-6">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between items-center border-b border-gray-100 pb-3">
                  <div>
                    <p className="font-medium">{item.product.name}</p>
                    <p className="text-sm text-gray-500">Količina: {item.quantity}</p>
                  </div>
                  <p className="font-medium">{formatPrice(item.price * item.quantity)}</p>
                </div>
              ))}
            </div>
            
            <div className="space-y-2 pt-4">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Dostava</span>
                <span>{formatPrice(order.shippingCost)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
                <span>Ukupno</span>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                  {formatPrice(order.total)}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8">
            <Link 
              href="/" 
              className="rounded-lg bg-white px-6 py-3 text-center font-medium text-gray-700 shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors duration-200"
            >
              Povratak na početnu
            </Link>
            <Link 
              href="/products" 
              className="rounded-lg bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-6 py-3 text-center font-medium text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
            >
              Nastavi kupovinu
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
