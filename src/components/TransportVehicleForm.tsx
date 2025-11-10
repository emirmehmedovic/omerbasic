"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "react-hot-toast";
import { User, Mail, Phone, MapPin, Package, FileText, Send, Truck } from "lucide-react";
import { TransportVehicleFullSelector } from "@/components/TransportVehicleFullSelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// Schema za transport vozila formu
const transportVehicleSchema = z.object({
  name: z.string().min(2, "Ime mora imati najmanje 2 znaka"),
  email: z.string().email("Unesite valjanu email adresu"),
  phone: z.string().min(1, "Telefon je obavezan"),
  companyName: z.string().optional(),
  vehicleDescription: z.string().optional(),
  origin: z.string().min(3, "Lokacija izvora je obavezna"),
  destination: z.string().min(3, "Lokacija odredišta je obavezna"),
  notes: z.string().optional(),
});

type TransportVehicleFormData = z.infer<typeof transportVehicleSchema>;

export function TransportVehicleForm() {
  const [loading, setLoading] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [vehicleType, setVehicleType] = useState<"PASSENGER" | "COMMERCIAL" | "SPECIAL" | "OTHER" | null>(null);
  const [customDescription, setCustomDescription] = useState("");
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  const form = useForm<TransportVehicleFormData>({
    resolver: zodResolver(transportVehicleSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      companyName: "",
      vehicleDescription: "",
      origin: "",
      destination: "",
      notes: "",
    },
  });

  const onSubmit = async (data: TransportVehicleFormData) => {
    if (!selectedVehicle) {
      toast.error("Molimo odaberite vozilo");
      return;
    }

    try {
      setLoading(true);

      // Mapiraj tip vozila na transportVehicleType
      const vehicleTypeMap: Record<string, string> = {
        PASSENGER: "TRUCK",
        COMMERCIAL: "TRUCK",
        SPECIAL: "SPECIALIZED",
        OTHER: "OTHER",
      };

      const payload = {
        ...data,
        vehicleType: vehicleTypeMap[vehicleType || "TRUCK"] || "TRUCK",
        cargo: selectedVehicle,
      };

      const response = await fetch("/api/transport", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Greška pri slanju");
      }

      toast.success("Vaš zahtjev za transport vozila je uspješno poslан! Kontaktirat ćemo vas u najkraćem mogućem roku.");
      form.reset();
      setSelectedVehicle(null);
      setVehicleType(null);
      setCustomDescription("");
      setCurrentStep(1);
    } catch (error) {
      toast.error("Greška pri slanju zahtjeva. Pokušajte ponovno.");
    } finally {
      setLoading(false);
    }
  };

  const canProceedToStep2 = selectedVehicle !== null;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* STEP 1: Vozilo */}
      <div className={`rounded-2xl p-8 border-2 transition-all ${
        currentStep === 1
          ? "bg-white border-sunfire-400/40 shadow-lg shadow-sunfire-500/20"
          : "bg-slate-50 border-slate-200"
      }`}>
        <div className="flex items-center gap-4 mb-8">
          <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-white transition-all ${
            currentStep === 1
              ? "bg-gradient-to-r from-sunfire-600 to-sunfire-500"
              : "bg-green-500"
          }`}>
            {currentStep === 1 ? "1" : "✓"}
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">Korak 1: Odaberite vozilo</h3>
            <p className="text-sm text-slate-600 mt-1">
              {selectedVehicle ? <span className="text-sunfire-600 font-semibold">{selectedVehicle}</span> : "Odaberite tip i model vozila"}
            </p>
          </div>
        </div>

        {currentStep === 1 && (
          <div className="space-y-6">
            {/* Transport Vehicle Full Selector */}
            <TransportVehicleFullSelector
              selectedVehicleType={vehicleType}
              onVehicleTypeChange={setVehicleType}
              onVehicleSelect={setSelectedVehicle}
              customDescription={customDescription}
              onCustomDescriptionChange={setCustomDescription}
            />

            {/* Prikazi odabrano vozilo */}
            {selectedVehicle && (
              <div className="p-4 bg-gradient-to-r from-sunfire-600/5 to-sunfire-500/5 border-2 border-sunfire-400/30 rounded-lg">
                <p className="text-sm text-slate-600 mb-1">✓ Odabrano vozilo:</p>
                <p className="text-lg font-semibold text-sunfire-600">{selectedVehicle}</p>
              </div>
            )}

            {/* Next button */}
            <Button
              type="button"
              disabled={!canProceedToStep2}
              onClick={() => setCurrentStep(2)}
              className="w-full bg-gradient-to-r from-sunfire-600 to-sunfire-500 text-white hover:from-sunfire-700 hover:to-sunfire-600 shadow-lg shadow-sunfire-500/30 transition-all duration-200 rounded-lg font-semibold py-3 hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Nastavi na korak 2 →
            </Button>
          </div>
        )}

        {currentStep === 2 && selectedVehicle && (
          <div className="p-4 bg-gradient-to-r from-sunfire-600/5 to-sunfire-500/5 border-2 border-sunfire-400/30 rounded-lg">
            <p className="text-sm text-slate-600">✓ Odabrano vozilo:</p>
            <p className="font-semibold text-sunfire-600">{selectedVehicle}</p>
          </div>
        )}
      </div>

      {/* STEP 2: Informacije */}
      {currentStep === 2 && (
        <>
          {/* Lične informacije */}
          <div className="rounded-2xl p-8 bg-white border-2 border-slate-200 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center gap-4 mb-8">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-sunfire-600 to-sunfire-500 text-white font-bold">
                2
              </div>
              <h3 className="text-xl font-bold text-slate-900">Korak 2: Vaši podaci</h3>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-600 mb-2 block flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Ime i prezime *
                  </label>
                  <Input
                    {...form.register("name")}
                    className="bg-white border-slate-200 focus:border-primary focus:ring-primary rounded-lg transition-all duration-200 text-slate-900 placeholder:text-slate-400"
                    placeholder="Vaše ime i prezime"
                  />
                  {form.formState.errors.name && (
                    <p className="text-red-600 text-xs mt-1">{form.formState.errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-600 mb-2 block flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email *
                  </label>
                  <Input
                    {...form.register("email")}
                    type="email"
                    className="bg-white border-slate-200 focus:border-primary focus:ring-primary rounded-lg transition-all duration-200 text-slate-900 placeholder:text-slate-400"
                    placeholder="vaš@email.com"
                  />
                  {form.formState.errors.email && (
                    <p className="text-red-600 text-xs mt-1">{form.formState.errors.email.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-600 mb-2 block flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Telefon *
                  </label>
                  <Input
                    {...form.register("phone")}
                    className="bg-white border-slate-200 focus:border-primary focus:ring-primary rounded-lg transition-all duration-200 text-slate-900 placeholder:text-slate-400"
                    placeholder="+387 32 666 658"
                  />
                  {form.formState.errors.phone && (
                    <p className="text-red-600 text-xs mt-1">{form.formState.errors.phone.message}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-600 mb-2 block">Naziv firme (opcionalno)</label>
                  <Input
                    {...form.register("companyName")}
                    className="bg-white border-slate-200 focus:border-primary focus:ring-primary rounded-lg transition-all duration-200 text-slate-900 placeholder:text-slate-400"
                    placeholder="Naziv vaše firme"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Lokacije */}
          <div className="rounded-2xl p-8 bg-white border-2 border-slate-200 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center gap-4 mb-8">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-slate-400 to-slate-500 text-white font-bold text-sm">
                3
              </div>
              <h3 className="text-xl font-bold text-slate-900">Lokacije transporta</h3>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-600 mb-2 block flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Lokacija izvora (gdje se vozilo nalazi) *
                  </label>
                  <Input
                    {...form.register("origin")}
                    className="bg-white border-slate-200 focus:border-primary focus:ring-primary rounded-lg transition-all duration-200 text-slate-900 placeholder:text-slate-400"
                    placeholder="npr. Sarajevo, Beograd, Berlin"
                  />
                  {form.formState.errors.origin && (
                    <p className="text-red-600 text-xs mt-1">{form.formState.errors.origin.message}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-600 mb-2 block flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Lokacija odredišta (gdje se vozilo dostavlja) *
                  </label>
                  <Input
                    {...form.register("destination")}
                    className="bg-white border-slate-200 focus:border-primary focus:ring-primary rounded-lg transition-all duration-200 text-slate-900 placeholder:text-slate-400"
                    placeholder="npr. Jelah, Sarajevo"
                  />
                  {form.formState.errors.destination && (
                    <p className="text-red-600 text-xs mt-1">{form.formState.errors.destination.message}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Dodatne napomene */}
          <div className="rounded-2xl p-8 bg-white border-2 border-slate-200 shadow-sm hover:shadow-md transition-all">
            <label className="text-sm font-medium text-slate-600 mb-2 block flex items-center gap-2">
              <FileText className="w-4 h-4 text-sunfire-600" />
              Dodatne napomene (opcionalno)
            </label>
            <Textarea
              {...form.register("notes")}
              rows={3}
              className="bg-white border-slate-200 focus:border-primary focus:ring-primary rounded-lg transition-all duration-200 text-slate-900 placeholder:text-slate-400 resize-none"
              placeholder="Naprimjer: Vozilo je u dobrom stanju, hitna dostava potrebna, posebni zahtjevi za transport..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <Button
              type="button"
              onClick={() => setCurrentStep(1)}
              variant="outline"
              className="flex-1 bg-white text-slate-900 border-2 border-slate-200 hover:border-sunfire-500/50 hover:bg-slate-50 rounded-lg font-semibold py-3 transition-all"
            >
              ← Nazad
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-sunfire-600 to-sunfire-500 text-white hover:from-sunfire-700 hover:to-sunfire-600 shadow-lg shadow-sunfire-500/30 transition-all duration-200 rounded-lg font-semibold py-3 hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Slanje..." : "Pošaljite zahtjev"}
            </Button>
          </div>
        </>
      )}
    </form>
  );
}
