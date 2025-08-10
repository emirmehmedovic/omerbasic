"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import VehicleSelector from "@/components/vehicle/VehicleSelector";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

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

export default function VehicleCompatibilityClient() {
  const searchParams = useSearchParams();
  
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Dohvaćanje rezultata pretrage iz URL parametara pri prvom renderiranju
  useEffect(() => {
    const generationId = searchParams.get("generationId");
    
    if (generationId) {
      fetchSearchResults({
        generationId,
        engineId: searchParams.get("engineId") || undefined,
        bodyStyle: searchParams.get("bodyStyle") || undefined,
        year: searchParams.get("year") ? parseInt(searchParams.get("year")!) : undefined,
      });
    }
  }, [searchParams]);
  
  // Funkcija za dohvaćanje rezultata pretrage
  const fetchSearchResults = async (params: {
    generationId?: string;
    engineId?: string;
    bodyStyle?: string;
    year?: number;
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
  
  // Handler za odabir vozila
  const handleVehicleSelect = (params: {
    generationId?: string;
    engineId?: string;
    bodyStyle?: string;
    year?: number;
  }) => {
    if (params.generationId) {
      fetchSearchResults(params);
    }
  };
  
  // Handler za promjenu stranice
  const handlePageChange = (newPage: number) => {
    if (!searchResults) return;
    
    const params = {
      generationId: searchParams.get("generationId") || undefined,
      engineId: searchParams.get("engineId") || undefined,
      bodyStyle: searchParams.get("bodyStyle") || undefined,
      year: searchParams.get("year") ? parseInt(searchParams.get("year")!) : undefined,
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
        <div className="flex space-x-2">
          {/* Gumb za prethodnu stranicu */}
          <Button
            variant="outline"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Prethodna
          </Button>
          
          {/* Gumbi za stranice */}
          {pages.map((page, index) => {
            if (page < 0) {
              // Renderiranje "..."
              return (
                <Button key={`ellipsis-${index}`} variant="ghost" disabled>
                  ...
                </Button>
              );
            }
            
            return (
              <Button
                key={page}
                variant={page === currentPage ? "default" : "outline"}
                onClick={() => page !== currentPage && handlePageChange(page)}
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
    <div className="space-y-8">
      {/* Selektor vozila */}
      <div className="bg-gray-50 p-6 rounded-lg shadow-sm">
        <VehicleSelector onVehicleSelect={handleVehicleSelect} />
      </div>
      
      {/* Prikaz rezultata */}
      <div>
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Učitavanje rezultata...</span>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-700 p-4 rounded-md">
            <p>{error}</p>
          </div>
        ) : !searchResults ? (
          <div className="text-center py-12 text-gray-500">
            <p>Odaberite vozilo za pretragu kompatibilnih proizvoda</p>
          </div>
        ) : searchResults.products.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>Nema pronađenih proizvoda za odabrano vozilo</p>
          </div>
        ) : (
          <>
            {/* Broj rezultata */}
            <div className="mb-4 text-sm text-gray-500">
              Pronađeno {searchResults.total} kompatibilnih proizvoda
            </div>
            
            {/* Grid s proizvodima */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {searchResults.products.map((product) => (
                <div key={product.id} className="flex flex-col">
                  {/* Koristimo as any da zaobiđemo TypeScript provjere za ProductCard */}
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
                  <div className="mt-2 text-xs text-gray-500 italic">
                    {formatFitmentInfo(product)}
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
  );
}
