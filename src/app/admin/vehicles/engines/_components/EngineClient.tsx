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
    <div className="space-y-4">
      <div className="flex items-center mb-6">
        <Link href="/admin/vehicles" className="flex items-center text-gray-600 hover:text-gray-900">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Nazad na vozila
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">
            Motori za {generation.name}
          </h2>
          <p className="text-gray-500">
            {generation.model.brand.name} {generation.model.name}
            {generation.period && ` (${generation.period})`}
          </p>
        </div>
        <Button onClick={() => setIsAddingEngine(true)}>
          <Plus className="mr-2 h-4 w-4" /> Dodaj motor
        </Button>
      </div>

      {engines.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-md border">
          <p className="text-gray-500">Nema dostupnih motora za ovu generaciju</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => setIsAddingEngine(true)}
          >
            <Plus className="mr-2 h-4 w-4" /> Dodaj prvi motor
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {engines.map((engine) => (
            <Card key={engine.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium text-lg">
                      {formatEngineType(engine.engineType)}
                      {engine.engineCode && ` (${engine.engineCode})`}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {engine.engineCapacity && `${engine.engineCapacity} ccm`}
                      {engine.enginePowerKW && ` • ${engine.enginePowerKW} kW`}
                      {engine.enginePowerHP && ` • ${engine.enginePowerHP} KS`}
                    </div>
                    {engine.description && (
                      <div className="text-sm mt-2 text-gray-600">{engine.description}</div>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleEditEngine(engine)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDeleteEngine(engine.id)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal za dodavanje motora */}
      {isAddingEngine && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Dodaj novi motor</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Tip motora</label>
                <Select
                  value={engineType}
                  onValueChange={(value) => setEngineType(value)}
                >
                  <SelectTrigger>
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
                  <label className="text-sm font-medium">Snaga (kW)</label>
                  <Input
                    type="number"
                    placeholder="npr. 85"
                    value={enginePowerKW}
                    onChange={(e) => setEnginePowerKW(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Snaga (KS)</label>
                  <Input
                    type="number"
                    placeholder="npr. 115"
                    value={enginePowerHP}
                    onChange={(e) => setEnginePowerHP(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Zapremina (ccm)</label>
                <Input
                  type="number"
                  placeholder="npr. 1998"
                  value={engineCapacity}
                  onChange={(e) => setEngineCapacity(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Kod motora</label>
                <Input
                  placeholder="npr. CJXA"
                  value={engineCode}
                  onChange={(e) => setEngineCode(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Opis (opciono)</label>
                <Input
                  placeholder="Dodatni opis motora"
                  value={engineDescription}
                  onChange={(e) => setEngineDescription(e.target.value)}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    resetForm();
                    setIsAddingEngine(false);
                  }}
                >
                  Odustani
                </Button>
                <Button onClick={handleAddEngine}>Dodaj motor</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal za uređivanje motora */}
      {isEditingEngine && currentEngine && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Uredi motor</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Tip motora</label>
                <Select
                  value={engineType}
                  onValueChange={(value) => setEngineType(value)}
                >
                  <SelectTrigger>
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
                  <label className="text-sm font-medium">Snaga (kW)</label>
                  <Input
                    type="number"
                    placeholder="npr. 85"
                    value={enginePowerKW}
                    onChange={(e) => setEnginePowerKW(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Snaga (KS)</label>
                  <Input
                    type="number"
                    placeholder="npr. 115"
                    value={enginePowerHP}
                    onChange={(e) => setEnginePowerHP(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Zapremina (ccm)</label>
                <Input
                  type="number"
                  placeholder="npr. 1998"
                  value={engineCapacity}
                  onChange={(e) => setEngineCapacity(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Kod motora</label>
                <Input
                  placeholder="npr. CJXA"
                  value={engineCode}
                  onChange={(e) => setEngineCode(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Opis (opciono)</label>
                <Input
                  placeholder="Dodatni opis motora"
                  value={engineDescription}
                  onChange={(e) => setEngineDescription(e.target.value)}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    resetForm();
                    setIsEditingEngine(false);
                  }}
                >
                  Odustani
                </Button>
                <Button onClick={handleUpdateEngine}>Spremi promjene</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
