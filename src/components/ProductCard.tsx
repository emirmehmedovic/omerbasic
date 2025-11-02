'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { Category, Product } from '@/generated/prisma/client';
import ProductEngineSummary from '@/components/ProductEngineSummary';
import { useSession } from 'next-auth/react';
import { useCart } from '@/context/CartContext';
import { toast } from 'react-hot-toast';
import { ShoppingCart } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ProductCardProps {
  product: Product & { category: Category | null } & { originalPrice?: number; pricingSource?: 'FEATURED' | 'B2B' | 'BASE' };
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
  const discountLabel = hasDiscount ? (product.pricingSource === 'FEATURED' ? 'Akcija' : 'B2B cijena') : undefined;

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
      className="group relative block overflow-hidden rounded-2xl p-[1px] bg-gradient-to-br from-sunfire-200/60 to-transparent transition-transform duration-300 ease-in-out hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-sunfire-300/60"
    >
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-lg transition-shadow duration-300">
      {/* Frosted glass handled by utility classes */}
      
      {/* Product image */}
      <div className="relative aspect-square w-full overflow-hidden rounded-t-2xl z-20 shadow-inner">
        <div className="absolute inset-0 bg-gradient-to-t from-white/10 to-transparent z-10"></div>
        <Image
          src={imageUrl}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 ease-in-out group-hover:scale-110 group-hover:rotate-[0.25deg] z-0"
        />
        
        {/* Floating badge for discount */}
        {hasDiscount && (
          <div className="absolute top-3 right-3 z-20">
            <span className="bg-sunfire-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg shadow-sunfire-500/20">
              {discountLabel}
            </span>
          </div>
        )}
      </div>
      
      {/* Product info */}
      <div className="relative p-6 z-20 flex flex-col flex-grow">
        <h3 className="text-base font-semibold text-slate-900 mb-1.5 line-clamp-2" title={product.name}>
          {product.name}
        </h3>
        
        {product?.category && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 bg-slate-100 rounded-full px-2 py-0.5 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-sunfire-400"></span>
            {product.category.name}
          </span>
        )}

        {product?.oemNumber && (
          <div className="mb-3">
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-md px-2 py-0.5">
              <span className="text-slate-500">OEM</span>
              <span className="font-mono tracking-tight text-slate-700">{product.oemNumber}</span>
            </span>
          </div>
        )}

        {/* Compact engine summary with hover mini-modal */}
        <ProductEngineSummary productId={product.id} maxInline={2} />

        <div className="flex items-end justify-between mt-auto pt-4 border-t border-slate-100">
          <div>
            {/* Cijena s novim dizajnom */}
            {(hasDiscount || product.originalPrice) ? (
              <div className="flex flex-col">
                <p className="text-sm line-through text-slate-500 mb-1">
                  {isMounted ? formatPrice(originalPrice || product.originalPrice || product.price) : <span className="block h-4 w-16 animate-pulse rounded-md bg-slate-200" />}
                </p>
                <p className="text-2xl font-extrabold text-sunfire-600 tracking-tight">
                  {isMounted ? formatPrice(hasDiscount ? discountedPrice : product.price) : <span className="block h-7 w-24 animate-pulse rounded-md bg-slate-200" />}
                </p>
              </div>
            ) : (
              <p className="text-2xl font-extrabold text-sunfire-600 tracking-tight">
                {isMounted ? formatPrice(product.price) : <span className="block h-7 w-24 animate-pulse rounded-md bg-slate-200" />}
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
      </div>
    </Link>
  );
}
