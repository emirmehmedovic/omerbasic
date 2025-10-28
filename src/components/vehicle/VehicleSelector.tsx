"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ChevronRight, Car, CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import Audi from "@/components/icons/audi";
import Volkswagen from "@/components/icons/volkswagen";
import Mercedes from "@/components/icons/mercedes";
import Bmw from "@/components/icons/bmw";
import Volvo from "@/components/icons/volvo";
import Seat from "@/components/icons/seat";
import Skoda from "@/components/icons/skoda";
import Opel from "@/components/icons/opel";
import Citroen from "@/components/icons/citroen";
import Kia from "@/components/icons/kia";
import Peugeot from "@/components/icons/peugeot";
import Scania from "@/components/icons/scania";
import Man from "@/components/icons/man";
import Daf from "@/components/icons/daf";
import Iveco from "@/components/icons/iveco";
import Renault from "@/components/icons/renault";

// Tipovi za vozila
type VehicleBrand = {
  id: string;
  name: string;
  type?: 'PASSENGER' | 'COMMERCIAL';
};

type VehicleModel = {
  id: string;
  name: string;
  brandId: string;
};

type VehicleGeneration = {
  id: string;
  name: string;
  modelId: string;
  period?: string | null;
  bodyStyles?: string[];
};

type VehicleEngine = {
  id: string;
  engineType: string;
  enginePowerKW?: number | null;
  enginePowerHP?: number | null;
  engineCapacity?: number | null;
  engineCode?: string | null;
  description?: string | null;
  generationId: string;
};

interface VehicleSelectorProps {
  onVehicleSelect?: (data: {
    generationId?: string;
    engineId?: string;
    bodyStyle?: string;
    year?: number;
  }) => void;
  className?: string;
  compact?: boolean;
  vehicleType?: 'PASSENGER' | 'COMMERCIAL' | 'ALL';
  appearance?: 'light' | 'dark';
  variant?: 'card' | 'embedded';
}

