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
    setCurrentFilters(filters);

    if (isInitialMount.current) return;

    if (onFilterChangeExternal) {
      const { q, ...filterParams } = filters;
      onFilterChangeExternal(filterParams);
    }
    
    // Ako ne trebamo ažurirati URL, završavamo ovdje
    if (!updateUrl) return;
    
    const params = new URLSearchParams(searchParams);

    // Ažuriramo parametre na temelju novih filtera
    Object.keys(filters).forEach(key => {
      const value = filters[key];
      if (value === undefined || value === '' || value === null) {
        params.delete(key);
        if (key === 'makeId') params.delete('brandId');
        return;
      }

      // Posebno rukovanje za objektne vrijednosti (npr. specs)
      if (typeof value === 'object') {
        // Ako je prazan objekt, ukloni iz URL-a
        if (key === 'specs') {
          const hasAny = value && Object.keys(value).length > 0 && Object.values(value).some(v => v !== undefined && v !== '' && v !== null);
          if (!hasAny) {
            params.delete('specs');
            return;
          }
          params.set('specs', JSON.stringify(value));
          return;
        }
        // Za ostale objekte fallback na JSON
        params.set(key, JSON.stringify(value));
        return;
      }

      // Standardno postavljanje
      params.set(key, String(value));
      // Kompatibilnost: zrcali makeId u brandId
      if (key === 'makeId') {
        params.set('brandId', String(value));
      }
    });

    // Ako je primijenjen bilo koji filter osim 'q', ukloni 'q'
    const isFiltering = Object.keys(filters).some(key => key !== 'q' && filters[key]);
    if (isFiltering) {
      params.delete('q');
    }
    
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
