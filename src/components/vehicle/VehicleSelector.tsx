"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
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
  const [bodyStyles, setBodyStyles] = useState<string[]>([]);
  
  // Stanja za odabrane vrijednosti
  const [selectedBrandId, setSelectedBrandId] = useState<string>("");
  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const [selectedGenerationId, setSelectedGenerationId] = useState<string>("");
  const [selectedEngineId, setSelectedEngineId] = useState<string>("");
  const [selectedBodyStyle, setSelectedBodyStyle] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  
  // Stanja za učitavanje
  const [loadingBrands, setLoadingBrands] = useState<boolean>(false);
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
  const bodyStylesToRender = useMemo<string[]>(() => Array.from(new Set((bodyStyles || []).filter(Boolean))) as string[], [bodyStyles]);
  
  // Učitavanje brendova vozila pri prvom renderiranju
  useEffect(() => {
    const fetchBrands = async () => {
      setLoadingBrands(true);
      try {
        const response = await fetch("/api/vehicle-brands");
        if (!response.ok) throw new Error("Greška pri dohvaćanju brendova vozila");
        
        const data = await response.json();
        setAllBrands(Array.isArray(data) ? data : []);
        // Primijeni inicijalni filter po tipu
        const filtered = Array.isArray(data)
          ? data.filter((b: VehicleBrand) => vehicleType === 'ALL' || b.type === vehicleType)
          : [];
        setBrands(filtered);
        
        // Postavi odabrani brend iz URL-a ako postoji
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
  }, [searchParams]);

  // Kad se promijeni vehicleType, filtriraj brendove i resetiraj odabire
  useEffect(() => {
    const filtered = allBrands.filter((b) => vehicleType === 'ALL' || b.type === vehicleType);
    setBrands(filtered);
    // Reset selekcija jer se kontekst promijenio
    setSelectedBrandId("");
    setSelectedModelId("");
    setSelectedGenerationId("");
    setSelectedEngineId("");
    setSelectedBodyStyle("");
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
      try {
        const response = await fetch(`/api/vehicle-brands/${selectedBrandId}/models`);
        if (!response.ok) throw new Error("Greška pri dohvaćanju modela vozila");
        
        const data = await response.json();
        setModels(data);
        
        // Postavi odabrani model iz URL-a ako postoji
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
  }, [selectedBrandId, searchParams]);
  
  // Učitavanje generacija kada se odabere model
  useEffect(() => {
    if (!selectedModelId) {
      setGenerations([]);
      setSelectedGenerationId("");
      return;
    }
    
    const fetchGenerations = async () => {
      setLoadingGenerations(true);
      try {
        const response = await fetch(`/api/models/${selectedModelId}/generations`);
        if (!response.ok) throw new Error("Greška pri dohvaćanju generacija vozila");
        
        const data = await response.json();
        setGenerations(data);
        
        // Postavi odabranu generaciju iz URL-a ako postoji
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
  }, [selectedModelId, searchParams]);
  
  // Učitavanje motora i stilova karoserije kada se odabere generacija
  useEffect(() => {
    if (!selectedGenerationId) {
      setEngines([]);
      setBodyStyles([]);
      setSelectedEngineId("");
      setSelectedBodyStyle("");
      return;
    }
    
    const fetchEnginesAndBodyStyles = async () => {
      setLoadingEngines(true);
      try {
        // Dohvaćanje motora (puni zapisi)
        const enginesResponse = await fetch(`/api/generations/${selectedGenerationId}/engines`);
        if (!enginesResponse.ok) throw new Error("Greška pri dohvaćanju motora");
        
        const enginesData = await enginesResponse.json();
        // Očekujemo niz objekata s poljima: id, engineType, enginePowerKW, enginePowerHP, engineCapacity, engineCode, description, generationId
        const normalized = Array.isArray(enginesData)
          ? enginesData.filter((e: any) => e && typeof e === 'object' && e.id)
          : [];
        setEngines(normalized);
        
        // Dohvaćanje generacije za stilove karoserije
        const generationResponse = await fetch(`/api/generations/${selectedGenerationId}`);
        if (!generationResponse.ok) throw new Error("Greška pri dohvaćanju generacije");
        
        const generationData = await generationResponse.json();
        
        // Parsiranje stilova karoserije iz JSON polja
        let bodyStylesArray: string[] = [];
        if (generationData.bodyStyles && typeof generationData.bodyStyles === 'object') {
          bodyStylesArray = Array.isArray(generationData.bodyStyles) 
            ? generationData.bodyStyles 
            : [];
        }
        
        setBodyStyles(bodyStylesArray);
        
        // Postavi odabrani motor i stil karoserije iz URL-a ako postoji
        const engineIdFromUrl = searchParams.get("engineId");
        if (engineIdFromUrl) {
          setSelectedEngineId(engineIdFromUrl);
        }
        
        const bodyStyleFromUrl = searchParams.get("bodyStyle");
        if (bodyStyleFromUrl) {
          setSelectedBodyStyle(bodyStyleFromUrl);
        }
        
        const yearFromUrl = searchParams.get("year");
        if (yearFromUrl) {
          setSelectedYear(yearFromUrl);
        }
      } catch (error) {
        console.error("Greška:", error);
      } finally {
        setLoadingEngines(false);
      }
    };
    
    fetchEnginesAndBodyStyles();
  }, [selectedGenerationId, searchParams]);
  
  // Generiranje godina za odabir
  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    
    // Generiranje godina od 1950 do trenutne godine
    for (let year = currentYear; year >= 1950; year--) {
      years.push(year);
    }
    
    return years;
  };
  
  // Handler za pretragu proizvoda po vozilu
  const handleSearch = () => {
    if (!selectedGenerationId) return;
    
    const params = new URLSearchParams();
    
    if (selectedGenerationId) params.set("generationId", selectedGenerationId);
    if (selectedEngineId && selectedEngineId !== 'all') params.set("engineId", selectedEngineId);
    if (selectedBodyStyle && selectedBodyStyle !== 'all') params.set("bodyStyle", selectedBodyStyle);
    // Godina je vezana uz generaciju, pa je ne dodajemo kao zaseban parametar
    // Ako je potrebno filtriranje po godini, to će se raditi na backend strani
    
    // Ako je proslijeđen callback, pozovi ga
    if (onVehicleSelect) {
      onVehicleSelect({
        generationId: selectedGenerationId,
        engineId: selectedEngineId || undefined,
        bodyStyle: selectedBodyStyle || undefined,
        year: selectedYear ? parseInt(selectedYear) : undefined,
      });
    } else {
      // Inače, preusmjeri na stranicu s proizvodima
      router.push(`/products/vehicle-compatibility?${params.toString()}`);
    }
  };
  
  // Formatiranje opisa motora
  const formatEngineDescription = (engine: VehicleEngine) => {
    const parts = [];
    
    if (engine.engineType) {
      parts.push(engine.engineType);
    }
    
    if (engine.engineCapacity) {
      parts.push(`${(engine.engineCapacity / 1000).toFixed(1)}L`);
    }
    
    if (engine.enginePowerKW) {
      parts.push(`${engine.enginePowerKW}kW`);
    }
    
    if (engine.enginePowerHP) {
      parts.push(`(${engine.enginePowerHP}KS)`);
    }
    
    if (engine.engineCode) {
      parts.push(engine.engineCode);
    }
    
    return parts.join(" ");
  };
  
  return (
    <div className={cn("space-y-4", className)}>
      {!compact && (
        <div className="flex items-center space-x-2 mb-4">
          <Car className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-medium">Odaberi vozilo</h3>
        </div>
      )}
      
      <div className={cn(
        "grid gap-4",
        compact ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-5" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
      )}>
        {/* Odabir brenda */}
        <div>
          <Select
            value={selectedBrandId}
            onValueChange={setSelectedBrandId}
            disabled={loadingBrands}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Odaberi marku" />
            </SelectTrigger>
            <SelectContent>
              {loadingBrands ? (
                <div key="loader-brands" className="flex items-center justify-center p-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="ml-2">Učitavanje...</span>
                </div>
              ) : (
                brandsToRender.map((brand, idx) => (
                  <SelectItem key={`brand-${brand.id}-${idx}`} value={brand.id}>
                    {brand.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
        
        {/* Odabir modela */}
        <div>
          <Select
            value={selectedModelId}
            onValueChange={setSelectedModelId}
            disabled={!selectedBrandId || loadingModels}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Odaberi model" />
            </SelectTrigger>
            <SelectContent>
              {loadingModels ? (
                <div key="loader-models" className="flex items-center justify-center p-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="ml-2">Učitavanje...</span>
                </div>
              ) : (
                modelsToRender.map((model, idx) => (
                  <SelectItem key={`model-${model.id}-${idx}`} value={model.id}>
                    {model.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
        
        {/* Odabir generacije */}
        <div>
          <Select
            value={selectedGenerationId}
            onValueChange={setSelectedGenerationId}
            disabled={!selectedModelId || loadingGenerations}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Odaberi generaciju" />
            </SelectTrigger>
            <SelectContent>
              {loadingGenerations ? (
                <div key="loader-generations" className="flex items-center justify-center p-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="ml-2">Učitavanje...</span>
                </div>
              ) : (
                generationsToRender.map((generation, idx) => (
                  <SelectItem key={`gen-${generation.id}-${idx}`} value={generation.id}>
                    {generation.name} {generation.period ? `(${generation.period})` : ""}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
        
        {/* Odabir motora */}
        <div>
          <Select
            value={selectedEngineId}
            onValueChange={setSelectedEngineId}
            disabled={!selectedGenerationId || loadingEngines}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Odaberi motor (opcionalno)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem key="all-engines" value="all">Svi motori</SelectItem>
              {loadingEngines ? (
                <div key="loader-engines" className="flex items-center justify-center p-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="ml-2">Učitavanje...</span>
                </div>
              ) : (
                enginesToRender.map((engine, idx) => (
                  <SelectItem key={`engine-${engine.id}-${idx}`} value={engine.id}>
                    {formatEngineDescription(engine)}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
        
        {/* Odabir stila karoserije */}
        {bodyStyles.length > 0 && (
          <div>
            <Select
              value={selectedBodyStyle}
              onValueChange={setSelectedBodyStyle}
              disabled={!selectedGenerationId}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Odaberi karoseriju (opcionalno)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem key="all-body-styles" value="all">Sve karoserije</SelectItem>
                {bodyStylesToRender.map((style) => (
                  <SelectItem key={`style-${style}`} value={style}>
                    {style}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        
        {/* Odabir godine */}
        <div>
          <Select
            value={selectedYear}
            onValueChange={setSelectedYear}
            disabled={!selectedGenerationId}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Odaberi godinu (opcionalno)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem key="all-years" value="all">Sve godine</SelectItem>
              {generateYearOptions().map((year, idx) => (
                <SelectItem key={`year-${year}-${idx}`} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Gumb za pretragu */}
      <Button
        onClick={handleSearch}
        disabled={!selectedGenerationId}
        className={cn(
          "w-full md:w-auto",
          compact ? "mt-2" : "mt-4"
        )}
      >
        Pretraži dijelove
        <ChevronRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}
