'use client';

import { useState } from 'react';
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
    minPrice?: string;
    maxPrice?: string;
    q?: string;
    [key: string]: any;
  };

  const searchParams = useSearchParams();

  const initialFilters: FilterState = {
    categoryId: searchParams.get('categoryId') || undefined,
    generationId: searchParams.get('generationId') || undefined,
    minPrice: searchParams.get('minPrice') || undefined,
    maxPrice: searchParams.get('maxPrice') || undefined,
    q: searchParams.get('q') || undefined,
  };

  const [currentFilters, setCurrentFilters] = useState<FilterState>(initialFilters);
  const router = useRouter();
  const pathname = usePathname();

  const handleFilterChange = (filters: Record<string, any>) => {
    setCurrentFilters(prev => ({ ...prev, ...filters }));
  };

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
    const updated: FilterState = {
      categoryId: undefined,
      generationId: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      q: undefined,
    };
    setCurrentFilters(updated);
    router.replace(pathname, { scroll: false });
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

        <div className="mb-8">
          <ClientHierarchicalFilters
            key="top-filters"
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

        {/* Sidebar + results only when filters are applied */}
        {!noFiltersApplied && (
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="w-full lg:w-1/4">
              <ClientHierarchicalFilters
                key="sidebar-filters"
                initialFilters={currentFilters}
                displayMode="sidebarOnly"
                onFilterChangeExternal={handleFilterChange}
                categories={filterData.categories}
                brands={filterData.brands}
              />
            </div>

            <div className="w-full lg:w-3/4">
              <ResultsBreadcrumb
                filters={currentFilters}
                categories={filterData.categories}
                onRemove={handleRemoveFilter}
                onClearAll={handleClearAll}
              />
              <ProductsResults filters={currentFilters} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
