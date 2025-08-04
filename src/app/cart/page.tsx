'use client';

import { useCart } from '@/context/CartContext';
import Image from 'next/image';
import Link from 'next/link';
import { Trash2 } from 'lucide-react';

// Funkcija za formatiranje cijene
const formatPrice = (price: number) => {
  return new Intl.NumberFormat('bs-BA', {
    style: 'currency',
    currency: 'BAM',
  }).format(price);
};

export default function CartPage() {
  const { cartItems, removeFromCart, updateQuantity, cartTotal, cartCount } = useCart();

  if (cartCount === 0) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <div className="bg-white/80 backdrop-blur-md rounded-xl p-8 shadow-xl border border-white/20 max-w-2xl mx-auto">
          <h1 className="text-2xl font-semibold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">Vaša korpa je prazna</h1>
          <p className="text-gray-600 mb-8">Izgleda da još niste dodali nijedan proizvod.</p>
          <Link 
            href="/" 
            className="inline-block rounded-lg bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-6 py-3 font-medium text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
          >
            Vratite se na kupovinu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white/80 backdrop-blur-md rounded-xl p-8 shadow-xl border border-white/20 mb-8">
        <h1 className="text-2xl font-semibold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">Vaša korpa</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item) => (
              <div 
                key={item.id} 
                className="flex items-center justify-between gap-4 rounded-xl bg-white/60 backdrop-blur-sm p-4 shadow-md border border-white/30 hover:shadow-lg transition-all duration-200"
              >
                <div className="flex items-center gap-4">
                  <div className="relative h-24 w-24 overflow-hidden rounded-lg shadow-md">
                    <Image
                      src={item.imageUrl || 'https://placehold.co/600x400.png?text=Slika+nije+dostupna'}
                      alt={item.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <Link 
                      href={`/products/${item.id}`} 
                      className="font-semibold text-lg hover:text-indigo-600 transition-colors duration-200"
                    >
                      {item.name}
                    </Link>
                    <p className="text-gray-700 font-medium">{formatPrice(item.price)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateQuantity(item.id, parseInt(e.target.value, 10))}
                    className="w-16 rounded-lg bg-white/50 border-0 px-3 py-2 text-center text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 backdrop-blur-sm focus:ring-2 focus:ring-inset focus:ring-indigo-400"
                  />
                  <button 
                    onClick={() => removeFromCart(item.id)} 
                    className="text-red-500 hover:text-red-700 bg-white/50 p-2 rounded-full hover:bg-red-50 transition-colors duration-200"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-xl bg-white/70 backdrop-blur-md p-6 shadow-lg border border-white/30 h-fit">
            <h2 className="text-xl font-semibold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">Pregled narudžbe</h2>
            <div className="flex justify-between mb-2 text-gray-700">
              <span>Ukupno ({cartCount} artikal/a)</span>
              <span className="font-medium">{formatPrice(cartTotal)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg border-t border-gray-200 pt-4 mt-4">
              <span>Ukupno za platiti</span>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">{formatPrice(cartTotal)}</span>
            </div>
            <Link 
              href="/checkout" 
              className="mt-6 block w-full rounded-lg bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 py-3 text-center font-medium text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
            >
              Nastavi na plaćanje
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
