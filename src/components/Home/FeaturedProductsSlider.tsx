'use client';

import React from 'react';
import { ProductCard } from '@/components/ProductCard';
import type { Product } from '@/generated/prisma/client';

interface FeaturedProductsSliderProps {
  products: Product[];
}

function AutoScrollRow({ items, speed = 60 }: { items: Product[]; speed?: number }) {
  if (!items.length) return null;

  const row = (
    <div className="flex gap-4 px-1">
      {items.map((product) => (
        <div key={`card-${product.id}`} className="w-[220px] sm:w-[240px] md:w-[260px] flex-shrink-0">
          <ProductCard product={product as any} />
        </div>
      ))}
    </div>
  );

  return (
    <div className="overflow-hidden relative">
      <div className="marquee flex" style={{ ['--duration' as any]: `${speed}s` }}>
        {row}
        {row}
      </div>
      <style jsx>{`
        .marquee {
          width: max-content;
          animation: scroll-left var(--duration) linear infinite;
        }
        @keyframes scroll-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

export function FeaturedProductsSlider({ products }: FeaturedProductsSliderProps) {
  if (!products || products.length === 0) return null;

  return (
    <section className="relative mb-20">
      <div className="relative overflow-hidden rounded-3xl p-6 md:p-8 bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 shadow-xl">
        <div
          className="pointer-events-none absolute inset-0 z-0 opacity-[0.04]"
          style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(27,58,95,0.2) 1px, transparent 0), radial-gradient(circle at 50% 50%, rgba(255,107,53,0.08) 0%, transparent 70%)',
            backgroundSize: '32px 32px, 100% 100%'
          }}
        />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-primary font-extrabold text-2xl">Preporučeni proizvodi</h3>
            <div className="px-3 py-1.5 rounded-full bg-gradient-to-r from-sunfire-600 to-sunfire-500 text-white text-xs font-bold shadow-lg">{products.length} proizvoda</div>
          </div>
          <AutoScrollRow items={products.slice(0, 12)} speed={60} />
        </div>
      </div>
    </section>
  );
}
