'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import HierarchicalFilters, { Category } from './HierarchicalFilters';
import { VehicleBrand } from '@/generated/prisma/client';

interface ClientHierarchicalFiltersProps {
  initialFilters: Record<string, any>;
  displayMode?: 'full' | 'topOnly' | 'sidebarOnly';
  updateUrl?: boolean;
  onFilterChangeExternal?: (filters: Record<string, any>) => void;
  categories: Category[];
  brands: VehicleBrand[];
}

export default function ClientHierarchicalFilters({ 
  initialFilters, 
  displayMode = 'full',
  updateUrl = false,
  onFilterChangeExternal,
  categories,
  brands
}: ClientHierarchicalFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isInitialMount = useRef(true);
  const [currentFilters, setCurrentFilters] = useState(initialFilters);

  // Kada se promijene initialFilters iz parenta, sinkroniziraj lokalno stanje
  useEffect(() => {
    setCurrentFilters(initialFilters);
  }, [initialFilters]);
  
  // Spriječimo beskonačnu petlju pri inicijalnom učitavanju
  useEffect(() => {
    isInitialMount.current = false;
  }, []);

  const handleFilterChange = (filters: Record<string, any>) => {
    // Ažuriramo lokalno stanje filtera
    setCurrentFilters(filters);
    
    // Ako je inicijalno učitavanje, ne radimo ništa s URL-om
    if (isInitialMount.current) return;
    
    // Ako imamo vanjski callback, pozovemo ga (ali i dalje možemo ažurirati URL ako je omogućeno)
    if (onFilterChangeExternal) {
      onFilterChangeExternal(filters);
    }
    
    // Ako ne trebamo ažurirati URL, završavamo ovdje
    if (!updateUrl) return;
    
    // Kreiramo novi URLSearchParams objekt
    const params = new URLSearchParams();
    
    // Dodamo nove parametre
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        if (key === 'specs' && typeof value === 'object') {
          // Za specs objekt, dodaj ih kao pojedinačne parametre
          Object.entries(value).forEach(([specKey, specValue]) => {
            if (specValue) {
              params.set(`spec_${specKey}`, String(specValue));
            }
          });
        } else {
          // Za sve ostale parametre, dodaj ih direktno
          params.set(key, String(value));
        }
      }
    });
    
    // Provjerimo jesu li se parametri stvarno promijenili
    const newParamsString = params.toString();
    const currentParamsString = searchParams.toString();
    
    if (newParamsString !== currentParamsString) {
      // Ažuriramo URL bez osvježavanja stranice samo ako su se parametri promijenili
      router.replace(`${pathname}?${newParamsString}`, { scroll: false });
    }
  };

  return (
    <HierarchicalFilters
      onFilterChange={handleFilterChange}
      initialFilters={currentFilters}
      displayMode={displayMode}
      categories={categories}
      brands={brands}
    />
  );
}
