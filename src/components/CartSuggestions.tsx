'use client';

import { useEffect, useState } from 'react';
import type { Product } from '@/generated/prisma/client';
import axios from 'axios';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';
import { toast } from 'react-hot-toast';
import { formatPrice } from '@/lib/utils';
import { ShoppingCart } from 'lucide-react';

interface CartSuggestionsProps {
  categoryIds: string[];
  excludeProductIds: string[];
}

export const CartSuggestions = ({ categoryIds, excludeProductIds }: CartSuggestionsProps) => {
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        setLoading(true);
        const response = await axios.post('/api/products/suggestions', {
          categoryIds: [...new Set(categoryIds)], // Ensure unique category IDs
          excludeProductIds,
          take: 4,
        });
        setSuggestions(response.data);
      } catch (error) {
        console.error('Failed to fetch product suggestions:', error);
      } finally {
        setLoading(false);
      }
    };

    if (categoryIds.length > 0) {
      fetchSuggestions();
    }
  }, [categoryIds, excludeProductIds]);

  const handleAddToCart = (product: Product) => {
    addToCart(product);
    toast.success(`${product.name} je dodan u korpu!`);
  };

  if (loading) {
    return (
      <div className="rounded-2xl p-6 mt-8 bg-white border border-slate-200 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Možda će vas zanimati...</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg p-4 border border-slate-200 animate-pulse">
              <div className="w-full h-40 bg-slate-100 rounded-md mb-4"></div>
              <div className="h-4 bg-slate-100 rounded w-3/4 mb-2"></div>
              <div className="h-6 bg-slate-100 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl p-6 mt-8 bg-white border border-slate-200 shadow-sm">
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Zaboravili ste nešto?</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {suggestions.map((product) => (
          <div key={product.id} className="bg-white rounded-lg overflow-hidden flex flex-col group border border-slate-200 hover:shadow-sm transition">
            <Link href={`/products/${product.id}`} className="block">
              <div className="relative h-48 w-full">
                <Image
                  src={product.imageUrl || 'https://placehold.co/400x400.png?text=Nema+slike'}
                  alt={product.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            </Link>
            <div className="p-4 flex flex-col flex-grow">
              <h3 className="font-semibold text-slate-900 flex-grow">
                <Link href={`/products/${product.id}`} className="hover:text-sunfire-700 transition-colors">
                  {product.name}
                </Link>
              </h3>
              <div className="mt-4 flex justify-between items-center">
                <p className="text-lg font-bold text-sunfire-600">{formatPrice(product.price)}</p>
                <button
                  onClick={() => handleAddToCart(product)}
                  className="bg-sunfire-600 text-white p-2 rounded-full hover:bg-sunfire-700 transition-colors"
                  aria-label={`Dodaj ${product.name} u korpu`}
                >
                  <ShoppingCart size={20} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
