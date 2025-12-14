'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import ClientHierarchicalFilters from '@/components/ClientHierarchicalFilters';
import ProductsResults from '@/components/ProductsResults';
import DiscountedProductsSlider from './DiscountedProductsSlider';
import ResultsBreadcrumb from './ResultsBreadcrumb';
import { VehicleBrand } from '@/generated/prisma/client';
import { Category } from '@/components/HierarchicalFilters';

interface ProductsPageClientProps {
  filterData: {
    categories: Category[];
    brands: VehicleBrand[];
  };
}

// Hero sekcija uklonjena na zahtjev (carousel i bento grids)

export default function ProductsPageClient({ filterData }: ProductsPageClientProps) {
  type FilterState = {
    categoryId?: string;
    generationId?: string;
    engineId?: string;
    makeId?: string;
    minPrice?: string;
    maxPrice?: string;
    q?: string;
    page?: number | string;
    [key: string]: any;
  };

  const searchParams = useSearchParams();

  const initialFilters: FilterState = {
    categoryId: searchParams.get('categoryId') || undefined,
    generationId: searchParams.get('generationId') || undefined,
    engineId: searchParams.get('engineId') || undefined,
    // Map brandId from URL to makeId expected by filters
    makeId: searchParams.get('brandId') || searchParams.get('makeId') || undefined,
    minPrice: searchParams.get('minPrice') || undefined,
    maxPrice: searchParams.get('maxPrice') || undefined,
    q: searchParams.get('q') || undefined,
    page: searchParams.get('page') || undefined,
  };

  const [currentFilters, setCurrentFilters] = useState<FilterState>(initialFilters);
  const [vehicleResetKey, setVehicleResetKey] = useState(0);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const handleFilterChange = (filters: Record<string, any>) => {
    // Kada se promijene filteri (kategorija, vozilo, cijena...), resetuj page
    setCurrentFilters(prev => ({ ...prev, ...filters, page: undefined }));

    // Na mobilnim uređajima, nakon odabira filtera automatski zatvori drawer
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setMobileFiltersOpen(false);
    }
  };

  // If we land with a makeId but no categoryId, default to Passenger category (static ID)
  // so VehicleSelector is shown and brand is preselected.
  const [categoryAutoApplied, setCategoryAutoApplied] = useState(false);
  useEffect(() => {
    if (categoryAutoApplied) return;
    if (!currentFilters.makeId || currentFilters.categoryId) return;
    const PASSENGER_CATEGORY_ID = 'cmer01ok30001rqbwu15hej6j';
    const updated: FilterState = { ...currentFilters, categoryId: PASSENGER_CATEGORY_ID };
    setCurrentFilters(updated);
    setVehicleResetKey((k) => k + 1);
    const params = new URLSearchParams(searchParams);
    params.set('makeId', String(updated.makeId));
    params.set('brandId', String(updated.makeId || ''));
    params.set('categoryId', String(PASSENGER_CATEGORY_ID));
    if (updated.generationId) params.set('generationId', String(updated.generationId)); else params.delete('generationId');
    if (updated.engineId) params.set('engineId', String(updated.engineId)); else params.delete('engineId');
    if (updated.minPrice) params.set('minPrice', String(updated.minPrice)); else params.delete('minPrice');
    if (updated.maxPrice) params.set('maxPrice', String(updated.maxPrice)); else params.delete('maxPrice');
    if (updated.q) params.set('q', String(updated.q)); else params.delete('q');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    setCategoryAutoApplied(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryAutoApplied, currentFilters, filterData.categories, pathname, router]);

  const handleRemoveFilter = (key: keyof FilterState) => {
    const updated: FilterState = { ...currentFilters } as any;
    if (key === 'minPrice' || key === 'maxPrice') {
      updated.minPrice = undefined;
      updated.maxPrice = undefined;
    } else {
      (updated as any)[key] = undefined;
    }

    setCurrentFilters(updated);

    // sync URL after state update
    const params = new URLSearchParams(searchParams);
    if (key === 'minPrice' || key === 'maxPrice') {
      params.delete('minPrice');
      params.delete('maxPrice');
    } else {
      params.delete(String(key));
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const handleClearAll = () => {
    // Helper to find path to a category id
    const findPath = (nodes: Category[], id: string, path: Category[] = []): Category[] | null => {
      for (const node of nodes) {
        const np = [...path, node];
        if (node.id === id) return np;
        if (node.children && node.children.length) {
          const res = findPath(node.children, id, np);
          if (res) return res;
        }
      }
      return null;
    };
    const currentCatId = currentFilters.categoryId as string | undefined;
    let rootCategoryId: string | undefined = undefined;
    if (currentCatId) {
      const path = findPath(filterData.categories, currentCatId);
      if (path && path.length) rootCategoryId = path[0].id;
    } else {
      // infer from selected brand type, or default to PASSENGER
      const PASSENGER_CATEGORY_ID = 'cmer01ok30001rqbwu15hej6j';
      const COMMERCIAL_CATEGORY_ID = 'cmer01z6s0001rqcokur4f0bn';
      const brand = filterData.brands.find(b => String(b.id) === String(currentFilters.makeId || '')) as any;
      if (brand?.type === 'COMMERCIAL') rootCategoryId = COMMERCIAL_CATEGORY_ID;
      else rootCategoryId = PASSENGER_CATEGORY_ID;
    }

    const updated: FilterState = {
      ...currentFilters,
      categoryId: rootCategoryId ?? currentFilters.categoryId,
      generationId: undefined,
      engineId: undefined,
      makeId: undefined,
      // leave other filters (price/q) as-is
    };
    setCurrentFilters(updated);

    const params = new URLSearchParams();
    if (updated.categoryId) params.set('categoryId', String(updated.categoryId));
    // explicitly remove vehicle brand/model filters
    params.delete('brandId');
    params.delete('makeId');
    params.delete('modelId');
    // ensure engine/gen removed
    params.delete('generationId');
    params.delete('engineId');
    if (updated.minPrice) params.set('minPrice', String(updated.minPrice));
    if (updated.maxPrice) params.set('maxPrice', String(updated.maxPrice));
    if (updated.q) params.set('q', String(updated.q));
    // do not include generationId/engineId
    router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname, { scroll: false });
  };

  const noFiltersApplied = !currentFilters.categoryId &&
    !currentFilters.generationId &&
    !currentFilters.minPrice &&
    !currentFilters.maxPrice &&
    !currentFilters.q;

  return (
    <div className="min-h-screen bg-app relative">
      <div className="container mx-auto px-4 py-6 max-w-7xl relative z-10">
        {/* Hero (carousel/bento) uklonjen */}
        {/* Mobilni gumb za otvaranje/zatvaranje filtera */}
        <div className="mb-4 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileFiltersOpen((open) => !open)}
            className="w-full flex items-center justify-between px-4 py-2 rounded-xl bg-white/80 backdrop-blur-sm border border-white/60 shadow-sm text-slate-800 text-sm font-medium"
          >
            <span className="flex flex-col items-start text-left">
              <span>Filteri proizvoda</span>
              <span className="text-[11px] text-slate-500 font-normal">Dodirnite da odaberete vozilo, kategoriju i cijenu</span>
            </span>
            <span className="text-xs text-slate-600">{mobileFiltersOpen ? 'Sakrij' : 'Otvori'}</span>
          </button>
        </div>

        <div className={`mb-8 ${mobileFiltersOpen ? 'block' : 'hidden'} lg:block`}>
          <ClientHierarchicalFilters
            key={`top-filters-${vehicleResetKey}`}
            initialFilters={currentFilters}
            displayMode="topOnly"
            updateUrl={true}
            onFilterChangeExternal={handleFilterChange}
            categories={filterData.categories}
            brands={filterData.brands}
          />
        </div>

        {/* Full-width discounted slider when no filters */}
        {noFiltersApplied && (
          <div className="mb-8">
            <DiscountedProductsSlider />
          </div>
        )}

        {/* Sidebar + results - always show */}
        <div className="flex flex-col lg:flex-row gap-6">
          {!noFiltersApplied && (
            <div className={`w-full lg:w-1/4 ${mobileFiltersOpen ? 'block' : 'hidden'} lg:block`}>
              <ClientHierarchicalFilters
                key={`sidebar-filters-${vehicleResetKey}`}
                initialFilters={currentFilters}
                displayMode="sidebarOnly"
                updateUrl={true}
                onFilterChangeExternal={handleFilterChange}
                categories={filterData.categories}
                brands={filterData.brands}
              />
            </div>
          )}

          <div className={noFiltersApplied ? "w-full" : "w-full lg:w-3/4"}>
            {!noFiltersApplied && (
              <ResultsBreadcrumb
                filters={currentFilters}
                categories={filterData.categories}
                onRemove={handleRemoveFilter}
                onClearAll={handleClearAll}
              />
            )}
            <ProductsResults
              filters={currentFilters}
              onPageChange={(nextPage) => {
                setCurrentFilters(prev => ({ ...prev, page: nextPage }));
                const params = new URLSearchParams(searchParams);
                if (nextPage && nextPage > 1) {
                  params.set('page', String(nextPage));
                } else {
                  params.delete('page');
                }
                const query = params.toString();
                router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
              }}
              onQueryChange={(query) => {
                const trimmed = query.trim();
                setCurrentFilters(prev => ({
                  ...prev,
                  q: trimmed || undefined,
                  page: undefined,
                }));

                const params = new URLSearchParams(searchParams);
                if (trimmed) {
                  params.set('q', trimmed);
                } else {
                  params.delete('q');
                }
                // Resetuj paginaciju kad se promijeni tekst pretrage
                params.delete('page');

                const queryString = params.toString();
                router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
