'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { X, Filter, Car, Settings, Layers, Truck, ShieldCheck, SprayCan, LifeBuoy, Droplets, Box } from 'lucide-react';
import VehicleSelector from './vehicle/VehicleSelector';
import TechnicalSpecsFilter from './TechnicalSpecsFilter';
import { Button } from './ui/button';
import { Separator } from './ui/separator';

import { Category as PrismaCategory } from '@/generated/prisma/client';

// Tip za kategoriju sa djecom
export type Category = PrismaCategory & {
  children: Category[];
  productCount?: number;
};

// Komponenta za prikaz aktivnih filtera
const ActiveFilters = ({ filters, onRemove }: { 
  filters: { id: string; type: string; label: string }[]; 
  onRemove: (id: string) => void 
}) => {
  if (filters.length === 0) return null;
  
  // Posložimo filtre u željeni redoslijed za breadcrumb (vozilo -> kategorija -> ostalo)
  const order = ['Vozilo', 'Kategorija'];
  const sorted = [...filters].sort((a, b) => {
    const ia = order.indexOf(a.type);
    const ib = order.indexOf(b.type);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  return (
    <div className="active-filters mb-3">
      <div className="rounded-xl px-3 py-2 text-white bg-gradient-to-t from-black/60 to-transparent border border-white/10">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Filter className="h-4 w-4 text-sunfire-300 flex-shrink-0" />
            <div className="flex items-center flex-wrap text-sm text-white/90">
              {sorted.map((f, idx) => (
                <div key={f.id} className="flex items-center max-w-full">
                  {/* Segment */}
                  <span className="truncate">
                    {f.label}
                  </span>
                  <button
                    onClick={() => onRemove(f.id)}
                    className="ml-1 text-white/60 hover:text-white"
                    aria-label={`Ukloni ${f.type}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  {/* Separator osim za zadnji */}
                  {idx < sorted.length - 1 && (
                    <span className="mx-2 text-white/40">–</span>
                  )}
                </div>
              ))}
            </div>
          </div>
          <button
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold text-white bg-sunfire-500 hover:bg-sunfire-600 transition-colors shadow-sm"
            onClick={() => sorted.forEach(f => onRemove(f.id))}
          >
            <X className="h-3.5 w-3.5" />
            Očisti sve
          </button>
        </div>
      </div>
    </div>
  );
};

// Komponenta za prikaz podkategorija u sidebaru
const SubcategoryList = ({ 
  categories, 
  selectedCategoryId, 
  onCategorySelect 
}: { 
  categories: Category[]; 
  selectedCategoryId: string; 
  onCategorySelect: (id: string) => void 
}) => {
  return (
    <div className="subcategory-list">
      <div className="space-y-2">
        {categories.map(category => (
          <button
            key={category.id}
            data-category-id={category.id}
            onClick={() => onCategorySelect(category.id)}
            className={`group flex items-center w-full text-left px-4 py-3 rounded-lg text-sm transition-all duration-200 border ${category.id === selectedCategoryId
              ? 'bg-sunfire-500/20 text-white border-sunfire-400 shadow-md shadow-sunfire-500/10 font-semibold'
              : 'text-slate-300 hover:bg-sunfire-500/10 hover:text-white border-transparent hover:border-sunfire-500/50'
            }`}
          >
            {/* Indikator */}
            <span className={`flex-shrink-0 w-2 h-2 mr-3 rounded-full transition-colors ${category.id === selectedCategoryId ? 'bg-sunfire-300' : 'bg-slate-500 group-hover:bg-sunfire-400'}`}></span>
            
            {/* Naziv kategorije */}
            <span className="flex-1">{category.name}</span>
            
            {/* Broj proizvoda */}
            {category.productCount && (
              <span className={`ml-3 px-2 py-0.5 text-xs rounded-full transition-colors ${category.id === selectedCategoryId 
                ? 'bg-sunfire-500/30 text-sunfire-100' 
                : 'bg-slate-700 text-slate-300 group-hover:bg-sunfire-500/20 group-hover:text-sunfire-200'
              }`}>
                {category.productCount}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

import { VehicleBrand } from '@/generated/prisma/client';

interface HierarchicalFiltersProps {
  onFilterChange: (filters: any) => void;
  initialFilters?: any;
  displayMode?: 'full' | 'topOnly' | 'sidebarOnly';
  categories: Category[];
  brands: VehicleBrand[];
}

export default function HierarchicalFilters({ 
  onFilterChange, 
  initialFilters = {},
  displayMode = 'full',
  categories,
  brands
}: HierarchicalFiltersProps) {
  // Stanje za kategorije
  const [mainCategories, setMainCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Odabrana glavna kategorija će se izračunati ispod nakon što definiramo filters stanje
  
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

  // Sinkroniziraj lokalne filtere kada se promijeni initialFilters
  useEffect(() => {
    setFilters(prevFilters => ({
      ...prevFilters,
      ...initialFilters,
      categoryId: initialFilters.categoryId || '',
      generationId: initialFilters.generationId || '',
    }));
  }, [initialFilters]);

  // Postavljanje glavnih kategorija iz propsa
  useEffect(() => {
    if (categories) {
            const main = categories.filter(cat => cat.parentId === null);
      setMainCategories(main);
    }
  }, [categories]);

  // selectedMainCategory se računa preko useMemo iznad, nije potreban dodatni efekt

  // Funkcija za pronalaženje kategorije po ID-u
  const findCategoryById = (cats: Category[], id: string): Category | null => {
    for (const cat of cats) {
      if (cat.id === id) return cat;
      if (cat.children && cat.children.length > 0) {
        const found = findCategoryById(cat.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  // Odabrana glavna kategorija izvedena iz filters.categoryId i stabla kategorija
  const selectedMainCategory = useMemo(() => {
    if (!filters.categoryId) return null;
    
    const selectedCat = findCategoryById(categories, filters.categoryId);
    if (!selectedCat) return null;

    // Ako je odabrana kategorija podkategorija (ima parentId), 
    // pronađi i vrati njenog roditelja kao glavnu kategoriju.
    if (selectedCat.parentId) {
      // Iteriramo kroz glavne kategorije da pronađemo roditelja
      for (const mainCat of mainCategories) {
        if (mainCat.id === selectedCat.parentId) {
          return mainCat;
        }
      }
    }
    
    // Ako odabrana kategorija nema roditelja, ona je glavna kategorija.
    return selectedCat;
  }, [categories, mainCategories, filters.categoryId]);

  // Izvedi tip vozila iz odabrane glavne kategorije
  const derivedVehicleType = useMemo<'PASSENGER' | 'COMMERCIAL' | 'ALL'>(() => {
    if (!selectedMainCategory) return 'ALL';
    const n = (selectedMainCategory.name || '').toLowerCase();
    // Ako naziv sadrži "teret", tretiramo kao COMMERCIAL
    if (n.includes('teret')) return 'COMMERCIAL';
    // Ako naziv sadrži "putnič"/"putnick", tretiramo kao PASSENGER
    if (n.includes('putnič') || n.includes('putnick') || n.includes('putnic')) return 'PASSENGER';
    return 'ALL';
  }, [selectedMainCategory]);

  // Funkcija za ažuriranje filtera
  const updateFilter = (key: string, value: any, type: string, label?: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));

    // Ažuriranje aktivnih filtera
    if (value && label) {
      setActiveFilters(prev => {
        // Ukloni postojeći filter istog tipa (npr. 'Kategorija') ako postoji
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

  // Funkcija za odabir glavne kategorije
  const handleMainCategorySelect = (category: Category) => {
    // Ispravak: Koristimo 'categoryId' kao ključ, a 'Kategorija' kao tip za prikaz
    updateFilter('categoryId', category.id, 'Kategorija', category.name);
    console.log('Selected main category:', category.id, category.name);
  };

  // Funkcija za odabir podkategorije
  const handleSubcategorySelect = (categoryId: string) => {
    const category = findCategoryById(categories, categoryId);
    if (category) {
      // Labela uključuje i glavnu kategoriju kako bi se sve prikazalo u jednoj traci aktivnih filtera
      const parentLabel = selectedMainCategory?.name ? `${selectedMainCategory.name} › ${category.name}` : category.name;
      updateFilter('categoryId', categoryId, 'Kategorija', parentLabel);
      console.log('Selected subcategory:', categoryId, parentLabel);
    }
  };

  // Efekt za obavještavanje o promjenama filtera
  // Koristimo useRef za praćenje prethodnih filtera kako bismo izbjegli beskonačnu petlju
  const prevFiltersRef = useRef(filters);
  
  useEffect(() => {
    // Usporedimo trenutne filtere s prethodnima da izbjegnemo nepotrebna ažuriranja
    const hasChanged = JSON.stringify(prevFiltersRef.current) !== JSON.stringify(filters);
    
    if (hasChanged) {
      console.log('Sending filters to parent:', filters);
      prevFiltersRef.current = filters;
      onFilterChange(filters);
    }
  }, [filters, onFilterChange]);

  // Loading stanje
  if (loading) {
    return (
      <div className="hierarchical-filters bg-white/30 backdrop-blur-md rounded-xl p-4 shadow-lg border border-white/50">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200/50 rounded-xl w-full"></div>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-10 bg-slate-200/50 rounded-xl w-24"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Određujemo što prikazati ovisno o displayMode
  const renderTopContent = displayMode === 'full' || displayMode === 'topOnly';
  const renderSidebarContent = displayMode === 'full' || displayMode === 'sidebarOnly';
  
  return (
    <div className="hierarchical-filters">
      {/* Aktivni filteri se prikazuju samo u 'full' modu */}
      {displayMode === 'full' && activeFilters.length > 0 && (
        <div className="mb-4">
          <ActiveFilters filters={activeFilters} onRemove={removeFilter} />
        </div>
      )}
      
      {/* Gornji dio (glavne kategorije i selektor vozila) */}
      {renderTopContent && (
        <div className="top-filters">
          {/* Clean glavne kategorije */}
          <div className="main-categories">
            <div className="rounded-2xl p-6 text-white bg-gradient-to-t from-black/60 to-transparent border border-white/10 mb-6">
              <h3 className="text-xl font-bold text-white mb-6 text-center">Kategorije proizvoda</h3>
              <div className="flex flex-wrap justify-center gap-4">
                {mainCategories.map((category) => {
                  const categoryIcons: { [key: string]: React.ComponentType<{ className?: string }> } = {
                    'teretna vozila': Truck,
                    'putnička vozila': Car,
                    'adr oprema': ShieldCheck,
                    'autopraonice': SprayCan,
                    'gume': LifeBuoy,
                    'motorna ulja': Droplets,
                  };

                  const Icon = categoryIcons[category.name.toLowerCase()] || Box;
                  const isSelected = selectedMainCategory?.id === category.id;

                  return (
                    <button
                      key={category.id}
                      onClick={() => handleMainCategorySelect(category)}
                      className={`
                        group relative flex flex-col items-center justify-center p-4 rounded-xl border text-center w-32 h-28 text-white transform-gpu transition-transform duration-300 hover:scale-105
                        ${isSelected
                          ? 'accent-bg-is-selected border-transparent shadow-lg scale-105'
                          : 'bg-black/30 border-white/20 hover-pulse-sunfire'
                        }
                      `}
                    >
                      {/* Icon Container */}
                      <div className="flex items-center justify-center w-12 h-12 rounded-lg mb-2 transition-all duration-300">
                        <Icon className={`
                          w-7 h-7 transition-all duration-300 ease-in-out
                          ${isSelected ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'text-white/80 group-hover:text-sunfire-200 group-hover:drop-shadow-[0_0_15px_rgba(255,217,128,1)]'}
                        `} />
                      </div>
                      
                      {/* Name */}
                      <span className="text-sm font-bold transition-colors duration-300 text-white">
                        {category.name}
                      </span>
                    </button>
                  );
                })}

              </div>
            </div>
          </div>
          
          {/* Clean odabir vozila (prikaži samo za Teretna/Putnička) */}
          {derivedVehicleType !== 'ALL' && (
            <div className="vehicle-selector">
              <div className="bg-gradient-to-t from-black/60 to-transparent p-6 rounded-2xl">
                <div className="flex items-center mb-4">
                  <div className="p-2 rounded-lg mr-3">
                    <Car className="h-6 w-6 text-sunfire-300" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Odabir vozila</h3>
                </div>
                
                <VehicleSelector 
                  onVehicleSelect={(data) => {
                    if (data.generationId) {
                      // Ispravak: Poziv s ispravnim argumentima
                      updateFilter('generationId', data.generationId, 'Vozilo', `Odabrano`);
                    }
                  }}
                  compact={true}
                  vehicleType={derivedVehicleType}
                />
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Clean sidebar sa podkategorijama i filterima */}
      {renderSidebarContent && selectedMainCategory && (
        <div className="sidebar-filters space-y-6">
          {/* Podkategorije ako postoje */}
          {selectedMainCategory.children && selectedMainCategory.children.length > 0 && (
            <div className="bg-gradient-to-t from-black/60 to-transparent p-6 rounded-2xl border border-sunfire-500/30">
              <div className="flex items-center mb-4">
                <div className="p-2 rounded-lg mr-3 bg-sunfire-500/10 shadow-lg shadow-sunfire-500/10">
                  <Layers className="h-5 w-5 text-sunfire-300" />
                </div>
                <h3 className="font-bold text-white text-xl">Podkategorije</h3>
              </div>
              <SubcategoryList 
                key={selectedMainCategory.id}
                categories={selectedMainCategory.children}
                selectedCategoryId={filters.categoryId}
                onCategorySelect={handleSubcategorySelect}
              />
            </div>
          )}
          
          {/* Tehničke specifikacije */}
          <div className="technical-specs">
            <div className="bg-gradient-to-t from-black/60 to-transparent p-6 rounded-2xl border border-sunfire-500/30">
            <div className="flex items-center mb-4">
                <div className="p-2 rounded-lg mr-3 bg-sunfire-500/10 shadow-lg shadow-sunfire-500/10">
                  <Settings className="h-5 w-5 text-sunfire-300" />
              </div>
                <h3 className="font-bold text-white text-xl">Tehničke specifikacije</h3>
            </div>
            <TechnicalSpecsFilter 
              categoryId={filters.categoryId}
              onSpecsChange={(specs) => {
                // Ispravak: Poziv s ispravnim argumentima
                updateFilter('specs', specs, 'Specifikacija'); // Ne treba label jer se specifikacije ne prikazuju kao jedan tag
                
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
