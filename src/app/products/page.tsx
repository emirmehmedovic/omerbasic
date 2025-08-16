'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ClientHierarchicalFilters from '@/components/ClientHierarchicalFilters';
import ProductsResults from '@/components/ProductsResults';
import { DiscountCarousel } from '@/components/DiscountCarousel';

// Komponenta za učitavanje
function ProductsLoading() {
  return (
    <div className="text-center py-12 glass-card rounded-xl">
      <div className="animate-pulse flex flex-col items-center">
        <div className="w-12 h-12 mb-4 rounded-full bg-slate-200"></div>
        <div className="h-4 w-32 bg-slate-200 rounded mb-3"></div>
        <div className="h-3 w-24 bg-slate-200 rounded"></div>
      </div>
    </div>
  );
}

// Clean Header komponenta
function ProductsHeader() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 mb-8">
      {/* Carousel Container (70%) */}
      <div className="lg:col-span-7 rounded-2xl overflow-hidden">
        <DiscountCarousel />
      </div>

      {/* Right Column (30%) */}
      <div className="lg:col-span-3 flex flex-col gap-6">
        {/* Quick Links Card */}
        <div className="rounded-2xl p-6 text-white bg-gradient-to-t from-black/60 to-transparent border border-white/10 flex items-center justify-center h-full transform-gpu transition-transform duration-300 hover:scale-105 hover-pulse-sunfire">
          <h3 className="font-bold text-3xl accent-text">Katalog proizvoda</h3>
        </div>
        {/* Stats Card */}
        <div className="accent-bg rounded-2xl p-6 flex flex-col justify-center items-center text-center h-full text-white transform-gpu transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:-translate-y-1">
          <p className="text-sm opacity-90 mb-1">Ukupno Artikala</p>
          <p className="text-4xl font-bold">1,250+</p>
        </div>

        {/* Promotional Card */}
        <div className="accent-bg rounded-2xl p-6 flex flex-col justify-center items-center text-center text-white h-full">
          <p className="font-bold text-lg mb-1">B2B Popusti</p>
          <p className="text-sm opacity-90">Prijavite se za poslovne cijene</p>
        </div>
      </div>
    </div>
  );
}

// Grid komponenta zamijenjena stvarnim prikazom proizvoda

// Footer će doći nakon uvođenja paginacije

// Glavna komponenta stranice - pretvorena u klijentsku komponentu
function ProductsPageInner() {
  // Definiramo tip za filtere
  type FilterState = {
    categoryId?: string;
    generationId?: string;
    minPrice?: string;
    maxPrice?: string;
    q?: string;
    [key: string]: any; // Za ostale moguće filtere
  };

  // Koristimo useSearchParams hook za dohvaćanje parametara (unutar Suspense)
  const searchParams = useSearchParams();

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
    <div className="min-h-screen bg-app relative">
      <div className="container mx-auto px-4 py-6 max-w-7xl relative z-10">
        
        {/* Clean Header */}
        <div className="mb-8">
          <ProductsHeader />
        </div>

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
        
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar s podkategorijama */}
          <div className="w-full lg:w-1/4">
            <ClientHierarchicalFilters 
              key="sidebar-filters"
              initialFilters={currentFilters} 
              displayMode="sidebarOnly" 
              onFilterChangeExternal={handleFilterChange}
            />
          </div>
          
          {/* Glavni sadržaj */}
          <div className="w-full lg:w-3/4">
            <ProductsResults filters={currentFilters} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<ProductsLoading />}>
      <ProductsPageInner />
    </Suspense>
  );
}
