'use client';

import { useEffect, useState } from 'react';
import { VehicleBrand, VehicleModel, VehicleGeneration, VehicleType, VehicleEngine } from '@/generated/prisma/client';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface MultiVehicleSelectorProps {
  onGenerationsChange: (generationIds: string[]) => void;
  initialGenerationIds?: string[];
}

// Tip za prikaz odabranog vozila
interface SelectedVehicle {
  id: string;
  displayName: string;
  engineId?: string;
  engineDisplayName?: string;
}

const MultiVehicleSelector = ({ 
  onGenerationsChange,
  initialGenerationIds = []
}: MultiVehicleSelectorProps) => {
  const [vehicleType, setVehicleType] = useState<VehicleType | ''>('');
  const [brands, setBrands] = useState<VehicleBrand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [models, setModels] = useState<VehicleModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [generations, setGenerations] = useState<VehicleGeneration[]>([]);
  const [selectedGeneration, setSelectedGeneration] = useState<string>('');
  const [engines, setEngines] = useState<VehicleEngine[]>([]);
  const [selectedEngine, setSelectedEngine] = useState<string>('');
  
  // Stanje za praćenje odabranih vozila
  const [selectedVehicles, setSelectedVehicles] = useState<SelectedVehicle[]>([]);
  
  // Učitaj inicijalne generacije ako su dostavljene
  useEffect(() => {
    if (initialGenerationIds && initialGenerationIds.length > 0) {
      const loadInitialGenerations = async () => {
        try {
          const loadedVehicles: SelectedVehicle[] = [];
          
          for (const genId of initialGenerationIds) {
            const res = await fetch(`/api/generations/${genId}/details`);
            if (res.ok) {
              const data = await res.json();
              loadedVehicles.push({
                id: genId,
                displayName: `${data.brand.name} ${data.model.name} ${data.name} (${data.period})`
              });
            }
          }
          
          setSelectedVehicles(loadedVehicles);
        } catch (error) {
          console.error('Error loading initial generations:', error);
        }
      };
      
      loadInitialGenerations();
    }
  }, [initialGenerationIds]);

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
      setEngines([]);
      setSelectedEngine('');
      return;
    }
    const fetchGenerations = async () => {
      const res = await fetch(`/api/models/${selectedModel}/generations`);
      const data = await res.json();
      setGenerations(data);
    };
    fetchGenerations();
  }, [selectedModel]);

  // Fetch engines when generation changes
  useEffect(() => {
    if (!selectedGeneration) {
      setEngines([]);
      setSelectedEngine('');
      return;
    }
    const fetchEngines = async () => {
      const res = await fetch(`/api/generations/${selectedGeneration}/engines`);
      const data = await res.json();
      setEngines(data);
    };
    fetchEngines();
  }, [selectedGeneration]);

  // Dodaj vozilo u odabrana
  const addVehicle = () => {
    if (!selectedGeneration) return;
    
    // Kreiraj jedinstveni ID koji uključuje generaciju i motor
    const vehicleId = selectedEngine ? `${selectedGeneration}-${selectedEngine}` : selectedGeneration;
    
    // Provjeri da li je već dodano
    if (selectedVehicles.some(v => v.id === vehicleId)) {
      return;
    }
    
    // Nađi podatke o generaciji
    const generation = generations.find(g => g.id === selectedGeneration);
    if (!generation) return;
    
    // Nađi podatke o modelu
    const model = models.find(m => m.id === selectedModel);
    if (!model) return;
    
    // Nađi podatke o brendu
    const brand = brands.find(b => b.id === selectedBrand);
    if (!brand) return;
    
    // Nađi podatke o motoru ako je odabran
    const engine = selectedEngine ? engines.find(e => e.id === selectedEngine) : null;
    
    // Kreiraj prikaz za odabrano vozilo
    const engineInfo = engine ? ` - ${engine.engineType} ${engine.engineCapacity}cc ${engine.enginePowerHP}KS` : '';
    const newVehicle: SelectedVehicle = {
      id: vehicleId,
      displayName: `${brand.name} ${model.name} ${generation.name} (${generation.period})${engineInfo}`,
      engineId: selectedEngine || undefined,
      engineDisplayName: engine ? `${engine.engineType} ${engine.engineCapacity}cc ${engine.enginePowerHP}KS` : undefined
    };
    
    // Dodaj u listu i obavijesti roditelja
    const updatedVehicles = [...selectedVehicles, newVehicle];
    setSelectedVehicles(updatedVehicles);
    onGenerationsChange(updatedVehicles.map(v => v.id));
    
    // Resetiraj odabir za novo dodavanje
    setSelectedGeneration('');
    setSelectedEngine('');
  };

  // Ukloni vozilo iz odabranih
  const removeVehicle = (id: string) => {
    const updatedVehicles = selectedVehicles.filter(v => v.id !== id);
    setSelectedVehicles(updatedVehicles);
    onGenerationsChange(updatedVehicles.map(v => v.id));
  };

  return (
    <div className="w-full space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
        {/* Vehicle Type Dropdown */}
        <select 
          value={vehicleType} 
          onChange={(e) => {
            setVehicleType(e.target.value as VehicleType);
            setSelectedBrand('');
            setSelectedModel('');
            setSelectedGeneration('');
          }} 
          className="px-3 py-2 bg-white rounded border border-gray-300 shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
        >
          <option value="" className="text-gray-900">Tip vozila</option>
          <option value="PASSENGER" className="text-gray-900">Putničko</option>
          <option value="COMMERCIAL" className="text-gray-900">Teretno</option>
        </select>

        {/* Brand Dropdown */}
        <select 
          value={selectedBrand} 
          onChange={(e) => {
            setSelectedBrand(e.target.value);
            setSelectedModel('');
            setSelectedGeneration('');
          }} 
          disabled={!vehicleType} 
          className="px-3 py-2 bg-white rounded border border-gray-300 shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 text-gray-900"
        >
          <option value="" className="text-gray-900">Brend</option>
          {brands.map((brand) => (
            <option key={brand.id} value={brand.id} className="text-gray-900">{brand.name}</option>
          ))}
        </select>

        {/* Model Dropdown */}
        <select 
          value={selectedModel} 
          onChange={(e) => {
            setSelectedModel(e.target.value);
            setSelectedGeneration('');
            setSelectedEngine('');
          }} 
          disabled={!selectedBrand} 
          className="px-3 py-2 bg-white rounded border border-gray-300 shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 text-gray-900"
        >
          <option value="" className="text-gray-900">Model</option>
          {models.map((model) => (
            <option key={model.id} value={model.id} className="text-gray-900">{model.name}</option>
          ))}
        </select>

        {/* Generation Dropdown */}
        <select 
          value={selectedGeneration}
          onChange={(e) => {
            setSelectedGeneration(e.target.value);
            setSelectedEngine('');
          }} 
          disabled={!selectedModel} 
          className="px-3 py-2 bg-white rounded border border-gray-300 shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 text-gray-900" 
        >
          <option value="" className="text-gray-900">Generacija</option>
          {generations.map((gen) => (
            <option key={gen.id} value={gen.id} className="text-gray-900">{`${gen.name} (${gen.period})`}</option>
          ))}
        </select>

        {/* Engine Dropdown */}
        <select 
          value={selectedEngine}
          onChange={(e) => setSelectedEngine(e.target.value)} 
          disabled={!selectedGeneration} 
          className="px-3 py-2 bg-white rounded border border-gray-300 shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 text-gray-900" 
        >
          <option value="" className="text-gray-900">Motor (opciono)</option>
          {engines.map((engine) => (
            <option key={engine.id} value={engine.id} className="text-gray-900">
              {`${engine.engineType} ${engine.engineCapacity}cc ${engine.enginePowerHP}KS`}
            </option>
          ))}
        </select>

        {/* Add Button */}
        <Button 
          type="button"
          onClick={addVehicle}
          disabled={!selectedGeneration}
          className="h-full"
        >
          Dodaj vozilo
        </Button>
      </div>

      {/* Selected Vehicles List */}
      {selectedVehicles.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium mb-2">Odabrana vozila:</h4>
          <div className="flex flex-wrap gap-2">
            {selectedVehicles.map(vehicle => (
              <Badge key={vehicle.id} variant="secondary" className="flex items-center gap-1 py-1 px-2">
                {vehicle.displayName}
                <button 
                  type="button" 
                  onClick={() => removeVehicle(vehicle.id)}
                  className="ml-1 text-gray-500 hover:text-gray-700"
                >
                  <X size={14} />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiVehicleSelector;
