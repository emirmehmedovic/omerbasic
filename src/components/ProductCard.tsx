'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { Category, Product } from '@/generated/prisma/client';
import { useSession } from 'next-auth/react';
import { useCart } from '@/context/CartContext';
import { toast } from 'react-hot-toast';
import { ShoppingCart } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ProductCardProps {
  product: Product & { category: Category | null } & { originalPrice?: number };
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('bs-BA', {
    style: 'currency',
    currency: 'BAM',
  }).format(price);
};

export const ProductCard = ({ product }: ProductCardProps) => {
  const { addToCart } = useCart();
  const { data: session } = useSession();
  const [isMounted, setIsMounted] = useState(false);
  
  // Koristimo originalPrice iz produkta ako postoji (postavljen na serveru)
  const hasDiscount = !!product.originalPrice;
  const originalPrice = product.originalPrice;
  const discountedPrice = product.price;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const getSafeImageUrl = (url: string | null | undefined): string => {
    const placeholder = 'https://placehold.co/600x600.png?text=Slika+nije+dostupna';
    if (!url) return placeholder;
    if (url.startsWith('/')) return url;
    try {
      const hostname = new URL(url).hostname;
      if (hostname.includes('google.com')) {
        return placeholder;
      }
      return url;
    } catch (error) {
      return placeholder;
    }
  };

  const imageUrl = getSafeImageUrl(product.imageUrl);

  const handleAddToCart = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product);
    toast.success(`${product.name} je dodan u košaricu!`);
  };

  return (
    <Link 
      href={`/products/${product.id}`} 
      className="group relative block overflow-hidden rounded-3xl transition-all duration-300 ease-in-out hover:scale-[1.02]"
    >
      {/* Glass card effect */}
      <div className="absolute inset-0 bg-white/40 backdrop-blur-md border border-white/30 shadow-lg rounded-3xl z-10"></div>
      
      {/* Product image */}
      <div className="relative aspect-square w-full overflow-hidden rounded-t-3xl z-20">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/5 z-10"></div>
        <Image
          src={imageUrl}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 ease-in-out group-hover:scale-110 z-0"
        />
      </div>
      
      {/* Product info */}
      <div className="relative p-5 z-20">
        <h3 className="text-base font-semibold text-slate-800 truncate" title={product.name}>
          {product.name}
        </h3>
        <div className="mt-2 flex items-center justify-between">
          <div>
            {/* Ako je B2B korisnik s popustom ili proizvod ima originalPrice, prikaži obje cijene */}
            {(hasDiscount || product.originalPrice) ? (
              <div className="flex flex-col">
                <p className="text-sm line-through text-gray-500">
                  {isMounted ? formatPrice(originalPrice || product.originalPrice || product.price) : <span className="block h-4 w-16 animate-pulse rounded-md bg-gray-200" />}
                </p>
                <p className="text-lg font-bold bg-accent-gradient bg-clip-text text-transparent">
                  {isMounted ? formatPrice(hasDiscount ? discountedPrice : product.price) : <span className="block h-7 w-24 animate-pulse rounded-md bg-gray-200" />}
                </p>
              </div>
            ) : (
              <p className="text-lg font-bold bg-accent-gradient bg-clip-text text-transparent">
                {isMounted ? formatPrice(product.price) : <span className="block h-7 w-24 animate-pulse rounded-md bg-gray-200" />}
              </p>
            )}
          </div>
          
          {/* Category badge */}
          <div className="flex flex-col items-end gap-1">
            {hasDiscount && (
              <span className="text-xs bg-accent-gradient text-white px-2 py-0.5 rounded-full">
                B2B cijena
              </span>
            )}
            {product.category && (
              <span className="text-xs bg-white/70 backdrop-blur-sm px-2 py-1 rounded-full text-slate-600">
                {product.category.name}
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* Add to Cart Button - appears on hover with glassmorphism */}
      <div className="absolute bottom-0 left-0 right-0 p-5 opacity-0 transition-all duration-300 ease-in-out group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 z-30">
        <div className="relative">
          <div className="absolute inset-0 bg-accent-gradient opacity-90 rounded-full"></div>
          <button 
            onClick={handleAddToCart}
            className="relative flex w-full items-center justify-center gap-2 rounded-full py-3 px-4 text-sm font-semibold text-white transition-all hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-amber focus:ring-offset-2"
          >
            <ShoppingCart size={16} />
            Dodaj u košaricu
          </button>
        </div>
      </div>
    </Link>
  );
};
