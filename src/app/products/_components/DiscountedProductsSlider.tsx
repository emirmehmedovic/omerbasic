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

  // Grupiranje po kategoriji
  const byCategory = useMemo(() => {
    const map = new Map<string, FeaturedProduct[]>();
    for (const it of items) {
      const title = it.product?.category?.name || "Bez kategorije";
      if (!map.has(title)) map.set(title, []);
      map.get(title)!.push(it);
    }
    return Array.from(map.entries());
  }, [items]);

  if (loading) {
    return (
      <div className="rounded-2xl p-6 bg-gradient-to-t from-black/60 to-transparent border border-white/10">
        <div className="animate-pulse h-6 w-40 bg-slate-700 rounded mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-72 rounded-2xl bg-slate-800/60 border border-slate-700" />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) return null;

  // Single block containing all categories as separate horizontally auto-scrolling rows
  return (
    <div className="rounded-2xl p-4 md:p-6 bg-gradient-to-t from-black/60 to-transparent border border-white/10">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold text-lg">Istaknuti proizvodi</h3>
        <div className="text-xs text-slate-400">{items.length} proizvoda</div>
      </div>
      <div className="space-y-6">
        {byCategory.map(([cat, arr], idx) => (
          <div key={cat}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-white/90">{cat}</div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400">{arr.length} kom</div>
            </div>
            <AutoScrollRow items={arr} speed={45 + Math.min(30, Math.max(0, 12 - Math.floor(arr.length / 2)))} />
            {idx < byCategory.length - 1 && (
              <div className="border-t border-white/10 mt-4" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
