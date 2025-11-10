"use client";

import { useState } from "react";
import { Car, Truck, Wrench, HelpCircle, AlertCircle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { TransportVehicleSimpleSelector } from "@/components/TransportVehicleSimpleSelector";

type VehicleTypeOption = "PASSENGER" | "COMMERCIAL" | "SPECIAL" | "OTHER" | null;

interface TransportVehicleFullSelectorProps {
  onVehicleSelect: (vehicle: string | null) => void;
  onVehicleTypeChange: (type: VehicleTypeOption) => void;
  selectedVehicleType: VehicleTypeOption;
  customDescription?: string;
  onCustomDescriptionChange?: (desc: string) => void;
}

export function TransportVehicleFullSelector({
  onVehicleSelect,
  onVehicleTypeChange,
  selectedVehicleType,
  customDescription = "",
  onCustomDescriptionChange,
}: TransportVehicleFullSelectorProps) {
  const handleVehicleTypeChange = (type: VehicleTypeOption) => {
    onVehicleTypeChange(type);
    onVehicleSelect(null);
  };

  return (
    <div className="space-y-6">
      {/* Step 1: Odabir tipa vozila */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900">Odaberite tip vozila</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Putničko vozilo */}
          <button
            onClick={() => handleVehicleTypeChange("PASSENGER")}
            className={`p-6 rounded-xl border-2 transition-all duration-200 flex items-center gap-4 ${
              selectedVehicleType === "PASSENGER"
                ? "border-blue-500 bg-blue-50"
                : "border-slate-200 bg-white hover:border-blue-300"
            }`}
          >
            <div
              className={`p-3 rounded-lg ${
                selectedVehicleType === "PASSENGER" ? "bg-blue-200" : "bg-slate-100"
              }`}
            >
              <Car
                className={`w-6 h-6 ${
                  selectedVehicleType === "PASSENGER"
                    ? "text-blue-700"
                    : "text-slate-600"
                }`}
              />
            </div>
            <div className="text-left">
              <h4 className="font-semibold text-slate-900">Putničko vozilo</h4>
              <p className="text-sm text-slate-600">Auto, SUV, minivan...</p>
            </div>
          </button>

          {/* Teretno vozilo */}
          <button
            onClick={() => handleVehicleTypeChange("COMMERCIAL")}
            className={`p-6 rounded-xl border-2 transition-all duration-200 flex items-center gap-4 ${
              selectedVehicleType === "COMMERCIAL"
                ? "border-blue-500 bg-blue-50"
                : "border-slate-200 bg-white hover:border-blue-300"
            }`}
          >
            <div
              className={`p-3 rounded-lg ${
                selectedVehicleType === "COMMERCIAL" ? "bg-blue-200" : "bg-slate-100"
              }`}
            >
              <Truck
                className={`w-6 h-6 ${
                  selectedVehicleType === "COMMERCIAL"
                    ? "text-blue-700"
                    : "text-slate-600"
                }`}
              />
            </div>
            <div className="text-left">
              <h4 className="font-semibold text-slate-900">Teretno vozilo</h4>
              <p className="text-sm text-slate-600">Kamion, furgon...</p>
            </div>
          </button>

          {/* Specijalni transport */}
          <button
            onClick={() => handleVehicleTypeChange("SPECIAL")}
            className={`p-6 rounded-xl border-2 transition-all duration-200 flex items-center gap-4 ${
              selectedVehicleType === "SPECIAL"
                ? "border-blue-500 bg-blue-50"
                : "border-slate-200 bg-white hover:border-blue-300"
            }`}
          >
            <div
              className={`p-3 rounded-lg ${
                selectedVehicleType === "SPECIAL" ? "bg-blue-200" : "bg-slate-100"
              }`}
            >
              <Wrench
                className={`w-6 h-6 ${
                  selectedVehicleType === "SPECIAL"
                    ? "text-blue-700"
                    : "text-slate-600"
                }`}
              />
            </div>
            <div className="text-left">
              <h4 className="font-semibold text-slate-900">Specijalni transport</h4>
              <p className="text-sm text-slate-600">Ekskavator, bagher...</p>
            </div>
          </button>

          {/* Ostalo */}
          <button
            onClick={() => handleVehicleTypeChange("OTHER")}
            className={`p-6 rounded-xl border-2 transition-all duration-200 flex items-center gap-4 ${
              selectedVehicleType === "OTHER"
                ? "border-blue-500 bg-blue-50"
                : "border-slate-200 bg-white hover:border-blue-300"
            }`}
          >
            <div
              className={`p-3 rounded-lg ${
                selectedVehicleType === "OTHER" ? "bg-blue-200" : "bg-slate-100"
              }`}
            >
              <HelpCircle
                className={`w-6 h-6 ${
                  selectedVehicleType === "OTHER"
                    ? "text-blue-700"
                    : "text-slate-600"
                }`}
              />
            </div>
            <div className="text-left">
              <h4 className="font-semibold text-slate-900">Ostalo</h4>
              <p className="text-sm text-slate-600">Nešto drugo...</p>
            </div>
          </button>
        </div>
      </div>

      {/* Step 2: Odabir specifičnog vozila ili unos opisa */}
      {selectedVehicleType && (
        <div className="space-y-4 pt-6 border-t border-slate-200">
          {selectedVehicleType === "PASSENGER" ||
          selectedVehicleType === "COMMERCIAL" ? (
            // Za putničko ili teretno - prikaži selector
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-4">
                Odaberite {selectedVehicleType === "PASSENGER" ? "putničko vozilo" : "teretno vozilo"}
              </h3>

              <TransportVehicleSimpleSelector
                vehicleType={selectedVehicleType}
                onVehicleSelect={(vehicle) => {
                  if (vehicle) {
                    const fullName = `${vehicle.brand} ${vehicle.model} ${vehicle.generation}`;
                    onVehicleSelect(fullName);
                  } else {
                    onVehicleSelect(null);
                  }
                }}
              />
            </div>
          ) : selectedVehicleType === "SPECIAL" ? (
            // Za specijalni transport - textarea
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-4">
                Opišite specijalno vozilo/opremu
              </h3>
              <Textarea
                value={customDescription}
                onChange={(e) => {
                  onCustomDescriptionChange?.(e.target.value);
                  onVehicleSelect(e.target.value || null);
                }}
                rows={4}
                className="bg-white border-slate-200 focus:border-blue-300 focus:ring-blue-300 rounded-lg text-slate-900 placeholder:text-slate-400"
                placeholder="Npr. Ekskavator Caterpillar CAT 320, Bagher Komatsu 70, Roto vaga..."
              />
            </div>
          ) : selectedVehicleType === "OTHER" ? (
            // Za ostalo - textarea
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-4">
                Opišite što trebate transportovati
              </h3>
              <Textarea
                value={customDescription}
                onChange={(e) => {
                  onCustomDescriptionChange?.(e.target.value);
                  onVehicleSelect(e.target.value || null);
                }}
                rows={4}
                className="bg-white border-slate-200 focus:border-blue-300 focus:ring-blue-300 rounded-lg text-slate-900 placeholder:text-slate-400"
                placeholder="Npr. Dva motocikla, Jedan privatni helikopter, Brod..."
              />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
