'use client';

import { useCart } from '@/context/CartContext';
import type { Category, Product } from '@/generated/prisma/client';
import Image from 'next/image';
import { toast } from 'react-hot-toast';

interface ProductDetailsProps {
  product: Product & { category: Category | null; originalPrice?: number };
}

// Funkcija za formatiranje cijene u KM
const formatPrice = (price: number) => {
  return new Intl.NumberFormat('bs-BA', {
    style: 'currency',
    currency: 'BAM',
  }).format(price);
};

export const ProductDetails = ({ product }: ProductDetailsProps) => {
  const { addToCart } = useCart();

  const handleAddToCart = () => {
    addToCart(product);
    toast.success(`${product.name} je dodan u korpu!`);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="relative h-96 w-full overflow-hidden rounded-lg">
        <Image
          src={product.imageUrl || 'https://placehold.co/600x400.png?text=Slika+nije+dostupna'}
          alt={product.name}
          fill
          className="object-cover"
        />
      </div>
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-gray-500">
          {product.category?.name || 'Nekategorizirano'}
        </p>
        <h1 className="text-3xl font-bold mt-2 text-gray-900">{product.name}</h1>
        {product.originalPrice ? (
          <div className="mt-4">
            <p className="text-2xl font-bold text-indigo-600">
              {formatPrice(product.price)}
            </p>
            <p className="text-lg text-gray-500 line-through">
              {formatPrice(product.originalPrice)}
            </p>
            <p className="text-sm font-semibold text-green-600">
              Ušteda: {formatPrice(product.originalPrice - product.price)}
            </p>
          </div>
        ) : (
          <p className="text-2xl font-bold mt-4 text-indigo-600">
            {formatPrice(product.price)}
          </p>
        )}
        <p className="mt-4 text-gray-700">{product.description}</p>
        <div className="mt-6">
          <button
            onClick={handleAddToCart}
            className="w-full rounded-md bg-indigo-600 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all"
          >
            Dodaj u korpu
          </button>
        </div>
      </div>
    </div>
  );
};
