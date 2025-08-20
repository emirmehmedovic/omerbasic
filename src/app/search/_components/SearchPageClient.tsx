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
    minPrice: searchParams.get('minPrice') || undefined,
    maxPrice: searchParams.get('maxPrice') || undefined,
  });

  const [currentFilters, setCurrentFilters] = useState(getFiltersFromParams);

  // Sinkroniziraj stanje s URL parametrima
  useEffect(() => {
    setCurrentFilters(getFiltersFromParams());
  }, [searchParams]);

  const handleFilterChange = (newFilters: Record<string, any>) => {
    // Ako je akcija pretrage, postavi samo 'q' i ništa drugo
    if ('q' in newFilters) {
      const q = (newFilters as any).q;
      const params = new URLSearchParams();
      if (q && String(q).trim()) params.set('q', String(q).trim());
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
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

    const params = new URLSearchParams();
    for (const [key, value] of pairs) params.set(key, String(value));

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
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
            <ProductsResults filters={currentFilters} />
          </div>
        </div>
      </div>
    </div>
  );
}
