'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { X, Filter, Car, Settings, Layers, Truck, ShieldCheck, SprayCan, LifeBuoy, Droplets, Box, ChevronRight, ChevronDown, Search } from 'lucide-react';
import VehicleSelector from './vehicle/VehicleSelector';
import { Button } from './ui/button';
import { Separator } from './ui/separator';

import { Category as PrismaCategory } from '@/generated/prisma/client';

// Tip za kategoriju sa djecom
export type Category = PrismaCategory & {
  children: Category[];
  productCount?: number;
};

// Komponenta za prikaz aktivnih filtera
const ActiveFilters = ({ filters, onRemove, onClearAll }: { 
  filters: { id: string; type: string; label: string }[]; 
  onRemove: (id: string) => void;
  onClearAll?: () => void;
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
    <div className="active-filters mb-4">
      <div className="rounded-2xl px-4 py-3 bg-white/80 backdrop-blur-sm border border-white/60 shadow-lg">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Filter className="h-4 w-4 text-[#FF6B35] flex-shrink-0" />
            <div className="flex items-center flex-wrap text-sm text-slate-700 font-medium">
              {sorted.map((f, idx) => (
                <div key={f.id} className="flex items-center max-w-full">
                  {/* Segment */}
                  <span className="truncate">
                    {f.label}
                  </span>
                  <button
                    onClick={() => onRemove(f.id)}
                    className="ml-1 text-slate-500 hover:text-slate-800 transition-colors"
                    aria-label={`Ukloni ${f.type}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  {/* Separator osim za zadnji */}
                  {idx < sorted.length - 1 && (
                    <span className="mx-2 text-slate-400">›</span>
                  )}
                </div>
              ))}
            </div>
          </div>
          <button
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-primary via-primary-dark to-primary hover:shadow-2xl transform hover:-translate-y-0.5 transition-all duration-300 shadow-xl"
            onClick={() => { if (onClearAll) onClearAll(); else sorted.forEach(f => onRemove(f.id)); }}
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
  className,
}: {
  categories: Category[];
  selectedCategoryId: string;
  onCategorySelect: (id: string) => void;
  expandIds?: string[];
  className?: string;
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
            <div className={`flex items-center w-full text-left rounded-xl text-sm transition-all duration-300 border ${
              isSelected
                ? 'bg-gradient-to-r from-primary/10 via-primary-dark/10 to-primary/10 text-primary border-primary shadow-lg font-bold'
                : 'text-slate-700 hover:bg-gradient-to-r hover:from-[#0c1c3a]/10 hover:to-transparent hover:text-[#0c1c3a] hover:shadow-lg hover:shadow-[#0c1c3a]/20 hover:border-l-4 hover:border-l-[#0c1c3a] hover:translate-x-1 border-white/60 bg-white/70 backdrop-blur-sm'
            } ${depth === 0 ? 'px-3 py-2.5 lg:px-4 lg:py-3' : 'px-3 py-2'}`}>
              {/* Chevron za expand/collapse */}
              <button
                type="button"
                aria-label={isOpen ? 'Sažmi' : 'Proširi'}
                onClick={(e) => { e.stopPropagation(); if (hasChildren) toggle(category.id); }}
                className={`mr-2 p-1 rounded hover:bg-sunfire-50 ${hasChildren ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
              >
                {isOpen ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-500" />}
              </button>

              {/* Indikator */}
              <span className={`flex-shrink-0 w-2 h-2 mr-3 rounded-full transition-colors ${isSelected ? 'bg-gradient-to-r from-primary via-primary-dark to-primary' : 'bg-slate-300'}`}></span>

              {/* Naziv (klik za odabir) */}
              <button
                type="button"
                onClick={() => {
                  onCategorySelect(category.id);
                  if (hasChildren && !isOpen) setExpanded(prev => ({ ...prev, [category.id]: true }));
                }}
                className={`flex-1 text-left truncate ${depth === 0 ? 'text-[0.95rem] font-bold' : 'font-medium'}`}
              >
                {category.name}
              </button>

              {/* Broj proizvoda */}
              {category.productCount && (
                <span className={`ml-3 px-2.5 py-1 text-xs rounded-full font-bold transition-all duration-300 shadow-sm ${isSelected
                  ? 'bg-gradient-to-r from-primary via-primary-dark to-primary text-white shadow-xl'
                  : 'bg-white/70 backdrop-blur-sm text-slate-700 border border-white/60'
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
      className={`subcategory-list max-h-[95vh] lg:max-h-[120vh] overflow-y-auto pr-2 ${className ?? ''}`}
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
  enableMobileStickyBar?: boolean;
  categories: Category[];
  brands: VehicleBrand[];
}

export default function HierarchicalFilters({ 
  onFilterChange, 
  initialFilters = {},
  displayMode = 'full',
  enableMobileStickyBar = false,
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

  const [vehicleSelectorResetKey, setVehicleSelectorResetKey] = useState(0);
  const [mobileSubcatsOpen, setMobileSubcatsOpen] = useState(false);
  const [mobileVehicleOpen, setMobileVehicleOpen] = useState(false);

  // Sinkroniziraj lokalne filtere kada se promijene pojedinačne vrijednosti initialFilters,
  // ali nemoj prebrisati korisnički izbor s praznim vrijednostima.
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      ...(initialFilters || {}),
      categoryId: initialFilters.categoryId !== undefined ? initialFilters.categoryId : prev.categoryId,
      generationId: initialFilters.generationId !== undefined ? initialFilters.generationId : prev.generationId,
      engineId: initialFilters.engineId !== undefined ? initialFilters.engineId : prev.engineId,
      specs: initialFilters.specs !== undefined ? initialFilters.specs : prev.specs,
    }));

    // Inicijalizuj aktivne filtere samo kada initialFilters eksplicitno sadrži vrijednosti
    const chips: { id: string; type: string; label: string }[] = [];
    if (initialFilters.categoryId) {
      const cat = findCategoryById(categories, initialFilters.categoryId);
      if (cat) chips.push({ id: `Kategorija-${initialFilters.categoryId}`, type: 'Kategorija', label: cat.name });
    }
    if (initialFilters.generationId) {
      chips.push({ id: `Vozilo-${initialFilters.generationId}`, type: 'Vozilo', label: 'Odabrano vozilo' });
    }
    if (initialFilters.engineId) {
      chips.push({ id: `Motor-${initialFilters.engineId}`, type: 'Motor', label: 'Specifičan motor' });
    }
    if (chips.length) setActiveFilters(chips);
  }, [
    initialFilters?.categoryId,
    initialFilters?.generationId,
    initialFilters?.engineId,
    JSON.stringify(initialFilters?.specs)
  ]);

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
    // 1) Direktno poklapanje po ID-u u glavnim kategorijama
    const direct = mainCategories.find((c) => c.id === (filters.categoryId as any));
    if (direct) return direct;
    // 2) Fallback na izračunatu putanju (ako je dostupna)
    if (!selectedPath || selectedPath.length === 0) return null;
    return selectedPath[0] || null;
  }, [mainCategories, filters.categoryId, selectedPath]);

  // Osiguraj da uvijek imamo puni čvor glavne kategorije sa djecom (iz stabla)
  const selectedMainCategoryFull = useMemo(() => {
    if (!selectedMainCategory) return null;
    // Pretraži kroz cijelo stablo polazeći od root-ova (mainCategories)
    return findCategoryById(mainCategories, selectedMainCategory.id) || selectedMainCategory;
  }, [selectedMainCategory, mainCategories]);

  // Filtriranje stabla kategorija po pretrazi (prikazuje samo grane koje se poklapaju)
  const { filteredSubcategories, expandIdsForSearch } = useMemo(() => {
    const result = { filteredSubcategories: [] as Category[], expandIdsForSearch: new Set<string>() };
    if (!selectedMainCategoryFull || !catSearch.trim()) return result;

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

    result.filteredSubcategories = filterTree(selectedMainCategoryFull.children || [], [selectedMainCategoryFull.id]);
    return result;
  }, [selectedMainCategoryFull, catSearch]);

  // Izvedi tip vozila iz odabrane glavne kategorije
  const derivedVehicleType = useMemo<'PASSENGER' | 'COMMERCIAL' | 'ALL'>(() => {
    if (!selectedMainCategoryFull) return 'ALL';
    const n = (selectedMainCategoryFull.name || '').toLowerCase();
    // Ako naziv sadrži "teret", tretiramo kao COMMERCIAL
    if (n.includes('teret')) return 'COMMERCIAL';
    // Ako naziv sadrži "putnič"/"putnick", tretiramo kao PASSENGER
    if (n.includes('putnič') || n.includes('putnick') || n.includes('putnic')) return 'PASSENGER';
    return 'ALL';
  }, [selectedMainCategoryFull]);

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
    // Koristi isti pristup kao u staroj verziji: samo postavi categoryId preko updateFilter
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
      <div className="hierarchical-filters relative overflow-hidden rounded-3xl p-8 bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 shadow-xl">
        <div className="pointer-events-none absolute inset-0 z-0 opacity-[0.04]"
             style={{
               backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(27,58,95,0.2) 1px, transparent 0), radial-gradient(circle at 50% 50%, rgba(255,107,53,0.08) 0%, transparent 70%)',
               backgroundSize: '32px 32px, 100% 100%'
             }} />
        <div className="relative z-10 animate-pulse space-y-4">
          <div className="h-8 bg-white/70 backdrop-blur-sm rounded-2xl w-full shadow-sm"></div>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-10 bg-white/70 backdrop-blur-sm rounded-xl w-24 shadow-sm"></div>
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
          <ActiveFilters 
            filters={activeFilters} 
            onRemove={removeFilter}
            onClearAll={() => {
              const rootId = selectedPath && selectedPath.length > 0 ? selectedPath[0].id : filters.categoryId;
              const rootCat = rootId ? findCategoryById(categories, rootId) : null;
              setFilters(prev => ({
                ...prev,
                categoryId: rootId || '',
                makeId: '',
                modelId: '',
                generationId: '',
                engineId: '',
                specs: {}
              }));
              setActiveFilters(() => {
                const chips: { id: string; type: string; label: string }[] = [];
                if (rootId && rootCat) chips.push({ id: `Kategorija-${rootId}`, type: 'Kategorija', label: rootCat.name });
                return chips;
              });
              setVehicleSelectorResetKey(k => k + 1);
            }}
          />
        </div>
      )}
      
      {/* Gornji dio (glavne kategorije i selektor vozila) */}
      {renderTopContent && (
        <div className="top-filters">
          {/* Clean glavne kategorije */}
          <div className="main-categories">
            <div className="relative overflow-hidden rounded-3xl p-8 bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 shadow-xl mb-6">
              <div className="pointer-events-none absolute inset-0 z-0 opacity-[0.04]"
                   style={{
                     backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(27,58,95,0.2) 1px, transparent 0), radial-gradient(circle at 50% 50%, rgba(255,107,53,0.08) 0%, transparent 70%)',
                     backgroundSize: '32px 32px, 100% 100%'
                   }} />
              <h3 className="relative z-10 text-2xl font-bold text-primary mb-6 text-center">Kategorije proizvoda</h3>
              <div className="relative z-10 w-full">
                <div className="flex w-full rounded-xl border border-slate-200 overflow-x-auto flex-nowrap snap-x snap-mandatory">
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
                      className={`group relative z-10 flex flex-1 items-center justify-center px-3 py-2 sm:px-4 sm:py-3 md:py-4 border-r transition-all duration-300 snap-start
                        ${isSelected 
                          ? 'bg-gradient-to-r from-primary via-primary-dark to-primary text-white border-primary-dark shadow-2xl ring-2 ring-primary/50 -translate-y-1' 
                          : 'bg-white/80 backdrop-blur-sm border-white/40 text-slate-900 hover:bg-white hover:shadow-xl hover:-translate-y-1'
                        }
                        ${idx === 0 ? 'rounded-l-2xl' : ''}
                        ${idx === mainCategories.length - 1 ? 'rounded-r-2xl border-r-0' : ''}
                      `}
                    >
                      {/* Inner content scales on hover to preserve connected pill edges */}
                      <div className="flex flex-col items-center gap-3 transition-transform duration-300 ease-in-out group-hover:scale-[1.05]">
                        <div className={`flex items-center justify-center rounded-2xl shadow-lg w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 transition-all duration-300 ${isSelected ? 'bg-gradient-to-br from-primary to-primary-dark shadow-primary/50' : 'bg-[#0c1c3a] group-hover:shadow-xl'}`}>
                          {usePassengerSvg ? (
                            <img
                              src="/images/putnicka-vozila.svg"
                              alt="Putnička vozila"
                              className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 opacity-90"
                            />
                          ) : useCommercialSvg ? (
                            <img
                              src="/images/teretna-vozila.svg"
                              alt="Teretna vozila"
                              className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 opacity-90"
                            />
                          ) : useAdrSvg ? (
                            <img
                              src="/images/adr.svg"
                              alt="ADR oprema"
                              className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 opacity-90"
                            />
                          ) : useWashSvg ? (
                            <img
                              src="/images/autopraonice.svg"
                              alt="Autopraonice"
                              className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 opacity-90"
                            />
                          ) : useTyresSvg ? (
                            <img
                              src="/images/gume.svg"
                              alt="Gume"
                              className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 opacity-90"
                            />
                          ) : useOilsSvg ? (
                            <img
                              src="/images/uljaimaziva.svg"
                              alt="Ulja i maziva"
                              className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 opacity-90"
                            />
                          ) : (
                            <Icon className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 text-white" />
                          )}
                        </div>
                        <div className="relative">
                          <span className="text-xs sm:text-sm md:text-[0.95rem] font-bold text-center leading-tight">
                            {category.name}
                          </span>
                          {isSelected && (
                            <div className="absolute -top-1 -right-2 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-lg animate-in zoom-in duration-300">
                              <svg className="w-2.5 h-2.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                        </div>
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
            <div className="hidden lg:block">
              <VehicleSelector 
                key={`vehsel-${vehicleSelectorResetKey}-${filters.categoryId}`}
                onVehicleSelect={(data) => {
                  if (data.generationId) {
                    // Ispravak: Poziv s ispravnim argumentima
                    updateFilter('generationId', data.generationId, 'Vozilo', `Odabrano`);
                    // Ako postoji specificirani motor, propagiraj i engineId; inače očisti engineId
                    updateFilter('engineId', data.engineId || '', 'Motor');
                  }
                }}
                compact={true}
                appearance="light"
                vehicleType={derivedVehicleType}
              />
            </div>
          )}
        </div>
      )}
      
      {/* Clean sidebar sa podkategorijama i filterima */}
      {renderSidebarContent && selectedMainCategoryFull && (
        <div className="sidebar-filters space-y-6">
          {/* Podkategorije ako postoje */}
          {selectedMainCategoryFull.children && selectedMainCategoryFull.children.length > 0 && (
            <>
              <div className="relative overflow-hidden p-6 rounded-3xl bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 shadow-xl hidden lg:block" data-test="hf-panel-v2">
                <div className="pointer-events-none absolute inset-0 z-0 opacity-[0.04]"
                     style={{
                       backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(27,58,95,0.2) 1px, transparent 0), radial-gradient(circle at 50% 50%, rgba(255,107,53,0.08) 0%, transparent 70%)',
                       backgroundSize: '32px 32px, 100% 100%'
                     }} />
                <div className="relative z-10">
                  <div className="sticky top-0 z-10 -mx-6 px-6 pt-3 pb-4 bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 backdrop-blur-sm border-b border-white/40 rounded-t-3xl">
                    <div className="flex items-center mb-3">
                      <div className="p-2.5 rounded-2xl mr-3 bg-gradient-to-br from-[#E85A28] to-[#FF6B35] shadow-xl">
                        <Layers className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="font-bold text-primary text-xl">Podkategorije</h3>
                    </div>
                    {/* Search input */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#FF6B35]" />
                      <input
                        type="text"
                        value={catSearch}
                        onChange={(e) => setCatSearch(e.target.value)}
                        placeholder="Pretraži kategorije…"
                        className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-white/90 backdrop-blur-sm text-slate-900 placeholder:text-slate-500 border border-white/60 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35] transition-all duration-300"
                      />
                      {catSearch && (
                        <button
                          type="button"
                          onClick={() => setCatSearch('')}
                          aria-label="Očisti pretragu"
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <SubcategoryList 
                    key={selectedMainCategoryFull.id}
                    categories={catSearch.trim() ? filteredSubcategories : selectedMainCategoryFull.children}
                    selectedCategoryId={filters.categoryId}
                    onCategorySelect={handleSubcategorySelect}
                    expandIds={catSearch.trim() ? Array.from(expandIdsForSearch) : selectedPath?.map(c => c.id)}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {enableMobileStickyBar && (
        <>
          {mobileSubcatsOpen && selectedMainCategoryFull && (
            <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
              <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                onClick={() => setMobileSubcatsOpen(false)}
              />
              <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] rounded-t-3xl bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 shadow-2xl border-t border-white/60">
                <div className="px-5 pt-4 pb-3 border-b border-white/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-gradient-to-br from-[#E85A28] to-[#FF6B35] shadow-md">
                        <Layers className="h-4 w-4 text-white" />
                      </div>
                      <h3 className="font-bold text-primary text-lg">Podkategorije</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMobileSubcatsOpen(false)}
                      className="p-2 rounded-xl bg-white/80 border border-white/60 shadow-sm text-slate-600 hover:text-slate-900"
                      aria-label="Zatvori"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="relative mt-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#FF6B35]" />
                    <input
                      type="text"
                      value={catSearch}
                      onChange={(e) => setCatSearch(e.target.value)}
                      placeholder="Pretraži kategorije…"
                      className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-white/90 backdrop-blur-sm text-slate-900 placeholder:text-slate-500 border border-white/60 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35] transition-all duration-300"
                    />
                    {catSearch && (
                      <button
                        type="button"
                        onClick={() => setCatSearch('')}
                        aria-label="Očisti pretragu"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="px-5 pb-5 pt-4">
                  <SubcategoryList 
                    key={`mobile-${selectedMainCategoryFull.id}`}
                    categories={catSearch.trim() ? filteredSubcategories : selectedMainCategoryFull.children}
                    selectedCategoryId={filters.categoryId}
                    onCategorySelect={(id) => {
                      handleSubcategorySelect(id);
                      setMobileSubcatsOpen(false);
                    }}
                    expandIds={catSearch.trim() ? Array.from(expandIdsForSearch) : selectedPath?.map(c => c.id)}
                    className="max-h-[60vh]"
                  />
                </div>
              </div>
            </div>
          )}

          {mobileVehicleOpen && derivedVehicleType !== 'ALL' && (
            <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
              <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                onClick={() => setMobileVehicleOpen(false)}
              />
              <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] rounded-t-3xl bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 shadow-2xl border-t border-white/60">
                <div className="px-5 pt-4 pb-3 border-b border-white/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-gradient-to-br from-[#E85A28] to-[#FF6B35] shadow-md">
                        <Car className="h-4 w-4 text-white" />
                      </div>
                      <h3 className="font-bold text-primary text-lg">Odabir vozila</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMobileVehicleOpen(false)}
                      className="p-2 rounded-xl bg-white/80 border border-white/60 shadow-sm text-slate-600 hover:text-slate-900"
                      aria-label="Zatvori"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="px-5 pb-5 pt-4">
                  <VehicleSelector 
                    key={`vehsel-mobile-${vehicleSelectorResetKey}-${filters.categoryId}`}
                    onVehicleSelect={(data) => {
                      if (data.generationId) {
                        updateFilter('generationId', data.generationId, 'Vozilo', `Odabrano`);
                        updateFilter('engineId', data.engineId || '', 'Motor');
                        setMobileVehicleOpen(false);
                      }
                    }}
                    compact={true}
                    appearance="light"
                    vehicleType={derivedVehicleType}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="fixed inset-x-0 bottom-0 z-40 lg:hidden">
            <div className="mx-4 mb-4 rounded-2xl bg-white/90 backdrop-blur-md border border-white/60 shadow-2xl p-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMobileSubcatsOpen(true)}
                  disabled={!selectedMainCategoryFull || !selectedMainCategoryFull.children?.length}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-[#0c1c3a] to-[#1b3a5f] text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Layers className="h-4 w-4" />
                  Filteri
                </button>
                <button
                  type="button"
                  onClick={() => setMobileVehicleOpen(true)}
                  disabled={derivedVehicleType === 'ALL'}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-[#E85A28] to-[#FF6B35] text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Car className="h-4 w-4" />
                  Vozilo
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
