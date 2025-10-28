'use client';

import { useCart } from '@/context/CartContext';
import Image from 'next/image';
import Link from 'next/link';
import { Trash2 } from 'lucide-react';
import { CartSuggestions } from '@/components/CartSuggestions';

// Funkcija za formatiranje cijene
const formatPrice = (price: number) => {
  return new Intl.NumberFormat('bs-BA', {
    style: 'currency',
    currency: 'BAM',
  }).format(price);
};

export default function CartPage() {
  const { cartItems, removeFromCart, updateQuantity, cartTotal, cartCount } = useCart();

  const categoryIds = cartItems.map(item => item.categoryId).filter((id): id is string => !!id);
  const excludeProductIds = cartItems.map(item => item.id);

  if (cartCount === 0) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <div className="rounded-2xl p-8 max-w-2xl mx-auto bg-white border border-slate-200 shadow-sm">
          <h1 className="text-3xl font-bold text-slate-900 mb-4">Vaša korpa je prazna</h1>
          <p className="text-slate-600 mb-8">Izgleda da još niste dodali nijedan proizvod.</p>
          <Link 
            href="/" 
            className="inline-block bg-sunfire-600 text-white font-bold py-3 px-8 rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
          >
            Vratite se na kupovinu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="rounded-2xl p-8 mb-8 bg-white border border-slate-200 shadow-sm">
        <h1 className="text-3xl font-bold text-slate-900 mb-6">Vaša korpa</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item) => (
              <div 
                key={item.id} 
                className="flex items-center justify-between gap-4 rounded-xl bg-white p-4 border border-slate-200 hover:shadow-sm transition-all duration-200"
              >
                <div className="flex items-center gap-4 flex-grow">
                  <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg border border-slate-200 shadow-sm bg-white">
                    <Image
                      src={item.imageUrl || 'https://placehold.co/600x400.png?text=Slika+nije+dostupna'}
                      alt={item.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-grow">
                    <Link 
                      href={`/products/${item.id}`} 
                      className="font-semibold text-lg text-slate-900 hover:text-sunfire-700 transition-colors duration-200"
                    >
                      {item.name}
                    </Link>
                    <p className="text-slate-900 font-bold text-lg">{formatPrice(item.price)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateQuantity(item.id, parseInt(e.target.value, 10))}
                    className="w-20 rounded-lg bg-white border border-slate-200 px-3 py-2 text-center text-slate-900 focus:ring-2 focus:ring-sunfire-300 focus:border-sunfire-300"
                  />
                  <button 
                    onClick={() => removeFromCart(item.id)} 
                    className="text-slate-500 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-colors duration-200"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-2xl p-6 h-fit bg-white border border-slate-200 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Pregled narudžbe</h2>
            <div className="space-y-3 text-slate-700">
              <div className="flex justify-between">
                <span>Ukupno ({cartCount} artikal/a)</span>
                <span className="font-medium">{formatPrice(cartTotal)}</span>
              </div>
              {/* Ovdje se mogu dodati troskovi dostave */}
            </div>
            <div className="flex justify-between font-bold text-xl border-t border-slate-200 pt-4 mt-4 text-slate-900">
              <span>Ukupno za platiti</span>
              <span className="text-sunfire-700">{formatPrice(cartTotal)}</span>
            </div>
            <Link 
              href="/checkout" 
              className="mt-6 block w-full bg-sunfire-600 text-white font-bold py-3 text-center rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
            >
              Nastavi na plaćanje
            </Link>
          </div>
        </div>
      </div>
      {cartCount > 0 && 
        <CartSuggestions 
          categoryIds={categoryIds} 
          excludeProductIds={excludeProductIds} 
        />
      }
    </div>
  );
}