export default function VehicleSelector({
  onVehicleSelect,
  className,
  compact = false,
  vehicleType = 'ALL',
  appearance = 'dark',
  variant = 'card'
}: VehicleSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bootstrappedFromGenRef = useRef(false);
  
  // Stanja za odabir vozila
  const [allBrands, setAllBrands] = useState<VehicleBrand[]>([]);
  const [brands, setBrands] = useState<VehicleBrand[]>([]);
  const [models, setModels] = useState<VehicleModel[]>([]);
  const [generations, setGenerations] = useState<VehicleGeneration[]>([]);
  const [engines, setEngines] = useState<VehicleEngine[]>([]);

  
  // Stanja za odabrane vrijednosti
  const [selectedBrandId, setSelectedBrandId] = useState<string>("");
  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const [selectedGenerationId, setSelectedGenerationId] = useState<string>("");
  const [selectedEngineId, setSelectedEngineId] = useState<string>("");
  // Pretraga u dropdownima
  const [brandQuery, setBrandQuery] = useState("");
  const [modelQuery, setModelQuery] = useState("");
  const [generationQuery, setGenerationQuery] = useState("");
  const [engineQuery, setEngineQuery] = useState("");
  
  // Stanja za učitavanje
  const [loadingBrands, setLoadingBrands] = useState<boolean>(true);
  const [loadingModels, setLoadingModels] = useState<boolean>(false);
  const [loadingGenerations, setLoadingGenerations] = useState<boolean>(false);
  const [loadingEngines, setLoadingEngines] = useState<boolean>(false);

  // Helper: jedinstveni po id-u
  const uniqById = <T extends { id: string }>(arr: T[]) => {
    const seen = new Set<string>();
    const out: T[] = [];
    for (const item of arr) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        out.push(item);
      }
    }
    return out;
  };

  // Deduplirani prikazi za mape (sprječava React key warning kod duplikata)
  const brandsToRender = useMemo<VehicleBrand[]>(
    () => {
      let filtered = allBrands.filter((b: VehicleBrand) => 
        vehicleType === 'ALL' || !b.type || b.type === vehicleType
      );
      // Always include the selected brand even if it doesn't match the filter
      if (selectedBrandId) {
        const sel = allBrands.find(b => b.id === selectedBrandId);
        if (sel && !filtered.some(b => b.id === sel.id)) {
          filtered = [...filtered, sel];
        }
      }
      return uniqById(filtered);
    },
    [allBrands, vehicleType, selectedBrandId]
  );
  const modelsToRender = useMemo<VehicleModel[]>(() => uniqById(models), [models]);
  const generationsToRender = useMemo<VehicleGeneration[]>(() => uniqById(generations), [generations]);
  const enginesToRender = useMemo<VehicleEngine[]>(() => uniqById(engines), [engines]);

  // Helper: normalize string (lowercase, remove diacritics)
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

  // Popular brands to show as quick-access icons (only those we have icons for)
  const popularBrands = useMemo(
    () => [
      { key: 'volkswagen', label: 'Volkswagen', Icon: Volkswagen },
      { key: 'audi', label: 'Audi', Icon: Audi },
      { key: 'bmw', label: 'BMW', Icon: Bmw },
      { key: 'mercedes', label: 'Mercedes', Icon: Mercedes },
      { key: 'opel', label: 'Opel', Icon: Opel },
      { key: 'peugeot', label: 'Peugeot', Icon: Peugeot },
      { key: 'seat', label: 'Seat', Icon: Seat },
      { key: 'skoda', label: 'Škoda', Icon: Skoda },
      { key: 'citroen', label: 'Citroën', Icon: Citroen },
      { key: 'volvo', label: 'Volvo', Icon: Volvo },
      { key: 'kia', label: 'Kia', Icon: Kia },
    ],
    []
  );

  const popularCommercialBrands = useMemo(
    () => [
      { key: 'volvo', label: 'Volvo', Icon: Volvo },
      { key: 'scania', label: 'Scania', Icon: Scania },
      { key: 'daf', label: 'DAF', Icon: Daf },
      { key: 'man', label: 'MAN', Icon: Man },
      { key: 'iveco', label: 'Iveco', Icon: Iveco },
      { key: 'renault', label: 'Renault', Icon: Renault },
      { key: 'mercedes', label: 'Mercedes', Icon: Mercedes },
    ],
    []
  );

  // Build a map from normalized brand name to brand id for quick lookup (with aliases)
  const brandNameToId = useMemo(() => {
    const map = new Map<string, string>();
    const aliases = new Map<string, string>([
      ["mercedes-benz", "mercedes"],
      ["vw", "volkswagen"],
      // Truck brand variants -> canonical keys used in strips
      ["volvo trucks", "volvo"],
      ["mercedes-benz trucks", "mercedes"],
      ["mercedes trucks", "mercedes"],
    ]);
    for (const b of brandsToRender) {
      const norm = normalize(b.name);
      map.set(norm, b.id);
      // apply aliases: if name matches an alias key, also set the alias target
      const aliasTarget = aliases.get(norm);
      if (aliasTarget) {
        map.set(aliasTarget, b.id);
      }
    }
    return map;
  }, [brandsToRender]);

  // Filtrirani popisi po upitu
  const filteredBrands = useMemo(() => {
    const q = brandQuery.trim().toLowerCase();
    return q ? brandsToRender.filter(b => b.name.toLowerCase().includes(q)) : brandsToRender;
  }, [brandQuery, brandsToRender]);
  const filteredModels = useMemo(() => {
    const q = modelQuery.trim().toLowerCase();
    return q ? modelsToRender.filter(m => m.name.toLowerCase().includes(q)) : modelsToRender;
  }, [modelQuery, modelsToRender]);
  const filteredGenerations = useMemo(() => {
    const q = generationQuery.trim().toLowerCase();
    return q ? generationsToRender.filter(g => `${g.name} ${g.period ?? ''}`.toLowerCase().includes(q)) : generationsToRender;
  }, [generationQuery, generationsToRender]);
  const filteredEngines = useMemo(() => {
    const q = engineQuery.trim().toLowerCase();
    if (!q) return enginesToRender;
    const desc = (e: VehicleEngine) => {
      const parts: string[] = [];
      if (e.engineType) parts.push(e.engineType);
      if (e.engineCapacity) parts.push(`${(e.engineCapacity / 1000).toFixed(1)}l`);
      if (e.enginePowerKW) parts.push(`${e.enginePowerKW}kw`);
      if (e.enginePowerHP) parts.push(`${e.enginePowerHP}ks`);
      if (e.engineCode) parts.push(e.engineCode);
      return parts.join(" ");
    };
    return enginesToRender.filter(e => desc(e).toLowerCase().includes(q));
  }, [engineQuery, enginesToRender]);
  
  // Učitavanje brendova vozila pri prvom renderiranju
  useEffect(() => {
    const fetchBrands = async () => {
      setLoadingBrands(true);
      try {
        const response = await fetch("/api/vehicle-brands");
        if (!response.ok) throw new Error("Greška pri dohvaćanju brendova vozila");
        
        const data = await response.json();
        setAllBrands(Array.isArray(data) ? data : []);
        
        const brandIdFromUrl = searchParams.get("brandId") || searchParams.get("makeId");
        if (brandIdFromUrl) {
          setSelectedBrandId(brandIdFromUrl);
        }
      } catch (error) {
        console.error("Greška:", error);
      } finally {
        setLoadingBrands(false);
      }
    };
    
    fetchBrands();
  }, []);

  // Kad se promijeni vehicleType, filtriraj brendove; zadrži odabran brend ako je i dalje valjan
  useEffect(() => {
    let filtered = allBrands.filter((b) => vehicleType === 'ALL' || !b.type || b.type === vehicleType);
    // include selected brand if missing due to type filter
    if (selectedBrandId && !filtered.some(b => b.id === selectedBrandId)) {
      const sel = allBrands.find(b => b.id === selectedBrandId);
      if (sel) filtered = [...filtered, sel];
    }
    setBrands(filtered);
    const stillValid = !!selectedBrandId && allBrands.some(b => b.id === selectedBrandId);
    if (!stillValid) {
      // Resetiraj samo ako prethodni brend više nije valjan u novom tipu
      setSelectedBrandId("");
      setSelectedModelId("");
      setSelectedGenerationId("");
      setSelectedEngineId("");
    }
  }, [vehicleType, allBrands, selectedBrandId]);
  
  // Učitavanje modela kada se odabere brend
  useEffect(() => {
    if (!selectedBrandId) {
      setModels([]);
      setSelectedModelId("");
      return;
    }
    
    const fetchModels = async () => {
      setLoadingModels(true);
      setGenerations([]);
      setEngines([]);
      setSelectedModelId("");
      setSelectedGenerationId("");
      setSelectedEngineId("");
      try {
        const response = await fetch(`/api/vehicle-brands/${selectedBrandId}/models`);
        if (!response.ok) throw new Error("Greška pri dohvaćanju modela vozila");
        
        const data = await response.json();
        setModels(data);
        
        const modelIdFromUrl = searchParams.get("modelId");
        if (modelIdFromUrl) {
          setSelectedModelId(modelIdFromUrl);
        }
      } catch (error) {
        console.error("Greška:", error);
      } finally {
        setLoadingModels(false);
      }
    };
    
    fetchModels();
  }, [selectedBrandId]);

  // Učitavanje generacija kada se odabere model
  useEffect(() => {
    if (!selectedModelId) {
      setGenerations([]);
      setSelectedGenerationId("");
      return;
    }
    
    const fetchGenerations = async () => {
      setLoadingGenerations(true);
      setEngines([]);
      setSelectedGenerationId("");
      setSelectedEngineId("");
      try {
        const response = await fetch(`/api/models/${selectedModelId}/generations`);
        if (!response.ok) throw new Error("Greška pri dohvaćanju generacija vozila");
        
        const data = await response.json();
        setGenerations(data);
        
        const generationIdFromUrl = searchParams.get("generationId");
        if (generationIdFromUrl) {
          setSelectedGenerationId(generationIdFromUrl);
        }
      } catch (error) {
        console.error("Greška:", error);
      } finally {
        setLoadingGenerations(false);
      }
    };
    
    fetchGenerations();
  }, [selectedModelId]);

  // Bootstrap iz generationId u URL-u: ako imamo generationId u URL-u, a model nije postavljen,
  // dohvatimo generaciju da bismo izveli model i brend i postavili state lancežno
  useEffect(() => {
    const genIdFromUrl = searchParams.get('generationId');
    if (!genIdFromUrl) return;
    if (bootstrappedFromGenRef.current) return;
    if (selectedModelId) return; // već postavljen kroz standardni tok
    (async () => {
      try {
        const res = await fetch(`/api/generations/${genIdFromUrl}`);
        if (!res.ok) return;
        const gen = await res.json();
        const modelId = gen?.model?.id;
        const brandId = gen?.model?.brand?.id;
        if (brandId && brandId !== selectedBrandId) setSelectedBrandId(brandId);
        if (modelId && modelId !== selectedModelId) setSelectedModelId(modelId);
        setSelectedGenerationId(genIdFromUrl);
        bootstrappedFromGenRef.current = true;
      } catch (e) {
        console.error('Bootstrap from generationId failed', e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Učitavanje motora i stilova karoserije kada se odabere generacija
  useEffect(() => {
    if (!selectedGenerationId) {
      setEngines([]);
      setSelectedEngineId("");
      return;
    }
    
    const fetchEnginesAndBodyStyles = async () => {
      setLoadingEngines(true);
      setEngines([]);
      setSelectedEngineId("");
      try {


        const enginesResponse = await fetch(`/api/generations/${selectedGenerationId}/engines`);
        if (!enginesResponse.ok) throw new Error("Greška pri dohvaćanju motora");
        const enginesData = await enginesResponse.json();
        setEngines(enginesData || []);
        
        const engineIdFromUrl = searchParams.get("engineId");
        if (engineIdFromUrl && engineIdFromUrl !== 'all') {
          const existsInThisGen = Array.isArray(enginesData) && enginesData.some((e: any) => e.id === engineIdFromUrl);
          if (existsInThisGen) {
            setSelectedEngineId(engineIdFromUrl);
          } else {
            // URL engine doesn't belong to this generation -> default to 'all'
            setSelectedEngineId('all');
          }
        } else {
          // Default to 'all' so user doesn't have to select it manually
          setSelectedEngineId('all');
        }
        


      } catch (error) {
        console.error("Greška:", error);
      } finally {
        setLoadingEngines(false);
      }
    };
    
    fetchEnginesAndBodyStyles();
  }, [selectedGenerationId]);
  

  
  // Handler za pretragu proizvoda po vozilu
  const handleSearch = () => {
    if (!selectedGenerationId) return;
    const params = new URLSearchParams(searchParams);
    if (selectedBrandId) {
      params.set("brandId", selectedBrandId);
      params.set("makeId", selectedBrandId);
    } else {
      params.delete("brandId");
      params.delete("makeId");
    }
    if (selectedGenerationId) params.set("generationId", selectedGenerationId); else params.delete("generationId");
    if (selectedEngineId && selectedEngineId !== 'all') params.set("engineId", selectedEngineId); else params.delete("engineId");
    // Heuristic: set categoryId based on selected brand type if known so products page doesn't need a second redirect
    const selBrand = allBrands.find(b => b.id === selectedBrandId);
    const PASSENGER_CATEGORY_ID = 'cmer01ok30001rqbwu15hej6j';
    const COMMERCIAL_CATEGORY_ID = 'cmer01z6s0001rqcokur4f0bn';
    if (selBrand?.type === 'PASSENGER') params.set('categoryId', PASSENGER_CATEGORY_ID);
    else if (selBrand?.type === 'COMMERCIAL') params.set('categoryId', COMMERCIAL_CATEGORY_ID);
    else if (!params.get('categoryId')) params.set('categoryId', PASSENGER_CATEGORY_ID);
    // Remove free-text query if present
    params.delete('q');

    if (onVehicleSelect) {
      onVehicleSelect({
        generationId: selectedGenerationId,
        engineId: selectedEngineId !== 'all' ? selectedEngineId : undefined,
      });
    } else {
      router.push(`/products?${params.toString()}`);
    }
  };
  
  // Formatiranje opisa motora
  const formatEngineDescription = (engine: VehicleEngine) => {
    const parts = [];
    if (engine.engineType) parts.push(engine.engineType);
    if (engine.engineCapacity) parts.push(`${(engine.engineCapacity / 1000).toFixed(1)}L`);
    if (engine.enginePowerKW) parts.push(`${engine.enginePowerKW}kW`);
    if (engine.enginePowerHP) parts.push(`(${engine.enginePowerHP}KS)`);
    if (engine.engineCode) parts.push(engine.engineCode);
    return parts.join(" ");
  };
  
  const isLight = appearance === 'light';
  const wrapperClass = variant === 'embedded'
    ? ""
    : isLight
      ? "p-6 rounded-2xl bg-white border border-slate-200"
      : "bg-gradient-to-t from-black/60 to-transparent p-6 rounded-2xl";
  const headingTextClass = isLight ? "text-slate-900" : "text-white";
  const panelClass = variant === 'embedded'
    ? "space-y-4"
    : isLight
      ? "space-y-6 p-5 bg-white rounded-lg border border-slate-200"
      : "space-y-6 p-5 bg-slate-900/50 rounded-lg border border-slate-800";
  const labelMutedClass = isLight ? "text-slate-600" : "text-slate-300";
  const pillBaseClass = isLight
    ? "flex items-center gap-2 px-4 py-3 rounded-lg border transition-colors bg-white border-slate-200 text-slate-800 hover:border-sunfire-400"
    : "flex items-center gap-2 px-4 py-3 rounded-lg border transition-colors bg-slate-800/50 border-slate-700 text-white hover:border-sunfire-400";
  const pillActiveClass = isLight ? "border-sunfire-400 bg-sunfire-50" : "border-sunfire-400 bg-sunfire-500/10";
  const stickyHeaderClass = isLight ? "p-2 sticky top-0 bg-white z-10" : "p-2 sticky top-0 bg-slate-900/90 backdrop-blur z-10";
  const searchInputClass = isLight
    ? "h-8 text-sm bg-white border-slate-300 text-slate-900 placeholder:text-slate-500"
    : "h-8 text-sm bg-slate-800 border-slate-700 text-white placeholder:text-slate-400";
  const selectTriggerClasses = isLight
    ? "w-full h-11 bg-white border-slate-300 hover:border-sunfire-400 focus:border-sunfire-400 focus:ring-2 focus:ring-sunfire-200 text-slate-900 data-[placeholder]:text-slate-500 transition-all duration-300 truncate"
    : "w-full h-11 bg-slate-800/60 border-sunfire-500/60 hover:border-sunfire-400 focus:border-sunfire-400 focus:ring-2 focus:ring-sunfire-500/80 text-white data-[placeholder]:text-white transition-all duration-300 truncate";

  return (
    <div className={cn(wrapperClass, className)}>
      {!compact && variant !== 'embedded' && (
        <div className="flex items-center mb-4">
          <div className="p-2 rounded-lg mr-3 bg-sunfire-500/10 shadow-lg shadow-sunfire-500/10">
             <Car className="h-6 w-6 text-sunfire-300" />
          </div>
          <h3 className={cn("text-xl font-bold", headingTextClass)}>Odabir vozila</h3>
        </div>
      )}
      {/* Step chips header (visual only) */}
      <div className="mb-3">
        {(() => {
          const brandDone = !!selectedBrandId;
          const modelDone = !!selectedModelId;
          const generationDone = !!selectedGenerationId;
          const engineDone = !!selectedEngineId && selectedEngineId !== 'all';
          const stepTextBase = isLight ? "text-slate-700" : "text-slate-200";
          const chipBase = isLight ? "bg-white border border-slate-200" : "bg-slate-900/60 border border-slate-700";
          const activeRing = "ring-1 ring-sunfire-400/60";
          const Chip = ({ label, done, active }: { label: string; done: boolean; active?: boolean }) => (
            <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs", chipBase, active && activeRing)}>
              {done ? <CheckCircle2 className="w-3.5 h-3.5 text-sunfire-400" /> : <Circle className="w-3.5 h-3.5 opacity-50" />}
              <span className={stepTextBase}>{label}</span>
            </span>
          );
          return (
            <div className={cn("flex items-center gap-2 flex-wrap", isLight ? "text-slate-600" : "text-slate-300")}> 
              <Chip label="Marka" done={brandDone} active={!brandDone} />
              <ChevronRight className={cn("w-4 h-4", isLight ? "text-slate-400" : "text-slate-500")} />
              <Chip label="Model" done={modelDone} active={brandDone && !modelDone} />
              <ChevronRight className={cn("w-4 h-4", isLight ? "text-slate-400" : "text-slate-500")} />
              <Chip label="Generacija" done={generationDone} active={modelDone && !generationDone} />
              <ChevronRight className={cn("w-4 h-4", isLight ? "text-slate-400" : "text-slate-500")} />
              <Chip label="Motor" done={engineDone} active={generationDone && !engineDone} />
            </div>
          );
        })()}
      </div>
      
      <div className={panelClass}>
        {/* Popular brand icons strip */}
        <div className="mt-0">
          <div className={cn("text-xs mb-3", labelMutedClass)}>
            {vehicleType === 'COMMERCIAL' ? 'Popularne marke (teretna)' : 'Popularne marke'}
          </div>
          <div className={cn("flex gap-3 pb-1", variant === 'embedded' ? "flex-wrap" : "overflow-x-auto") }>
            {(vehicleType === 'COMMERCIAL' ? popularCommercialBrands : popularBrands).map(({ key, label, Icon }) => {
              const id = brandNameToId.get(key);
              const isDisabled = !id;
              const isActive = !!id && id === selectedBrandId;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => id && setSelectedBrandId(id)}
                  disabled={isDisabled}
                  className={cn(
                    pillBaseClass,
                    isActive && pillActiveClass,
                    isDisabled && "opacity-40 cursor-not-allowed"
                  )}
                >
                  <Icon size={24} color={isLight ? "#0f172a" : "#ffffff"} />
                  <span className={cn("text-sm whitespace-nowrap leading-none", isLight ? "text-slate-800" : "text-white")}>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className={cn(
          "grid gap-4",
          compact ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-4" : "grid-cols-1 md:grid-cols-2"
        )}>
          {/* Odabir brenda */}
          <div className="flex flex-col">
            <div className="h-5 mb-1" />
            <span className="text-xs text-slate-300 mb-1">Marka</span>
          <Select
            value={selectedBrandId}
            onValueChange={setSelectedBrandId}
            disabled={loadingBrands}
          >
            <SelectTrigger className={selectTriggerClasses}>
              <SelectValue placeholder="Marka" className="truncate" />
            </SelectTrigger>
            <SelectContent>
              {loadingBrands ? (
                <div className="flex items-center justify-center p-2"><Loader2 className="h-4 w-4 animate-spin mr-2 text-sunfire-400" />Učitavanje...</div>
              ) : (
                <>
                  <div className={stickyHeaderClass}>
                    <Input
                      value={brandQuery}
                      onChange={(e) => setBrandQuery(e.target.value)}
                      placeholder="Pretraži marke..."
                      className={searchInputClass}
                    />
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {filteredBrands.map((brand) => (
                      <SelectItem key={brand.id} value={brand.id} className="focus:bg-sunfire-500/20 focus:text-slate-900">{brand.name}</SelectItem>
                    ))}
                  </div>
                </>
              )}
            </SelectContent>
          </Select>
          </div>
          
          {/* Odabir modela */}
          <div className="flex flex-col">
            <div className="h-5 mb-1 text-sunfire-300 text-xs font-medium">
              {selectedBrandId && !selectedModelId ? 'Sada izaberite model' : null}
            </div>
            <span className="text-xs text-slate-300 mb-1">Model</span>
          <Select
            value={selectedModelId}
            onValueChange={setSelectedModelId}
            disabled={!selectedBrandId || loadingModels}
          >
            <SelectTrigger className={selectTriggerClasses}>
              <SelectValue placeholder="Model" className="truncate" />
            </SelectTrigger>
            <SelectContent>
              {loadingModels ? (
                <div className="flex items-center justify-center p-2"><Loader2 className="h-4 w-4 animate-spin mr-2 text-sunfire-400" />Učitavanje...</div>
              ) : (
                <>
                  <div className={stickyHeaderClass}>
                    <Input
                      value={modelQuery}
                      onChange={(e) => setModelQuery(e.target.value)}
                      placeholder="Pretraži modele..."
                      className={searchInputClass}
                    />
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {filteredModels.map((model) => (
                      <SelectItem key={model.id} value={model.id} className="focus:bg-sunfire-500/20 focus:text-slate-900">{model.name}</SelectItem>
                    ))}
                  </div>
                </>
              )}
            </SelectContent>
          </Select>
          </div>
          
          {/* Odabir generacije */}
          <div className="flex flex-col">
            <div className="h-5 mb-1" />
            <span className="text-xs text-slate-300 mb-1">Generacija</span>
          <Select
            value={selectedGenerationId}
            onValueChange={setSelectedGenerationId}
            disabled={!selectedModelId || loadingGenerations}
          >
            <SelectTrigger className={selectTriggerClasses}>
              <SelectValue placeholder="Generacija" className="truncate" />
            </SelectTrigger>
            <SelectContent>
              {loadingGenerations ? (
                <div className="flex items-center justify-center p-2"><Loader2 className="h-4 w-4 animate-spin mr-2 text-sunfire-400" />Učitavanje...</div>
              ) : (
                <>
                  <div className={stickyHeaderClass}>
                    <Input
                      value={generationQuery}
                      onChange={(e) => setGenerationQuery(e.target.value)}
                      placeholder="Pretraži generacije..."
                      className={searchInputClass}
                    />
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {filteredGenerations.map((gen) => (
                      <SelectItem key={gen.id} value={gen.id} className="focus:bg-sunfire-500/20 focus:text-slate-900">{gen.name} {gen.period && `(${gen.period})`}</SelectItem>
                    ))}
                  </div>
                </>
              )}
            </SelectContent>
          </Select>
          </div>
          
          {/* Odabir motora */}
          <div className="flex flex-col">
            <div className="h-5 mb-1" />
            <span className="text-xs text-slate-300 mb-1">Motor</span>
          <Select
            value={selectedEngineId}
            onValueChange={setSelectedEngineId}
            disabled={!selectedGenerationId || loadingEngines}
          >
            <SelectTrigger className={selectTriggerClasses}>
              <SelectValue placeholder="Motor" className="truncate" />
            </SelectTrigger>
            <SelectContent>
              {loadingEngines ? (
                <div className="flex items-center justify-center p-2"><Loader2 className="h-4 w-4 animate-spin mr-2 text-sunfire-400" />Učitavanje...</div>
              ) : (
                <>
                  <div className={stickyHeaderClass}>
                    <Input
                      value={engineQuery}
                      onChange={(e) => setEngineQuery(e.target.value)}
                      placeholder="Pretraži motore..."
                      className={searchInputClass}
                    />
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    <SelectItem value="all" className="focus:bg-sunfire-500/20 focus:text-slate-900">Svi motori</SelectItem>
                    {filteredEngines.map((engine) => (
                      <SelectItem key={engine.id} value={engine.id} className="focus:bg-sunfire-500/20 focus:text-slate-900">{formatEngineDescription(engine)}</SelectItem>
                    ))}
                  </div>
                </>
              )}
            </SelectContent>
          </Select>
          </div>
        </div>
        
        <div className="flex justify-end mt-4">
          <Button 
            onClick={handleSearch} 
            disabled={!selectedGenerationId}
            className="bg-sunfire-600 hover:bg-sunfire-700 text-white font-semibold py-2 px-5 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 flex items-center gap-2 disabled:bg-sunfire-500/50 disabled:cursor-not-allowed"
          >
            Pretraži
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
