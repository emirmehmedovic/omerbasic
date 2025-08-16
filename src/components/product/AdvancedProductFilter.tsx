"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Filter, X } from "lucide-react";

// Lokalne definicije tipova umjesto importa iz @prisma/client
interface Category {
  id: string;
  name: string;
  parentId: string | null;
  level: number;
  iconUrl: string | null;
}

interface CategoryAttribute {
  id: string;
  name: string;
  label: string;
  type: string;
  unit?: string | null;
  options?: any;
  isRequired: boolean;
  isFilterable: boolean;
  sortOrder: number;
}

// Tip za atribute kategorije s vrijednostima
type AttributeWithValues = {
  id: string;
  name: string;
  label: string;
  type: string;
  unit?: string | null;
  options?: any;
  isRequired: boolean;
  isFilterable: boolean;
  sortOrder: number;
};

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

interface AdvancedProductFilterProps {
  categories: Category[];
  initialParams?: Partial<FilterParams>;
  onFilterChange?: (params: FilterParams) => void;
}

export default function AdvancedProductFilter({
  categories,
  initialParams,
  onFilterChange
}: AdvancedProductFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Stanje filtera
  const [filterParams, setFilterParams] = useState<FilterParams>({
    query: initialParams?.query || '',
    categoryId: initialParams?.categoryId || undefined,
    minPrice: initialParams?.minPrice || undefined,
    maxPrice: initialParams?.maxPrice || undefined,
    attributes: initialParams?.attributes || {},
    crossReferenceNumber: initialParams?.crossReferenceNumber || undefined,
    vehicleGenerationId: initialParams?.vehicleGenerationId || undefined,
    page: initialParams?.page || 1,
    limit: initialParams?.limit || 10,
    sortBy: initialParams?.sortBy || 'name',
    sortOrder: initialParams?.sortOrder || 'asc'
  });

  // Stanje za atribute kategorije
  const [categoryAttributes, setCategoryAttributes] = useState<AttributeWithValues[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFilterVisible, setIsFilterVisible] = useState(false);

  // Učitavanje atributa za odabranu kategoriju
  useEffect(() => {
    async function loadCategoryAttributes() {
      if (!filterParams.categoryId) {
        setCategoryAttributes([]);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(`/api/categories/${filterParams.categoryId}/attributes`);
        if (response.ok) {
          const data = await response.json();
          setCategoryAttributes(data.filter((attr: AttributeWithValues) => attr.isFilterable));
        }
      } catch (error) {
        console.error("Error loading category attributes:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadCategoryAttributes();
  }, [filterParams.categoryId]);

  // Ažuriranje URL-a i obavještavanje roditelja o promjeni filtera
  const applyFilters = () => {
    // Resetiranje stranice na 1 pri promjeni filtera
    const updatedParams = { ...filterParams, page: 1 };
    
    // Ažuriranje URL-a
    const params = new URLSearchParams();
    
    if (updatedParams.query) params.set('query', updatedParams.query);
    if (updatedParams.categoryId) params.set('categoryId', updatedParams.categoryId);
    if (updatedParams.minPrice !== undefined) params.set('minPrice', updatedParams.minPrice.toString());
    if (updatedParams.maxPrice !== undefined) params.set('maxPrice', updatedParams.maxPrice.toString());
    if (updatedParams.crossReferenceNumber) params.set('crossReferenceNumber', updatedParams.crossReferenceNumber);
    if (updatedParams.vehicleGenerationId) params.set('vehicleGenerationId', updatedParams.vehicleGenerationId);
    
    // Atributi kao JSON string
    if (Object.keys(updatedParams.attributes || {}).length > 0) {
      params.set('attributes', JSON.stringify(updatedParams.attributes));
    }
    
    params.set('page', updatedParams.page.toString());
    params.set('limit', updatedParams.limit.toString());
    params.set('sortBy', updatedParams.sortBy);
    params.set('sortOrder', updatedParams.sortOrder);
    
    // Ažuriranje URL-a bez osvježavanja stranice
    router.push(`?${params.toString()}`, { scroll: false });
    
    // Obavještavanje roditelja o promjeni filtera
    if (onFilterChange) {
      onFilterChange(updatedParams);
    }
  };

  // Resetiranje filtera
  const resetFilters = () => {
    setFilterParams({
      query: '',
      categoryId: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      attributes: {},
      crossReferenceNumber: undefined,
      vehicleGenerationId: undefined,
      page: 1,
      limit: 10,
      sortBy: 'name',
      sortOrder: 'asc'
    });
    
    // Resetiranje URL-a
    router.push('?', { scroll: false });
    
    // Obavještavanje roditelja o resetiranju filtera
    if (onFilterChange) {
      onFilterChange({
        query: '',
        page: 1,
        limit: 10,
        sortBy: 'name',
        sortOrder: 'asc'
      });
    }
  };

  // Ažuriranje atributa
  const handleAttributeChange = (attributeId: string, value: string) => {
    setFilterParams(prev => ({
      ...prev,
      attributes: {
        ...prev.attributes,
        [attributeId]: value
      }
    }));
  };

  // Uklanjanje atributa
  const removeAttribute = (attributeId: string) => {
    const updatedAttributes = { ...filterParams.attributes };
    delete updatedAttributes[attributeId];
    
    setFilterParams(prev => ({
      ...prev,
      attributes: updatedAttributes
    }));
  };

  // Renderiranje kontrola za atribute ovisno o tipu
  const renderAttributeControl = (attribute: AttributeWithValues) => {
    const attributeValue = filterParams.attributes?.[attribute.id] || '';
    
    switch (attribute.type) {
      case 'string':
        return (
          <Input
            type="text"
            value={attributeValue}
            onChange={(e) => handleAttributeChange(attribute.id, e.target.value)}
            placeholder={`Unesite ${attribute.label.toLowerCase()}`}
            className="mt-1"
          />
        );
      
      case 'number':
        return (
          <Input
            type="number"
            value={attributeValue}
            onChange={(e) => handleAttributeChange(attribute.id, e.target.value)}
            placeholder={`Unesite ${attribute.label.toLowerCase()}`}
            className="mt-1"
          />
        );
      
      case 'boolean':
        return (
          <div className="flex items-center space-x-2 mt-1">
            <Checkbox
              id={`attribute-${attribute.id}`}
              checked={attributeValue === 'true'}
              onCheckedChange={(checked) => 
                handleAttributeChange(attribute.id, checked ? 'true' : 'false')
              }
            />
            <label htmlFor={`attribute-${attribute.id}`} className="text-sm">
              Da
            </label>
          </div>
        );
      
      case 'enum':
        if (attribute.options && typeof attribute.options === 'object') {
          const options = Array.isArray(attribute.options) 
            ? attribute.options 
            : Object.entries(attribute.options).map(([value, label]) => ({ value, label }));
          
          return (
            <Select
              value={attributeValue}
              onValueChange={(value) => handleAttributeChange(attribute.id, value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder={`Odaberite ${attribute.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {options.map((option: any) => (
                  <SelectItem 
                    key={option.value || option} 
                    value={option.value || option}
                  >
                    {option.label || option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        }
        return null;
      
      default:
        return (
          <Input
            type="text"
            value={attributeValue}
            onChange={(e) => handleAttributeChange(attribute.id, e.target.value)}
            placeholder={`Unesite ${attribute.label.toLowerCase()}`}
            className="mt-1"
          />
        );
    }
  };

  return (
    <div className="w-full mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Pretraga proizvoda</h2>
        <Button 
          variant="outline" 
          onClick={() => setIsFilterVisible(!isFilterVisible)}
          className="flex items-center gap-2"
        >
          <Filter size={16} />
          {isFilterVisible ? 'Sakrij filtere' : 'Prikaži filtere'}
        </Button>
      </div>

      {/* Osnovni filter uvijek vidljiv */}
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Pretraži po nazivu, kataloškom ili OEM broju..."
            value={filterParams.query || ''}
            onChange={(e) => setFilterParams(prev => ({ ...prev, query: e.target.value }))}
          />
        </div>
        <div className="w-full md:w-48">
          <Select
            value={filterParams.sortBy}
            onValueChange={(value: 'name' | 'price' | 'createdAt') => 
              setFilterParams(prev => ({ ...prev, sortBy: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Sortiraj po" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Nazivu</SelectItem>
              <SelectItem value="price">Cijeni</SelectItem>
              <SelectItem value="createdAt">Datumu</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-full md:w-48">
          <Select
            value={filterParams.sortOrder}
            onValueChange={(value: 'asc' | 'desc') => 
              setFilterParams(prev => ({ ...prev, sortOrder: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Redoslijed" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asc">Uzlazno</SelectItem>
              <SelectItem value="desc">Silazno</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={applyFilters}>Pretraži</Button>
      </div>

      {/* Napredni filteri */}
      {isFilterVisible && (
        <div className="bg-slate-900/80 border border-sunfire-500/60 rounded-lg p-6 mb-4">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Napredni filteri</CardTitle>
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                Resetiraj filtere
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Filtriranje po kategoriji */}
              <div>
                <Label htmlFor="category">Kategorija</Label>
                <Select
                  value={filterParams.categoryId}
                  onValueChange={(value) => 
                    setFilterParams(prev => ({ 
                      ...prev, 
                      categoryId: value,
                      attributes: {} // Resetiranje atributa pri promjeni kategorije
                    }))
                  }
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Odaberite kategoriju" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtriranje po rasponu cijena */}
              <div>
                <Label>Raspon cijena</Label>
                <div className="flex gap-4 items-center mt-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={filterParams.minPrice || ''}
                    onChange={(e) => setFilterParams(prev => ({ 
                      ...prev, 
                      minPrice: e.target.value ? parseFloat(e.target.value) : undefined 
                    }))}
                    className="w-24"
                  />
                  <span>-</span>
                  <Input
                    type="number"
                    placeholder="Max"
                    value={filterParams.maxPrice || ''}
                    onChange={(e) => setFilterParams(prev => ({ 
                      ...prev, 
                      maxPrice: e.target.value ? parseFloat(e.target.value) : undefined 
                    }))}
                    className="w-24"
                  />
                </div>
              </div>

              {/* Filtriranje po cross-reference broju */}
              <div>
                <Label htmlFor="crossReference">Cross-reference broj</Label>
                <Input
                  id="crossReference"
                  type="text"
                  placeholder="Unesite OEM ili referentni broj"
                  value={filterParams.crossReferenceNumber || ''}
                  onChange={(e) => setFilterParams(prev => ({ 
                    ...prev, 
                    crossReferenceNumber: e.target.value || undefined 
                  }))}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Atributi kategorije */}
            {filterParams.categoryId && categoryAttributes.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-2">Atributi kategorije</h3>
                <Accordion type="multiple" className="w-full">
                  {categoryAttributes.map((attribute) => (
                    <AccordionItem key={attribute.id} value={attribute.id}>
                      <AccordionTrigger className="text-sm">
                        {attribute.label}
                        {filterParams.attributes?.[attribute.id] && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                            Aktivno
                          </span>
                        )}
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="py-2">
                          {renderAttributeControl(attribute)}
                          
                          {filterParams.attributes?.[attribute.id] && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeAttribute(attribute.id)}
                              className="mt-2 text-xs flex items-center"
                            >
                              <X size={14} className="mr-1" />
                              Ukloni filter
                            </Button>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            )}

            {/* Aktivni filteri */}
            <div className="mt-6 flex flex-wrap gap-2">
              {Object.entries(filterParams.attributes || {}).map(([attributeId, value]) => {
                const attribute = categoryAttributes.find(attr => attr.id === attributeId);
                if (!attribute || !value) return null;
                
                return (
                  <div 
                    key={attributeId}
                    className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm flex items-center"
                  >
                    <span>{attribute.label}: {value}</span>
                    <button 
                      onClick={() => removeAttribute(attributeId)}
                      className="ml-2 text-blue-500 hover:text-blue-700"
                    >
                      <X size={14} />
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={applyFilters}>Primijeni filtere</Button>
            </div>
          </CardContent>
        </div>
      )}
    </div>
  );
}
