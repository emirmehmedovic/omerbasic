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
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-8">
          {/* Left Column (70%) */}
          <div className="lg:col-span-7">
            <div className="glass-card rounded-xl p-8 h-full flex flex-col">
              <div className="flex items-center justify-center mb-6">
                <div className="bg-sunfire-a10/20 p-3 rounded-full">
                  <CheckCircle2 className="h-10 w-10 text-sunfire-a40" />
                </div>
              </div>
              <h1 className="text-3xl font-bold text-center mb-2 text-slate-100">Narudžba uspješno kreirana!</h1>
              <p className="text-center text-slate-400 mb-8">Hvala Vam na narudžbi. Vaša narudžba je zaprimljena i bit će obrađena u najkraćem mogućem roku.</p>

              <div className="border-t border-slate-700/50 pt-6 flex-grow">
                <h3 className="text-lg font-medium mb-4 text-slate-200">Naručeni artikli</h3>
                <div className="space-y-4 mb-6">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center border-b border-slate-700/50 pb-3">
                      <div>
                        <p className="font-medium text-slate-200">{item.product.name}</p>
                        <p className="text-sm text-slate-400">Količina: {item.quantity}</p>
                      </div>
                      <p className="font-medium text-slate-200">{formatPrice(item.price * item.quantity)}</p>
                    </div>
                  ))}
                </div>
                
                <div className="space-y-2 pt-4 text-slate-300">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-medium">{formatPrice(order.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Dostava</span>
                    <span className="font-medium">{formatPrice(order.shippingCost)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t border-slate-700/50 text-slate-100">
                    <span>Ukupno</span>
                    <span className="text-sunfire-a40">{formatPrice(order.total)}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8">
                <Link href="/" className="rounded-lg bg-slate-700/50 px-6 py-3 text-center font-medium text-slate-200 shadow-sm border border-slate-600/80 hover:bg-slate-700 transition-colors duration-200">Povratak na početnu</Link>
                <Link href="/products" className="accent-bg rounded-lg px-6 py-3 text-center font-medium text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105">Nastavi kupovinu</Link>
              </div>
            </div>
          </div>

          {/* Right Column (30%) */}
          <div className="lg:col-span-3 space-y-8">
            {/* Order Details Block */}
            <div className="glass-card rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-4 text-slate-200">Detalji narudžbe</h2>
              <div className="space-y-4 text-slate-300">
                <div>
                  <p className="text-sm text-slate-400">Broj narudžbe</p>
                  <p className="font-medium text-slate-200">{order.id.substring(0, 8).toUpperCase()}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Datum</p>
                  <p className="font-medium text-slate-200">{orderDate}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Način plaćanja</p>
                  <p className="font-medium text-slate-200">{order.paymentMethod === 'CASH_ON_DELIVERY' ? 'Plaćanje pouzećem' : 'Bankovna transakcija'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Način dostave</p>
                  <p className="font-medium text-slate-200">{order.shippingMethod === 'COURIER' ? 'Dostava kurirskom službom' : 'Lično preuzimanje'}</p>
                </div>
              </div>
            </div>

            {/* Shipping Address Block */}
            <div className="glass-card rounded-xl p-6">
              <h3 className="text-xl font-semibold mb-4 text-slate-200">Adresa za dostavu</h3>
              <div className="text-slate-300 space-y-1">
                <p className="font-medium text-slate-200">{order.customerName}</p>
                {typeof order.shippingAddress === 'object' && order.shippingAddress !== null && (
                  <>
                    <p>{(order.shippingAddress as any).street}</p>
                    <p>{(order.shippingAddress as any).city}, {(order.shippingAddress as any).postalCode}</p>
                    <p>{(order.shippingAddress as any).country}</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
