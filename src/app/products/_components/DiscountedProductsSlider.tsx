"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ProductCard } from "@/components/ProductCard";

type FeaturedProduct = {
  id: string;
  productId: string;
  isActive: boolean;
  displayOrder: number;
  customTitle?: string;
  customImageUrl?: string;
  product: any; // we pass straight into ProductCard; it tolerates missing category
};

function AutoScrollRow({ items, speed = 60 }: { items: FeaturedProduct[]; speed?: number }) {
  if (!items.length) return null;
  // Duplicate content to create a seamless loop
  const row = (
    <div className="flex gap-4 px-1">
      {items.map((fp) => (
        <div key={`card-${fp.id}`} className="w-[220px] sm:w-[240px] md:w-[260px] flex-shrink-0">
          <ProductCard product={fp.product} />
        </div>
      ))}
    </div>
  );

  // Using styled-jsx for keyframes local to this component
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

export default function DiscountedProductsSlider() {
  const [items, setItems] = useState<FeaturedProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/featured-products");
        if (res.ok) {
          const data: FeaturedProduct[] = await res.json();
          const active = data.filter((d) => d.isActive && d.product);
          if (mounted) setItems(active);
        }
      } catch (e) {
        // silent
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 shadow-xl">
        <div className="pointer-events-none absolute inset-0 z-0 opacity-[0.04]"
             style={{
               backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(27,58,95,0.2) 1px, transparent 0), radial-gradient(circle at 50% 50%, rgba(255,107,53,0.08) 0%, transparent 70%)',
               backgroundSize: '32px 32px, 100% 100%'
             }} />
        <div className="relative z-10">
          <div className="animate-pulse h-6 w-40 bg-white/70 backdrop-blur-sm rounded-xl mb-4 shadow-sm" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-72 rounded-2xl bg-white/70 backdrop-blur-sm border border-white/60 shadow-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) return null;

  // Single row with all featured products auto-scrolling
  return (
    <div className="relative overflow-hidden rounded-3xl p-6 md:p-8 bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 shadow-xl">
      <div className="pointer-events-none absolute inset-0 z-0 opacity-[0.04]"
           style={{
             backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(27,58,95,0.2) 1px, transparent 0), radial-gradient(circle at 50% 50%, rgba(255,107,53,0.08) 0%, transparent 70%)',
             backgroundSize: '32px 32px, 100% 100%'
           }} />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-primary font-extrabold text-2xl">Istaknuti proizvodi</h3>
          <div className="px-3 py-1.5 rounded-full bg-gradient-to-r from-[#E85A28] to-[#FF6B35] text-white text-xs font-bold shadow-lg">{items.length} proizvoda</div>
        </div>
        <AutoScrollRow items={items} speed={60} />
      </div>
    </div>
  );
}
