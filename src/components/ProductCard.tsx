'use client';

import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { ShoppingCart } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Category, Product } from '@/generated/prisma/client';
import { useCart } from '@/context/CartContext';
import { formatPrice, resolveProductImage } from '@/lib/utils';
import { fbEvent } from '@/lib/fbPixel';
import ProductEngineSummary from '@/components/ProductEngineSummary';

interface ProductCardProps {
  product: Product & { category: Category | null } & { originalPrice?: number; pricingSource?: 'FEATURED' | 'B2B' | 'BASE' };
  compact?: boolean;
}

export const ProductCard = ({ product, compact = false }: ProductCardProps) => {
  const { addToCart } = useCart();
  const [isMounted, setIsMounted] = useState(false);
  
  // Koristimo originalPrice iz produkta ako postoji (postavljen na serveru)
  const hasDiscount = !!product.originalPrice;
  const originalPrice = product.originalPrice;
  const discountedPrice = product.price;
  const discountLabel = hasDiscount ? (product.pricingSource === 'FEATURED' ? 'Akcija' : 'B2B cijena') : undefined;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const imageUrl = resolveProductImage(product.imageUrl, product.category?.imageUrl);

  const handleAddToCart = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product);
    toast.success(`${product.name} je dodan u košaricu!`);
    fbEvent('AddToCart', {
      content_ids: [product.id],
      content_type: 'product',
      currency: 'BAM',
      value: Number(product.price) || 0,
      contents: [
        {
          id: product.id,
          quantity: 1,
          item_price: Number(product.price) || 0,
        },
      ],
    });
  };

  return (
    <Link 
      href={`/products/${product.id}`} 
      className="group relative block overflow-hidden rounded-2xl transition-all duration-300 ease-in-out hover:-translate-y-2 hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B35]"
    >
      <div className="relative rounded-2xl bg-white/90 backdrop-blur-sm border border-white/60 shadow-lg hover:shadow-2xl transition-all duration-300">
        {/* Glow effect on hover */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-[#FF6B35] rounded-2xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300 -z-10" />
      
      {/* Product image */}
      <div className="relative aspect-square w-full overflow-hidden rounded-t-2xl z-20 bg-slate-50">
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/10 to-transparent z-10"></div>
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
            <span className="bg-gradient-to-r from-[#E85A28] to-[#FF6B35] text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-xl animate-pulse">
              {discountLabel}
            </span>
          </div>
        )}
        
        {/* Shine effect on hover */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 z-10" />
      </div>
      
      {/* Product info */}
      <div className={`relative z-20 flex flex-col flex-grow ${compact ? 'p-3' : 'p-5'}`}>
        <h3 className={`font-bold text-primary mb-2 line-clamp-2 group-hover:text-primary-dark transition-colors ${compact ? 'text-xs' : 'text-sm'}`} title={product.name}>
          {product.name}
        </h3>
        
        {!compact && product?.category && (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-white/80 backdrop-blur-sm border border-white/60 rounded-full px-3 py-1.5 mb-3 shadow-sm w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-[#E85A28] to-[#FF6B35]"></span>
            {product.category.name}
          </span>
        )}

        {!compact && product?.oemNumber && (
          <div className="mb-3">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold bg-gradient-to-r from-primary/10 to-primary-dark/10 backdrop-blur-sm border border-primary/30 rounded-xl px-3 py-1.5 shadow-sm">
              <span className="text-primary text-[10px] uppercase tracking-wider">OEM</span>
              <span className="font-mono tracking-tight text-primary">{product.oemNumber}</span>
            </div>
          </div>
        )}

        {/* Compact engine summary with hover mini-modal */}
        {!compact && <ProductEngineSummary productId={product.id} maxInline={2} />}

        <div className={`flex items-end justify-between mt-auto border-t border-slate-200/60 ${compact ? 'pt-2' : 'pt-4'}`}>
          <div>
            {/* Cijena s novim dizajnom */}
            {(hasDiscount || product.originalPrice) ? (
              <div className="flex flex-col">
                <p className={`line-through text-slate-500 ${compact ? 'text-xs mb-0.5' : 'text-sm mb-1'}`}>
                  {isMounted ? formatPrice(originalPrice || product.originalPrice || product.price) : <span className="block h-4 w-16 animate-pulse rounded-md bg-slate-200" />}
                </p>
                <p className={`font-extrabold bg-gradient-to-r from-[#E85A28] to-[#FF6B35] bg-clip-text text-transparent tracking-tight ${compact ? 'text-lg' : 'text-2xl'}`}>
                  {isMounted ? formatPrice(hasDiscount ? discountedPrice : product.price) : <span className="block h-7 w-24 animate-pulse rounded-md bg-slate-200" />}
                </p>
              </div>
            ) : (
              <p className={`font-extrabold bg-gradient-to-r from-[#E85A28] to-[#FF6B35] bg-clip-text text-transparent tracking-tight ${compact ? 'text-lg' : 'text-2xl'}`}>
                {isMounted ? formatPrice(product.price) : <span className="block h-7 w-24 animate-pulse rounded-md bg-slate-200" />}
              </p>
            )}
          </div>
        </div>
      </div>
      
      {/* Add to Cart Button - appears on hover with navy gradient */}
      <div className={`absolute bottom-0 left-0 right-0 opacity-0 transition-all duration-300 ease-in-out group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 z-30 ${compact ? 'p-3' : 'p-5'}`}>
        <button 
          onClick={handleAddToCart}
          className={`flex w-full items-center justify-center gap-2 rounded-xl font-bold text-white bg-gradient-to-r from-primary via-primary-dark to-primary shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-white/40 ${compact ? 'py-2 px-3 text-xs' : 'py-3 px-4 text-sm'}`}
        >
          <ShoppingCart size={compact ? 14 : 18} />
          {compact ? 'Dodaj' : 'Dodaj u košaricu'}
        </button>
      </div>
      </div>
    </Link>
  );
};
