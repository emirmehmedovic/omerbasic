'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import TecDocFilters from './TecDocFilters';

interface ClientTecDocFiltersProps {
  initialFilters: Record<string, any>;
}

export default function ClientTecDocFilters({ initialFilters }: ClientTecDocFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isInitialMount = useRef(true);
  const [currentFilters, setCurrentFilters] = useState(initialFilters);
  
  // Spriječimo beskonačnu petlju pri inicijalnom učitavanju
  useEffect(() => {
    isInitialMount.current = false;
  }, []);

  const handleFilterChange = (filters: Record<string, any>) => {
    // Ažuriramo lokalno stanje filtera
    setCurrentFilters(filters);
    
    // Ako je inicijalno učitavanje, ne radimo ništa s URL-om
    if (isInitialMount.current) return;
    
    // Kreiramo novi URLSearchParams objekt
    const params = new URLSearchParams();
    
    // Dodamo nove parametre
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        if (typeof value === 'object') {
          // Za složene objekte kao što su specs, dodaj ih kao pojedinačne parametre
          Object.entries(value).forEach(([specKey, specValue]) => {
            if (specValue) {
              params.set(`spec_${specKey}`, String(specValue));
            }
          });
        } else {
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
    <TecDocFilters
      onFilterChange={handleFilterChange}
      initialFilters={currentFilters}
    />
  );
}
