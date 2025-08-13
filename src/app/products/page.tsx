'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ClientHierarchicalFilters from '@/components/ClientHierarchicalFilters';
import ProductsResults from '@/components/ProductsResults';

// Komponenta za učitavanje
function ProductsLoading() {
  return (
    <div className="text-center py-12 bg-white/50 backdrop-blur-md rounded-xl border border-white/30 shadow-md">
      <div className="animate-pulse flex flex-col items-center">
        <div className="w-12 h-12 mb-4 rounded-full bg-slate-200"></div>
        <div className="h-4 w-32 bg-slate-200 rounded mb-3"></div>
        <div className="h-3 w-24 bg-slate-200 rounded"></div>
      </div>
    </div>
  );
}

// Header komponenta
function ProductsHeader() {
  return (
    <div className="bg-white/50 backdrop-blur-md rounded-xl p-6 shadow-md border border-white/30">
      <h1 className="text-2xl font-bold text-slate-800">Proizvodi</h1>
      <p className="text-slate-600">Pronađite dijelove koji vam trebaju</p>
    </div>
  );
}

// Grid komponenta zamijenjena stvarnim prikazom proizvoda

// Footer će doći nakon uvođenja paginacije

// Glavna komponenta stranice - pretvorena u klijentsku komponentu
export default function ProductsPage() {
  // Koristimo useSearchParams hook za dohvaćanje parametara
  const searchParams = useSearchParams();
  
  // Definiramo tip za filtere
  type FilterState = {
    categoryId?: string;
    generationId?: string;
    minPrice?: string;
    maxPrice?: string;
    q?: string;
    [key: string]: any; // Za ostale moguće filtere
  };

  // Sigurno dohvaćamo vrijednosti iz searchParams
  const initialFilters: FilterState = {
    categoryId: searchParams.get('categoryId') || undefined,
    generationId: searchParams.get('generationId') || undefined,
    minPrice: searchParams.get('minPrice') || undefined,
    maxPrice: searchParams.get('maxPrice') || undefined,
    q: searchParams.get('q') || undefined,
  };

  // State za praćenje trenutnih filtera
  const [currentFilters, setCurrentFilters] = useState<FilterState>(initialFilters);

  // Funkcija za sinkronizaciju filtera između komponenti
  const handleFilterChange = (filters: Record<string, any>) => {
    setCurrentFilters(prev => ({ ...prev, ...filters }));
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Glavni filteri - glavne kategorije i odabir vozila */}
      <div className="mb-8">
        <ClientHierarchicalFilters 
          key="top-filters"
          initialFilters={currentFilters} 
          displayMode="topOnly" 
          updateUrl={true} // Samo ova komponenta ažurira URL
          onFilterChangeExternal={handleFilterChange}
        />
      </div>
      
      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar s podkategorijama */}
        <div className="w-full md:w-1/4 lg:w-1/5">
          <ClientHierarchicalFilters 
            key="sidebar-filters"
            initialFilters={currentFilters} 
            displayMode="sidebarOnly" 
            onFilterChangeExternal={handleFilterChange}
          />
        </div>
        
        {/* Glavni sadržaj */}
        <div className="w-full md:w-3/4 lg:w-4/5">
          <div className="space-y-6">
            <Suspense fallback={<ProductsLoading />}>
              <ProductsHeader />
              <ProductsResults filters={currentFilters} />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
