"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Loader2, Car, Zap, Award, Users } from "lucide-react";
import ClientHierarchicalFilters from '@/components/ClientHierarchicalFilters';
import { VehicleBrand } from '@/generated/prisma/client';
import { Category } from '@/components/HierarchicalFilters';

// Tip za proizvod u rezultatima pretrage
type ProductWithFitment = {
  id: string;
  name: string;
  catalogNumber: string;
  oemNumber: string | null;
  price: number;
  imageUrl: string | null;
  images: string[];
  category: {
    id: string;
    name: string;
  };
  vehicleFitments: Array<{
    id: string;
    fitmentNotes: string | null;
    position: string | null;
    bodyStyles: string[];
    yearFrom: number | null;
    yearTo: number | null;
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
    engine: {
      id: string;
      engineType: string;
      enginePowerKW: number | null;
      enginePowerHP: number | null;
      engineCapacity: number | null;
      engineCode: string | null;
    } | null;
  }>;
};

// Tip za rezultate pretrage
type SearchResults = {
  products: ProductWithFitment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

interface VehicleCompatibilityClientProps {
  filterData: {
    categories: Category[];
    brands: VehicleBrand[];
  };
}

function VehicleCompatibilityHeader() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 mb-8">
      <div className="lg:col-span-7 rounded-2xl overflow-hidden">
        <div className="relative rounded-2xl p-8 md:p-12 flex flex-col justify-between min-h-[300px] [box-shadow:0_0_60px_-15px_theme(colors.sunfire.400)] overflow-hidden">
          {/* Animated Background - Same as homepage */}
          <div className="absolute inset-0 bg-gradient-to-r from-amber via-orange to-brown opacity-90 -z-10 rounded-2xl"></div>
          <div className="absolute inset-0 bg-[url('/images/pattern.png')] opacity-10 -z-10 rounded-2xl"></div>
          
          {/* Animated overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent -z-10 rounded-2xl animate-pulse"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <Car className="w-8 h-8 text-yellow-200" />
              <span className="text-white/90 font-medium">Kompatibilnost vozila</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold tracking-tighter text-white drop-shadow-md mb-4 leading-tight">
              Pronađite dijelove za{' '}
              <span className="bg-gradient-to-r from-yellow-200 via-yellow-300 to-yellow-100 bg-clip-text text-transparent">
                vaše vozilo
              </span>
            </h1>
            <p className="text-lg text-white/90 max-w-lg leading-relaxed">
              Odaberite vozilo i pronađite sve kompatibilne autodijelove. Brzo, jednostavno i pouzdano.
            </p>
          </div>
        </div>
      </div>
      
      <div className="lg:col-span-3 flex flex-col gap-4">
        <div className="rounded-2xl p-6 text-white bg-gradient-to-t from-black/60 to-transparent border border-white/10 flex items-center justify-center">
          <div className="text-center">
            <Car className="w-8 h-8 mx-auto mb-2 text-amber" />
            <h3 className="font-bold text-lg">Provjera kompatibilnosti</h3>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="accent-bg rounded-2xl p-4 flex flex-col justify-center items-center text-center text-white">
            <Zap className="w-6 h-6 mb-2 text-yellow-200" />
            <p className="text-sm font-medium">Brza pretraga</p>
          </div>
          <div className="accent-bg rounded-2xl p-4 flex flex-col justify-center items-center text-center text-white">
            <Award className="w-6 h-6 mb-2 text-yellow-200" />
            <p className="text-sm font-medium">100% precizno</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VehicleCompatibilityClient({ filterData }: VehicleCompatibilityClientProps) {
  type FilterState = {
    categoryId?: string;
    generationId?: string;
    engineId?: string;
    bodyStyle?: string;
    year?: string;
    minPrice?: string;
    maxPrice?: string;
    q?: string;
    [key: string]: any;
  };

  const searchParams = useSearchParams();
  
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const initialFilters: FilterState = {
    categoryId: searchParams.get('categoryId') || undefined,
    generationId: searchParams.get('generationId') || undefined,
    engineId: searchParams.get('engineId') || undefined,
    bodyStyle: searchParams.get('bodyStyle') || undefined,
    year: searchParams.get('year') || undefined,
    minPrice: searchParams.get('minPrice') || undefined,
    maxPrice: searchParams.get('maxPrice') || undefined,
    q: searchParams.get('q') || undefined,
  };

  const [currentFilters, setCurrentFilters] = useState<FilterState>(initialFilters);
  
  const handleFilterChange = (filters: Record<string, any>) => {
    setCurrentFilters(prev => ({ ...prev, ...filters }));
    
    // Ako je odabrano vozilo (generationId), izvrši pretragu
    if (filters.generationId) {
      fetchSearchResults({
        generationId: filters.generationId,
        engineId: filters.engineId,
        bodyStyle: filters.bodyStyle,
        year: filters.year ? parseInt(filters.year) : undefined,
        categoryId: filters.categoryId,
      });
    }
  };

  // Dohvaćanje rezultata pretrage iz URL parametara pri prvom renderiranju
  useEffect(() => {
    const generationId = searchParams.get("generationId");
    
    if (generationId) {
      fetchSearchResults({
        generationId,
        engineId: searchParams.get("engineId") || undefined,
        bodyStyle: searchParams.get("bodyStyle") || undefined,
        year: searchParams.get("year") ? parseInt(searchParams.get("year")!) : undefined,
        categoryId: searchParams.get("categoryId") || undefined,
      });
    }
  }, [searchParams]);
  
  // Funkcija za dohvaćanje rezultata pretrage
  const fetchSearchResults = async (params: {
    generationId?: string;
    engineId?: string;
    bodyStyle?: string;
    year?: number;
    categoryId?: string;
    page?: number;
    limit?: number;
  }) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Izgradnja URL-a s parametrima
      const url = new URL('/api/products/vehicle-compatibility', window.location.origin);
      
      if (params.generationId) url.searchParams.set('vehicleGenerationId', params.generationId);
      if (params.engineId) url.searchParams.set('vehicleEngineId', params.engineId);
      if (params.bodyStyle) url.searchParams.set('bodyStyle', params.bodyStyle);
      if (params.categoryId) url.searchParams.set('categoryId', params.categoryId);
      // Godina je vezana uz generaciju, ne šaljemo je kao zaseban parametar
      
      // Paginacija
      const page = params.page || parseInt(searchParams.get("page") || "1");
      const limit = params.limit || parseInt(searchParams.get("limit") || "10");
      
      url.searchParams.set('page', page.toString());
      url.searchParams.set('limit', limit.toString());
      
      // Sortiranje
      url.searchParams.set('sortBy', searchParams.get("sortBy") || "name");
      url.searchParams.set('sortOrder', searchParams.get("sortOrder") || "asc");
      
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Greška prilikom pretrage proizvoda');
      }
      
      const data = await response.json();
      setSearchResults(data);
    } catch (err) {
      console.error("Error fetching search results:", err);
      setError(err instanceof Error ? err.message : 'Greška prilikom pretrage proizvoda');
    } finally {
      setIsLoading(false);
    }
  };

  
  // Handler za promjenu stranice
  const handlePageChange = (newPage: number) => {
    if (!searchResults) return;
    
    const params = {
      generationId: currentFilters.generationId,
      engineId: currentFilters.engineId,
      bodyStyle: currentFilters.bodyStyle,
      year: currentFilters.year ? parseInt(currentFilters.year) : undefined,
      categoryId: currentFilters.categoryId,
      page: newPage,
    };
    
    fetchSearchResults(params);
  };
  
  // Renderiranje paginacije
  const renderPagination = () => {
    if (!searchResults || searchResults.totalPages <= 1) return null;
    
    const currentPage = searchResults.page;
    const totalPages = searchResults.totalPages;
    
    // Određivanje koje stranice prikazati
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      // Prikaži sve stranice ako ih je manje od maxVisiblePages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Prikaži prvu stranicu
      pages.push(1);
      
      // Prikaži stranice oko trenutne stranice
      const startPage = Math.max(2, currentPage - 1);
      const endPage = Math.min(totalPages - 1, currentPage + 1);
      
      if (startPage > 2) {
        pages.push(-1); // Oznaka za "..."
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
      
      if (endPage < totalPages - 1) {
        pages.push(-2); // Oznaka za "..."
      }
      
      // Prikaži zadnju stranicu
      pages.push(totalPages);
    }
    
    return (
      <div className="flex justify-center mt-8">
        <div className="flex space-x-2 glass-card p-4 rounded-xl border border-white/10">
          {/* Gumb za prethodnu stranicu */}
          <Button
            variant="outline"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="bg-slate-800/50 border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:text-white disabled:opacity-50"
          >
            Prethodna
          </Button>
          
          {/* Gumbi za stranice */}
          {pages.map((page, index) => {
            if (page < 0) {
              // Renderiranje "..."
              return (
                <Button key={`ellipsis-${index}`} variant="ghost" disabled className="text-slate-400">
                  ...
                </Button>
              );
            }
            
            return (
              <Button
                key={page}
                variant={page === currentPage ? "default" : "outline"}
                onClick={() => page !== currentPage && handlePageChange(page)}
                className={page === currentPage 
                  ? "bg-gradient-to-r from-amber to-orange text-white border-none" 
                  : "bg-slate-800/50 border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:text-white"
                }
              >
                {page}
              </Button>
            );
          })}
          
          {/* Gumb za sljedeću stranicu */}
          <Button
            variant="outline"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="bg-slate-800/50 border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:text-white disabled:opacity-50"
          >
            Sljedeća
          </Button>
        </div>
      </div>
    );
  };
  
  // Funkcija za formatiranje informacija o kompatibilnosti
  const formatFitmentInfo = (product: ProductWithFitment) => {
    if (!product.vehicleFitments || product.vehicleFitments.length === 0) {
      return "Nema informacija o kompatibilnosti";
    }
    
    // Uzmi prvi fitment za prikaz (obično će biti samo jedan za trenutno odabrano vozilo)
    const fitment = product.vehicleFitments[0];
    
    const parts = [];
    
    // Dodaj informacije o vozilu
    parts.push(`${fitment.generation.model.brand.name} ${fitment.generation.model.name} ${fitment.generation.name}`);
    
    // Dodaj informacije o motoru ako postoje
    if (fitment.engine) {
      const engineParts = [];
      
      if (fitment.engine.engineType) {
        engineParts.push(fitment.engine.engineType);
      }
      
      if (fitment.engine.engineCapacity) {
        engineParts.push(`${(fitment.engine.engineCapacity / 1000).toFixed(1)}L`);
      }
      
      if (fitment.engine.enginePowerKW) {
        engineParts.push(`${fitment.engine.enginePowerKW}kW`);
      }
      
      if (fitment.engine.engineCode) {
        engineParts.push(fitment.engine.engineCode);
      }
      
      if (engineParts.length > 0) {
        parts.push(engineParts.join(" "));
      }
    }
    
    // Dodaj informacije o poziciji ako postoje
    if (fitment.position) {
      parts.push(`Pozicija: ${fitment.position}`);
    }
    
    // Dodaj informacije o godinama ako postoje
    if (fitment.yearFrom || fitment.yearTo) {
      const yearPart = [];
      
      if (fitment.yearFrom) {
        yearPart.push(`od ${fitment.yearFrom}`);
      }
      
      if (fitment.yearTo) {
        yearPart.push(`do ${fitment.yearTo}`);
      }
      
      if (yearPart.length > 0) {
        parts.push(yearPart.join(" "));
      }
    }
    
    // Dodaj napomene ako postoje
    if (fitment.fitmentNotes) {
      parts.push(fitment.fitmentNotes);
    }
    
    return parts.join(" | ");
  };
  
  return (
    <div className="min-h-screen bg-app relative">
      <div className="container mx-auto px-4 py-6 max-w-7xl relative z-10">
        <div className="mb-8">
          <VehicleCompatibilityHeader />
        </div>

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
            <div className="glass-card rounded-2xl p-6">
              {isLoading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-amber" />
                  <span className="ml-2 text-slate-300">Učitavanje rezultata...</span>
                </div>
              ) : error ? (
                <div className="bg-red-500/10 border border-red-500/20 text-red-300 p-6 rounded-xl">
                  <p>{error}</p>
                </div>
              ) : !searchResults ? (
                <div className="text-center py-16">
                  <Car className="w-16 h-16 mx-auto mb-4 text-slate-400" />
                  <h3 className="text-xl font-semibold text-slate-300 mb-2">Odaberite vozilo</h3>
                  <p className="text-slate-400">Koristite filtere da pronađete kompatibilne proizvode za vaše vozilo</p>
                </div>
              ) : searchResults.products.length === 0 ? (
                <div className="text-center py-16">
                  <Car className="w-16 h-16 mx-auto mb-4 text-slate-400" />
                  <h3 className="text-xl font-semibold text-slate-300 mb-2">Nema rezultata</h3>
                  <p className="text-slate-400">Nema pronađenih proizvoda za odabrano vozilo</p>
                </div>
              ) : (
                <>
                  {/* Broj rezultata */}
                  <div className="mb-6 flex items-center justify-between">
                    <div className="text-slate-300">
                      Pronađeno <span className="font-semibold text-amber">{searchResults.total}</span> kompatibilnih proizvoda
                    </div>
                  </div>
                  
                  {/* Grid s proizvodima */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                    {searchResults.products.map((product) => (
                      <div key={product.id} className="flex flex-col">
                        <ProductCard
                          product={{
                            id: product.id,
                            name: product.name,
                            price: product.price,
                            category: {
                              ...product.category,
                              parentId: null,
                              level: 0,
                              iconUrl: null
                            },
                            imageUrl: product.imageUrl || null,
                            isFeatured: false,
                            isArchived: false,
                            description: null,
                            stock: 0,
                            catalogNumber: product.catalogNumber,
                            oemNumber: product.oemNumber,
                            categoryId: product.category.id,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            dimensions: {},
                            technicalSpecs: {},
                            standards: [],
                            images: product.images
                          } as any}
                        />
                        <div className="mt-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                          <div className="text-xs text-slate-400 italic">
                            {formatFitmentInfo(product)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Paginacija */}
                  {renderPagination()}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
