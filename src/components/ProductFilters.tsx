'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';
import type { Category } from '@/generated/prisma/client';
import VehicleSelector from './vehicle-selector';
import CategoryHierarchy from './CategoryHierarchy';
import TechnicalSpecsFilter from './TechnicalSpecsFilter';
import CategoryAttributesFilter from './CategoryAttributesFilter';
import CrossReferenceFilter from './CrossReferenceFilter';
import { ChevronDown, ChevronUp, Filter, X, Sliders } from 'lucide-react';

interface ProductFiltersProps {
  categories: Category[];
  initialFilters: { [key: string]: any };
  showVehicleFilters?: boolean;
  showTechSpecs?: boolean;
  showHierarchy?: boolean;
}

export function ProductFilters({ 
  categories, 
  initialFilters, 
  showVehicleFilters = true,
  showTechSpecs = true,
  showHierarchy = true 
}: ProductFiltersProps) {
  const [filters, setFilters] = useState(initialFilters);
  const [techSpecs, setTechSpecs] = useState<Record<string, string>>({});
  const [categoryAttributes, setCategoryAttributes] = useState<Record<string, string>>({});
  const [crossReference, setCrossReference] = useState<string>('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    categories: true,
    vehicle: true,
    techSpecs: true,
    price: true,
    attributes: true,
    crossReference: true
  });
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  
  const router = useRouter();
  const pathname = usePathname();

  const handleFilterChange = useDebouncedCallback((key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    updateUrl(newFilters);
  }, 500);
  
  const handleTechSpecsChange = useDebouncedCallback((specs: Record<string, string>) => {
    setTechSpecs(specs);
    
    // Dodaj tehničke specifikacije u URL kao posebne parametre
    const newFilters = { ...filters };
    
    // Prvo ukloni sve postojeće spec_ parametre
    Object.keys(newFilters).forEach(key => {
      if (key.startsWith('spec_')) {
        delete newFilters[key];
      }
    });
    
    // Dodaj nove spec_ parametre
    Object.entries(specs).forEach(([specName, value]) => {
      if (value) {
        newFilters[`spec_${specName}`] = value;
      }
    });
    
    setFilters(newFilters);
    updateUrl(newFilters);
  }, 500);
  
  const handleCategoryAttributesChange = useDebouncedCallback((attributes: Record<string, string>) => {
    setCategoryAttributes(attributes);
    
    // Dodaj atribute kategorije u URL kao posebne parametre
    const newFilters = { ...filters };
    
    // Prvo ukloni sve postojeće attr_ parametre
    Object.keys(newFilters).forEach(key => {
      if (key.startsWith('attr_')) {
        delete newFilters[key];
      }
    });
    
    // Dodaj nove attr_ parametre
    Object.entries(attributes).forEach(([attrId, value]) => {
      if (value) {
        newFilters[`attr_${attrId}`] = value;
      }
    });
    
    setFilters(newFilters);
    updateUrl(newFilters);
  }, 500);
  
  const handleCrossReferenceChange = useDebouncedCallback((value: string) => {
    setCrossReference(value);
    
    const newFilters = { ...filters };
    
    if (value) {
      newFilters.crossRef = value;
    } else {
      delete newFilters.crossRef;
    }
    
    setFilters(newFilters);
    updateUrl(newFilters);
  }, 500);
  
  const updateUrl = (filterParams: Record<string, any>) => {
    const params = new URLSearchParams();
    Object.entries(filterParams).forEach(([filterKey, filterValue]) => {
      if (filterValue) {
        params.set(filterKey, String(filterValue));
      }
    });

    router.replace(`${pathname}?${params.toString()}`);
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const clearFilters = () => {
    setFilters({});
    setTechSpecs({});
    router.replace(pathname);
  };

  // Učitaj inicijalne tehničke specifikacije iz URL-a
  useEffect(() => {
    const initialSpecs: Record<string, string> = {};
    const initialAttributes: Record<string, string> = {};
    let initialCrossRef = '';
    
    Object.entries(initialFilters).forEach(([key, value]) => {
      if (key.startsWith('spec_') && typeof value === 'string') {
        const specName = key.replace('spec_', '');
        initialSpecs[specName] = value;
      } else if (key.startsWith('attr_') && typeof value === 'string') {
        const attrId = key.replace('attr_', '');
        initialAttributes[attrId] = value;
      } else if (key === 'crossRef' && typeof value === 'string') {
        initialCrossRef = value;
      }
    });
    
    setTechSpecs(initialSpecs);
    setCategoryAttributes(initialAttributes);
    setCrossReference(initialCrossRef);
  }, [initialFilters]);

  // Broj aktivnih filtera
  const activeFilterCount = Object.keys(filters).filter(key => {
    // Ne računaj categoryId kao filter ako koristimo hijerarhiju
    if (key === 'categoryId' && showHierarchy) return false;
    return filters[key] !== undefined && filters[key] !== '';
  }).length;

  return (
    <div className="relative">
      {/* Mobilni prikaz - toggle button */}
      <div className="lg:hidden mb-4">
        <button 
          onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
          className="w-full flex items-center justify-between px-4 py-3 bg-white/70 backdrop-blur-sm rounded-xl border border-white/50 shadow-sm text-slate-700 font-medium"
        >
          <div className="flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            <span>Filteri</span>
            {activeFilterCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-gradient-to-r from-orange to-brown text-white text-xs rounded-full">
                {activeFilterCount}
              </span>
            )}
          </div>
          {mobileFiltersOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      {/* Glavni kontejner za filtere */}
      <div className={`relative overflow-hidden bg-white/50 backdrop-blur-lg rounded-2xl border border-white/30 shadow-lg ${mobileFiltersOpen ? 'block' : 'hidden lg:block'}`}>
        {/* Decorative elements */}
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-gradient-to-br from-orange/10 to-brown/10 rounded-full filter blur-2xl -z-10"></div>
        <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-gradient-to-tl from-orange/10 to-brown/10 rounded-full filter blur-2xl -z-10"></div>
        
        {/* Header s brojem aktivnih filtera i gumbom za čišćenje */}
        <div className="flex items-center justify-between p-4 border-b border-white/30">
          <div className="flex items-center">
            <Sliders className="w-5 h-5 mr-2 text-slate-700" />
            <h2 className="text-lg font-medium text-slate-700">Filteri</h2>
            {activeFilterCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-gradient-to-r from-orange to-brown text-white text-xs rounded-full">
                {activeFilterCount}
              </span>
            )}
          </div>
          {(Object.keys(filters).length > 0 || Object.keys(techSpecs).length > 0) && (
            <button 
              onClick={clearFilters}
              className="flex items-center text-sm text-slate-600 hover:text-slate-900 transition-colors"
            >
              <X className="w-4 h-4 mr-1" />
              Očisti sve
            </button>
          )}
        </div>

        {/* Filter sections - organizirani u tri reda */}
        <div className="p-4 space-y-4">
          {/* 1. RED: Kategorije i cijena */}
          <div className="w-full flex flex-wrap gap-4">
            <div className="flex-1 bg-white/70 backdrop-blur-sm rounded-xl border border-white/50 shadow-sm overflow-hidden">
              <button 
                onClick={() => toggleSection('categories')}
                className="w-full flex items-center justify-between p-3 text-left font-medium text-slate-700 hover:bg-white/50 transition-colors"
              >
                <span>Kategorije</span>
                {expandedSections.categories ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              
              {expandedSections.categories && (
                <div className="p-3 pt-0 border-t border-white/30">
                  {showHierarchy ? (
                    <div className="max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                      <CategoryHierarchy 
                        onCategorySelect={(categoryId) => handleFilterChange('categoryId', categoryId)}
                        selectedCategoryId={filters.categoryId}
                      />
                    </div>
                  ) : (
                    <div className="py-2">
                      <div className="relative">
                        <select
                          id="category"
                          name="categoryId"
                          onChange={(e) => handleFilterChange('categoryId', e.target.value)}
                          value={filters.categoryId || ''}
                          className="w-full px-4 py-2.5 bg-white/70 backdrop-blur-sm rounded-xl border border-white/50 shadow-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange/50 transition-all duration-200"
                        >
                          <option value="">Sve kategorije</option>
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Cijena - sada dio prvog reda */}
            <div className="w-64 bg-white/70 backdrop-blur-sm rounded-xl border border-white/50 shadow-sm overflow-hidden">
              <button 
                onClick={() => toggleSection('price')}
                className="w-full flex items-center justify-between p-3 text-left font-medium text-slate-700 hover:bg-white/50 transition-colors"
              >
                <span>Cijena</span>
                {expandedSections.price ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              
              {expandedSections.price && (
                <div className="p-3 pt-0 border-t border-white/30">
                  <div className="grid grid-cols-2 gap-3 py-2">
                    {/* Min cijena */}
                    <div>
                      <label htmlFor="minPrice" className="block text-sm font-medium text-slate-700 mb-1">Minimalna</label>
                      <div className="relative">
                        <input
                          type="number"
                          id="minPrice"
                          name="minPrice"
                          placeholder="0"
                          onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                          value={filters.minPrice || ''}
                          className="w-full px-3 py-2 bg-white/70 backdrop-blur-sm rounded-xl border border-white/50 shadow-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange/50 transition-all duration-200"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-sm">KM</div>
                      </div>
                    </div>

                    {/* Max cijena */}
                    <div>
                      <label htmlFor="maxPrice" className="block text-sm font-medium text-slate-700 mb-1">Maksimalna</label>
                      <div className="relative">
                        <input
                          type="number"
                          id="maxPrice"
                          name="maxPrice"
                          placeholder="1000+"
                          onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                          value={filters.maxPrice || ''}
                          className="w-full px-3 py-2 bg-white/70 backdrop-blur-sm rounded-xl border border-white/50 shadow-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange/50 transition-all duration-200"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-sm">KM</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 2. RED: Vozilo */}
          {showVehicleFilters && (
            <div className="w-full">
              <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-white/50 shadow-sm overflow-hidden">
                <button 
                  onClick={() => toggleSection('vehicle')}
                  className="w-full flex items-center justify-between p-3 text-left font-medium text-slate-700 hover:bg-white/50 transition-colors"
                >
                  <span>Odabir vozila</span>
                  {expandedSections.vehicle ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                
                {expandedSections.vehicle && (
                  <div className="p-3 pt-0 border-t border-white/30">
                    <VehicleSelector 
                      layout="horizontal" 
                      onGenerationSelect={(id) => handleFilterChange('generationId', id)} 
                    />
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* 3. RED: Tehničke specifikacije */}
          {showTechSpecs && filters.categoryId && (
            <div className="filter-section mb-4">
              <div 
                className="flex items-center justify-between cursor-pointer py-2 border-b border-slate-200"
                onClick={() => toggleSection('techSpecs')}
              >
                <h3 className="font-medium text-slate-700 flex items-center">
                  <ChevronDown 
                    className={`h-4 w-4 mr-1 transition-transform ${expandedSections.techSpecs ? '' : '-rotate-90'}`} 
                  />
                  Tehničke specifikacije
                </h3>
              </div>
              
              {expandedSections.techSpecs && (
                <div className="mt-3">
                  <TechnicalSpecsFilter 
                    categoryId={filters.categoryId} 
                    onSpecsChange={handleTechSpecsChange}
                    selectedSpecs={techSpecs}
                  />
                </div>
              )}
            </div>
          )}
          
          {/* Atributi kategorije */}
          {filters.categoryId && (
            <div className="filter-section mb-4">
              <div 
                className="flex items-center justify-between cursor-pointer py-2 border-b border-slate-200"
                onClick={() => toggleSection('attributes')}
              >
                <h3 className="font-medium text-slate-700 flex items-center">
                  <ChevronDown 
                    className={`h-4 w-4 mr-1 transition-transform ${expandedSections.attributes ? '' : '-rotate-90'}`} 
                  />
                  Atributi
                </h3>
              </div>
              
              {expandedSections.attributes && (
                <div className="mt-3">
                  <CategoryAttributesFilter
                    categoryId={filters.categoryId}
                    onAttributesChange={handleCategoryAttributesChange}
                    selectedAttributes={categoryAttributes}
                  />
                </div>
              )}
            </div>
          )}
          
          {/* Cross-reference pretraga */}
          <div className="filter-section mb-4">
            <div 
              className="flex items-center justify-between cursor-pointer py-2 border-b border-slate-200"
              onClick={() => toggleSection('crossReference')}
            >
              <h3 className="font-medium text-slate-700 flex items-center">
                <ChevronDown 
                  className={`h-4 w-4 mr-1 transition-transform ${expandedSections.crossReference ? '' : '-rotate-90'}`} 
                />
                OEM / Aftermarket broj
              </h3>
            </div>
            
            {expandedSections.crossReference && (
              <div className="mt-3">
                <CrossReferenceFilter
                  onCrossReferenceChange={handleCrossReferenceChange}
                  initialValue={crossReference}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}