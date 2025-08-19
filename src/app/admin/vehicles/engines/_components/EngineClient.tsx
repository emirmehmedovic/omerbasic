"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { Trash, Edit, Plus, ArrowLeft } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

interface VehicleEngine {
  id: string;
  generationId: string;
  engineType: string;
  enginePowerKW: number | null;
  enginePowerHP: number | null;
  engineCapacity: number | null;
  engineCode: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Generation {
  id: string;
  name: string;
  period: string | null;
  model: {
    id: string;
    name: string;
    brand: {
      id: string;
      name: string;
    }
  }
}

interface EngineClientProps {
  initialEngines: VehicleEngine[];
  generation: Generation;
  brandId: string;
  modelId: string;
  generationId: string;
}

export const EngineClient = ({
  initialEngines,
  generation,
  brandId,
  modelId,
  generationId,
}: EngineClientProps) => {
  const router = useRouter();
  const [engines, setEngines] = useState<VehicleEngine[]>(initialEngines);
  const [isAddingEngine, setIsAddingEngine] = useState(false);
  const [isEditingEngine, setIsEditingEngine] = useState(false);
  const [currentEngine, setCurrentEngine] = useState<VehicleEngine | null>(null);
  
  // State za novi motor
  const [engineType, setEngineType] = useState<string>("PETROL");
  const [enginePowerKW, setEnginePowerKW] = useState<string>("");
  const [enginePowerHP, setEnginePowerHP] = useState<string>("");
  const [engineCapacity, setEngineCapacity] = useState<string>("");
  const [engineCode, setEngineCode] = useState<string>("");
  const [engineDescription, setEngineDescription] = useState<string>("");

  // Resetiranje forme
  const resetForm = () => {
    setEngineType("PETROL");
    setEnginePowerKW("");
    setEnginePowerHP("");
    setEngineCapacity("");
    setEngineCode("");
    setEngineDescription("");
    setCurrentEngine(null);
  };

  // Dodavanje novog motora
  const handleAddEngine = async () => {
    try {
      const response = await fetch(
        `/api/vehicle-brands/${brandId}/models/${modelId}/generations/${generationId}/engines`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            engineType,
            enginePowerKW: enginePowerKW ? parseFloat(enginePowerKW) : null,
            enginePowerHP: enginePowerHP ? parseFloat(enginePowerHP) : null,
            engineCapacity: engineCapacity ? parseInt(engineCapacity) : null,
            engineCode: engineCode || null,
            description: engineDescription || null,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Greška prilikom dodavanja motora");
      }

      const newEngine = await response.json();
      setEngines([newEngine, ...engines]);
      resetForm();
      setIsAddingEngine(false);
      toast.success("Motor uspješno dodan");
      router.refresh();
    } catch (error: any) {
      console.error("Greška:", error);
      toast.error(error.message || "Greška prilikom dodavanja motora");
    }
  };

  // Ažuriranje motora
  const handleUpdateEngine = async () => {
    if (!currentEngine) return;

    try {
      const response = await fetch(
        `/api/vehicle-brands/${brandId}/models/${modelId}/generations/${generationId}/engines/${currentEngine.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            engineType,
            enginePowerKW: enginePowerKW ? parseFloat(enginePowerKW) : null,
            enginePowerHP: enginePowerHP ? parseFloat(enginePowerHP) : null,
            engineCapacity: engineCapacity ? parseInt(engineCapacity) : null,
            engineCode: engineCode || null,
            description: engineDescription || null,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Greška prilikom ažuriranja motora");
      }

      const updatedEngine = await response.json();
      setEngines(
        engines.map((engine) =>
          engine.id === updatedEngine.id ? updatedEngine : engine
        )
      );
      resetForm();
      setIsEditingEngine(false);
      toast.success("Motor uspješno ažuriran");
      router.refresh();
    } catch (error: any) {
      console.error("Greška:", error);
      toast.error(error.message || "Greška prilikom ažuriranja motora");
    }
  };

  // Brisanje motora
  const handleDeleteEngine = async (engineId: string) => {
    if (!confirm("Jeste li sigurni da želite obrisati ovaj motor?")) {
      return;
    }

    try {
      const response = await fetch(
        `/api/vehicle-brands/${brandId}/models/${modelId}/generations/${generationId}/engines/${engineId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Greška prilikom brisanja motora");
      }

      setEngines(engines.filter((engine) => engine.id !== engineId));
      toast.success("Motor uspješno obrisan");
      router.refresh();
    } catch (error: any) {
      console.error("Greška:", error);
      toast.error(error.message || "Greška prilikom brisanja motora");
    }
  };

  // Postavljanje motora za uređivanje
  const handleEditEngine = (engine: VehicleEngine) => {
    setCurrentEngine(engine);
    setEngineType(engine.engineType);
    setEnginePowerKW(engine.enginePowerKW?.toString() || "");
    setEnginePowerHP(engine.enginePowerHP?.toString() || "");
    setEngineCapacity(engine.engineCapacity?.toString() || "");
    setEngineCode(engine.engineCode || "");
    setEngineDescription(engine.description || "");
    setIsEditingEngine(true);
  };

  // Formatiranje tipa motora za prikaz
  const formatEngineType = (type: string) => {
    switch (type) {
      case "PETROL":
        return "Benzin";
      case "DIESEL":
        return "Dizel";
      case "HYBRID":
        return "Hibrid";
      case "ELECTRIC":
        return "Električni";
      default:
        return type;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-sm rounded-lg border border-gray-200">
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Motori za {generation.name}
                  </h1>
                  <p className="text-gray-600 mt-1">
                    {generation.model.brand.name} {generation.model.name}
                    {generation.period && ` (${generation.period})`}
                  </p>
                </div>
              </div>
          <div className="flex items-center gap-3">
            <Link 
              href="/admin/vehicles" 
              className="flex items-center text-gray-600 hover:text-gray-900 bg-white border border-gray-200 hover:border-gray-300 rounded-xl transition-all duration-200 shadow-sm px-4 py-2 font-medium"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Nazad na vozila
            </Link>
            <Button 
              onClick={() => setIsAddingEngine(true)}
              className="bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-md transition-all duration-200 rounded-xl px-4 py-2 font-semibold"
            >
              <Plus className="mr-2 h-4 w-4" /> Dodaj motor
            </Button>
          </div>
        </div>
      </div>

      {engines.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-8 text-center">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nema dostupnih motora</h3>
            <p className="text-gray-600 mb-4">Za ovu generaciju još nije dodan nijedan motor</p>
            <Button 
              onClick={() => setIsAddingEngine(true)}
              className="bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-md transition-all duration-200 rounded-xl px-4 py-2 font-semibold"
            >
              <Plus className="mr-2 h-4 w-4" /> Dodaj prvi motor
            </Button>
          </div>
        </div>
      ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {engines.map((engine) => (
                <div key={engine.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-all duration-200">
                  {/* Engine Header */}
                  <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg border border-gray-200">
                          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {formatEngineType(engine.engineType)}
                      </h3>
                      {engine.engineCode && (
                        <p className="text-sm text-gray-600">Kod: {engine.engineCode}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Engine Details */}
              <div className="p-6">
                <div className="space-y-3">
                  {(engine.engineCapacity || engine.enginePowerKW || engine.enginePowerHP) && (
                    <div className="flex flex-wrap gap-2">
                      {engine.engineCapacity && (
                        <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
                          {engine.engineCapacity} ccm
                        </span>
                      )}
                      {engine.enginePowerKW && (
                        <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
                          {engine.enginePowerKW} kW
                        </span>
                      )}
                      {engine.enginePowerHP && (
                        <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
                          {engine.enginePowerHP} KS
                        </span>
                      )}
                    </div>
                  )}
                  
                  {engine.description && (
                    <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                      {engine.description}
                    </div>
                  )}
                  
                  <div className="flex justify-end space-x-2 pt-2">
                    <Button
                      size="sm"
                      onClick={() => handleEditEngine(engine)}
                      className="bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-md transition-all duration-200 rounded-lg px-3 py-1 text-xs font-medium"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Uredi
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleDeleteEngine(engine.id)}
                      className="bg-red-600 text-white hover:bg-red-700 shadow-sm hover:shadow-md transition-all duration-200 rounded-lg px-3 py-1 text-xs font-medium"
                    >
                      <Trash className="h-4 w-4 mr-1" />
                      Obriši
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal za dodavanje motora */}
      {isAddingEngine && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="w-full max-w-md bg-white border border-gray-200 shadow-xl rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gray-100 rounded-lg border border-gray-200">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Dodaj novi motor</h2>
                <p className="text-gray-600 text-sm">Kreirajte novi motor za ovu generaciju</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-gray-700 font-medium">Tip motora</label>
                <Select
                  value={engineType}
                  onValueChange={(value) => setEngineType(value)}
                >
                  <SelectTrigger className="bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900">
                    <SelectValue placeholder="Odaberite tip motora" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PETROL">Benzin</SelectItem>
                    <SelectItem value="DIESEL">Dizel</SelectItem>
                    <SelectItem value="HYBRID">Hibrid</SelectItem>
                    <SelectItem value="ELECTRIC">Električni</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-gray-700 font-medium">Snaga (kW)</label>
                  <Input
                    type="number"
                    placeholder="npr. 85"
                    value={enginePowerKW}
                    onChange={(e) => setEnginePowerKW(e.target.value)}
                    className="bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500 px-4 py-2"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-gray-700 font-medium">Snaga (KS)</label>
                  <Input
                    type="number"
                    placeholder="npr. 115"
                    value={enginePowerHP}
                    onChange={(e) => setEnginePowerHP(e.target.value)}
                    className="bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500 px-4 py-2"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-gray-700 font-medium">Zapremina (ccm)</label>
                <Input
                  type="number"
                  placeholder="npr. 1998"
                  value={engineCapacity}
                  onChange={(e) => setEngineCapacity(e.target.value)}
                  className="bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500 px-4 py-2"
                />
              </div>

              <div className="space-y-2">
                <label className="text-gray-700 font-medium">Kod motora</label>
                <Input
                  placeholder="npr. CJXA"
                  value={engineCode}
                  onChange={(e) => setEngineCode(e.target.value)}
                  className="bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500 px-4 py-2"
                />
              </div>

              <div className="space-y-2">
                <label className="text-gray-700 font-medium">Opis (opciono)</label>
                <Input
                  placeholder="Dodatni opis motora"
                  value={engineDescription}
                  onChange={(e) => setEngineDescription(e.target.value)}
                  className="bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500 px-4 py-2"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    resetForm();
                    setIsAddingEngine(false);
                  }}
                  className="bg-white text-gray-700 hover:bg-gray-50 border-gray-300 hover:border-gray-400 rounded-xl transition-all duration-200 shadow-sm px-4 py-2 font-semibold"
                >
                  Odustani
                </Button>
                <Button 
                  onClick={handleAddEngine}
                  className="bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-md transition-all duration-200 rounded-xl px-4 py-2 font-semibold"
                >
                  Dodaj motor
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal za uređivanje motora */}
      {isEditingEngine && currentEngine && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="w-full max-w-md bg-white border border-gray-200 shadow-xl rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gray-100 rounded-lg border border-gray-200">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Uredi motor</h2>
                <p className="text-gray-600 text-sm">Ažurirajte podatke o motoru</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-gray-700 font-medium">Tip motora</label>
                <Select
                  value={engineType}
                  onValueChange={(value) => setEngineType(value)}
                >
                  <SelectTrigger className="bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900">
                    <SelectValue placeholder="Odaberite tip motora" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PETROL">Benzin</SelectItem>
                    <SelectItem value="DIESEL">Dizel</SelectItem>
                    <SelectItem value="HYBRID">Hibrid</SelectItem>
                    <SelectItem value="ELECTRIC">Električni</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-gray-700 font-medium">Snaga (kW)</label>
                  <Input
                    type="number"
                    placeholder="npr. 85"
                    value={enginePowerKW}
                    onChange={(e) => setEnginePowerKW(e.target.value)}
                    className="bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500 px-4 py-2"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-gray-700 font-medium">Snaga (KS)</label>
                  <Input
                    type="number"
                    placeholder="npr. 115"
                    value={enginePowerHP}
                    onChange={(e) => setEnginePowerHP(e.target.value)}
                    className="bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500 px-4 py-2"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-gray-700 font-medium">Zapremina (ccm)</label>
                <Input
                  type="number"
                  placeholder="npr. 1998"
                  value={engineCapacity}
                  onChange={(e) => setEngineCapacity(e.target.value)}
                  className="bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500 px-4 py-2"
                />
              </div>

              <div className="space-y-2">
                <label className="text-gray-700 font-medium">Kod motora</label>
                <Input
                  placeholder="npr. CJXA"
                  value={engineCode}
                  onChange={(e) => setEngineCode(e.target.value)}
                  className="bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500 px-4 py-2"
                />
              </div>

              <div className="space-y-2">
                <label className="text-gray-700 font-medium">Opis (opciono)</label>
                <Input
                  placeholder="Dodatni opis motora"
                  value={engineDescription}
                  onChange={(e) => setEngineDescription(e.target.value)}
                  className="bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500 px-4 py-2"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    resetForm();
                    setIsEditingEngine(false);
                  }}
                  className="bg-white text-gray-700 hover:bg-gray-50 border-gray-300 hover:border-gray-400 rounded-xl transition-all duration-200 shadow-sm px-4 py-2 font-semibold"
                >
                  Odustani
                </Button>
                <Button 
                  onClick={handleUpdateEngine}
                  className="bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-md transition-all duration-200 rounded-xl px-4 py-2 font-semibold"
                >
                  Spremi promjene
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
