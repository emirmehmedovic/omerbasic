"use client";

import { useEffect, useMemo, useState } from "react";
import { ProductCard } from "./ProductCard";
import { LayoutGrid, List } from "lucide-react";
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { toast } from 'react-hot-toast';

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
  engineId?: string;
  minPrice?: string;
  maxPrice?: string;
  q?: string;
  [key: string]: any;
};

interface Props {
  filters: ProductFilters;
}

export default function ProductsResults({ filters }: Props) {
  const [view, setView] = useState<'grid' | 'list'>('list');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const PAGE_SIZE = 24;
  const { addToCart } = useCart();

  const baseParams = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.categoryId) params.set("categoryId", String(filters.categoryId));
    if (filters.generationId) params.set("generationId", String(filters.generationId));
    if (filters.engineId) params.set("engineId", String(filters.engineId));
    if (filters.minPrice) params.set("minPrice", String(filters.minPrice));
    if (filters.maxPrice) params.set("maxPrice", String(filters.maxPrice));
    if (filters.q) params.set("q", String(filters.q));
    return params;
  }, [filters]);

  const fetchPage = async (cursor: string | null, append: boolean) => {
    const params = new URLSearchParams(baseParams.toString());
    params.set('limit', String(PAGE_SIZE));
    if (cursor) params.set('cursor', cursor);
    const url = `/api/products?${params.toString()}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Greška pri dohvaćanju proizvoda (${res.status})`);
    const newCursor = res.headers.get('X-Next-Cursor');
    const data: Product[] = await res.json();
    setHasMore(Boolean(newCursor));
    setNextCursor(newCursor);
    setProducts(prev => append ? [...prev, ...data] : data);
  };

  // Reset and load first page when filters change
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        await fetchPage(null, false);
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Greška pri učitavanju proizvoda');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseParams.toString()]);

  const loadMore = async () => {
    setLoadingMore(true);
    setError(null);
    try {
      await fetchPage(nextCursor, true);
    } catch (e: any) {
      setError(e.message || 'Greška pri učitavanju proizvoda');
    } finally {
      setLoadingMore(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-t from-black/60 to-transparent p-8 rounded-2xl border border-sunfire-500/30 shadow-lg shadow-sunfire-500/10">
        <div className="flex items-center justify-center mb-6">
          <div className="bg-sunfire-500/10 p-3 rounded-xl mr-4">
            <div className="animate-spin w-6 h-6 border-2 border-sunfire-400 border-t-transparent rounded-full"></div>
          </div>
          <p className="text-lg text-white font-medium">Proizvodi se učitavaju...</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array(8)
            .fill(0)
            .map((_, index) => (
              <div
                key={index}
                className="bg-slate-900/50 rounded-2xl p-5 transition-all duration-300 animate-scale-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="animate-pulse">
                  <div className="h-44 bg-slate-800 rounded-xl mb-4"></div>
                  <div className="h-5 w-3/4 bg-slate-800 rounded-lg mb-3"></div>
                  <div className="h-4 w-1/2 bg-slate-800 rounded-lg mb-3"></div>
                  <div className="h-7 w-1/3 bg-sunfire-500/20 rounded-lg"></div>
                </div>
              </div>
            ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/50 border border-red-500/50 text-red-300 rounded-xl p-8">
        <div className="flex items-center justify-center">
          <div className="bg-red-500/10 p-3 rounded-xl mr-4">
            <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-lg font-medium">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-t from-black/60 to-transparent p-8 rounded-2xl border border-sunfire-500/30 shadow-lg shadow-sunfire-500/10">
      {products.length === 0 ? (
        <div className="text-center py-12">
          <div className="bg-sunfire-500/10 p-4 rounded-xl inline-flex mb-4">
            <svg className="w-8 h-8 text-sunfire-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <p className="text-lg text-slate-300 font-medium">Nema proizvoda za odabrane filtere</p>
          <p className="text-sm text-slate-400 mt-2">Pokušajte promijeniti filtere ili kategoriju</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">
              Pronađeno {products.length} proizvoda
            </h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center text-sm text-sunfire-300">
                <div className="w-2 h-2 rounded-full mr-2 bg-sunfire-400"></div>
                Rezultati pretrage
              </div>
              <div className="flex items-center gap-1 rounded-lg bg-slate-900/50 p-1 border border-slate-700">
                <button onClick={() => setView('grid')} className={`p-1.5 rounded-md transition-colors ${view === 'grid' ? 'bg-sunfire-500 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                  <LayoutGrid className="h-5 w-5" />
                </button>
                <button onClick={() => setView('list')} className={`p-1.5 rounded-md transition-colors ${view === 'list' ? 'bg-sunfire-500 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                  <List className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
          {view === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((p, index) => (
                <div
                  key={p.id}
                  className="animate-scale-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <ProductCard product={p as any} />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {products.map((p, index) => (
                <Link
                  href={`/products/${p.id}`}
                  key={p.id}
                  className="animate-fade-in flex flex-col sm:flex-row sm:items-center bg-gradient-to-br from-slate-900 to-slate-950 p-4 rounded-lg border border-transparent hover:border-sunfire-500/50 transition-all duration-300 hover:scale-[1.02]"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="relative w-full sm:w-24 h-32 sm:h-24 flex-shrink-0 mb-4 sm:mb-0 sm:mr-6">
                    <Image 
                      src={p.imageUrl || '/images/mockup.png'} 
                      alt={p.name} 
                      layout="fill"
                      className="object-cover rounded-md" 
                    />
                  </div>
                  <div className="flex-grow">
                    <p className="text-sm text-sunfire-300 mb-1">{p.category?.name || 'Kategorija'}</p>
                    <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">{p.name}</h3>
                  </div>
                  <div className="text-left sm:text-right w-full sm:w-48 flex-shrink-0 mt-4 sm:mt-0 sm:ml-6">
                    <p className="text-xl font-bold text-sunfire-400 mb-3">{p.price.toFixed(2)} BAM</p>
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        addToCart(p as any);
                        toast.success(`${p.name} je dodan u košaricu!`);
                      }}
                      className="bg-sunfire-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-sunfire-600 transition-colors w-full"
                    >
                      Dodaj u košaricu
                    </button>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {hasMore && (
            <div className="mt-8 flex justify-center">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className={`px-5 py-2.5 rounded-md text-sm font-semibold border transition-colors ${loadingMore ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-sunfire-500 text-white border-sunfire-500 hover:bg-sunfire-600'}`}
              >
                {loadingMore ? 'Učitavanje…' : 'Učitaj više'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
