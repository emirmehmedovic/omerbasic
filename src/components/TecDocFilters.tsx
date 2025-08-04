'use client';

import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronDown, Filter } from 'lucide-react';
import CategoryHierarchy from './CategoryHierarchy';
import VehicleSelector from './vehicle-selector';
import TechnicalSpecsFilter from './TechnicalSpecsFilter';

interface FilterSectionProps {
  title: string;
  children: React.ReactNode;
  isActive: boolean;
  onToggle: () => void;
}

// Komponenta za pojedinačnu sekciju filtera
const FilterSection = ({ title, children, isActive, onToggle }: FilterSectionProps) => {
  return (
    <div className="filter-section mb-4">
      <div 
        className="flex items-center justify-between cursor-pointer py-2 border-b border-slate-200"
        onClick={onToggle}
      >
        <h3 className="font-medium text-slate-700 flex items-center">
          <ChevronRight 
            className={`h-4 w-4 mr-1 transition-transform ${isActive ? 'rotate-90' : ''}`} 
          />
          {title}
        </h3>
      </div>
      
      {isActive && (
        <div className="mt-3">
          {children}
        </div>
      )}
    </div>
  );
};

// Komponenta za prikaz aktivnih filtera
const ActiveFilters = ({ filters, onRemove }: { 
  filters: { id: string; type: string; label: string }[]; 
  onRemove: (id: string) => void 
}) => {
  if (filters.length === 0) return null;
  
  return (
    <div className="active-filters mt-4 mb-6">
      <div className="flex items-center mb-2">
        <Filter className="h-4 w-4 mr-1 text-slate-500" />
        <h3 className="text-sm font-medium text-slate-700">Aktivni filteri</h3>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {filters.map(filter => (
          <div 
            key={filter.id}
            className="px-2 py-1 bg-white/70 backdrop-blur-sm rounded-lg flex items-center gap-1 text-xs border border-white/50 shadow-sm"
          >
            <span className="text-slate-500">{filter.type}:</span>
            <span className="font-medium">{filter.label}</span>
            <button 
              onClick={() => onRemove(filter.id)}
              className="ml-1 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        
        <button 
          onClick={() => filters.forEach(f => onRemove(f.id))}
          className="px-2 py-1 text-xs text-orange hover:text-brown transition-colors"
        >
          Očisti sve
        </button>
      </div>
    </div>
  );
};

interface TecDocFiltersProps {
  onFilterChange: (filters: any) => void;
  initialFilters?: any;
}

export default function TecDocFilters({ onFilterChange, initialFilters = {} }: TecDocFiltersProps) {
  // Stanje za aktivne sekcije filtera
  const [activeSections, setActiveSections] = useState({
    categories: true,
    vehicle: true,
    specs: true
  });
  
  // Stanje za aktivne filtere
  const [activeFilters, setActiveFilters] = useState<{ id: string; type: string; label: string }[]>([]);
  
  // Stanje za filtere
  const [filters, setFilters] = useState({
    categoryId: initialFilters.categoryId || '',
    makeId: initialFilters.makeId || '',
    modelId: initialFilters.modelId || '',
    generationId: initialFilters.generationId || '',
    engineId: initialFilters.engineId || '',
    specs: initialFilters.specs || {}
  });
  
  // Funkcija za promjenu stanja sekcije
  const toggleSection = (section: 'categories' | 'vehicle' | 'specs') => {
    setActiveSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  // Funkcija za ažuriranje filtera
  const updateFilter = (type: string, value: any, label?: string) => {
    setFilters(prev => ({
      ...prev,
      [type]: value
    }));
    
    // Ažuriranje aktivnih filtera
    if (value && label) {
      setActiveFilters(prev => {
        // Ukloni postojeći filter istog tipa ako postoji
        const filtered = prev.filter(f => f.type !== type);
        // Dodaj novi filter
        return [...filtered, { id: `${type}-${value}`, type, label }];
      });
    } else {
      // Ukloni filter ako je vrijednost prazna
      setActiveFilters(prev => prev.filter(f => f.type !== type));
    }
  };
  
  // Funkcija za uklanjanje filtera
  const removeFilter = (id: string) => {
    const [type] = id.split('-');
    
    setFilters(prev => ({
      ...prev,
      [type]: type === 'specs' ? {} : ''
    }));
    
    setActiveFilters(prev => prev.filter(f => f.id !== id));
  };
  
  // Efekt za obavještavanje o promjenama filtera
  useEffect(() => {
    onFilterChange(filters);
  }, [filters, onFilterChange]);
  
  return (
    <div className="tecdoc-filters bg-white/30 backdrop-blur-md rounded-xl p-4 shadow-lg border border-white/50">
      <ActiveFilters filters={activeFilters} onRemove={removeFilter} />
      
      <FilterSection 
        title="Kategorije" 
        isActive={activeSections.categories}
        onToggle={() => toggleSection('categories')}
      >
        <CategoryHierarchy 
          onCategorySelect={(categoryId) => {
            const selectedCategory = document.querySelector(`button[data-category-id="${categoryId}"]`);
            const categoryName = selectedCategory?.textContent || 'Odabrana kategorija';
            updateFilter('categoryId', categoryId, categoryName);
          }}
          selectedCategoryId={filters.categoryId}
        />
      </FilterSection>
      
      <FilterSection 
        title="Odabir vozila" 
        isActive={activeSections.vehicle}
        onToggle={() => toggleSection('vehicle')}
      >
        <VehicleSelector 
          onGenerationSelect={(generationId: string) => {
            updateFilter('generationId', generationId, `Vozilo: Odabrano`);
          }}
          layout="horizontal"
          rememberSelection={true}
        />
      </FilterSection>
      
      <FilterSection 
        title="Tehničke specifikacije" 
        isActive={activeSections.specs}
        onToggle={() => toggleSection('specs')}
      >
        <TechnicalSpecsFilter 
          categoryId={filters.categoryId}
          onSpecsChange={(specs) => {
            updateFilter('specs', specs);
            
            // Dodaj aktivne filtere za specifikacije
            Object.entries(specs).forEach(([key, value]) => {
              if (value) {
                const label = `${key}: ${value}`;
                setActiveFilters(prev => {
                  const filtered = prev.filter(f => f.id !== `specs-${key}`);
                  return [...filtered, { id: `specs-${key}`, type: 'Specifikacija', label }];
                });
              }
            });
          }}
          selectedSpecs={filters.specs}
        />
      </FilterSection>
    </div>
  );
}
