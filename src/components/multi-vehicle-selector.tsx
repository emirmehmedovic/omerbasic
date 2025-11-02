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
  id: string; // composite: generationId or generationId::engineId
  brandName: string;
  modelName: string;
  generationName: string;
  period?: string | null;
  engineId?: string;
  engineType?: string | null;
  engineCapacity?: number | null;
  enginePowerHP?: number | null;
  engineCode?: string | null;
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
  // Bulk selection state
  const [enginesByGeneration, setEnginesByGeneration] = useState<Record<string, VehicleEngine[]>>({});
  const [bulkSelected, setBulkSelected] = useState<Record<string, { mode: 'none' | 'all' | 'selected'; engineIds: Set<string> }>>({});
  
  // Stanje za praćenje odabranih vozila
  const [selectedVehicles, setSelectedVehicles] = useState<SelectedVehicle[]>([]);
  
  // Učitaj inicijalne generacije/motore ako su dostavljeni (podržava ID-jeve oblika genId ili genId::engineId)
  useEffect(() => {
    if (initialGenerationIds && initialGenerationIds.length > 0) {
      const loadInitialGenerations = async () => {
        try {
          const loadedVehicles: SelectedVehicle[] = [];
          
          for (const composite of initialGenerationIds) {
            const [genId, engId] = composite.split('::');
            const res = await fetch(`/api/generations/${genId}/details`);
            if (res.ok) {
              const data = await res.json();
              // Build structured vehicle row
              let engineData: Partial<SelectedVehicle> = {};
              if (engId) {
                try {
                  const engRes = await fetch(`/api/engines/${engId}`);
                  if (engRes.ok) {
                    const engine: VehicleEngine = await engRes.json();
                    engineData = {
                      engineId: engine.id,
                      engineType: engine.engineType,
                      engineCapacity: engine.engineCapacity,
                      enginePowerHP: engine.enginePowerHP,
                      engineCode: engine.engineCode,
                    };

                  }
                } catch {}
              }
              loadedVehicles.push({
                id: composite,
                brandName: data.brand.name,
                modelName: data.model.name,
                generationName: data.name,
                period: data.period ?? null,
                ...engineData,
              });
            }
          }
          
          setSelectedVehicles(loadedVehicles);
          // Propagiraj inicijalne (kompozitne) ID-jeve roditelju
          onGenerationsChange(initialGenerationIds);
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

  // Lazy load engines for a generation in bulk UI
  const ensureEnginesLoaded = async (genId: string) => {
    if (enginesByGeneration[genId]) return;
    try {
      const res = await fetch(`/api/generations/${genId}/engines`);
      const data = await res.json();
      setEnginesByGeneration(prev => ({ ...prev, [genId]: data }));
    } catch {}
  };

  // Dodaj vozilo u odabrana
  const addVehicle = () => {
    if (!selectedGeneration) return;
    
    // Kreiraj jedinstveni ID koji uključuje generaciju i motor
    const vehicleId = selectedEngine ? `${selectedGeneration}::${selectedEngine}` : selectedGeneration;
    
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
    const newVehicle: SelectedVehicle = {
      id: vehicleId,
      brandName: brand.name,
      modelName: model.name,
      generationName: generation.name,
      period: generation.period,
      engineId: engine?.id || undefined,
      engineType: engine?.engineType ?? null,
      engineCapacity: engine?.engineCapacity ?? null,
      enginePowerHP: engine?.enginePowerHP ?? null,
      engineCode: engine?.engineCode ?? null,
    };
    
    // Dodaj u listu i obavijesti roditelja
    const updatedVehicles = [...selectedVehicles, newVehicle];
    setSelectedVehicles(updatedVehicles);
    // Emitiraj kompozitne ID-jeve (genId ili genId-engineId) da bi backend znao engine
    onGenerationsChange(updatedVehicles.map(v => v.id));
    
    // Resetiraj odabir za novo dodavanje
    setSelectedGeneration('');
    setSelectedEngine('');
  };

  // Bulk add handler used by UI buttons
  const handleAddBulk = () => {
    const entries: SelectedVehicle[] = [];
    for (const gen of generations) {
      const bulk = bulkSelected[gen.id];
      if (!bulk) continue;
      const model = models.find(m => m.id === selectedModel);
      const brand = brands.find(b => b.id === selectedBrand);
      if (!model || !brand) continue;
      const base: Omit<SelectedVehicle, 'id'> = {
        brandName: brand.name,
        modelName: model.name,
        generationName: gen.name,
        period: gen.period,
        engineId: undefined,
        engineType: null,
        engineCapacity: null,
        enginePowerHP: null,
        engineCode: null,
      };
      if (bulk.mode === 'none') {
        const id = gen.id;
        if (!selectedVehicles.some(v => v.id === id)) entries.push({ id, ...base });
      } else if (bulk.mode === 'all') {
        const eList = enginesByGeneration[gen.id] || [];
        for (const e of eList) {
          const id = `${gen.id}::${e.id}`;
          if (!selectedVehicles.some(v => v.id === id)) {
            entries.push({ id, ...base, engineId: e.id, engineType: e.engineType, engineCapacity: e.engineCapacity ?? null, enginePowerHP: e.enginePowerHP ?? null, engineCode: e.engineCode ?? null });
          }
        }
      } else if (bulk.mode === 'selected') {
        const ids = Array.from(bulk.engineIds);
        for (const engId of ids) {
          const e = (enginesByGeneration[gen.id] || []).find(x => x.id === engId);
          const id = `${gen.id}::${engId}`;
          if (!selectedVehicles.some(v => v.id === id)) {
            entries.push({ id, ...base, engineId: e?.id, engineType: e?.engineType ?? null, engineCapacity: e?.engineCapacity ?? null, enginePowerHP: e?.enginePowerHP ?? null, engineCode: e?.engineCode ?? null });
          }
        }
      }
    }
    if (entries.length === 0) return;
    const updated = [...selectedVehicles, ...entries];
    setSelectedVehicles(updated);
    onGenerationsChange(updated.map(v => v.id));
  };

  // Ukloni vozilo iz odabranih
  const removeVehicle = (id: string) => {
    const updatedVehicles = selectedVehicles.filter(v => v.id !== id);
    setSelectedVehicles(updatedVehicles);
    // Emitiraj kompozitne ID-jeve
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
              {`${engine.engineType || ''} ${engine.engineCapacity ?? ''}cc ${engine.enginePowerHP ?? ''}KS ${engine.engineCode ? '('+engine.engineCode+')' : ''}`.trim()}
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

      {/* Bulk selection for current model */}
      {selectedModel && (
        <div className="rounded-md border border-gray-200 p-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium">Brzi višestruki odabir generacija i motora</h4>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" className="h-8" onClick={handleAddBulk}>Dodaj odabrano</Button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-auto">
            {generations.map((gen) => (
              <div key={gen.id} className="border rounded p-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={Boolean(bulkSelected[gen.id])}
                    onChange={async (e) => {
                      if (e.target.checked) {
                        setBulkSelected(prev => ({ ...prev, [gen.id]: { mode: 'none', engineIds: new Set() } }));
                      } else {
                        setBulkSelected(prev => { const cp = { ...prev }; delete cp[gen.id]; return cp; });
                      }
                    }}
                  />
                  <span>{gen.name}{gen.period ? ` (${gen.period})` : ''}</span>
                </label>
                {bulkSelected[gen.id] && (
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center gap-3 text-xs">
                      <label className="flex items-center gap-1">
                        <input
                          type="radio"
                          name={`mode-${gen.id}`}
                          checked={bulkSelected[gen.id].mode === 'none'}
                          onChange={() => setBulkSelected(prev => ({ ...prev, [gen.id]: { ...prev[gen.id], mode: 'none' } }))}
                        />
                        <span>Generacija</span>
                      </label>
                      <label className="flex items-center gap-1">
                        <input
                          type="radio"
                          name={`mode-${gen.id}`}
                          checked={bulkSelected[gen.id].mode === 'all'}
                          onChange={async () => {
                            await ensureEnginesLoaded(gen.id);
                            setBulkSelected(prev => ({ ...prev, [gen.id]: { ...prev[gen.id], mode: 'all' } }));
                          }}
                        />
                        <span>Svi motori</span>
                      </label>
                      <label className="flex items-center gap-1">
                        <input
                          type="radio"
                          name={`mode-${gen.id}`}
                          checked={bulkSelected[gen.id].mode === 'selected'}
                          onChange={async () => {
                            await ensureEnginesLoaded(gen.id);
                            setBulkSelected(prev => ({ ...prev, [gen.id]: { ...prev[gen.id], mode: 'selected' } }));
                          }}
                        />
                        <span>Odabrani motori</span>
                      </label>
                    </div>
                    {bulkSelected[gen.id].mode === 'selected' && (
                      <div className="max-h-40 overflow-auto border rounded p-2">
                        {(enginesByGeneration[gen.id] || []).map((e) => (
                          <label key={e.id} className="flex items-center gap-2 text-xs py-0.5">
                            <input
                              type="checkbox"
                              checked={bulkSelected[gen.id].engineIds.has(e.id)}
                              onChange={(ev) => setBulkSelected(prev => {
                                const curr = prev[gen.id];
                                const nextSet = new Set(curr.engineIds);
                                if (ev.target.checked) nextSet.add(e.id); else nextSet.delete(e.id);
                                return { ...prev, [gen.id]: { ...curr, engineIds: nextSet } };
                              })}
                            />
                            <span>{`${e.engineType || ''} ${e.engineCapacity ?? ''}cc ${e.enginePowerHP ?? ''}KS ${e.engineCode ? '('+e.engineCode+')' : ''}`.trim()}</span>
                          </label>
                        ))}
                        {(enginesByGeneration[gen.id] || []).length === 0 && (
                          <div className="text-xs text-gray-500">Nema motora</div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {generations.length === 0 && <div className="text-sm text-gray-500">Nema generacija za ovaj model.</div>}
          </div>
          <div className="mt-2 text-right">
            <Button type="button" onClick={handleAddBulk}>Dodaj odabrano</Button>
          </div>
        </div>
      )}

      {/* Selected Vehicles Table */}
      {selectedVehicles.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium mb-2">Povezana vozila</h4>
          <div className="overflow-x-auto rounded-md border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">Brend</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">Model</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">Generacija</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">Period</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">Motor</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">Broj motora</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {selectedVehicles.map((v) => (
                  <tr key={v.id}>
                    <td className="px-3 py-2 text-gray-900">{v.brandName}</td>
                    <td className="px-3 py-2 text-gray-900">{v.modelName}</td>
                    <td className="px-3 py-2 text-gray-900">{v.generationName}</td>
                    <td className="px-3 py-2 text-gray-900">{v.period || '-'}</td>
                    <td className="px-3 py-2 text-gray-900">{v.engineType ? `${v.engineType} ${v.engineCapacity ?? ''}cc ${v.enginePowerHP ?? ''}KS` : '-'}</td>
                    <td className="px-3 py-2 text-gray-900">{v.engineCode || '-'}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => removeVehicle(v.id)}
                        className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                      >
                        <X size={14} /> Ukloni
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiVehicleSelector;
