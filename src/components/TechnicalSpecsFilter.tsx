'use client';

import { useState, useEffect } from 'react';

interface TechnicalSpecsFilterProps {
  categoryId: string;
  onSpecsChange: (specs: Record<string, string>) => void;
  selectedSpecs?: Record<string, string>;
}

export default function TechnicalSpecsFilter({ 
  categoryId, 
  onSpecsChange, 
  selectedSpecs = {} 
}: TechnicalSpecsFilterProps) {
  const [specs, setSpecs] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [selectedValues, setSelectedValues] = useState<Record<string, string>>(selectedSpecs);

  // Fetch specs when category changes
  useEffect(() => {
    if (!categoryId) {
      setSpecs({});
      setSelectedValues({});
      return;
    }

    const fetchSpecs = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/categories/${categoryId}/specs`);
        if (!response.ok) {
          throw new Error('Failed to fetch technical specifications');
        }
        const data = await response.json();
        setSpecs(data);
      } catch (error) {
        console.error('Error fetching technical specs:', error);
        setSpecs({});
      } finally {
        setLoading(false);
      }
    };

    fetchSpecs();
  }, [categoryId]);

  // Reset selected values when specs change
  useEffect(() => {
    // Zadrži samo one odabrane vrijednosti koje još uvijek postoje u novim specifikacijama
    const newSelectedValues: Record<string, string> = {};
    
    Object.entries(selectedValues).forEach(([key, value]) => {
      if (specs[key] && specs[key].includes(value)) {
        newSelectedValues[key] = value;
      }
    });
    
    setSelectedValues(newSelectedValues);
    onSpecsChange(newSelectedValues);
  }, [specs]);

  const handleSpecChange = (specName: string, value: string) => {
    const newSelectedValues = { ...selectedValues };
    
    if (value) {
      newSelectedValues[specName] = value;
    } else {
      delete newSelectedValues[specName];
    }
    
    setSelectedValues(newSelectedValues);
    onSpecsChange(newSelectedValues);
  };

  // Ako nema kategorije ili specifikacija, ne prikazuj ništa
  if (!categoryId || Object.keys(specs).length === 0) {
    return null;
  }

  if (loading) {
    return (
      <div className="py-2 animate-pulse">
        {[1, 2].map(i => (
          <div key={i} className="h-10 bg-slate-200 rounded my-2"></div>
        ))}
      </div>
    );
  }

  // Sortiraj specifikacije po abecedi
  const sortedSpecs = Object.entries(specs).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="technical-specs-filter">
      <h3 className="font-medium text-slate-700 mb-3 pb-2 border-b border-slate-200">
        Tehničke specifikacije
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sortedSpecs.map(([specName, values]) => (
          <div key={specName} className="spec-filter">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {specName}
            </label>
            <div className="relative">
              <select
                value={selectedValues[specName] || ''}
                onChange={(e) => handleSpecChange(specName, e.target.value)}
                className="w-full px-3 py-2 bg-white/70 backdrop-blur-sm rounded-xl border border-white/50 shadow-sm text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange/50 transition-all duration-200"
              >
                <option value="">Sve</option>
                {values.sort().map(value => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
