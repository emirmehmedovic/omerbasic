'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { X, Filter, Car, Settings, Layers } from 'lucide-react';
import VehicleSelector from './vehicle/VehicleSelector';
import TechnicalSpecsFilter from './TechnicalSpecsFilter';
import { Button } from './ui/button';
import { Separator } from './ui/separator';

// Tip za kategoriju
interface Category {
  id: string;
  name: string;
  level: number;
  parentId: string | null;
  iconUrl?: string | null;
  children: Category[];
  productCount?: number; // Dodajemo opcionalnu vrijednost za broj proizvoda
}

// Komponenta za prikaz aktivnih filtera
const ActiveFilters = ({ filters, onRemove }: { 
  filters: { id: string; type: string; label: string }[]; 
  onRemove: (id: string) => void 
}) => {
  if (filters.length === 0) return null;
  
  return (
    <div className="active-filters mb-6">
      <div className="flex items-center mb-3">
        <div className="bg-gradient-to-r from-orange/20 to-brown/20 p-1.5 rounded-lg mr-2">
          <Filter className="h-4 w-4 text-orange" />
        </div>
        <h3 className="text-sm font-medium text-slate-700">Aktivni filteri</h3>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {filters.map(filter => (
          <div 
            key={filter.id}
            className="group relative px-3 py-1.5 bg-white/80 backdrop-blur-sm rounded-lg flex items-center gap-1.5 text-xs border border-white/70 shadow-sm hover:shadow-md transition-all duration-200 hover:bg-white/90"
          >
            {/* Pozadinski efekat */}
            <span className="absolute inset-0 rounded-lg bg-gradient-to-r from-orange/5 to-brown/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
            
            <span className="relative text-orange font-medium">{filter.type}:</span>
            <span className="relative font-medium text-slate-700">{filter.label}</span>
            <button 
              onClick={() => onRemove(filter.id)}
              className="relative ml-1 p-0.5 rounded-full text-slate-400 hover:text-white hover:bg-orange/80 transition-colors duration-200"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        
        <button 
          className="px-3 py-1.5 text-xs bg-gradient-to-r from-orange/10 to-brown/10 hover:from-orange/20 hover:to-brown/20 text-orange hover:text-brown transition-all duration-200 rounded-lg border border-orange/20 hover:border-orange/30 shadow-sm hover:shadow flex items-center gap-1"
          onClick={() => filters.forEach(f => onRemove(f.id))}
        >
          <X className="h-3 w-3" />
          <span>Očisti sve</span>
        </button>
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
            className={`group relative flex items-center w-full text-left px-4 py-3 rounded-xl text-sm transition-all duration-300 overflow-hidden ${category.id === selectedCategoryId
              ? 'bg-gradient-to-r from-orange/20 to-brown/30 text-slate-800 font-medium shadow-sm'
              : 'hover:bg-white/70 text-slate-600 hover:text-slate-800'
            }`}
          >
            {/* Pozadinski efekat za hover */}
            <span className={`absolute inset-0 w-full h-full bg-gradient-to-r from-orange/5 to-brown/5 opacity-0 ${category.id !== selectedCategoryId ? 'group-hover:opacity-100' : ''} transition-opacity duration-300`}></span>
            
            {/* Ikonica kategorije ili indikator */}
            <span className={`relative flex-shrink-0 w-2 h-2 mr-3 rounded-full ${category.id === selectedCategoryId ? 'bg-orange' : 'bg-slate-300 group-hover:bg-orange/50'} transition-colors duration-300`}></span>
            
            {/* Naziv kategorije */}
            <span className="relative">{category.name}</span>
            
            {/* Broj proizvoda (ako je dostupan) */}
            {category.productCount && (
              <span className={`relative ml-auto text-xs px-2 py-0.5 rounded-full ${category.id === selectedCategoryId ? 'bg-white/30 text-slate-700' : 'bg-slate-100 text-slate-500 group-hover:bg-white/50'} transition-colors duration-300`}>
                {category.productCount}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

interface HierarchicalFiltersProps {
  onFilterChange: (filters: any) => void;
  initialFilters?: any;
  displayMode?: 'full' | 'topOnly' | 'sidebarOnly';
}

export default function HierarchicalFilters({ 
  onFilterChange, 
  initialFilters = {},
  displayMode = 'full'
}: HierarchicalFiltersProps) {
  // Stanje za kategorije
  const [categories, setCategories] = useState<Category[]>([]);
  const [mainCategories, setMainCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  
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

  // Dohvat kategorija (samo jednom pri mount-u)
  useEffect(() => {
    async function fetchCategories() {
      try {
        const response = await fetch('/api/categories/hierarchy');
        if (!response.ok) throw new Error('Failed to fetch categories');
        const data = await response.json();
        setCategories(data);
        
        // Filtriramo glavne kategorije (one bez parentId)
        const main = data.filter((cat: Category) => cat.parentId === null);
        setMainCategories(main);
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchCategories();
  }, []);

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
    if (!categories || categories.length === 0) return null;
    if (!filters?.categoryId) return null;
    const selectedCat = findCategoryById(categories, filters.categoryId);
    if (!selectedCat) return null;
    if (selectedCat.parentId) {
      return findCategoryById(categories, selectedCat.parentId);
    }
    return selectedCat;
  }, [categories, filters?.categoryId]);

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

  // Funkcija za odabir glavne kategorije
  const handleMainCategorySelect = (category: Category) => {
    // Uvijek postavimo odabranu kategoriju, bez obzira ima li djece ili ne
    updateFilter('categoryId', category.id, `Kategorija: ${category.name}`);
    console.log('Selected main category:', category.id, category.name);
  };

  // Funkcija za odabir podkategorije
  const handleSubcategorySelect = (categoryId: string) => {
    const category = findCategoryById(categories, categoryId);
    if (category) {
      updateFilter('categoryId', categoryId, `Kategorija: ${category.name}`);
      console.log('Selected subcategory:', categoryId, category.name);
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
      {/* Aktivni filteri se uvijek prikazuju */}
      {activeFilters.length > 0 && (
        <div className="mb-4">
          <ActiveFilters filters={activeFilters} onRemove={removeFilter} />
        </div>
      )}
      
      {/* Gornji dio (glavne kategorije i selektor vozila) */}
      {renderTopContent && (
        <div className="top-filters">
          {/* Glavne kategorije kao dugmad na vrhu */}
          <div className="main-categories">
            <div className="flex items-center mb-4">
              <div className="bg-gradient-to-r from-orange/20 to-brown/20 p-1.5 rounded-lg mr-2">
                <Layers className="h-5 w-5 text-orange" />
              </div>
              <h3 className="font-semibold text-slate-800 text-lg">Glavne kategorije</h3>
            </div>
            <div className="flex flex-wrap gap-3 mb-6">
              {mainCategories.map(category => (
                <Button
                  key={category.id}
                  variant="ghost"
                  className={`group relative overflow-hidden transition-all duration-300 text-base py-4 px-6 rounded-xl ${selectedMainCategory?.id === category.id
                    ? 'bg-gradient-to-br from-orange/90 to-brown text-white font-medium shadow-lg shadow-orange/20 border-none transform-gpu hover:shadow-xl hover:shadow-orange/30'
                    : 'bg-white/70 hover:bg-white/90 border border-white/80 text-slate-700 hover:text-slate-900 shadow-md hover:shadow-lg'}`}
                  onClick={() => handleMainCategorySelect(category)}
                >
                  {/* Pozadinski efekt */}
                  <span className={`absolute inset-0 w-full h-full ${selectedMainCategory?.id === category.id
                    ? 'bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.2)_0%,_rgba(255,255,255,0)_50%)] opacity-70'
                    : 'bg-[radial-gradient(circle_at_center,_rgba(255,165,0,0.1)_0%,_rgba(255,165,0,0)_50%)] opacity-0 group-hover:opacity-100'} transition-opacity duration-500`}></span>
                  
                  {/* Ikona kategorije */}
                  {category.iconUrl ? (
                    <div className={`relative z-10 flex items-center justify-center mb-1 ${selectedMainCategory?.id === category.id ? 'text-white' : 'text-orange'}`}>
                      <img 
                        src={category.iconUrl} 
                        alt="" 
                        className={`w-6 h-6 transition-transform duration-300 ${selectedMainCategory?.id === category.id ? 'scale-110' : 'group-hover:scale-110'}`} 
                      />
                    </div>
                  ) : (
                    <div className={`relative z-10 flex items-center justify-center mb-1 ${selectedMainCategory?.id === category.id ? 'text-white' : 'text-orange'}`}>
                      <Layers className={`w-6 h-6 transition-transform duration-300 ${selectedMainCategory?.id === category.id ? 'scale-110' : 'group-hover:scale-110'}`} />
                    </div>
                  )}
                  
                  {/* Naziv kategorije */}
                  <span className="relative z-10 block text-center font-medium">{category.name}</span>
                  
                  {/* Indikator odabrane kategorije */}
                  {selectedMainCategory?.id === category.id && (
                    <span className="absolute bottom-0 left-0 right-0 h-1 bg-white/50 rounded-full mx-3"></span>
                  )}
                </Button>
              ))}
            </div>
          </div>
          
          {/* Odabir vozila - inline ispod glavnih kategorija */}
          <div className="vehicle-selector mt-6">
            <div className="flex items-center mb-4">
              <div className="bg-gradient-to-r from-orange/20 to-brown/20 p-1.5 rounded-lg mr-2">
                <Car className="h-4 w-4 text-orange" />
              </div>
              <h3 className="font-medium text-slate-700">Odabir vozila</h3>
            </div>
            <VehicleSelector 
              onVehicleSelect={(data) => {
                if (data.generationId) {
                  updateFilter('generationId', data.generationId, `Vozilo: Odabrano`);
                }
              }}
              compact={true}
              vehicleType={derivedVehicleType}
            />
          </div>
        </div>
      )}
      
      {/* Sidebar sa podkategorijama i filterima */}
      {renderSidebarContent && selectedMainCategory && (
        <div className="sidebar-filters">
          {/* Podkategorije ako postoje */}
          {selectedMainCategory.children && selectedMainCategory.children.length > 0 && (
            <>
              <div className="flex items-center mb-4">
                <div className="bg-gradient-to-r from-orange/20 to-brown/20 p-1.5 rounded-lg mr-2">
                  <Layers className="h-4 w-4 text-orange" />
                </div>
                <h3 className="font-medium text-slate-700">Podkategorije</h3>
              </div>
              <SubcategoryList 
                key={selectedMainCategory.id}
                categories={selectedMainCategory.children}
                selectedCategoryId={filters.categoryId}
                onCategorySelect={handleSubcategorySelect}
              />
              <Separator className="my-4" />
            </>
          )}
          
          {/* Tehničke specifikacije */}
          <div className="technical-specs">
            <div className="flex items-center mb-4">
              <div className="bg-gradient-to-r from-orange/20 to-brown/20 p-1.5 rounded-lg mr-2">
                <Settings className="h-4 w-4 text-orange" />
              </div>
              <h3 className="font-medium text-slate-700">Tehničke specifikacije</h3>
            </div>
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
          </div>
        </div>
      )}
    </div>
  );
}
