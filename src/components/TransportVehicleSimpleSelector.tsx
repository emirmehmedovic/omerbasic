"use client";

import { useState, useEffect, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type VehicleBrand = {
  id: string;
  name: string;
  type?: "PASSENGER" | "COMMERCIAL";
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

interface TransportVehicleSimpleSelectorProps {
  vehicleType: "PASSENGER" | "COMMERCIAL";
  onVehicleSelect: (vehicle: {
    brand: string;
    model: string;
    generation: string;
    generationId: string;
  } | null) => void;
}

export function TransportVehicleSimpleSelector({
  vehicleType,
  onVehicleSelect,
}: TransportVehicleSimpleSelectorProps) {
  const [brands, setBrands] = useState<VehicleBrand[]>([]);
  const [models, setModels] = useState<VehicleModel[]>([]);
  const [generations, setGenerations] = useState<VehicleGeneration[]>([]);

  const [selectedBrandId, setSelectedBrandId] = useState<string>("");
  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const [selectedGenerationId, setSelectedGenerationId] = useState<string>("");

  const [loadingBrands, setLoadingBrands] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [loadingGenerations, setLoadingGenerations] = useState(false);

  // Učitavanje brendova
  useEffect(() => {
    const fetchBrands = async () => {
      try {
        setLoadingBrands(true);
        const response = await fetch("/api/vehicle-brands");
        if (!response.ok) throw new Error("Greška pri dohvaćanju brendova");

        const data = await response.json();
        const filtered = Array.isArray(data)
          ? data.filter(
              (b: VehicleBrand) =>
                !b.type || b.type === vehicleType
            )
          : [];
        setBrands(filtered);
      } catch (error) {
        console.error("Greška pri dohvaćanju brendova:", error);
      } finally {
        setLoadingBrands(false);
      }
    };

    fetchBrands();
  }, [vehicleType]);

  // Učitavanje modela kada se odabere brend
  useEffect(() => {
    if (!selectedBrandId) {
      setModels([]);
      setGenerations([]);
      setSelectedModelId("");
      setSelectedGenerationId("");
      onVehicleSelect(null);
      return;
    }

    const fetchModels = async () => {
      try {
        setLoadingModels(true);
        const response = await fetch(
          `/api/vehicle-brands/${selectedBrandId}/models`
        );
        if (!response.ok) throw new Error("Greška pri dohvaćanju modela");

        const data = await response.json();
        setModels(Array.isArray(data) ? data : []);
        setGenerations([]);
        setSelectedModelId("");
        setSelectedGenerationId("");
      } catch (error) {
        console.error("Greška pri dohvaćanju modela:", error);
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
      onVehicleSelect(null);
      return;
    }

    const fetchGenerations = async () => {
      try {
        setLoadingGenerations(true);
        const response = await fetch(`/api/models/${selectedModelId}/generations`);
        if (!response.ok) throw new Error("Greška pri dohvaćanju generacija");

        const data = await response.json();
        setGenerations(Array.isArray(data) ? data : []);
        setSelectedGenerationId("");
      } catch (error) {
        console.error("Greška pri dohvaćanju generacija:", error);
      } finally {
        setLoadingGenerations(false);
      }
    };

    fetchGenerations();
  }, [selectedModelId]);

  // Pozovi callback kada se odabere generacija
  useEffect(() => {
    if (selectedGenerationId) {
      const generation = generations.find((g) => g.id === selectedGenerationId);
      const model = models.find((m) => m.id === selectedModelId);
      const brand = brands.find((b) => b.id === selectedBrandId);

      if (generation && model && brand) {
        onVehicleSelect({
          brand: brand.name,
          model: model.name,
          generation: generation.name,
          generationId: generation.id,
        });
      }
    } else {
      onVehicleSelect(null);
    }
  }, [selectedGenerationId, generations, models, brands, selectedModelId, selectedBrandId]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Marka */}
        <div>
          <label className="text-sm font-medium text-slate-600 mb-2 block">
            Marka *
          </label>
          <select
            value={selectedBrandId}
            onChange={(e) => setSelectedBrandId(e.target.value)}
            disabled={loadingBrands}
            className={cn(
              "w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-300/50 transition-all",
              loadingBrands && "opacity-50 cursor-not-allowed"
            )}
          >
            <option value="">{loadingBrands ? "Učitavanje..." : "Odaberite marku..."}</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>
        </div>

        {/* Model */}
        <div>
          <label className="text-sm font-medium text-slate-600 mb-2 block">
            Model *
          </label>
          <select
            value={selectedModelId}
            onChange={(e) => setSelectedModelId(e.target.value)}
            disabled={!selectedBrandId || loadingModels}
            className={cn(
              "w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-300/50 transition-all",
              (!selectedBrandId || loadingModels) && "opacity-50 cursor-not-allowed"
            )}
          >
            <option value="">
              {loadingModels
                ? "Učitavanje..."
                : !selectedBrandId
                ? "Prvo odaberite marku"
                : "Odaberite model..."}
            </option>
            {models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
        </div>

        {/* Generacija */}
        <div>
          <label className="text-sm font-medium text-slate-600 mb-2 block">
            Generacija *
          </label>
          <select
            value={selectedGenerationId}
            onChange={(e) => setSelectedGenerationId(e.target.value)}
            disabled={!selectedModelId || loadingGenerations}
            className={cn(
              "w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-300/50 transition-all",
              (!selectedModelId || loadingGenerations) && "opacity-50 cursor-not-allowed"
            )}
          >
            <option value="">
              {loadingGenerations
                ? "Učitavanje..."
                : !selectedModelId
                ? "Prvo odaberite model"
                : "Odaberite generaciju..."}
            </option>
            {generations.map((generation) => (
              <option key={generation.id} value={generation.id}>
                {generation.name} {generation.period ? `(${generation.period})` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
