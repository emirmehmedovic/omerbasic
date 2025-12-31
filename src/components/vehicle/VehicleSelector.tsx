"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from 'swr';
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
  heroMode?: boolean;
}

export default function VehicleSelector({
  onVehicleSelect,
  className,
  compact = false,
  vehicleType = 'ALL',
  appearance = 'dark',
  variant = 'card',
  heroMode = false
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
  
  // SWR fetcher function
  const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Error fetching ${url}`);
    return res.json();
  };

  // SWR hooks for data fetching with caching
  const { data: brandsData, isLoading: loadingBrands, error: brandsError } = useSWR<VehicleBrand[]>(
    '/api/vehicle-brands',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // Cache for 60 seconds
    }
  );

  const { data: modelsData, isLoading: loadingModels } = useSWR<VehicleModel[]>(
    selectedBrandId ? `/api/vehicle-brands/${selectedBrandId}/models` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000,
    }
  );

  const { data: generationsData, isLoading: loadingGenerations } = useSWR<VehicleGeneration[]>(
    selectedModelId ? `/api/models/${selectedModelId}/generations` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000,
    }
  );

  const { data: enginesData, isLoading: loadingEngines } = useSWR<VehicleEngine[]>(
    selectedGenerationId ? `/api/generations/${selectedGenerationId}/engines` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000,
    }
  );

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
  
  // Update brands state from SWR data
  useEffect(() => {
    if (brandsData) {
      setAllBrands(Array.isArray(brandsData) ? brandsData : []);
      
      const brandIdFromUrl = searchParams.get("brandId") || searchParams.get("makeId");
      if (brandIdFromUrl) {
        setSelectedBrandId(brandIdFromUrl);
      }
    }
  }, [brandsData, searchParams]);

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
  
  // Update models state from SWR data
  useEffect(() => {
    if (!selectedBrandId) {
      setModels([]);
      setSelectedModelId("");
      return;
    }
    
    if (modelsData) {
      setModels(modelsData);
      // Clear dependent selections when models change
      setGenerations([]);
      setEngines([]);
      setSelectedGenerationId("");
      setSelectedEngineId("");
      
      const modelIdFromUrl = searchParams.get("modelId");
      if (modelIdFromUrl) {
        setSelectedModelId(modelIdFromUrl);
      }
    } else if (!loadingModels) {
      // Clear models if data is not available and not loading
      setModels([]);
    }
  }, [modelsData, selectedBrandId, loadingModels, searchParams]);

  // Update generations state from SWR data
  useEffect(() => {
    if (!selectedModelId) {
      setGenerations([]);
      setSelectedGenerationId("");
      return;
    }
    
    if (generationsData) {
      setGenerations(generationsData);
      // Clear dependent selections when generations change
      setEngines([]);
      setSelectedEngineId("");
      
      const generationIdFromUrl = searchParams.get("generationId");
      if (generationIdFromUrl) {
        setSelectedGenerationId(generationIdFromUrl);
      }
    } else if (!loadingGenerations) {
      // Clear generations if data is not available and not loading
      setGenerations([]);
    }
  }, [generationsData, selectedModelId, loadingGenerations, searchParams]);

  // Bootstrap iz generationId u URL-u: ako imamo generationId u URL-u, a model nije postavljen,
  // dohvatimo generaciju da bismo izveli model i brend i postavili state lancežno
  const genIdFromUrl = searchParams.get('generationId');
  const shouldBootstrap = genIdFromUrl && !bootstrappedFromGenRef.current && !selectedModelId;
  
  type GenerationBootstrap = {
    id: string;
    model: {
      id: string;
      brand: {
        id: string;
      };
    };
  };
  
  const { data: bootstrapGenData } = useSWR<GenerationBootstrap>(
    shouldBootstrap ? `/api/generations/${genIdFromUrl}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000,
    }
  );

  // Process bootstrap data when available
  useEffect(() => {
    if (!bootstrapGenData || bootstrappedFromGenRef.current) return;
    const modelId = bootstrapGenData?.model?.id;
    const brandId = bootstrapGenData?.model?.brand?.id;
    if (brandId && brandId !== selectedBrandId) setSelectedBrandId(brandId);
    if (modelId && modelId !== selectedModelId) setSelectedModelId(modelId);
    if (genIdFromUrl) setSelectedGenerationId(genIdFromUrl);
    bootstrappedFromGenRef.current = true;
  }, [bootstrapGenData, genIdFromUrl, selectedBrandId, selectedModelId]);
  
  // Update engines state from SWR data
  useEffect(() => {
    if (!selectedGenerationId) {
      setEngines([]);
      setSelectedEngineId("");
      return;
    }
    
    if (enginesData) {
      setEngines(enginesData || []);
      
      const engineIdFromUrl = searchParams.get("engineId");
      if (engineIdFromUrl && engineIdFromUrl !== 'all') {
        const existsInThisGen = Array.isArray(enginesData) && enginesData.some((e: VehicleEngine) => e.id === engineIdFromUrl);
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
    } else if (!loadingEngines) {
      // Clear engines if data is not available and not loading
      setEngines([]);
    }
  }, [enginesData, selectedGenerationId, loadingEngines, searchParams]);
  

  
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
      ? "relative overflow-hidden p-8 rounded-3xl bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 shadow-xl"
      : "bg-gradient-to-t from-black/60 to-transparent p-6 rounded-2xl";
  const headingTextClass = isLight ? "text-primary" : "text-white";
  const panelClass = variant === 'embedded'
    ? "space-y-4"
    : isLight
      ? "space-y-6 p-6 bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 shadow-lg"
      : "space-y-6 p-5 bg-slate-900/50 rounded-lg border border-slate-800";
  const labelMutedClass = isLight ? "text-slate-600" : "text-slate-300";
  const pillBaseClass = heroMode
    ? "flex items-center gap-2 px-4 py-3 rounded-xl border transition-all duration-300 bg-white/90 backdrop-blur-sm border-white/60 text-slate-800 hover:shadow-lg hover:-translate-y-0.5 shadow-sm"
    : isLight
    ? "flex items-center gap-2 px-4 py-3 rounded-xl border transition-all duration-300 bg-white/80 backdrop-blur-sm border-white/60 text-slate-800 hover:shadow-lg hover:-translate-y-0.5 shadow-sm"
    : "flex items-center gap-2 px-4 py-3 rounded-xl border transition-all duration-300 bg-slate-800/50 border-slate-700 text-white hover:shadow-lg hover:-translate-y-0.5";
  const pillActiveClass = heroMode ? "border-primary shadow-xl bg-gradient-to-r from-primary/10 to-primary-dark/10 text-primary" : isLight ? "border-primary shadow-xl bg-gradient-to-r from-primary/10 to-primary-dark/10" : "border-sunfire-400 bg-sunfire-500/10";
  const stickyHeaderClass = isLight ? "p-2 sticky top-0 bg-white z-10" : "p-2 sticky top-0 bg-slate-900/90 backdrop-blur z-10";
  const searchInputClass = isLight
    ? "h-8 text-sm bg-white border-slate-300 text-slate-900 placeholder:text-slate-500"
    : "h-8 text-sm bg-slate-800 border-slate-700 text-white placeholder:text-slate-400";
  const selectTriggerClasses = heroMode
    ? "w-full h-11 bg-white/90 backdrop-blur-sm border-white/60 hover:border-primary focus:border-primary focus:ring-2 focus:ring-primary/20 text-slate-900 data-[placeholder]:text-slate-500 transition-all duration-300 truncate shadow-sm hover:shadow-lg hover:scale-[1.02] rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
    : isLight
    ? "w-full h-11 bg-white/90 backdrop-blur-sm border-white/60 hover:border-primary focus:border-primary focus:ring-2 focus:ring-primary/20 text-slate-900 data-[placeholder]:text-slate-500 transition-all duration-300 truncate shadow-sm hover:shadow-lg hover:scale-[1.02] rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
    : "w-full h-11 bg-slate-800/60 border-sunfire-500/60 hover:border-sunfire-400 focus:border-sunfire-400 focus:ring-2 focus:ring-sunfire-500/80 text-white data-[placeholder]:text-white transition-all duration-300 truncate rounded-xl hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100";

  return (
    <div className={cn(wrapperClass, className)}>
      {isLight && variant !== 'embedded' && (
        <div className="pointer-events-none absolute inset-0 z-0 opacity-[0.04]"
             style={{
               backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(27,58,95,0.2) 1px, transparent 0), radial-gradient(circle at 50% 50%, rgba(255,107,53,0.08) 0%, transparent 70%)',
               backgroundSize: '32px 32px, 100% 100%'
             }} />
      )}
      <div className="relative z-10">
      {!compact && variant !== 'embedded' && (
        <div className="flex items-center mb-6">
          <div className="p-3 rounded-2xl mr-3 bg-gradient-to-br from-[#E85A28] to-[#FF6B35] shadow-xl">
             <Car className="h-6 w-6 text-white" />
          </div>
          <h3 className={cn("text-2xl font-bold", headingTextClass)}>Odabir vozila</h3>
        </div>
      )}
      {/* Step chips header (visual only) */}
      <div className="mb-6">
        {(() => {
          const brandDone = !!selectedBrandId;
          const modelDone = !!selectedModelId;
          const generationDone = !!selectedGenerationId;
          const engineDone = !!selectedEngineId && selectedEngineId !== 'all';
          const stepTextBase = isLight ? "text-slate-700" : "text-slate-200";
          const chipBase = isLight ? "bg-white/80 backdrop-blur-sm border border-white/60 shadow-sm" : "bg-slate-900/60 border border-slate-700";
          const activeRing = "ring-2 ring-primary/30";
          const Chip = ({ label, done, active, stepNum }: { label: string; done: boolean; active?: boolean; stepNum: number }) => (
            <span className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-300 cursor-default",
              chipBase,
              active && activeRing,
              active && "animate-[pulse_3s_ease-in-out_infinite]",
              done && "bg-gradient-to-r from-primary/10 to-primary-dark/10 border-primary/30",
              heroMode && "hover:shadow-md hover:-translate-y-0.5"
            )}>
              {done ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-primary animate-in fade-in zoom-in duration-300" />
              ) : (
                <span className={cn(
                  "flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold",
                  active ? "bg-primary/20 text-primary" : "bg-slate-200 text-slate-400"
                )}>
                  {stepNum}
                </span>
              )}
              <span className={stepTextBase}>{label}</span>
            </span>
          );
          const progress = brandDone ? (modelDone ? (generationDone ? (engineDone ? 100 : 75) : 50) : 25) : 0;
          return (
            <div>
              <div className={cn("flex items-center gap-2 flex-wrap mb-4", isLight ? "text-slate-600" : "text-slate-300")}>
                <Chip label="Marka" done={brandDone} active={!brandDone} stepNum={1} />
                <ChevronRight className={cn("w-4 h-4 transition-colors", brandDone ? "text-primary" : "text-slate-400")} />
                <Chip label="Model" done={modelDone} active={brandDone && !modelDone} stepNum={2} />
                <ChevronRight className={cn("w-4 h-4 transition-colors", modelDone ? "text-primary" : "text-slate-400")} />
                <Chip label="Generacija" done={generationDone} active={modelDone && !generationDone} stepNum={3} />
                <ChevronRight className={cn("w-4 h-4 transition-colors", generationDone ? "text-primary" : "text-slate-400")} />
                <Chip label="Motor" done={engineDone} active={generationDone && !engineDone} stepNum={4} />
              </div>
              {/* Progress bar with label below */}
              <div className="space-y-2">
                <div className="relative">
                  <div className="w-full h-2 bg-slate-200/80 rounded-full overflow-hidden shadow-inner">
                    <div
                      className={cn(
                        "h-full bg-gradient-to-r from-primary via-primary-dark to-primary transition-all duration-500 ease-out rounded-full relative overflow-hidden",
                        progress === 100 && "shadow-lg shadow-primary/50"
                      )}
                      style={{ width: `${progress}%` }}
                    >
                      {/* Shimmer effect */}
                      {progress > 0 && progress < 100 && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_infinite]"
                             style={{ backgroundSize: '200% 100%' }} />
                      )}
                    </div>
                  </div>
                  {progress === 100 && (
                    <div className="absolute -top-1 right-0 animate-in slide-in-from-right duration-500">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-gradient-to-r from-primary via-primary-dark to-primary text-white shadow-lg">
                        <CheckCircle2 className="w-3 h-3" />
                        Kompletno
                      </span>
                    </div>
                  )}
                </div>
                {/* Progress percentage - below the bar */}
                {progress > 0 && progress < 100 && heroMode && (
                  <div className="text-[10px] font-bold text-primary">
                    {progress}% završeno
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>
      
      <div className={panelClass}>
        {/* Popular brand icons strip */}
        <div className="mt-0">
          <div className="flex items-center justify-between mb-3">
            <div className={cn("text-xs font-bold uppercase tracking-wider", heroMode ? "text-primary" : "text-primary")}>
              {vehicleType === 'COMMERCIAL' ? 'Popularne marke (teretna)' : 'Popularne marke'}
            </div>
            {heroMode && (
              <span className="text-[10px] text-slate-500 font-medium">Brzi odabir</span>
            )}
          </div>
          <div className={cn("flex gap-3 pb-1", heroMode ? "overflow-x-auto scrollbar-none" : variant === 'embedded' ? "flex-wrap" : "overflow-x-auto") }>
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
                  <Icon size={24} color={heroMode ? "#0f172a" : isLight ? "#0f172a" : "#ffffff"} />
                  <span className={cn("text-sm whitespace-nowrap leading-none", heroMode ? "text-slate-800" : isLight ? "text-slate-800" : "text-white")}>{label}</span>
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
            <span className={cn("text-xs font-bold uppercase tracking-wider mb-1", heroMode ? "text-primary" : "text-primary")}>Marka</span>
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
            <div className="h-5 mb-1" />
            <span className={cn("text-xs font-bold uppercase tracking-wider mb-1", heroMode ? "text-primary" : "text-primary")}>Model</span>
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
            <span className={cn("text-xs font-bold uppercase tracking-wider mb-1", heroMode ? "text-primary" : "text-primary")}>Generacija</span>
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
            <span className={cn("text-xs font-bold uppercase tracking-wider mb-1", heroMode ? "text-primary" : "text-primary")}>Motor</span>
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
        
        <div className="flex items-center justify-between mt-6">
          <div className="text-xs font-medium">
            {selectedGenerationId ? (
              <span className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-primary/10 to-primary-dark/10 border border-primary/30 shadow-sm">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span className="text-primary font-bold">Vozilo odabrano</span>
              </span>
            ) : (
              <span className={cn("flex items-center gap-1.5", heroMode ? "text-slate-600" : "text-white/80 drop-shadow-lg")}>
                <Circle className="w-3.5 h-3.5 opacity-50" />
                Odaberite vozilo za pretragu
              </span>
            )}
          </div>
          <Button 
            onClick={handleSearch} 
            disabled={!selectedGenerationId}
            className={cn(
              "bg-gradient-to-r from-primary via-primary-dark to-primary hover:shadow-2xl text-white font-bold py-3 px-8 rounded-xl shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none",
              heroMode && "hover:scale-[1.02]"
            )}
          >
            <span>Pretraži</span>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>
      </div>
    </div>
  );
}
