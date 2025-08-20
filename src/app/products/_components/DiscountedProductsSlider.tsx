"use client";

import React, { useEffect, useMemo, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
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

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function CategorySlider({ title, items }: { title: string; items: FeaturedProduct[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, inViewThreshold: 0.5 });

  const slides = useMemo(() => chunk(items, 12), [items]);

  useEffect(() => {
    if (!emblaApi) return;
    const interval = setInterval(() => emblaApi.scrollNext(), 4000);
    return () => clearInterval(interval);
  }, [emblaApi]);

  if (items.length === 0) return null;

  return (
    <div className="rounded-2xl p-4 bg-gradient-to-t from-black/60 to-transparent border border-white/10">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold text-lg">Akcija na {title}</h3>
        <div className="text-xs text-slate-400">{items.length} proizvoda</div>
      </div>
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {slides.map((group, idx) => (
            <div key={idx} className="flex-[0_0_100%] px-1">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {group.map((fp) => (
                  <ProductCard key={fp.id} product={fp.product} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
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

  return (
    <div className="space-y-6">
      {byCategory.map(([cat, arr]) => (
        <CategorySlider key={cat} title={cat} items={arr} />
      ))}
    </div>
  );
}
