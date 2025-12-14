'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import ClientHierarchicalFilters from '@/components/ClientHierarchicalFilters';
import ProductsResults from '@/components/ProductsResults';
import { VehicleBrand } from '@/generated/prisma/client';
import { Category } from '@/components/HierarchicalFilters';

interface SearchPageClientProps {
  filterData: {
    categories: Category[];
    brands: VehicleBrand[];
  };
}

export default function SearchPageClient({ filterData }: SearchPageClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const getFiltersFromParams = () => ({
    q: searchParams.get('q') || undefined,
    categoryId: searchParams.get('categoryId') || undefined,
    generationId: searchParams.get('generationId') || undefined,
    engineId: searchParams.get('engineId') || undefined,
    minPrice: searchParams.get('minPrice') || undefined,
    maxPrice: searchParams.get('maxPrice') || undefined,
  });

  const [currentFilters, setCurrentFilters] = useState(getFiltersFromParams);

  // Sinkroniziraj stanje s URL parametrima
  useEffect(() => {
    setCurrentFilters(getFiltersFromParams());
  }, [searchParams]);

  const handleQueryChange = (query: string) => {
    const trimmed = query.trim();
    const params = new URLSearchParams(searchParams);
    if (trimmed) {
      params.set('q', trimmed);
    } else {
      params.delete('q');
    }
    // Resetuj paginaciju ako postoji
    params.delete('page');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleFilterChange = (newFilters: Record<string, any>) => {
    // Ako je akcija pretrage, delegiraj na handleQueryChange
    if ('q' in newFilters) {
      handleQueryChange(String((newFilters as any).q ?? ''));
      return;
    }

    // Filtriranje: izgradi parametre samo iz stvarno postavljenih filtera
    // - preskoči 'q'
    // - preskoči 'specs' i sve objekt-vrijednosti (da izbjegnemo [object Object])
    const pairs = Object.entries(newFilters).filter(([key, value]) => {
      if (key === 'q' || key === 'specs') return false;
      if (value === undefined || value === null || value === '') return false;
      if (typeof value === 'object') return false;
      return true;
    });

    // Ako nema nijednog konkretnog filtera, ne diraj URL (izbjegni brisanje aktivnog q)
    if (pairs.length === 0) return;

    const params = new URLSearchParams(searchParams);

    // Očisti stare vrijednosti filtera koje kontroliramo (zadržavamo q i ostale parametre)
    ['categoryId', 'generationId', 'engineId', 'minPrice', 'maxPrice'].forEach((key) => {
      params.delete(key);
    });

    for (const [key, value] of pairs) params.set(key, String(value));

    // Resetuj paginaciju ako postoji
    params.delete('page');

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleClearAll = () => {
    const params = new URLSearchParams(searchParams);
    const currentCategoryId = params.get('categoryId') || undefined;

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

    let rootCategoryId: string | undefined = undefined;
    if (currentCategoryId) {
      const path = findPath(filterData.categories, currentCategoryId);
      if (path && path.length) rootCategoryId = path[0].id;
    } else {
      // default to passenger main category if unknown
      const PASSENGER_CATEGORY_ID = 'cmer01ok30001rqbwu15hej6j';
      rootCategoryId = PASSENGER_CATEGORY_ID;
    }

    const next = new URLSearchParams();
    if (rootCategoryId) next.set('categoryId', rootCategoryId);
    // preserve q if present
    const q = params.get('q');
    if (q) next.set('q', q);
    // remove vehicle-specific params
    next.delete('brandId');
    next.delete('makeId');
    next.delete('modelId');
    next.delete('generationId');
    next.delete('engineId');
    // remove price for now (optional): we can preserve if desired
    const minPrice = params.get('minPrice');
    const maxPrice = params.get('maxPrice');
    if (minPrice) next.set('minPrice', minPrice);
    if (maxPrice) next.set('maxPrice', maxPrice);

    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  return (
    <div className="min-h-screen bg-app relative">
      <div className="container mx-auto px-4 py-6 max-w-7xl relative z-10">
        <h1 className="text-3xl font-bold mb-4">
          Rezultati pretrage za: <span className="text-orange-500">"{currentFilters.q || ''}"</span>
        </h1>
        <p className="text-slate-500 mb-8">Filtrirajte rezultate kako biste pronašli točno ono što trebate.</p>

        <div className="mb-8">
          <ClientHierarchicalFilters 
            key="top-filters"
            initialFilters={currentFilters} 
            displayMode="topOnly" 
            updateUrl={false} 
            onFilterChangeExternal={handleFilterChange}
            categories={filterData.categories}
            brands={filterData.brands}
          />
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="w-full lg:w-1/4">
            <ClientHierarchicalFilters 
              key="sidebar-filters"
              initialFilters={currentFilters} 
              displayMode="sidebarOnly" 
              updateUrl={false} 
              onFilterChangeExternal={handleFilterChange}
              categories={filterData.categories}
              brands={filterData.brands}
            />
          </div>
          
          <div className="w-full lg:w-3/4">
            <ProductsResults 
              filters={currentFilters} 
              onClearAll={handleClearAll} 
              onQueryChange={handleQueryChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
