"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import AdvancedProductFilter from "@/components/product/AdvancedProductFilter";
import { ProductCard } from "@/components/ProductCard";
import { resolveProductImage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { FloatingChatButtons } from "@/components/ChatButtons";
// Lokalna definicija tipa za kategoriju
interface Category {
  id: string;
  name: string;
  parentId: string | null;
  level: number;
  iconUrl: string | null;
  imageUrl: string | null;
}

// Tip za parametre filtera
type FilterParams = {
  query?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  attributes?: Record<string, string>;
  crossReferenceNumber?: string;
  vehicleGenerationId?: string;
  page: number;
  limit: number;
  sortBy: 'name' | 'price' | 'createdAt';
  sortOrder: 'asc' | 'desc';
};

// Tip za proizvod u rezultatima pretrage
type ProductWithRelations = {
  id: string;
  name: string;
  catalogNumber: string;
  oemNumber: string | null;
  price: number;
  imageUrl: string | null;
  images?: string[];
  category: {
    id: string;
    name: string;
    imageUrl?: string | null;
    parentId?: string | null;
    level?: number | null;
    iconUrl?: string | null;
  };
  attributeValues: Array<{
    id: string;
    value: string;
    attribute: {
      id: string;
      name: string;
      label: string;
      type: string;
    };
  }>;
  originalReferences: Array<{
    id: string;
    referenceNumber: string;
    type: string;
  }>;
  replacementFor: Array<{
    id: string;
    referenceNumber: string;
    type: string;
  }>;
  vehicleGenerations: Array<{
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
    vehicleEngines: Array<{
      id: string;
      engineType: string;
      enginePowerKW: number | null;
      enginePowerHP: number | null;
      engineCapacity: number | null;
      engineCode: string | null;
    }>;
  }>;
  [key: string]: any;
};

// Tip za rezultate pretrage
type SearchResults = {
  products: ProductWithRelations[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

interface AdvancedProductSearchClientProps {
  categories: Category[];
}

export default function AdvancedProductSearchClient({ categories }: AdvancedProductSearchClientProps) {
  const searchParams = useSearchParams();
  
  // Inicijalno stanje filtera iz URL parametara
  const initialParams: FilterParams = {
    query: searchParams.get('query') || undefined,
    categoryId: searchParams.get('categoryId') || undefined,
    minPrice: searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : undefined,
    maxPrice: searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : undefined,
    crossReferenceNumber: searchParams.get('crossReferenceNumber') || undefined,
    vehicleGenerationId: searchParams.get('vehicleGenerationId') || undefined,
    page: parseInt(searchParams.get('page') || '1'),
    limit: parseInt(searchParams.get('limit') || '10'),
    sortBy: (searchParams.get('sortBy') as 'name' | 'price' | 'createdAt') || 'name',
    sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'asc',
  };
  
  // Pokušaj parsiranja atributa iz URL-a
  try {
    const attributesParam = searchParams.get('attributes');
    if (attributesParam) {
      initialParams.attributes = JSON.parse(attributesParam);
    }
  } catch (e) {
    console.error("Error parsing attributes from URL:", e);
  }
  
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const cooldownUntilRef = useRef<number>(0);
  
  // Funkcija za dohvaćanje rezultata pretrage
  const fetchSearchResults = async (params: FilterParams) => {
    // honor cooldown after 429
    const now = Date.now();
    if (cooldownUntilRef.current && now < cooldownUntilRef.current) {
      return;
    }
    setIsLoading(true);
    setError(null);
    
    try {
      // Izgradnja URL-a s parametrima
      const url = new URL('/api/products/advanced-search', window.location.origin);
      
      if (params.query && params.query.trim().length >= 3) {
        url.searchParams.set('query', params.query.trim());
      }
      if (params.categoryId) url.searchParams.set('categoryId', params.categoryId);
      if (params.minPrice !== undefined) url.searchParams.set('minPrice', params.minPrice.toString());
      if (params.maxPrice !== undefined) url.searchParams.set('maxPrice', params.maxPrice.toString());
      if (params.crossReferenceNumber) url.searchParams.set('crossReferenceNumber', params.crossReferenceNumber);
      if (params.vehicleGenerationId) url.searchParams.set('vehicleGenerationId', params.vehicleGenerationId);
      
      // Atributi kao JSON string
      if (params.attributes && Object.keys(params.attributes).length > 0) {
        url.searchParams.set('attributes', JSON.stringify(params.attributes));
      }
      
      url.searchParams.set('page', params.page.toString());
      url.searchParams.set('limit', params.limit.toString());
      url.searchParams.set('sortBy', params.sortBy);
      url.searchParams.set('sortOrder', params.sortOrder);
      
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        if (response.status === 429) {
          const resetHeader = response.headers.get('RateLimit-Reset');
          const resetInSec = resetHeader ? parseInt(resetHeader) : 5;
          const msg = `Previše zahtjeva. Pokušajte ponovo za ${resetInSec}s.`;
          setError(msg);
          cooldownUntilRef.current = Date.now() + (isNaN(resetInSec) ? 5000 : resetInSec * 1000);
          return;
        }
        const errorData = await response.json().catch(() => ({ error: 'Greška prilikom pretrage proizvoda' }));
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

  // Debounce
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const debouncedFetch = (params: FilterParams, delay = 300) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSearchResults(params);
    }, delay);
  };

  // Učitavanje rezultata pri prvom renderiranju
  useEffect(() => {
    // Provjera ima li dovoljno parametara za pretragu
    const hasSearchParams = searchParams.toString().length > 0;
    if (hasSearchParams) {
      debouncedFetch(initialParams, 0);
    }
  }, []);
  
  // Handler za promjenu filtera
  const handleFilterChange = (params: FilterParams) => {
    // Ako je upit prekratak, a nema drugih filtera, ne pozivati API
    const hasQuery = Boolean(params.query && params.query.trim().length >= 3);
    const hasOtherFilters = Boolean(
      params.categoryId || params.minPrice !== undefined || params.maxPrice !== undefined ||
      params.crossReferenceNumber || params.vehicleGenerationId || (params.attributes && Object.keys(params.attributes).length > 0)
    );
    if (!hasQuery && !hasOtherFilters) {
      setSearchResults({ products: [], total: 0, page: params.page, limit: params.limit, totalPages: 0 });
      return;
    }
    debouncedFetch(params);
  };
  
  // Handler za promjenu stranice
  const handlePageChange = (newPage: number) => {
    if (!searchResults) return;
    
    const updatedParams: FilterParams = {
      ...initialParams,
      page: newPage,
    };
    
    fetchSearchResults(updatedParams);
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
                className={page === currentPage ? 'bg-sunfire-500 hover:bg-sunfire-600 border-sunfire-400' : 'border-slate-700 hover:bg-slate-800 hover:text-white'}
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
  
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-100">Napredna pretraga</h1>
        <p className="text-sm text-slate-400">Kombinujte više filtera za precizniji rezultat.</p>
      </div>
      {/* Filter komponenta */}
      <AdvancedProductFilter
        categories={categories}
        initialParams={initialParams}
        onFilterChange={handleFilterChange}
      />
      
      {/* Prikaz rezultata */}
      <div className="mt-6 bg-gradient-to-t from-black/60 to-transparent p-6 rounded-2xl border border-sunfire-500/30 shadow-lg shadow-sunfire-500/10">
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
            <p>Koristite filtere za pretragu proizvoda</p>
          </div>
        ) : searchResults.products.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>Nema pronađenih proizvoda za zadane filtere</p>
          </div>
        ) : (
          <>
            {/* Broj rezultata */}
            <div className="mb-6 text-lg font-semibold text-white">
              Pronađeno {searchResults.total} proizvoda
            </div>
            
            {/* Grid s proizvodima */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {searchResults.products.map((product) => {
                const fallbackImage = resolveProductImage(
                  product.imageUrl,
                  product.category?.imageUrl ?? null,
                );

                const productForCard = {
                  ...product,
                  imageUrl: fallbackImage,
                  categoryId: product.category?.id ?? (product as any).categoryId ?? "",
                  description: product.description ?? null,
                  purchasePrice: product.purchasePrice ?? null,
                  stock: product.stock ?? 0,
                  lowStockThreshold: product.lowStockThreshold ?? null,
                  lowStockAlerted: product.lowStockAlerted ?? false,
                  unitOfMeasure: product.unitOfMeasure ?? null,
                  sku: product.sku ?? null,
                  manufacturerId: product.manufacturerId ?? null,
                  technicalSpecs: product.technicalSpecs ?? {},
                  dimensions: product.dimensions ?? {},
                  standards: product.standards ?? [],
                  isFeatured: product.isFeatured ?? false,
                  isArchived: product.isArchived ?? false,
                  createdAt: product.createdAt ? new Date(product.createdAt) : new Date(),
                  updatedAt: product.updatedAt ? new Date(product.updatedAt) : new Date(),
                  category: product.category
                    ? {
                        id: product.category.id ?? "",
                        name: product.category.name ?? "",
                        parentId: product.category.parentId ?? null,
                        level: product.category.level ?? 0,
                        iconUrl: product.category.iconUrl ?? null,
                        imageUrl: product.category.imageUrl ?? null,
                      }
                    : null,
                } as unknown as Parameters<typeof ProductCard>[0]["product"];

                return <ProductCard key={product.id} product={productForCard} />;
              })}
            </div>
            
            {/* Paginacija */}
            {renderPagination()}
          </>
        )}
      </div>
      <FloatingChatButtons />
    </div>
  );
}
