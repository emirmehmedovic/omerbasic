"use client";

import { useState, useEffect } from "react";
import { Car, Truck, Wrench, HelpCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

type TransportVehicleTypeSelectorProps = {
  onVehicleSelect: (vehicle: string | null) => void;
  selectedVehicleType: "PASSENGER" | "COMMERCIAL" | "SPECIAL" | "OTHER" | null;
  onVehicleTypeChange: (type: "PASSENGER" | "COMMERCIAL" | "SPECIAL" | "OTHER" | null) => void;
  customDescription?: string;
  onCustomDescriptionChange?: (desc: string) => void;
};

type VehicleData = {
  id: string;
  name: string;
  type: "PASSENGER" | "COMMERCIAL";
};

export function TransportVehicleTypeSelector({
  onVehicleSelect,
  selectedVehicleType,
  onVehicleTypeChange,
  customDescription = "",
  onCustomDescriptionChange,
}: TransportVehicleTypeSelectorProps) {
  const [vehicles, setVehicles] = useState<VehicleData[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<string>("");

  // Fetch vehicles kada je tip odabran
  useEffect(() => {
    if (selectedVehicleType === "PASSENGER" || selectedVehicleType === "COMMERCIAL") {
      fetchVehicles(selectedVehicleType);
    }
  }, [selectedVehicleType]);

  const fetchVehicles = async (type: "PASSENGER" | "COMMERCIAL") => {
    try {
      setLoading(true);
      const response = await fetch(`/api/vehicles?type=${type}`);
      if (response.ok) {
        const data = await response.json();
        setVehicles(data);
      }
    } catch (error) {
      console.error("Greška pri dohvaćanju vozila:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleVehicleSelect = (vehicleId: string) => {
    setSelectedVehicle(vehicleId);
    const selected = vehicles.find((v) => v.id === vehicleId);
    onVehicleSelect(selected?.name || vehicleId);
  };

  const handleVehicleTypeChange = (type: string) => {
    const newType = type as "PASSENGER" | "COMMERCIAL" | "SPECIAL" | "OTHER" | null;
    onVehicleTypeChange(newType);
    setSelectedVehicle("");
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
                selectedVehicleType === "PASSENGER"
                  ? "bg-blue-200"
                  : "bg-slate-100"
              }`}
            >
              <Car className={`w-6 h-6 ${selectedVehicleType === "PASSENGER" ? "text-blue-700" : "text-slate-600"}`} />
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
                selectedVehicleType === "COMMERCIAL"
                  ? "bg-blue-200"
                  : "bg-slate-100"
              }`}
            >
              <Truck className={`w-6 h-6 ${selectedVehicleType === "COMMERCIAL" ? "text-blue-700" : "text-slate-600"}`} />
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
                selectedVehicleType === "SPECIAL"
                  ? "bg-blue-200"
                  : "bg-slate-100"
              }`}
            >
              <Wrench className={`w-6 h-6 ${selectedVehicleType === "SPECIAL" ? "text-blue-700" : "text-slate-600"}`} />
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
                selectedVehicleType === "OTHER"
                  ? "bg-blue-200"
                  : "bg-slate-100"
              }`}
            >
              <HelpCircle className={`w-6 h-6 ${selectedVehicleType === "OTHER" ? "text-blue-700" : "text-slate-600"}`} />
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
        <div className="space-y-4">
          {(selectedVehicleType === "PASSENGER" || selectedVehicleType === "COMMERCIAL") ? (
            // Za putničko ili teretno - prikaži listu iz baze
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-4">
                Odaberite {selectedVehicleType === "PASSENGER" ? "putničko vozilo" : "teretno vozilo"}
              </h3>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                </div>
              ) : vehicles.length > 0 ? (
                <Select value={selectedVehicle} onValueChange={handleVehicleSelect}>
                  <SelectTrigger className="bg-white border-slate-200 focus:border-blue-300 focus:ring-blue-300 rounded-lg">
                    <SelectValue placeholder="Odaberite vozilo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="p-4 bg-slate-50 rounded-lg text-slate-600 text-center">
                  Nema dostupnih vozila. Molimo opišite vozilo manuelno.
                </div>
              )}

              {/* Fallback - Moje vozilo nije na listi */}
              {vehicles.length === 0 && (
                <div className="mt-4">
                  <label className="text-sm font-medium text-slate-600 mb-2 block">
                    Ili opišite vozilo manuelno *
                  </label>
                  <Textarea
                    value={customDescription}
                    onChange={(e) => onCustomDescriptionChange?.(e.target.value)}
                    rows={3}
                    className="bg-white border-slate-200 focus:border-blue-300 focus:ring-blue-300 rounded-lg text-slate-900 placeholder:text-slate-400"
                    placeholder="Npr. Mercedes C-Class 2020, Volkswagen Transporter 2019..."
                  />
                  {customDescription && (
                    <Button
                      type="button"
                      onClick={() => onVehicleSelect(customDescription)}
                      className="mt-3 w-full bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
                    >
                      Potvrdi vozilo
                    </Button>
                  )}
                </div>
              )}
            </div>
          ) : selectedVehicleType === "SPECIAL" ? (
            // Za specijalni transport - textarea
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-4">Opišite specijalno vozilo/opremu</h3>
              <Textarea
                value={customDescription}
                onChange={(e) => onCustomDescriptionChange?.(e.target.value)}
                rows={4}
                className="bg-white border-slate-200 focus:border-blue-300 focus:ring-blue-300 rounded-lg text-slate-900 placeholder:text-slate-400"
                placeholder="Npr. Ekskavator Caterpillar CAT 320, Bagher Komatsu 70, Roto vaga..."
              />
              {customDescription && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-slate-600">Odabrano:</p>
                  <p className="font-semibold text-slate-900">{customDescription}</p>
                </div>
              )}
            </div>
          ) : selectedVehicleType === "OTHER" ? (
            // Za ostalo - textarea
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-4">Opišite što trebate transportovati</h3>
              <Textarea
                value={customDescription}
                onChange={(e) => onCustomDescriptionChange?.(e.target.value)}
                rows={4}
                className="bg-white border-slate-200 focus:border-blue-300 focus:ring-blue-300 rounded-lg text-slate-900 placeholder:text-slate-400"
                placeholder="Npr. Две мотоцикле, Jedan privatni helikopter, Brod..."
              />
              {customDescription && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-slate-600">Odabrano:</p>
                  <p className="font-semibold text-slate-900">{customDescription}</p>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
