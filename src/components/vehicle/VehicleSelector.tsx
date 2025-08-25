"use client";

import { useState, useEffect, useMemo } from "react";
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
import { Loader2, ChevronRight, Car } from "lucide-react";
import { cn } from "@/lib/utils";

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
}

export default function VehicleSelector({
  onVehicleSelect,
  className,
  compact = false,
  vehicleType = 'ALL'
}: VehicleSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
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
  const brandsToRender = useMemo<VehicleBrand[]>(() => uniqById(allBrands.filter((b: VehicleBrand) => vehicleType === 'ALL' || b.type === vehicleType)), [allBrands, vehicleType]);
  const modelsToRender = useMemo<VehicleModel[]>(() => uniqById(models), [models]);
  const generationsToRender = useMemo<VehicleGeneration[]>(() => uniqById(generations), [generations]);
  const enginesToRender = useMemo<VehicleEngine[]>(() => uniqById(engines), [engines]);

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
        
        const brandIdFromUrl = searchParams.get("brandId");
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

  // Kad se promijeni vehicleType, filtriraj brendove i resetiraj odabire
  useEffect(() => {
    const filtered = allBrands.filter((b) => vehicleType === 'ALL' || b.type === vehicleType);
    setBrands(filtered);
    setSelectedBrandId("");
    setSelectedModelId("");
    setSelectedGenerationId("");
    setSelectedEngineId("");
  }, [vehicleType, allBrands]);
  
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
    
    if (selectedGenerationId) params.set("generationId", selectedGenerationId);
    else params.delete("generationId");

    if (selectedEngineId && selectedEngineId !== 'all') params.set("engineId", selectedEngineId);
    else params.delete("engineId");



    if (onVehicleSelect) {
      onVehicleSelect({
        generationId: selectedGenerationId,
        engineId: selectedEngineId !== 'all' ? selectedEngineId : undefined,
      });
    } else {
      router.push(`/products/advanced-search?${params.toString()}`);
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
  
  const selectTriggerClasses = "w-full bg-slate-800/60 border-sunfire-500/60 hover:border-sunfire-400 focus:border-sunfire-400 focus:ring-2 focus:ring-sunfire-500/80 text-white data-[placeholder]:text-white transition-all duration-300";

  return (
    <div className={cn("bg-gradient-to-t from-black/60 to-transparent p-6 rounded-2xl", className)}>
      {!compact && (
        <div className="flex items-center mb-4">
          <div className="p-2 rounded-lg mr-3 bg-sunfire-500/10 shadow-lg shadow-sunfire-500/10">
             <Car className="h-6 w-6 text-sunfire-300" />
          </div>
          <h3 className="text-xl font-bold text-white">Odabir vozila</h3>
        </div>
      )}
      
      <div className="space-y-4 p-4 bg-slate-900/50 rounded-lg border border-slate-800">
        <div className={cn(
          "grid gap-4",
          compact ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-4" : "grid-cols-1 md:grid-cols-2"
        )}>
          {/* Odabir brenda */}
          <div className="flex flex-col">
            <span className="text-xs text-slate-300 mb-1">Marka</span>
          <Select
            value={selectedBrandId}
            onValueChange={setSelectedBrandId}
            disabled={loadingBrands}
          >
            <SelectTrigger className={selectTriggerClasses}>
              <SelectValue placeholder="Marka" />
            </SelectTrigger>
            <SelectContent>
              {loadingBrands ? (
                <div className="flex items-center justify-center p-2"><Loader2 className="h-4 w-4 animate-spin mr-2 text-sunfire-400" />Učitavanje...</div>
              ) : (
                <>
                  <div className="p-2 sticky top-0 bg-slate-900/90 backdrop-blur z-10">
                    <Input
                      value={brandQuery}
                      onChange={(e) => setBrandQuery(e.target.value)}
                      placeholder="Pretraži marke..."
                      className="h-8 text-sm bg-slate-800 border-slate-700 text-white placeholder:text-slate-400"
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
            <span className="text-xs text-slate-300 mb-1">Model</span>
          <Select
            value={selectedModelId}
            onValueChange={setSelectedModelId}
            disabled={!selectedBrandId || loadingModels}
          >
            <SelectTrigger className={selectTriggerClasses}>
              <SelectValue placeholder="Model" />
            </SelectTrigger>
            <SelectContent>
              {loadingModels ? (
                <div className="flex items-center justify-center p-2"><Loader2 className="h-4 w-4 animate-spin mr-2 text-sunfire-400" />Učitavanje...</div>
              ) : (
                <>
                  <div className="p-2 sticky top-0 bg-slate-900/90 backdrop-blur z-10">
                    <Input
                      value={modelQuery}
                      onChange={(e) => setModelQuery(e.target.value)}
                      placeholder="Pretraži modele..."
                      className="h-8 text-sm bg-slate-800 border-slate-700 text-white placeholder:text-slate-400"
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
            <span className="text-xs text-slate-300 mb-1">Generacija</span>
          <Select
            value={selectedGenerationId}
            onValueChange={setSelectedGenerationId}
            disabled={!selectedModelId || loadingGenerations}
          >
            <SelectTrigger className={selectTriggerClasses}>
              <SelectValue placeholder="Generacija" />
            </SelectTrigger>
            <SelectContent>
              {loadingGenerations ? (
                <div className="flex items-center justify-center p-2"><Loader2 className="h-4 w-4 animate-spin mr-2 text-sunfire-400" />Učitavanje...</div>
              ) : (
                <>
                  <div className="p-2 sticky top-0 bg-slate-900/90 backdrop-blur z-10">
                    <Input
                      value={generationQuery}
                      onChange={(e) => setGenerationQuery(e.target.value)}
                      placeholder="Pretraži generacije..."
                      className="h-8 text-sm bg-slate-800 border-slate-700 text-white placeholder:text-slate-400"
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
            <span className="text-xs text-slate-300 mb-1">Motor</span>
          <Select
            value={selectedEngineId}
            onValueChange={setSelectedEngineId}
            disabled={!selectedGenerationId || loadingEngines}
          >
            <SelectTrigger className={selectTriggerClasses}>
              <SelectValue placeholder="Motor" />
            </SelectTrigger>
            <SelectContent>
              {loadingEngines ? (
                <div className="flex items-center justify-center p-2"><Loader2 className="h-4 w-4 animate-spin mr-2 text-sunfire-400" />Učitavanje...</div>
              ) : (
                <>
                  <div className="p-2 sticky top-0 bg-slate-900/90 backdrop-blur z-10">
                    <Input
                      value={engineQuery}
                      onChange={(e) => setEngineQuery(e.target.value)}
                      placeholder="Pretraži motore..."
                      className="h-8 text-sm bg-slate-800 border-slate-700 text-white placeholder:text-slate-400"
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
        
        {onVehicleSelect && (
          <div className="flex justify-end mt-6">
            <Button 
              onClick={handleSearch} 
              disabled={!selectedGenerationId}
              className="bg-sunfire-500 hover:bg-sunfire-600 text-white font-bold py-2 px-4 rounded-lg shadow-lg hover:shadow-xl shadow-sunfire-500/20 hover:shadow-sunfire-500/40 transition-all duration-300 transform hover:-translate-y-0.5 flex items-center gap-2 disabled:bg-sunfire-500/50 disabled:cursor-not-allowed border border-sunfire-400 hover:border-sunfire-300"
            >
              Primijeni filtere
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
