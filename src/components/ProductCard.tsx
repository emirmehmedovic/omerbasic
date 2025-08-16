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
      className="group relative flex flex-col overflow-hidden rounded-2xl transition-all duration-300 ease-in-out hover:scale-[1.03] bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 hover:border-sunfire-500/50"
    >
      {/* Frosted glass handled by utility classes */}
      
      {/* Product image */}
      <div className="relative aspect-square w-full overflow-hidden rounded-t-2xl z-20">
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10"></div>
        <Image
          src={imageUrl}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 ease-in-out group-hover:scale-110 z-0"
        />
        
        {/* Floating badge for discount */}
        {hasDiscount && (
          <div className="absolute top-3 right-3 z-20">
            <span className="bg-sunfire-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg shadow-sunfire-500/20">
              B2B cijena
            </span>
          </div>
        )}
      </div>
      
      {/* Product info */}
      <div className="relative p-6 z-20 flex flex-col flex-grow">
        <h3 className="text-base font-semibold text-white mb-1.5 line-clamp-2" title={product.name}>
          {product.name}
        </h3>
        
        {product?.category && (
          <span className="text-xs text-sunfire-300 mb-3">
            {product.category.name}
          </span>
        )}

        <div className="flex items-end justify-between mt-auto pt-4">
          <div>
            {/* Cijena s novim dizajnom */}
            {(hasDiscount || product.originalPrice) ? (
              <div className="flex flex-col">
                <p className="text-sm line-through text-slate-500 mb-1">
                  {isMounted ? formatPrice(originalPrice || product.originalPrice || product.price) : <span className="block h-4 w-16 animate-pulse rounded-md bg-slate-700" />}
                </p>
                <p className="text-xl font-bold text-sunfire-400">
                  {isMounted ? formatPrice(hasDiscount ? discountedPrice : product.price) : <span className="block h-7 w-24 animate-pulse rounded-md bg-slate-700" />}
                </p>
              </div>
            ) : (
              <p className="text-xl font-bold text-sunfire-400">
                {isMounted ? formatPrice(product.price) : <span className="block h-7 w-24 animate-pulse rounded-md bg-slate-700" />}
              </p>
            )}
          </div>
        </div>
      </div>
      
      {/* Add to Cart Button - appears on hover with sunfire accent */}
      <div className="absolute bottom-0 left-0 right-0 p-6 opacity-0 transition-all duration-300 ease-in-out group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 z-30">
        <div className="relative">
          <div className="absolute inset-0 bg-sunfire-500 opacity-95 rounded-xl shadow-lg shadow-sunfire-500/20"></div>
          <button 
            onClick={handleAddToCart}
            className="relative flex w-full items-center justify-center gap-2 rounded-xl py-3 px-4 text-sm font-semibold text-white transition-all hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-white/40 focus:ring-offset-0 hover:scale-105"
          >
            <ShoppingCart size={16} />
            Dodaj u košaricu
          </button>
        </div>
      </div>
    </Link>
  );
};
