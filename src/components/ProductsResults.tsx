"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ProductCard } from "./ProductCard";
import { LayoutGrid, List } from "lucide-react";
import ProductEngineSummary from '@/components/ProductEngineSummary';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { toast } from 'react-hot-toast';
import { resolveProductImage } from '@/lib/utils';
import { fbEvent } from '@/lib/fbPixel';

// Minimal type aligned with API include
type Category = {
  id: string;
  name: string;
  imageUrl?: string | null;
};

type Product = {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  categoryId: string;
  category: Category | null;
  categoryImageUrl?: string | null;
  originalPrice?: number;
  pricingSource?: 'FEATURED' | 'B2B' | 'BASE';
  oemNumber?: string | null;
  stock?: number;
};

export type ProductFilters = {
  categoryId?: string;
  generationId?: string;
  engineId?: string;
  minPrice?: string;
  maxPrice?: string;
  q?: string;
  page?: string | number;
  [key: string]: any;
};

interface Props {
  filters: ProductFilters;
  onClearAll?: () => void;
  onPageChange?: (page: number) => void;
  onQueryChange?: (query: string) => void;
}

export default function ProductsResults({ filters, onClearAll, onPageChange, onQueryChange }: Props) {
  const [view, setView] = useState<'grid' | 'list'>('list');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [localQuery, setLocalQuery] = useState<string>("");
  const [page, setPage] = useState<number>(() => {
    const initial = parseInt(String(filters.page ?? '1'), 10);
    return Number.isFinite(initial) && initial > 0 ? initial : 1;
  });
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const PAGE_SIZE = 24;
  const { addToCart } = useCart();

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('bs-BA', { style: 'currency', currency: 'BAM' }).format(price);

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

  const paramsString = baseParams.toString();
  const prevParamsStringRef = useRef<string | null>(null);

  useEffect(() => {
    const prev = prevParamsStringRef.current;
    // Preskoči inicijalno učitavanje i situacije kada se paramsString nije promijenio
    if (prev !== null && prev !== paramsString) {
      setPage(1);
    }
    prevParamsStringRef.current = paramsString;
  }, [paramsString]);

  const fetchPagedResults = async (pageNumber: number) => {
    const params = new URLSearchParams(paramsString);
    params.set('limit', String(PAGE_SIZE));
    params.set('page', String(pageNumber));
    const url = `/api/products?${params.toString()}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Greška pri dohvaćanju proizvoda (${res.status})`);
    const totalPagesHeader = res.headers.get('X-Total-Pages');
    const totalCountHeader = res.headers.get('X-Total-Count');
    const items: Product[] = await res.json();
    return {
      items,
      totalPages: Math.max(parseInt(totalPagesHeader || '1', 10) || 1, 1),
      totalCount: parseInt(totalCountHeader || String(items.length), 10) || items.length,
    };
  };

  // Fetch whenever filters or page change
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const { items, totalPages: total, totalCount: count } = await fetchPagedResults(page);
        if (cancelled) return;
        if (page > total && total > 0) {
          setPage(total);
          return;
        }
        const normalized = items.map((item) => ({
          ...item,
          categoryImageUrl: (item as any).categoryImageUrl ?? item.category?.imageUrl ?? null,
          category: item.category ? { ...item.category, imageUrl: item.category?.imageUrl ?? ((item as any).categoryImageUrl ?? null) } : item.category,
        }));
        setProducts(normalized);
        setTotalPages(total);
        setTotalCount(count);
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Greška pri učitavanju proizvoda');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [page, paramsString]);

  // Sinkronizuj input s backend q parametrom
  useEffect(() => {
    setLocalQuery(filters.q ? String(filters.q) : "");
  }, [filters.q]);

  // Prikazani proizvodi su oni koje vrati backend (q je već primijenjen u API-ju)
  const displayed = products;

  const handleChangePage = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages || nextPage === page) return;
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (onPageChange) {
      onPageChange(nextPage);
    }
  };

  const pageNumbers = useMemo(() => {
    if (totalPages <= 1) return [] as number[];
    const delta = 2;
    let start = Math.max(1, page - delta);
    let end = Math.min(totalPages, page + delta);
    if (page <= delta) {
      end = Math.min(totalPages, 1 + delta * 2);
    }
    if (page > totalPages - delta) {
      start = Math.max(1, totalPages - delta * 2);
    }
    const numbers: number[] = [];
    for (let i = start; i <= end; i++) numbers.push(i);
    if (!numbers.includes(1)) numbers.unshift(1);
    if (!numbers.includes(totalPages)) numbers.push(totalPages);
    return Array.from(new Set(numbers)).sort((a, b) => a - b);
  }, [page, totalPages]);

  if (loading) {
    return (
      <div className="relative overflow-hidden rounded-3xl p-8 bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 shadow-xl">
        <div className="pointer-events-none absolute inset-0 z-0 opacity-[0.04]"
             style={{
               backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(27,58,95,0.2) 1px, transparent 0), radial-gradient(circle at 50% 50%, rgba(255,107,53,0.08) 0%, transparent 70%)',
               backgroundSize: '32px 32px, 100% 100%'
             }} />
        <div className="relative z-10">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-gradient-to-br from-[#E85A28] to-[#FF6B35] p-4 rounded-2xl shadow-xl mr-4">
              <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full"></div>
            </div>
            <p className="text-lg text-primary font-bold">Proizvodi se učitavaju...</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array(8)
              .fill(0)
              .map((_, index) => (
                <div
                  key={index}
                  className="bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl p-5 shadow-lg transition-all duration-300 animate-scale-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="animate-pulse">
                    <div className="h-44 bg-slate-100 rounded-xl mb-4"></div>
                    <div className="h-5 w-3/4 bg-slate-100 rounded-lg mb-3"></div>
                    <div className="h-4 w-1/2 bg-slate-100 rounded-lg mb-3"></div>
                    <div className="h-7 w-1/3 bg-gradient-to-r from-[#E85A28] to-[#FF6B35] opacity-20 rounded-lg"></div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative overflow-hidden rounded-3xl p-8 bg-gradient-to-br from-red-50 via-red-100 to-red-200 shadow-xl border border-red-300">
        <div className="pointer-events-none absolute inset-0 z-0 opacity-[0.04]"
             style={{
               backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(220,38,38,0.2) 1px, transparent 0), radial-gradient(circle at 50% 50%, rgba(220,38,38,0.08) 0%, transparent 70%)',
               backgroundSize: '32px 32px, 100% 100%'
             }} />
        <div className="relative z-10 flex items-center justify-center">
          <div className="bg-gradient-to-br from-red-500 to-red-600 p-4 rounded-2xl shadow-xl mr-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-lg font-bold text-red-900">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-3xl p-8 bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 shadow-xl">
      <div className="pointer-events-none absolute inset-0 z-0 opacity-[0.04]"
           style={{
             backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(27,58,95,0.2) 1px, transparent 0), radial-gradient(circle at 50% 50%, rgba(255,107,53,0.08) 0%, transparent 70%)',
             backgroundSize: '32px 32px, 100% 100%'
           }} />
      <div className="relative z-10">
      {products.length === 0 ? (
        <div className="text-center py-12">
          <div className="bg-gradient-to-br from-[#E85A28] to-[#FF6B35] p-4 rounded-2xl shadow-xl inline-flex mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <p className="text-lg text-primary font-bold">Nema proizvoda za odabrane filtere</p>
          <p className="text-sm text-slate-600 mt-2">Pokušajte promijeniti filtere ili kategoriju</p>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] items-start gap-4">
              {/* Left: count + search */}
              <div className="min-w-[280px]">
                <div className="">
                  <div className="relative flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-white/60 rounded-xl px-2 py-2 shadow-lg">
                  <input
                    type="text"
                    value={localQuery}
                    onChange={(e) => setLocalQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && onQueryChange) {
                        const q = localQuery.trim();
                        onQueryChange(q);
                      }
                    }}
                    placeholder="Pretraži po imenu, OEM broju i kataloškom broju…"
                    className="h-9 w-80 sm:w-96 max-w-[80vw] rounded-xl border border-white/40 bg-white/90 backdrop-blur-sm pl-8 pr-16 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35] transition-all duration-300"
                  />
                  <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#FF6B35]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z" />
                  </svg>
                  {localQuery && (
                    <button
                      type="button"
                      aria-label="Očisti"
                      className="absolute right-12 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-800 transition-colors"
                      onClick={() => {
                      setLocalQuery("");
                      if (onQueryChange) onQueryChange("");
                    }}
                    >
                      ×
                    </button>
                  )}
                  <button
                    type="button"
                    className="h-9 px-3 rounded-xl bg-gradient-to-r from-primary via-primary-dark to-primary hover:shadow-2xl text-white text-sm font-bold shadow-xl transform hover:-translate-y-0.5 transition-all duration-300"
                    onClick={() => {
                      if (onQueryChange) {
                        onQueryChange(localQuery.trim());
                      }
                    }}
                  >
                    Pretraži
                  </button>
                  </div>
                  <div className="mt-2">
                    <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white/70 backdrop-blur-sm border border-white/60 text-[12px] text-slate-700 shadow-sm">
                      <svg className="h-4 w-4 text-[#FF6B35]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <circle cx="12" cy="12" r="10" strokeWidth="2" />
                        <path d="M12 8h.01" strokeWidth="2" strokeLinecap="round" />
                        <path d="M11 12h1v4h1" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                      Pretražuje proizvode unutar odabranih filtera; pritisnite Enter ili kliknite Pretraži za primjenu.
                    </span>
                  </div>
                </div>
                <h2 className="mt-3 text-2xl font-bold text-primary">Pronađeno {totalCount} proizvoda</h2>
              </div>

              {/* Right: label + clear + view toggle */}
              <div className="flex items-center justify-end gap-3">
                <div className="hidden md:flex items-center text-sm text-slate-700 font-medium">
                  <div className="w-2 h-2 rounded-full mr-2 bg-gradient-to-r from-[#E85A28] to-[#FF6B35]"></div>
                  Rezultati pretrage
                </div>
                {onClearAll && (
                  <button
                    type="button"
                    onClick={onClearAll}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#E85A28] to-[#FF6B35] hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 shadow-lg"
                  >
                    Očisti sve
                  </button>
                )}
                <div className="flex items-center gap-1 rounded-xl bg-white/80 backdrop-blur-sm p-1 border border-white/60 shadow-lg">
                  <button onClick={() => setView('grid')} className={`p-2 rounded-lg transition-all duration-300 ${view === 'grid' ? 'bg-gradient-to-r from-primary via-primary-dark to-primary text-white shadow-xl' : 'text-slate-600 hover:bg-white/80 hover:text-slate-900'}`}>
                    <LayoutGrid className="h-5 w-5" />
                  </button>
                  <button onClick={() => setView('list')} className={`p-2 rounded-lg transition-all duration-300 ${view === 'list' ? 'bg-gradient-to-r from-primary via-primary-dark to-primary text-white shadow-xl' : 'text-slate-600 hover:bg-white/80 hover:text-slate-900'}`}>
                    <List className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
          {view === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayed.map((p, index) => (
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
              {displayed.map((p, index) => (
                <Link
                  href={`/products/${p.id}`}
                  key={p.id}
                  className="animate-fade-in flex flex-col sm:flex-row sm:items-center bg-white/80 backdrop-blur-sm border border-white/60 p-5 rounded-2xl shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="relative w-full sm:w-24 h-32 sm:h-24 flex-shrink-0 mb-4 sm:mb-0 sm:mr-6">
                    <Image 
                      src={resolveProductImage(p.imageUrl, p.category?.imageUrl ?? p.categoryImageUrl ?? null)} 
                      alt={p.name} 
                      fill
                      className="object-cover rounded-md" 
                    />
                  </div>
                  <div className="flex-grow">
                    <p className="text-sm text-slate-600 mb-1">{p.category?.name || 'Kategorija'}</p>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2 line-clamp-2">{p.name}</h3>
                    {p.oemNumber && (
                      <div className="mb-1">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-white/70 backdrop-blur-sm border border-white/60 rounded-lg px-2 py-0.5 shadow-sm">
                          <span className="text-slate-500">OEM</span>
                          <span className="font-mono tracking-tight text-slate-700">{p.oemNumber}</span>
                        </span>
                      </div>
                    )}
                    <ProductEngineSummary productId={p.id} maxInline={3} />
                  </div>
                  <div className="text-left sm:text-right w-full sm:w-48 flex-shrink-0 mt-4 sm:mt-0 sm:ml-6">
                    {p.originalPrice ? (
                      <div className="flex flex-col items-start sm:items-end">
                        <div className="mb-1">
                          <span className="bg-gradient-to-r from-[#E85A28] to-[#FF6B35] text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg">
                            {p.pricingSource === 'FEATURED' ? 'Akcija' : 'B2B cijena'}
                          </span>
                        </div>
                        <p className="text-sm line-through text-slate-500">{formatPrice(p.originalPrice)}</p>
                        <p className="text-xl font-bold bg-gradient-to-r from-[#E85A28] to-[#FF6B35] bg-clip-text text-transparent">{formatPrice(p.price)}</p>
                      </div>
                    ) : (
                      <p className="text-xl font-bold bg-gradient-to-r from-[#E85A28] to-[#FF6B35] bg-clip-text text-transparent mb-3">{formatPrice(p.price)}</p>
                    )}
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        addToCart(p as any);
                        toast.success(`${p.name} je dodan u košaricu!`);
                        fbEvent('AddToCart', {
                          content_ids: [p.id],
                          content_type: 'product',
                          currency: 'BAM',
                          value: Number(p.price) || 0,
                          contents: [
                            {
                              id: p.id,
                              quantity: 1,
                              item_price: Number(p.price) || 0,
                            },
                          ],
                        });
                      }}
                      className="bg-gradient-to-r from-primary via-primary-dark to-primary text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:shadow-2xl transform hover:-translate-y-0.5 transition-all duration-300 shadow-xl w-full"
                    >
                      Dodaj u košaricu
                    </button>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-8 flex flex-col items-center gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleChangePage(page - 1)}
                  disabled={page <= 1}
                  className={`px-4 py-2 rounded-xl border text-sm font-bold transition-all duration-300 ${page <= 1 ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-white/80 backdrop-blur-sm text-primary border-white/60 shadow-lg hover:shadow-xl hover:-translate-y-0.5'}`}
                >
                  ← Prethodna
                </button>
                <div className="flex items-center gap-1">
                  {pageNumbers.map((num, idx) => {
                    const prev = pageNumbers[idx - 1];
                    const needsEllipsis = idx > 0 && num - prev! > 1;
                    return (
                      <span key={`${num}-${idx}`} className="flex items-center">
                        {needsEllipsis && <span className="px-1 text-slate-400">…</span>}
                        <button
                          type="button"
                          onClick={() => handleChangePage(num)}
                          className={`px-4 py-2 rounded-xl border text-sm font-bold transition-all duration-300 ${num === page ? 'bg-gradient-to-r from-primary to-primary-dark text-white border-primary shadow-xl' : 'bg-white/80 backdrop-blur-sm text-slate-700 border-white/60 shadow-lg hover:shadow-xl hover:-translate-y-0.5'}`}
                        >
                          {num}
                        </button>
                      </span>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => handleChangePage(page + 1)}
                  disabled={page >= totalPages}
                  className={`px-4 py-2 rounded-xl border text-sm font-bold transition-all duration-300 ${page >= totalPages ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-white/80 backdrop-blur-sm text-primary border-white/60 shadow-lg hover:shadow-xl hover:-translate-y-0.5'}`}
                >
                  Sljedeća →
                </button>
              </div>
              <p className="text-sm text-slate-700 font-medium">Stranica {page} od {totalPages} &middot; Prikazano {displayed.length} / {totalCount}</p>
            </div>
          )}
        </>
      )}
      </div>
    </div>
  );
}
