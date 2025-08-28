'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { X, Filter, Car, Settings, Layers, Truck, ShieldCheck, SprayCan, LifeBuoy, Droplets, Box, ChevronRight, ChevronDown, Search } from 'lucide-react';
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

// Komponenta za prikaz podkategorija u sidebaru (rekurzivna s expand/collapse)
const SubcategoryList = ({
  categories,
  selectedCategoryId,
  onCategorySelect,
  expandIds,
}: {
  categories: Category[];
  selectedCategoryId: string;
  onCategorySelect: (id: string) => void;
  expandIds?: string[];
}) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Initialize expanded nodes from expandIds when provided
  useEffect(() => {
    if (expandIds && expandIds.length > 0) {
      setExpanded(prev => {
        const next: Record<string, boolean> = { ...prev };
        for (const id of expandIds) next[id] = true;
        return next;
      });
    }
  }, [expandIds]);

  const toggle = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const renderNodes = (nodes: Category[], depth = 0) => (
    <div className={depth === 0 ? 'space-y-2' : 'space-y-1 ml-3'}>
      {nodes.map(category => {
        const hasChildren = !!(category.children && category.children.length > 0);
        const isOpen = !!expanded[category.id];
        const isSelected = category.id === selectedCategoryId;
        return (
          <div key={category.id} className="w-full">
            <div className={`flex items-center w-full text-left rounded-lg text-sm transition-all duration-200 border ${
              isSelected
                ? 'bg-sunfire-500/20 text-white border-sunfire-400 shadow-md shadow-sunfire-500/10 font-semibold'
                : 'text-slate-300 hover:bg-sunfire-500/10 hover:text-white border-transparent hover:border-sunfire-500/50'
            } ${depth === 0 ? 'px-3 py-2 lg:px-3.5 lg:py-2.5 bg-white/5 hover:bg-white/10' : 'px-3 py-2'}`}>
              {/* Chevron za expand/collapse */}
              <button
                type="button"
                aria-label={isOpen ? 'Sažmi' : 'Proširi'}
                onClick={(e) => { e.stopPropagation(); if (hasChildren) toggle(category.id); }}
                className={`mr-2 p-1 rounded hover:bg-sunfire-500/10 ${hasChildren ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
              >
                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>

              {/* Indikator */}
              <span className={`flex-shrink-0 w-2 h-2 mr-3 rounded-full transition-colors ${isSelected ? 'bg-sunfire-300' : 'bg-slate-500'}`}></span>

              {/* Naziv (klik za odabir) */}
              <button
                type="button"
                onClick={() => {
                  onCategorySelect(category.id);
                  if (hasChildren && !isOpen) setExpanded(prev => ({ ...prev, [category.id]: true }));
                }}
                className={`flex-1 text-left truncate ${depth === 0 ? 'text-[0.95rem] font-medium' : ''}`}
              >
                {category.name}
              </button>

              {/* Broj proizvoda */}
              {category.productCount && (
                <span className={`ml-3 px-2 py-0.5 text-xs rounded-full transition-colors ${isSelected
                  ? 'bg-sunfire-500/30 text-sunfire-100'
                  : 'bg-slate-700 text-slate-300'
                }`}>
                  {category.productCount}
                </span>
              )}
            </div>

            {/* Djeca */}
            {hasChildren && isOpen && (
              <div className="mt-1">
                {renderNodes(category.children!, depth + 1)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div
      className="subcategory-list max-h-[95vh] overflow-y-auto pr-2"
      style={{ maxHeight: '95vh', overflowY: 'auto' }}
      data-test="hf-subcat-v2"
    >
      {renderNodes(categories, 0)}
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
  // Pretraga podkategorija
  const [catSearch, setCatSearch] = useState('');
  
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
  // Pomoćna: pronađi put od root do zadanog ID-a
  const findPathToId = (nodes: Category[], targetId: string, path: Category[] = []): Category[] | null => {
    for (const node of nodes) {
      const newPath = [...path, node];
      if (node.id === targetId) return newPath;
      if (node.children && node.children.length > 0) {
        const res = findPathToId(node.children, targetId, newPath);
        if (res) return res;
      }
    }
    return null;
  };

  const selectedPath = useMemo(() => {
    if (!filters.categoryId) return null;
    return findPathToId(mainCategories, filters.categoryId) || null;
  }, [mainCategories, filters.categoryId]);

  const selectedMainCategory = useMemo(() => {
    if (!selectedPath || selectedPath.length === 0) return null;
    // prvi element u putu iz mainCategories je glavna kategorija
    return selectedPath[0] || null;
  }, [selectedPath]);

  // Filtriranje stabla kategorija po pretrazi (prikazuje samo grane koje se poklapaju)
  const { filteredSubcategories, expandIdsForSearch } = useMemo(() => {
    const result = { filteredSubcategories: [] as Category[], expandIdsForSearch: new Set<string>() };
    if (!selectedMainCategory || !catSearch.trim()) return result;

    const q = catSearch.trim().toLowerCase();

    const filterTree = (nodes: Category[], ancestors: string[]): Category[] => {
      const out: Category[] = [];
      for (const node of nodes) {
        const name = (node.name || '').toLowerCase();
        const children = node.children ? filterTree(node.children, [...ancestors, node.id]) : [];
        const isMatch = name.includes(q);
        if (isMatch || children.length > 0) {
          // Ako postoji poklapanje u potomcima, proširi sve pretke
          if (isMatch || children.length > 0) {
            for (const a of ancestors) result.expandIdsForSearch.add(a);
            // Također proširi i sam čvor da bi potomci bili vidljivi
            result.expandIdsForSearch.add(node.id);
          }
          out.push({ ...node, children });
        }
      }
      return out;
    };

    result.filteredSubcategories = filterTree(selectedMainCategory.children || [], [selectedMainCategory.id]);
    return result;
  }, [selectedMainCategory, catSearch]);

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
              <div className="w-full">
                <div className="flex w-full rounded-xl border border-white/10 overflow-x-auto flex-nowrap snap-x snap-mandatory">
                {mainCategories.map((category, idx) => {
                  const categoryIcons: { [key: string]: React.ComponentType<{ className?: string }> } = {
                    'teretna vozila': Truck,
                    // default fallback for Putnička vozila will be replaced by custom SVG below
                    'putnička vozila': Car,
                    'adr oprema': ShieldCheck,
                    'autopraonice': SprayCan,
                    'gume': LifeBuoy,
                    'motorna ulja': Droplets,
                  };

                  const nameLc = category.name.toLowerCase();
                  const usePassengerSvg = nameLc.includes('putnič') || nameLc.includes('putnick');
                  const useCommercialSvg = nameLc.includes('teret');
                  const useAdrSvg = nameLc.includes('adr');
                  const useWashSvg = nameLc.includes('autopraon');
                  const useTyresSvg = nameLc.includes('gume');
                  const useOilsSvg = nameLc.includes('ulja') || nameLc.includes('maziv');
                  const Icon = categoryIcons[nameLc] || Box;
                  const isSelected = selectedMainCategory?.id === category.id;

                  return (
                    <button
                      key={category.id}
                      onClick={() => handleMainCategorySelect(category)}
                      className={`group relative isolate z-0 flex flex-1 items-center justify-center px-3 py-2 sm:px-4 sm:py-3 md:py-4 text-white border-r border-white/10 transition-colors transition-shadow snap-start
                        ${isSelected ? 'accent-bg-is-selected' : 'bg-black/30 hover-pulse-sunfire'}
                        ${idx === 0 ? 'rounded-l-xl' : ''}
                        ${idx === mainCategories.length - 1 ? 'rounded-r-xl border-r-0' : ''}
                        hover:ring-2 hover:ring-sunfire-400/60
                      `}
                    >
                      {/* Inner content scales on hover to preserve connected pill edges */}
                      <div className="flex flex-col items-center gap-2 transition-transform duration-300 ease-in-out group-hover:scale-[1.03]">
                        {usePassengerSvg ? (
                          <img
                            src="/images/putnicka-vozila.svg"
                            alt="Putnička vozila"
                            className={`w-12 h-12 sm:w-16 sm:h-16 md:w-[5.25rem] md:h-[5.25rem] lg:w-[6rem] lg:h-[6rem] ${isSelected ? 'opacity-100 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'opacity-80 group-hover:opacity-100 group-hover:drop-shadow-[0_0_15px_rgba(255,217,128,1)]'}`}
                          />
                        ) : useCommercialSvg ? (
                          <img
                            src="/images/teretna-vozila.svg"
                            alt="Teretna vozila"
                            className={`w-12 h-12 sm:w-16 sm:h-16 md:w-[5.25rem] md:h-[5.25rem] lg:w-[6rem] lg:h-[6rem] ${isSelected ? 'opacity-100 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'opacity-80 group-hover:opacity-100 group-hover:drop-shadow-[0_0_15px_rgba(255,217,128,1)]'}`}
                          />
                        ) : useAdrSvg ? (
                          <img
                            src="/images/adr.svg"
                            alt="ADR oprema"
                            className={`w-12 h-12 sm:w-16 sm:h-16 md:w-[5.25rem] md:h-[5.25rem] lg:w-[6rem] lg:h-[6rem] ${isSelected ? 'opacity-100 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'opacity-80 group-hover:opacity-100 group-hover:drop-shadow-[0_0_15px_rgba(255,217,128,1)]'}`}
                          />
                        ) : useWashSvg ? (
                          <img
                            src="/images/autopraonice.svg"
                            alt="Autopraonice"
                            className={`w-12 h-12 sm:w-16 sm:h-16 md:w-[5.25rem] md:h-[5.25rem] lg:w-[6rem] lg:h-[6rem] ${isSelected ? 'opacity-100 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'opacity-80 group-hover:opacity-100 group-hover:drop-shadow-[0_0_15px_rgba(255,217,128,1)]'}`}
                          />
                        ) : useTyresSvg ? (
                          <img
                            src="/images/gume.svg"
                            alt="Gume"
                            className={`w-12 h-12 sm:w-16 sm:h-16 md:w-[5.25rem] md:h-[5.25rem] lg:w-[6rem] lg:h-[6rem] ${isSelected ? 'opacity-100 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'opacity-80 group-hover:opacity-100 group-hover:drop-shadow-[0_0_15px_rgba(255,217,128,1)]'}`}
                          />
                        ) : useOilsSvg ? (
                          <img
                            src="/images/uljaimaziva.svg"
                            alt="Ulja i maziva"
                            className={`w-12 h-12 sm:w-16 sm:h-16 md:w-[5.25rem] md:h-[5.25rem] lg:w-[6rem] lg:h-[6rem] ${isSelected ? 'opacity-100 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'opacity-80 group-hover:opacity-100 group-hover:drop-shadow-[0_0_15px_rgba(255,217,128,1)]'}`}
                          />
                        ) : (
                          <Icon className={`w-12 h-12 sm:w-16 sm:h-16 md:w-[5.25rem] md:h-[5.25rem] lg:w-[6rem] lg:h-[6rem] transition-all duration-300 ease-in-out ${isSelected ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'text-white/80 group-hover:text-sunfire-200 group-hover:drop-shadow-[0_0_15px_rgba(255,217,128,1)]'}`} />
                        )}
                        <span className="text-xs sm:text-sm md:text-[0.95rem] font-bold text-white text-center leading-tight">{category.name}</span>
                      </div>
                    </button>
                  );
                })}
                </div>
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
                      // Ako postoji specificirani motor, propagiraj i engineId; inače očisti engineId
                      updateFilter('engineId', data.engineId || '', 'Motor');
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
            <div className="bg-gradient-to-t from-black/60 to-transparent p-6 rounded-2xl border border-sunfire-500/30" data-test="hf-panel-v2">
              <div className="sticky top-0 z-10 -mx-6 px-6 pt-2 pb-3 bg-black/40 backdrop-blur border-b border-white/10 rounded-t-2xl">
                <div className="flex items-center mb-2">
                  <div className="p-2 rounded-lg mr-3 bg-sunfire-500/10 shadow-lg shadow-sunfire-500/10">
                    <Layers className="h-5 w-5 text-sunfire-300" />
                  </div>
                  <h3 className="font-bold text-white text-xl">Podkategorije</h3>
                </div>
                {/* Search input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
                  <input
                    type="text"
                    value={catSearch}
                    onChange={(e) => setCatSearch(e.target.value)}
                    placeholder="Pretraži kategorije…"
                    className="w-full pl-9 pr-8 py-2 rounded-md bg-white/10 text-white placeholder-white/60 border border-white/20 focus:outline-none focus:ring-2 focus:ring-sunfire-400/60 focus:border-sunfire-400/50"
                  />
                  {catSearch && (
                    <button
                      type="button"
                      onClick={() => setCatSearch('')}
                      aria-label="Očisti pretragu"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              <SubcategoryList 
                key={selectedMainCategory.id}
                categories={catSearch.trim() ? filteredSubcategories : selectedMainCategory.children}
                selectedCategoryId={filters.categoryId}
                onCategorySelect={handleSubcategorySelect}
                expandIds={catSearch.trim() ? Array.from(expandIdsForSearch) : selectedPath?.map(c => c.id)}
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
