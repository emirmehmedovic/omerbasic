"use client";

import { useEffect, useMemo, useState } from "react";
import { ProductCard } from "./ProductCard";

// Minimal type aligned with API include
type Category = {
  id: string;
  name: string;
};

type Product = {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  categoryId: string;
  category: Category | null;
  originalPrice?: number;
};

export type ProductFilters = {
  categoryId?: string;
  generationId?: string;
  minPrice?: string;
  maxPrice?: string;
  q?: string;
  [key: string]: any;
};

interface Props {
  filters: ProductFilters;
}

export default function ProductsResults({ filters }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.categoryId) params.set("categoryId", String(filters.categoryId));
    if (filters.generationId) params.set("generationId", String(filters.generationId));
    if (filters.minPrice) params.set("minPrice", String(filters.minPrice));
    if (filters.maxPrice) params.set("maxPrice", String(filters.maxPrice));
    if (filters.q) params.set("q", String(filters.q));
    return params.toString();
  }, [filters]);

  useEffect(() => {
    let isCancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const url = queryString ? `/api/products?${queryString}` : "/api/products";
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Greška pri dohvaćanju proizvoda (${res.status})`);
        const data = await res.json();
        if (!isCancelled) setProducts(data as Product[]);
      } catch (e: any) {
        if (!isCancelled) setError(e.message || "Greška pri učitavanju proizvoda");
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }
    load();
    return () => {
      isCancelled = true;
    };
  }, [queryString]);

  if (loading) {
    return (
      <div className="bg-white/50 backdrop-blur-md rounded-xl p-6 shadow-md border border-white/30">
        <p className="text-center text-slate-600">Proizvodi se učitavaju...</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-6">
          {Array(8)
            .fill(0)
            .map((_, index) => (
              <div key={index} className="bg-white/70 rounded-lg p-4 shadow-sm border border-white/50">
                <div className="animate-pulse">
                  <div className="h-40 bg-slate-200 rounded-md mb-4"></div>
                  <div className="h-4 w-3/4 bg-slate-200 rounded mb-3"></div>
                  <div className="h-3 w-1/2 bg-slate-200 rounded mb-3"></div>
                  <div className="h-6 w-1/3 bg-slate-200 rounded"></div>
                </div>
              </div>
            ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white/50 backdrop-blur-md rounded-xl p-6 shadow-md border border-white/30">
        <p className="text-center text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white/50 backdrop-blur-md rounded-xl p-6 shadow-md border border-white/30">
      {products.length === 0 ? (
        <p className="text-center text-slate-600">Nema proizvoda za odabrane filtere.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((p) => (
            <ProductCard key={p.id} product={p as any} />
          ))}
        </div>
      )}
    </div>
  );
}
