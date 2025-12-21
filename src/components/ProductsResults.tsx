"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from 'swr';
import { ProductCard } from "./ProductCard";
import { LayoutGrid, List, Loader2 } from "lucide-react";
import ProductBrandSummary from '@/components/ProductBrandSummary';
import ProductOEMSummary from '@/components/ProductOEMSummary';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { toast } from 'react-hot-toast';
import { resolveProductImage } from '@/lib/utils';
import { fbEvent } from '@/lib/fbPixel';

// SWR fetcher that returns data with headers
const productsFetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Greška pri dohvaćanju proizvoda (${res.status})`);
  const totalPagesHeader = res.headers.get('X-Total-Pages');
  const totalCountHeader = res.headers.get('X-Total-Count');
  const noFilterHeader = res.headers.get('X-No-Filter');
  const items = await res.json();
  return {
    items,
    totalPages: Math.max(parseInt(totalPagesHeader || '1', 10) || 1, 1),
    totalCount: parseInt(totalCountHeader || String(items.length), 10) || items.length,
    noFilter: noFilterHeader === 'true',
  };
};

// Minimal type aligned with API include
type Category = {
  id: string;
  name: string;
  imageUrl?: string | null;
};

type Product = {
  id: string;
  slug?: string | null;
  name: string;
  price: number;
  imageUrl: string | null;
  categoryId: string;
  category: Category | null;
  categoryImageUrl?: string | null;
  originalPrice?: number;
  pricingSource?: 'FEATURED' | 'B2B' | 'BASE';
  catalogNumber?: string;
  oemNumber?: string | null;
  tecdocArticleId?: number | null;
  stock?: number;
  isExactMatch?: boolean;
  articleOENumbers?: Array<{ id: string; oemNumber: string; manufacturer: string | null; referenceType: string | null }> | null;
  vehicleFitments?: Array<{
    id: string;
    isUniversal: boolean;
    generation: {
      id: string;
      name: string;
      model: {
        id: string;
        name: string;
        brand: {
          id: string;
          name: string;
        };
      };
    };
    engine?: {
      id: string;
      engineCode?: string | null;
      enginePowerKW?: number | null;
      enginePowerHP?: number | null;
      engineCapacity?: number | null;
    } | null;
  }> | null;
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
  const [localQuery, setLocalQuery] = useState<string>("");
  const [page, setPage] = useState<number>(() => {
    const initial = parseInt(String(filters.page ?? '1'), 10);
    return Number.isFinite(initial) && initial > 0 ? initial : 1;
  });
  const [loadingProductId, setLoadingProductId] = useState<string | null>(null);
  const PAGE_SIZE = 24;
  const { addToCart } = useCart();
  const router = useRouter();
  const prefetchedProducts = useRef<Set<string>>(new Set());

  // Prefetch product page on hover for faster navigation
  const handleProductHover = useCallback((productSlug: string | null, productId: string) => {
    const slug = productSlug || productId;
    const url = `/products/${slug}`;
    if (!prefetchedProducts.current.has(url)) {
      router.prefetch(url);
      prefetchedProducts.current.add(url);
    }
  }, [router]);

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
  const prevParamsStringRef = useRef<string>(paramsString);

  // Detect if filters changed (not just page) - if so, we should use page 1
  // This is calculated synchronously to avoid double-fetch
  const filtersChanged = prevParamsStringRef.current !== paramsString;
  
  // The effective page to use in the API call
  // If filters changed, always use page 1 to avoid showing stale paginated results
  const effectivePage = filtersChanged ? 1 : page;

  // Build the API URL for SWR
  const apiUrl = useMemo(() => {
    const params = new URLSearchParams(paramsString);
    params.set('limit', String(PAGE_SIZE));
    params.set('page', String(effectivePage));
    return `/api/products?${params.toString()}`;
  }, [paramsString, effectivePage]);

  // Update the ref and reset page state AFTER render to keep state in sync
  useEffect(() => {
    if (filtersChanged) {
      prevParamsStringRef.current = paramsString;
      // Also reset the page state so subsequent renders use the correct value
      if (page !== 1) {
        setPage(1);
      }
    }
  }, [paramsString, filtersChanged, page]);

  // Use SWR for data fetching with automatic caching
  // When user navigates back, cached data is shown instantly
  const { data, error: swrError, isLoading, isValidating } = useSWR(
    apiUrl,
    productsFetcher,
    {
      revalidateOnFocus: false, // Don't refetch when window regains focus
      revalidateOnReconnect: false, // Don't refetch on reconnect
      dedupingInterval: 60000, // Dedupe requests within 60 seconds
      keepPreviousData: true, // Keep showing previous data while fetching new (for back navigation)
    }
  );

  // Derive state from SWR data
  const noFilter = data?.noFilter ?? false;
  const totalPages = data?.totalPages ?? 1;
  const totalCount = data?.totalCount ?? 0;
  // Show loading when:
  // - Initial loading (no data yet)
  // - Validating AND filters changed (we're fetching new search results, show loading instead of stale data)
  const loading = isLoading || (isValidating && filtersChanged);
  const error = swrError?.message ?? null;

  // Check if we should look for products in other categories
  // Only when: we have a query, we have a category filter, and no products found
  const shouldCheckOtherCategories = Boolean(
    filters.q && 
    filters.categoryId && 
    data?.items?.length === 0 && 
    !isLoading && 
    !isValidating
  );

  // Build URL to fetch products from all categories (without category filter)
  const allCategoriesApiUrl = useMemo(() => {
    if (!shouldCheckOtherCategories) return null;
    const params = new URLSearchParams();
    if (filters.q) params.set("q", String(filters.q));
    if (filters.generationId) params.set("generationId", String(filters.generationId));
    if (filters.engineId) params.set("engineId", String(filters.engineId));
    if (filters.minPrice) params.set("minPrice", String(filters.minPrice));
    if (filters.maxPrice) params.set("maxPrice", String(filters.maxPrice));
    params.set('limit', String(PAGE_SIZE)); // Fetch full page of products
    params.set('page', '1');
    return `/api/products?${params.toString()}`;
  }, [shouldCheckOtherCategories, filters.q, filters.generationId, filters.engineId, filters.minPrice, filters.maxPrice]);

  // Fetch products from other categories
  const { data: otherCategoriesData, isLoading: isLoadingOtherCategories } = useSWR(
    allCategoriesApiUrl,
    allCategoriesApiUrl ? productsFetcher : null,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000,
    }
  );

  const otherCategoriesCount = otherCategoriesData?.totalCount ?? 0;
  
  // Normalize products from other categories
  const otherCategoriesProducts = useMemo(() => {
    if (!otherCategoriesData?.items) return [];
    return otherCategoriesData.items.map((item: any) => ({
      ...item,
      categoryImageUrl: item.categoryImageUrl ?? item.category?.imageUrl ?? null,
      category: item.category ? { ...item.category, imageUrl: item.category?.imageUrl ?? (item.categoryImageUrl ?? null) } : item.category,
    }));
  }, [otherCategoriesData?.items]);

  // Normalize products data
  // Don't show stale products from a different query - prevents flash of old results
  const products = useMemo(() => {
    if (!data?.items || noFilter) return [];
    // If we're validating and filters changed, show empty to prevent flash of stale results
    if (isValidating && filtersChanged) return [];
    return data.items.map((item: any) => ({
      ...item,
      categoryImageUrl: item.categoryImageUrl ?? item.category?.imageUrl ?? null,
      category: item.category ? { ...item.category, imageUrl: item.category?.imageUrl ?? (item.categoryImageUrl ?? null) } : item.category,
    }));
  }, [data?.items, noFilter, isValidating, filtersChanged]);

  // Handle page adjustment if current page exceeds total
  useEffect(() => {
    if (data && page > data.totalPages && data.totalPages > 0) {
      setPage(data.totalPages);
    }
  }, [data, page]);

  // Sinkronizuj input s backend q parametrom
  useEffect(() => {
    setLocalQuery(filters.q ? String(filters.q) : "");
  }, [filters.q]);

  // Razdvoji egzaktne i fuzzy matchove za vizuelno odvajanje
  const exactMatches = products.filter((p: Product) => p.isExactMatch);
  const fuzzyMatches = products.filter((p: Product) => !p.isExactMatch);
  const hasExactMatches = exactMatches.length > 0;
  const hasFuzzyMatches = fuzzyMatches.length > 0;

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

  // Show a prompt when no filters are applied
  if (noFilter) {
    return (
      <div className="relative overflow-hidden rounded-3xl p-8 bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 shadow-xl">
        <div className="pointer-events-none absolute inset-0 z-0 opacity-[0.04]"
             style={{
               backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(27,58,95,0.2) 1px, transparent 0), radial-gradient(circle at 50% 50%, rgba(255,107,53,0.08) 0%, transparent 70%)',
               backgroundSize: '32px 32px, 100% 100%'
             }} />
        <div className="relative z-10 text-center py-12">
          <div className="bg-gradient-to-br from-[#E85A28] to-[#FF6B35] p-4 rounded-2xl shadow-xl inline-flex mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          </div>
          <p className="text-lg text-primary font-bold mb-2">Odaberite kategoriju proizvoda</p>
          <p className="text-sm text-slate-600">Koristite filtere iznad da biste pretražili proizvode po kategoriji, vozilu ili cijeni</p>
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
      {products.length === 0 && otherCategoriesProducts.length === 0 ? (
        <div className="text-center py-12">
          <div className="bg-gradient-to-br from-[#E85A28] to-[#FF6B35] p-4 rounded-2xl shadow-xl inline-flex mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <p className="text-lg text-primary font-bold">Nema proizvoda za odabrane filtere</p>
          <p className="text-sm text-slate-600 mt-2">Pokušajte promijeniti filtere ili kategoriju</p>
        </div>
      ) : products.length === 0 && otherCategoriesProducts.length > 0 ? (
        /* Show products from other categories with search bar - same design as normal view */
        <div>
          {/* Search bar section - identical to normal view */}
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
                <h2 className="mt-3 text-2xl font-bold text-primary">Pronađeno {otherCategoriesCount} {otherCategoriesCount === 1 ? 'proizvod' : otherCategoriesCount < 5 ? 'proizvoda' : 'proizvoda'}</h2>
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

          {/* Info banner about products from other categories */}
          <div className="mb-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex items-center gap-3 flex-1">
                <div className="flex-shrink-0 bg-gradient-to-br from-amber-400 to-orange-500 p-2 rounded-xl">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-amber-900 font-semibold text-sm">
                  Nema proizvoda "{filters.q}" u odabranoj kategoriji. Prikazujemo rezultate iz drugih kategorija.
                </p>
              </div>
              <button
                onClick={() => {
                  // Remove categoryId from URL to show all categories
                  const params = new URLSearchParams();
                  params.set('q', String(filters.q));
                  if (filters.generationId) params.set('generationId', String(filters.generationId));
                  if (filters.engineId) params.set('engineId', String(filters.engineId));
                  if (filters.minPrice) params.set('minPrice', String(filters.minPrice));
                  if (filters.maxPrice) params.set('maxPrice', String(filters.maxPrice));
                  router.replace(`/search?${params.toString()}`, { scroll: false });
                }}
                className="flex-shrink-0 px-4 py-2 bg-gradient-to-r from-primary to-primary-dark text-white text-sm font-semibold rounded-xl shadow hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
              >
                Ukloni filter kategorije
              </button>
            </div>
          </div>

          {/* Product display from other categories - respects grid/list toggle */}
          {view === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {otherCategoriesProducts.map((p: Product, index: number) => (
                <div
                  key={p.id}
                  className="animate-scale-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <ProductCard 
                    product={p as any} 
                    isLoading={loadingProductId === p.id}
                    onProductClick={(id) => setLoadingProductId(id)}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {otherCategoriesProducts.map((p: Product, index: number) => (
                <Link
                  href={`/products/${p.slug || p.id}`}
                  key={p.id}
                  prefetch={false}
                  onClick={() => setLoadingProductId(p.id)}
                  onMouseEnter={() => handleProductHover(p.slug ?? null, p.id)}
                  className="animate-fade-in flex flex-col sm:flex-row sm:items-center bg-white/80 backdrop-blur-sm border border-white/60 p-5 rounded-2xl shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 relative"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Loading overlay */}
                  {loadingProductId === p.id && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-2xl z-20 flex items-center justify-center">
                      <div className="flex items-center gap-3">
                        <Loader2 className="w-6 h-6 text-[#FF6B35] animate-spin" />
                        <span className="text-sm font-medium text-slate-700">Učitavanje...</span>
                      </div>
                    </div>
                  )}
                  <div className="relative w-full sm:w-24 h-32 sm:h-24 flex-shrink-0 mb-4 sm:mb-0 sm:mr-6">
                    <Image 
                      src={resolveProductImage(p.imageUrl, p.category?.imageUrl ?? p.categoryImageUrl ?? null)} 
                      alt={p.name} 
                      fill
                      className="object-cover rounded-md" 
                    />
                  </div>
                  <div className="flex-grow">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm text-slate-600">{p.category?.name || 'Kategorija'}</p>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2 line-clamp-2">{p.name}</h3>
                    {(p.catalogNumber || p.tecdocArticleId) && (
                      <div className="mb-1 flex flex-wrap gap-2">
                        {p.catalogNumber && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-50/70 backdrop-blur-sm border border-slate-200 rounded-lg px-2 py-0.5 shadow-sm">
                            <span className="text-slate-500">Kataloški</span>
                            <span className="font-mono tracking-tight text-slate-700">{p.catalogNumber}</span>
                          </span>
                        )}
                        {p.tecdocArticleId && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-50/70 backdrop-blur-sm border border-slate-200 rounded-lg px-2 py-0.5 shadow-sm">
                            <span className="text-slate-500">TecDoc ID:</span>
                            <span className="font-mono tracking-tight text-slate-700">{p.tecdocArticleId}</span>
                          </span>
                        )}
                      </div>
                    )}
                    <ProductOEMSummary 
                      productId={p.id}
                      productOemNumber={p.oemNumber}
                      articleOENumbers={p.articleOENumbers}
                    />
                    <ProductBrandSummary productId={p.id} vehicleFitments={p.vehicleFitments ?? undefined} maxInline={5} />
                  </div>
                  <div className="text-left sm:text-right w-full sm:w-48 flex-shrink-0 mt-4 sm:mt-0 sm:ml-6">
                    <p className="text-xl font-bold bg-gradient-to-r from-[#E85A28] to-[#FF6B35] bg-clip-text text-transparent mb-3">{formatPrice(p.price)}</p>
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
            <div className="space-y-8">
              {/* Tačan rezultat sekcija */}
              {hasExactMatches && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-6 bg-gradient-to-b from-green-500 to-emerald-600 rounded-full"></div>
                      <h3 className="text-lg font-bold text-slate-900">Tačan rezultat</h3>
                      <span className="px-2.5 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                        {exactMatches.length}
                      </span>
                    </div>
                  </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {exactMatches.map((p: Product, index: number) => (
                <div
                  key={p.id}
                  className="animate-scale-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <ProductCard 
                    product={p as any} 
                    isLoading={loadingProductId === p.id}
                    onProductClick={(id) => setLoadingProductId(id)}
                  />
                </div>
              ))}
                  </div>
                </div>
              )}

              {/* Separator između sekcija */}
              {hasExactMatches && hasFuzzyMatches && (
                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-4 py-1 bg-slate-50 text-slate-500 text-xs font-medium rounded-full border border-slate-200">
                      Slični rezultati
                    </span>
                  </div>
                </div>
              )}

              {/* Slični rezultati sekcija */}
              {hasFuzzyMatches && (
                <div>
                  {hasExactMatches && (
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-6 bg-gradient-to-b from-slate-300 to-slate-400 rounded-full"></div>
                        <h3 className="text-lg font-bold text-slate-700">Slični rezultati</h3>
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
                          {fuzzyMatches.length}
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {fuzzyMatches.map((p: Product, index: number) => (
                      <div
                        key={p.id}
                        className="animate-scale-in"
                        style={{ animationDelay: `${(exactMatches.length + index) * 50}ms` }}
                      >
                        <ProductCard 
                          product={p as any} 
                          isLoading={loadingProductId === p.id}
                          onProductClick={(id) => setLoadingProductId(id)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Tačan rezultat sekcija */}
              {hasExactMatches && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-6 bg-gradient-to-b from-green-500 to-emerald-600 rounded-full"></div>
                      <h3 className="text-lg font-bold text-slate-900">Tačan rezultat</h3>
                      <span className="px-2.5 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                        {exactMatches.length}
                      </span>
                    </div>
                  </div>
            <div className="flex flex-col gap-4">
                    {exactMatches.map((p: Product, index: number) => (
                <Link
                  href={`/products/${p.slug || p.id}`}
                  key={p.id}
                  prefetch={false}
                  onClick={() => setLoadingProductId(p.id)}
                  onMouseEnter={() => handleProductHover(p.slug ?? null, p.id)}
                  className="animate-fade-in flex flex-col sm:flex-row sm:items-center bg-white/80 backdrop-blur-sm border border-white/60 p-5 rounded-2xl shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 relative"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Loading overlay */}
                  {loadingProductId === p.id && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-2xl z-20 flex items-center justify-center">
                      <div className="flex items-center gap-3">
                        <Loader2 className="w-6 h-6 text-[#FF6B35] animate-spin" />
                        <span className="text-sm font-medium text-slate-700">Učitavanje...</span>
                      </div>
                    </div>
                  )}
                  <div className="relative w-full sm:w-24 h-32 sm:h-24 flex-shrink-0 mb-4 sm:mb-0 sm:mr-6">
                    <Image 
                      src={resolveProductImage(p.imageUrl, p.category?.imageUrl ?? p.categoryImageUrl ?? null)} 
                      alt={p.name} 
                      fill
                      className="object-cover rounded-md" 
                    />
                  </div>
                  <div className="flex-grow">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm text-slate-600">{p.category?.name || 'Kategorija'}</p>
                      {p.isExactMatch && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white text-[10px] font-bold shadow-lg">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Tačan rezultat
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2 line-clamp-2">{p.name}</h3>
                    {(p.catalogNumber || p.tecdocArticleId) && (
                      <div className="mb-1 flex flex-wrap gap-2">
                        {p.catalogNumber && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-50/70 backdrop-blur-sm border border-slate-200 rounded-lg px-2 py-0.5 shadow-sm">
                            <span className="text-slate-500">Kataloški</span>
                            <span className="font-mono tracking-tight text-slate-700">{p.catalogNumber}</span>
                          </span>
                        )}
                        {p.tecdocArticleId && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-50/70 backdrop-blur-sm border border-slate-200 rounded-lg px-2 py-0.5 shadow-sm">
                            <span className="text-slate-500">TecDoc ID:</span>
                            <span className="font-mono tracking-tight text-slate-700">{p.tecdocArticleId}</span>
                          </span>
                        )}
                      </div>
                    )}
                    <ProductOEMSummary 
                      productId={p.id}
                      productOemNumber={p.oemNumber}
                      articleOENumbers={p.articleOENumbers}
                    />
                    <ProductBrandSummary productId={p.id} vehicleFitments={p.vehicleFitments ?? undefined} maxInline={5} />
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
                </div>
              )}

              {/* Separator između sekcija */}
              {hasExactMatches && hasFuzzyMatches && (
                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-4 py-1 bg-slate-50 text-slate-500 text-xs font-medium rounded-full border border-slate-200">
                      Slični rezultati
                    </span>
                  </div>
                </div>
              )}

              {/* Slični rezultati sekcija */}
              {hasFuzzyMatches && (
                <div>
                  {hasExactMatches && (
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-6 bg-gradient-to-b from-slate-300 to-slate-400 rounded-full"></div>
                        <h3 className="text-lg font-bold text-slate-700">Slični rezultati</h3>
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
                          {fuzzyMatches.length}
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="flex flex-col gap-4">
                    {fuzzyMatches.map((p: Product, index: number) => (
                <Link
                  href={`/products/${p.slug || p.id}`}
                  key={p.id}
                  prefetch={false}
                  onClick={() => setLoadingProductId(p.id)}
                  onMouseEnter={() => handleProductHover(p.slug ?? null, p.id)}
                  className="animate-fade-in flex flex-col sm:flex-row sm:items-center bg-white/80 backdrop-blur-sm border border-white/60 p-5 rounded-2xl shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 relative"
                  style={{ animationDelay: `${(exactMatches.length + index) * 50}ms` }}
                >
                  {/* Loading overlay */}
                  {loadingProductId === p.id && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-2xl z-20 flex items-center justify-center">
                      <div className="flex items-center gap-3">
                        <Loader2 className="w-6 h-6 text-[#FF6B35] animate-spin" />
                        <span className="text-sm font-medium text-slate-700">Učitavanje...</span>
                      </div>
                    </div>
                  )}
                  <div className="relative w-full sm:w-24 h-32 sm:h-24 flex-shrink-0 mb-4 sm:mb-0 sm:mr-6">
                    <Image 
                      src={resolveProductImage(p.imageUrl, p.category?.imageUrl ?? p.categoryImageUrl ?? null)} 
                      alt={p.name} 
                      fill
                      className="object-cover rounded-md" 
                    />
                  </div>
                  <div className="flex-grow">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm text-slate-600">{p.category?.name || 'Kategorija'}</p>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2 line-clamp-2">{p.name}</h3>
                    {(p.catalogNumber || p.tecdocArticleId) && (
                      <div className="mb-1 flex flex-wrap gap-2">
                        {p.catalogNumber && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-50/70 backdrop-blur-sm border border-slate-200 rounded-lg px-2 py-0.5 shadow-sm">
                            <span className="text-slate-500">Kataloški</span>
                            <span className="font-mono tracking-tight text-slate-700">{p.catalogNumber}</span>
                          </span>
                        )}
                        {p.tecdocArticleId && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-50/70 backdrop-blur-sm border border-slate-200 rounded-lg px-2 py-0.5 shadow-sm">
                            <span className="text-slate-500">TecDoc ID:</span>
                            <span className="font-mono tracking-tight text-slate-700">{p.tecdocArticleId}</span>
                          </span>
                        )}
                      </div>
                    )}
                    <ProductOEMSummary 
                      productId={p.id}
                      productOemNumber={p.oemNumber}
                      articleOENumbers={p.articleOENumbers}
                    />
                    <ProductBrandSummary productId={p.id} vehicleFitments={p.vehicleFitments ?? undefined} maxInline={5} />
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
                </div>
              )}
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
              <p className="text-sm text-slate-700 font-medium">Stranica {page} od {totalPages} &middot; Prikazano {products.length} / {totalCount}</p>
            </div>
          )}
        </>
      )}
      </div>
    </div>
  );
}
