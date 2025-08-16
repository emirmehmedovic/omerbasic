"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import AdvancedProductFilter from "@/components/product/AdvancedProductFilter";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
// Lokalna definicija tipa za kategoriju
interface Category {
  id: string;
  name: string;
  parentId: string | null;
  level: number;
  iconUrl: string | null;
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
  images: string[];
  category: {
    id: string;
    name: string;
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
  
  // Funkcija za dohvaćanje rezultata pretrage
  const fetchSearchResults = async (params: FilterParams) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Izgradnja URL-a s parametrima
      const url = new URL('/api/products/advanced-search', window.location.origin);
      
      if (params.query) url.searchParams.set('query', params.query);
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
  
  // Učitavanje rezultata pri prvom renderiranju
  useEffect(() => {
    // Provjera ima li dovoljno parametara za pretragu
    const hasSearchParams = searchParams.toString().length > 0;
    if (hasSearchParams) {
      fetchSearchResults(initialParams);
    }
  }, []);
  
  // Handler za promjenu filtera
  const handleFilterChange = (params: FilterParams) => {
    fetchSearchResults(params);
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
              {searchResults.products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={{
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    imageUrl: product.imageUrl || (product.images && product.images.length > 0 ? product.images[0] : null),
                    category: {
                      id: product.category.id,
                      name: product.category.name,
                      parentId: null,
                      level: 0,
                      iconUrl: null
                    },
                    // Dodajemo ostala potrebna polja iz Product tipa
                    categoryId: product.category.id,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    catalogNumber: product.catalogNumber,
                    oemNumber: product.oemNumber,
                    description: "",
                    stock: 0,
                    technicalSpecs: {},
                    dimensions: {},
                    standards: [],
                    isFeatured: false,
                    isArchived: false
                  }}
                />
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
