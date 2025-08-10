'use client';

import { useEffect, useState } from 'react';

import { VehicleBrand, VehicleModel, VehicleGeneration, VehicleType } from '@/generated/prisma/client';
import { EngineType } from '@/lib/types';

interface VehicleSelectorProps {
  onGenerationSelect: (generationId: string) => void;
  layout?: 'horizontal' | 'vertical';
  rememberSelection?: boolean;
}

const VehicleSelector = ({ 
  onGenerationSelect, 
  layout = 'horizontal',
  rememberSelection = true 
}: VehicleSelectorProps) => {
  

  const [vehicleType, setVehicleType] = useState<VehicleType | ''>('');
  const [brands, setBrands] = useState<VehicleBrand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [models, setModels] = useState<VehicleModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [generations, setGenerations] = useState<VehicleGeneration[]>([]);
  const [selectedGeneration, setSelectedGeneration] = useState<string>('');
  
  // TecDoc dodatna stanja
  const [engineTypes, setEngineTypes] = useState<string[]>([]);
  const [selectedEngineType, setSelectedEngineType] = useState<string>('');
  const [enginePowers, setEnginePowers] = useState<number[]>([]);
  const [selectedEnginePower, setSelectedEnginePower] = useState<string>('');
  const [engineCapacities, setEngineCapacities] = useState<number[]>([]);
  const [selectedEngineCapacity, setSelectedEngineCapacity] = useState<string>('');
  const [engineCodes, setEngineCodes] = useState<string[]>([]);
  const [selectedEngineCode, setSelectedEngineCode] = useState<string>('');
  

  // Učitaj spremljene postavke iz localStorage pri prvom renderiranju
  useEffect(() => {
    if (rememberSelection && typeof window !== 'undefined') {
      try {
        const savedVehicle = localStorage.getItem('selectedVehicle');
        if (savedVehicle) {
          const vehicle = JSON.parse(savedVehicle);
          if (vehicle.vehicleType) setVehicleType(vehicle.vehicleType as VehicleType);
          if (vehicle.brandId) setSelectedBrand(vehicle.brandId);
          if (vehicle.modelId) setSelectedModel(vehicle.modelId);
          if (vehicle.generationId && selectedGeneration !== vehicle.generationId) {
            setSelectedGeneration(vehicle.generationId);
            // Također pozovi callback funkciju za odabir generacije
            onGenerationSelect(vehicle.generationId);
          }
          if (vehicle.engineType) setSelectedEngineType(vehicle.engineType);
          if (vehicle.enginePower) setSelectedEnginePower(vehicle.enginePower);
          if (vehicle.engineCapacity) setSelectedEngineCapacity(vehicle.engineCapacity);
          if (vehicle.engineCode) setSelectedEngineCode(vehicle.engineCode);
        }
      } catch (error) {
        console.error('Error loading saved vehicle:', error);
        // U slučaju greške, očisti localStorage
        localStorage.removeItem('selectedVehicle');
      }
    }
  }, [rememberSelection, onGenerationSelect, selectedGeneration]);

  // Spremi odabrano vozilo u localStorage kada se promijeni bilo koji parametar
  useEffect(() => {
    if (rememberSelection && typeof window !== 'undefined' && 
        (vehicleType || selectedBrand || selectedModel || selectedGeneration || 
         selectedEngineType || selectedEnginePower || selectedEngineCapacity || selectedEngineCode)) {
      const vehicleToSave = {
        vehicleType,
        brandId: selectedBrand,
        modelId: selectedModel,
        generationId: selectedGeneration,
        engineType: selectedEngineType,
        enginePower: selectedEnginePower,
        engineCapacity: selectedEngineCapacity,
        engineCode: selectedEngineCode
      };
      localStorage.setItem('selectedVehicle', JSON.stringify(vehicleToSave));
    }
  }, [
    rememberSelection,
    vehicleType, 
    selectedBrand, 
    selectedModel, 
    selectedGeneration,
    selectedEngineType,
    selectedEnginePower,
    selectedEngineCapacity,
    selectedEngineCode
  ]);

  // Fetch brands when vehicle type changes
  useEffect(() => {
    if (!vehicleType) {
      setBrands([]);
      setSelectedBrand('');
      return;
    }
    const fetchBrands = async () => {
      const res = await fetch(`/api/brands?type=${vehicleType}`);
      const data = await res.json();
      setBrands(data);
    };
    fetchBrands();
  }, [vehicleType]);

  // Fetch models when brand changes
  useEffect(() => {
    if (!selectedBrand) {
      setModels([]);
      setSelectedModel('');
      return;
    }
    const fetchModels = async () => {
      const res = await fetch(`/api/brands/${selectedBrand}/models`);
      const data = await res.json();
      setModels(data);
    };
    fetchModels();
  }, [selectedBrand]);

  // Fetch generations when model changes
  useEffect(() => {
    if (!selectedModel) {
      setGenerations([]);
      setSelectedGeneration('');
      return;
    }
    const fetchGenerations = async () => {
      const res = await fetch(`/api/models/${selectedModel}/generations`);
      const data = await res.json();
      setGenerations(data);
    };
    fetchGenerations();
  }, [selectedModel]);

  // Fetch engine types when generation changes
  useEffect(() => {
    if (!selectedGeneration) {
      setEngineTypes([]);
      setSelectedEngineType('');
      return;
    }
    
    const fetchEngineTypes = async () => {
      try {
        const res = await fetch(`/api/generations/${selectedGeneration}/engine-types`);
        if (!res.ok) {
          console.error('Failed to fetch engine types');
          return;
        }
        const data = await res.json();
        setEngineTypes(data);
      } catch (error) {
        console.error('Error fetching engine types:', error);
      }
    };
    fetchEngineTypes();
  }, [selectedGeneration]);

  // Fetch engine powers when engine type changes
  useEffect(() => {
    if (!selectedEngineType) {
      setEnginePowers([]);
      setSelectedEnginePower('');
      return;
    }
    
    const fetchEnginePowers = async () => {
      try {
        const res = await fetch(`/api/engine-types/${selectedEngineType}/powers`);
        if (!res.ok) {
          console.error('Failed to fetch engine powers');
          return;
        }
        const data = await res.json();
        setEnginePowers(data);
      } catch (error) {
        console.error('Error fetching engine powers:', error);
      }
    };
    fetchEnginePowers();
  }, [selectedEngineType]);

  // Fetch engine capacities when engine power changes
  useEffect(() => {
    if (!selectedEnginePower) {
      setEngineCapacities([]);
      setSelectedEngineCapacity('');
      return;
    }
    
    const fetchEngineCapacities = async () => {
      try {
        const res = await fetch(`/api/engine-powers/${selectedEnginePower}/capacities`);
        if (!res.ok) {
          console.error('Failed to fetch engine capacities');
          return;
        }
        const data = await res.json();
        setEngineCapacities(data);
      } catch (error) {
        console.error('Error fetching engine capacities:', error);
      }
    };
    fetchEngineCapacities();
  }, [selectedEnginePower]);

  // Fetch engine codes when engine capacity changes
  useEffect(() => {
    if (!selectedEngineCapacity) {
      setEngineCodes([]);
      setSelectedEngineCode('');
      return;
    }
    
    const fetchEngineCodes = async () => {
      try {
        const res = await fetch(`/api/engine-capacities/${selectedEngineCapacity}/codes`);
        if (!res.ok) {
          console.error('Failed to fetch engine codes');
          return;
        }
        const data = await res.json();
        setEngineCodes(data);
      } catch (error) {
        console.error('Error fetching engine codes:', error);
      }
    };
    fetchEngineCodes();
  }, [selectedEngineCapacity]);

  

  return (
    <div className="w-full">
      {layout === 'horizontal' ? (
        // Horizontal layout - compact for inline filters
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 w-full">
          {/* Vehicle Type Dropdown */}
          <select 
            value={vehicleType} 
            onChange={(e) => {
              setVehicleType(e.target.value as VehicleType);
              // Resetiraj ostale vrijednosti kada se promijeni tip vozila
              setSelectedBrand('');
              setSelectedModel('');
              setSelectedGeneration('');
              setSelectedEngineType('');
              setSelectedEnginePower('');
              setSelectedEngineCapacity('');
              setSelectedEngineCode('');
            }} 
            className="w-full px-3 py-2 bg-white/70 backdrop-blur-sm rounded-xl border border-white/50 shadow-sm text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange/50 transition-all duration-200"
          >
            <option value="">Tip vozila</option>
            <option value="PASSENGER">Putničko</option>
            <option value="COMMERCIAL">Teretno</option>
          </select>

          {/* Brand Dropdown */}
          <select 
            value={selectedBrand} 
            onChange={(e) => {
              setSelectedBrand(e.target.value);
              // Resetiraj ostale vrijednosti kada se promijeni brend
              setSelectedModel('');
              setSelectedGeneration('');
              setSelectedEngineType('');
              setSelectedEnginePower('');
              setSelectedEngineCapacity('');
              setSelectedEngineCode('');
            }} 
            disabled={!vehicleType} 
            className="w-full px-3 py-2 bg-white/70 backdrop-blur-sm rounded-xl border border-white/50 shadow-sm text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange/50 transition-all duration-200 disabled:opacity-50"
          >
            <option value="">Brend</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>{brand.name}</option>
            ))}
          </select>

          {/* Model Dropdown */}
          <select 
            value={selectedModel} 
            onChange={(e) => {
              setSelectedModel(e.target.value);
              // Resetiraj ostale vrijednosti kada se promijeni model
              setSelectedGeneration('');
              setSelectedEngineType('');
              setSelectedEnginePower('');
              setSelectedEngineCapacity('');
              setSelectedEngineCode('');
            }} 
            disabled={!selectedBrand} 
            className="w-full px-3 py-2 bg-white/70 backdrop-blur-sm rounded-xl border border-white/50 shadow-sm text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange/50 transition-all duration-200 disabled:opacity-50"
          >
            <option value="">Model</option>
            {models.map((model) => (
              <option key={model.id} value={model.id}>{model.name}</option>
            ))}
          </select>

          {/* Generation Dropdown */}
          <select 
            value={selectedGeneration}
            onChange={(e) => {
              setSelectedGeneration(e.target.value);
              if (e.target.value) {
                onGenerationSelect(e.target.value);
              }
            }} 
            disabled={!selectedModel} 
            className="w-full px-3 py-2 bg-white/70 backdrop-blur-sm rounded-xl border border-white/50 shadow-sm text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange/50 transition-all duration-200 disabled:opacity-50" 
          >
            <option value="">Generacija</option>
            {generations.map((gen) => (
              <option key={gen.id} value={gen.id}>{`${gen.name} (${gen.period})`}</option>
            ))}
          </select>

          {/* Engine Type Dropdown */}
          <select 
            value={selectedEngineType}
            onChange={(e) => setSelectedEngineType(e.target.value)} 
            disabled={!selectedGeneration} 
            className="w-full px-3 py-2 bg-white/70 backdrop-blur-sm rounded-xl border border-white/50 shadow-sm text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange/50 transition-all duration-200 disabled:opacity-50" 
          >
            <option value="">Tip motora</option>
            {engineTypes.map((type) => (
              <option key={type} value={type}>{type === 'PETROL' ? 'Benzin' : type === 'DIESEL' ? 'Dizel' : type}</option>
            ))}
          </select>

          {/* Engine Power Dropdown */}
          <select 
            value={selectedEnginePower}
            onChange={(e) => setSelectedEnginePower(e.target.value)} 
            disabled={!selectedEngineType} 
            className="w-full px-3 py-2 bg-white/70 backdrop-blur-sm rounded-xl border border-white/50 shadow-sm text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange/50 transition-all duration-200 disabled:opacity-50" 
          >
            <option value="">Snaga (kW)</option>
            {enginePowers.map((power) => (
              <option key={power} value={power.toString()}>{power} kW / {Math.round(power * 1.36)} KS</option>
            ))}
          </select>

          {/* Engine Capacity Dropdown */}
          <select 
            value={selectedEngineCapacity}
            onChange={(e) => setSelectedEngineCapacity(e.target.value)} 
            disabled={!selectedEnginePower} 
            className="w-full px-3 py-2 bg-white/70 backdrop-blur-sm rounded-xl border border-white/50 shadow-sm text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange/50 transition-all duration-200 disabled:opacity-50" 
          >
            <option value="">Zapremina (ccm)</option>
            {engineCapacities.map((capacity) => (
              <option key={capacity} value={capacity.toString()}>{capacity} ccm</option>
            ))}
          </select>

          {/* Engine Code Dropdown */}
          <select 
            value={selectedEngineCode}
            onChange={(e) => setSelectedEngineCode(e.target.value)} 
            disabled={!selectedEngineCapacity} 
            className="w-full px-3 py-2 bg-white/70 backdrop-blur-sm rounded-xl border border-white/50 shadow-sm text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange/50 transition-all duration-200 disabled:opacity-50" 
          >
            <option value="">Kod motora</option>
            {engineCodes.map((code) => (
              <option key={code} value={code}>{code}</option>
            ))}
          </select>
        </div>
      ) : (
        // Vertical layout - with title and more spacing
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-slate-700">Pronađi dijelove za svoje vozilo</h3>
          <div className="flex flex-col gap-3">
            {/* Vehicle Type Dropdown */}
            <select 
              value={vehicleType} 
              onChange={(e) => {
                setVehicleType(e.target.value as VehicleType);
                // Resetiraj ostale vrijednosti kada se promijeni tip vozila
                setSelectedBrand('');
                setSelectedModel('');
                setSelectedGeneration('');
                setSelectedEngineType('');
                setSelectedEnginePower('');
                setSelectedEngineCapacity('');
                setSelectedEngineCode('');
              }} 
              className="w-full px-4 py-2.5 bg-white/70 backdrop-blur-sm rounded-xl border border-white/50 shadow-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange/50 transition-all duration-200"
            >
              <option value="">Tip vozila</option>
              <option value="PASSENGER">Putničko</option>
              <option value="COMMERCIAL">Teretno</option>
            </select>

            {/* Brand Dropdown */}
            <select 
              value={selectedBrand} 
              onChange={(e) => {
                setSelectedBrand(e.target.value);
                // Resetiraj ostale vrijednosti kada se promijeni brend
                setSelectedModel('');
                setSelectedGeneration('');
                setSelectedEngineType('');
                setSelectedEnginePower('');
                setSelectedEngineCapacity('');
                setSelectedEngineCode('');
              }} 
              disabled={!vehicleType} 
              className="w-full px-4 py-2.5 bg-white/70 backdrop-blur-sm rounded-xl border border-white/50 shadow-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange/50 transition-all duration-200 disabled:opacity-50"
            >
              <option value="">Brend</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>{brand.name}</option>
              ))}
            </select>

            {/* Model Dropdown */}
            <select 
              value={selectedModel} 
              onChange={(e) => {
                setSelectedModel(e.target.value);
                // Resetiraj ostale vrijednosti kada se promijeni model
                setSelectedGeneration('');
                setSelectedEngineType('');
                setSelectedEnginePower('');
                setSelectedEngineCapacity('');
                setSelectedEngineCode('');
              }} 
              disabled={!selectedBrand} 
              className="w-full px-4 py-2.5 bg-white/70 backdrop-blur-sm rounded-xl border border-white/50 shadow-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange/50 transition-all duration-200 disabled:opacity-50"
            >
              <option value="">Model</option>
              {models.map((model) => (
                <option key={model.id} value={model.id}>{model.name}</option>
              ))}
            </select>

            {/* Generation Dropdown */}
            <select 
              value={selectedGeneration}
              onChange={(e) => {
                setSelectedGeneration(e.target.value);
                if (e.target.value) {
                  onGenerationSelect(e.target.value);
                }
              }} 
              disabled={!selectedModel} 
              className="w-full px-4 py-2.5 bg-white/70 backdrop-blur-sm rounded-xl border border-white/50 shadow-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange/50 transition-all duration-200 disabled:opacity-50" 
            >
              <option value="">Generacija</option>
              {generations.map((gen) => (
                <option key={gen.id} value={gen.id}>{`${gen.name} (${gen.period})`}</option>
              ))}
            </select>

            {/* Engine Type Dropdown */}
            <select 
              value={selectedEngineType}
              onChange={(e) => setSelectedEngineType(e.target.value)} 
              disabled={!selectedGeneration} 
              className="w-full px-4 py-2.5 bg-white/70 backdrop-blur-sm rounded-xl border border-white/50 shadow-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange/50 transition-all duration-200 disabled:opacity-50" 
            >
              <option value="">Tip motora</option>
              {engineTypes.map((type) => (
                <option key={type} value={type}>{type === 'PETROL' ? 'Benzin' : type === 'DIESEL' ? 'Dizel' : type}</option>
              ))}
            </select>

            {/* Engine Power Dropdown */}
            <select 
              value={selectedEnginePower}
              onChange={(e) => setSelectedEnginePower(e.target.value)} 
              disabled={!selectedEngineType} 
              className="w-full px-4 py-2.5 bg-white/70 backdrop-blur-sm rounded-xl border border-white/50 shadow-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange/50 transition-all duration-200 disabled:opacity-50" 
            >
              <option value="">Snaga (kW)</option>
              {enginePowers.map((power) => (
                <option key={power} value={power.toString()}>{power} kW / {Math.round(power * 1.36)} KS</option>
              ))}
            </select>

            {/* Engine Capacity Dropdown */}
            <select 
              value={selectedEngineCapacity}
              onChange={(e) => setSelectedEngineCapacity(e.target.value)} 
              disabled={!selectedEnginePower} 
              className="w-full px-4 py-2.5 bg-white/70 backdrop-blur-sm rounded-xl border border-white/50 shadow-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange/50 transition-all duration-200 disabled:opacity-50" 
            >
              <option value="">Zapremina (ccm)</option>
              {engineCapacities.map((capacity) => (
                <option key={capacity} value={capacity.toString()}>{capacity} ccm</option>
              ))}
            </select>

            {/* Engine Code Dropdown */}
            <select 
              value={selectedEngineCode}
              onChange={(e) => setSelectedEngineCode(e.target.value)} 
              disabled={!selectedEngineCapacity} 
              className="w-full px-4 py-2.5 bg-white/70 backdrop-blur-sm rounded-xl border border-white/50 shadow-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange/50 transition-all duration-200 disabled:opacity-50" 
            >
              <option value="">Kod motora</option>
              {engineCodes.map((code) => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleSelector;
