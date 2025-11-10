"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "react-hot-toast";
import { Truck, User, Mail, Phone, MapPin, Package, FileText, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// Schema za transport formu
const transportSchema = z.object({
  name: z.string().min(2, "Ime mora imati najmanje 2 znaka"),
  email: z.string().email("Unesite valjanu email adresu"),
  phone: z.string().min(1, "Telefon je obavezan"),
  companyName: z.string().optional(),
  vehicleType: z.enum(["TRUCK", "TRAILER", "SPECIALIZED", "OTHER"]).refine(v => v, {
    message: "Odaberite tip vozila"
  }),
  cargo: z.string().min(10, "Opis tovara mora imati najmanje 10 znakova"),
  origin: z.string().min(3, "Lokacija izvora je obavezna"),
  destination: z.string().min(3, "Lokacija odredišta je obavezna"),
  notes: z.string().optional(),
});

type TransportFormData = z.infer<typeof transportSchema>;

export function TransportForm() {
  const [loading, setLoading] = useState(false);

  const form = useForm<TransportFormData>({
    resolver: zodResolver(transportSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      companyName: "",
      vehicleType: undefined,
      cargo: "",
      origin: "",
      destination: "",
      notes: "",
    },
  });

  const onSubmit = async (data: TransportFormData) => {
    try {
      setLoading(true);

      const response = await fetch("/api/transport", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Greška pri slanju");
      }

      toast.success("Vaš zahtjev za transport je uspješno poslан! Kontaktirat ćemo vas u najkraćem mogućem roku.");
      form.reset();
    } catch (error) {
      toast.error("Greška pri slanju zahtjeva. Pokušajte ponovno.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Kontakt informacije za transport */}
      <div className="lg:col-span-1">
        <div className="rounded-2xl p-6 bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
            <div className="p-2 bg-orange-100 border border-orange-200 rounded-lg">
              <Truck className="w-5 h-5 text-orange-700" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Info o transportu</h3>
          </div>
          <div className="space-y-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-orange-100 border border-orange-200 rounded-lg">
                <Phone className="w-5 h-5 text-orange-700" />
              </div>
              <div>
                <h3 className="font-medium text-slate-900">Telefon</h3>
                <p className="text-slate-600">032/666-658</p>
                <p className="text-slate-600">061/962-359</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-orange-100 border border-orange-200 rounded-lg">
                <Mail className="w-5 h-5 text-orange-700" />
              </div>
              <div>
                <h3 className="font-medium text-slate-900">Email</h3>
                <p className="text-slate-600">veleprodajatpo@gmail.com</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-orange-100 border border-orange-200 rounded-lg">
                <MapPin className="w-5 h-5 text-orange-700" />
              </div>
              <div>
                <h3 className="font-medium text-slate-900">Lokacija</h3>
                <p className="text-slate-600">Rosulje bb, Jelah</p>
              </div>
            </div>

            <div className="rounded-lg p-4 bg-orange-50 border border-orange-200">
              <div className="flex items-start gap-2 mb-2">
                <Truck className="w-5 h-5 text-orange-700 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-slate-900">Specijaliziramo se</h4>
                  <ul className="text-sm text-slate-700 mt-2 space-y-1">
                    <li>• Transport iz EU i Skandinavije</li>
                    <li>• Transport tekućih materija</li>
                    <li>• Sve vrste transporta</li>
                    <li>• Međunarodni i domaći transport</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Forma */}
      <div className="lg:col-span-2">
        <div className="rounded-2xl p-6 bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
            <div className="p-2 bg-orange-100 border border-orange-200 rounded-lg">
              <Send className="w-5 h-5 text-orange-700" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Zahtjev za transport</h3>
          </div>

          <div className="rounded-lg p-4 mb-6 bg-orange-50 border border-orange-200">
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-5 h-5 text-orange-700" />
              <h3 className="font-medium text-slate-900">Trebate transport?</h3>
            </div>
            <p className="text-sm text-slate-700">
              Ispunite formu ispod i mi ćemo vam omogućiti brz i siguran transport vašeg tovara.
              Naš tim će vas kontaktirati u najkraćem mogućem roku s detaljima i ponudom.
            </p>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Persoane informacije */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-600 mb-1 block flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Ime i prezime *
                </label>
                <Input
                  {...form.register("name")}
                  className="bg-white border-slate-200 focus:border-orange-300 focus:ring-orange-300 rounded-lg transition-all duration-200 text-slate-900 placeholder:text-slate-400"
                  placeholder="Vaše ime i prezime"
                />
                {form.formState.errors.name && (
                  <p className="text-red-600 text-xs mt-1">{form.formState.errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-slate-600 mb-1 block flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email *
                </label>
                <Input
                  {...form.register("email")}
                  type="email"
                  className="bg-white border-slate-200 focus:border-orange-300 focus:ring-orange-300 rounded-lg transition-all duration-200 text-slate-900 placeholder:text-slate-400"
                  placeholder="vaš@email.com"
                />
                {form.formState.errors.email && (
                  <p className="text-red-600 text-xs mt-1">{form.formState.errors.email.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-600 mb-1 block flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Telefon *
                </label>
                <Input
                  {...form.register("phone")}
                  className="bg-white border-slate-200 focus:border-orange-300 focus:ring-orange-300 rounded-lg transition-all duration-200 text-slate-900 placeholder:text-slate-400"
                  placeholder="+387 32 666 658"
                />
                {form.formState.errors.phone && (
                  <p className="text-red-600 text-xs mt-1">{form.formState.errors.phone.message}</p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-slate-600 mb-1 block">Naziv firme (opcionalno)</label>
                <Input
                  {...form.register("companyName")}
                  className="bg-white border-slate-200 focus:border-orange-300 focus:ring-orange-300 rounded-lg transition-all duration-200 text-slate-900 placeholder:text-slate-400"
                  placeholder="Naziv vaše firme"
                />
              </div>
            </div>

            {/* Transport informacije */}
            <div>
              <label className="text-sm font-medium text-slate-600 mb-1 block flex items-center gap-2">
                <Truck className="w-4 h-4" />
                Tip vozila *
              </label>
              <select
                {...form.register("vehicleType")}
                className="w-full bg-white border border-slate-200 focus:border-orange-300 focus:ring-orange-300 rounded-lg transition-all duration-200 text-slate-900 p-3"
              >
                <option value="">Odaberite tip vozila</option>
                <option value="TRUCK">Kamion (Truck)</option>
                <option value="TRAILER">Prikolica (Trailer)</option>
                <option value="SPECIALIZED">Specijalizirano vozilo</option>
                <option value="OTHER">Ostalo</option>
              </select>
              {form.formState.errors.vehicleType && (
                <p className="text-red-600 text-xs mt-1">{form.formState.errors.vehicleType.message}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-slate-600 mb-1 block flex items-center gap-2">
                <Package className="w-4 h-4" />
                Opis tovara *
              </label>
              <Textarea
                {...form.register("cargo")}
                rows={3}
                className="bg-white border-slate-200 focus:border-orange-300 focus:ring-orange-300 rounded-lg transition-all duration-200 text-slate-900 placeholder:text-slate-400 resize-none"
                placeholder="Detaljno opišite što transportujete (vrsta, količina, dimenzije, težina, itd.)"
              />
              {form.formState.errors.cargo && (
                <p className="text-red-600 text-xs mt-1">{form.formState.errors.cargo.message}</p>
              )}
            </div>

            {/* Lokacije */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-600 mb-1 block flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Lokacija izvora *
                </label>
                <Input
                  {...form.register("origin")}
                  className="bg-white border-slate-200 focus:border-orange-300 focus:ring-orange-300 rounded-lg transition-all duration-200 text-slate-900 placeholder:text-slate-400"
                  placeholder="Gdje se tov počinje"
                />
                {form.formState.errors.origin && (
                  <p className="text-red-600 text-xs mt-1">{form.formState.errors.origin.message}</p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-slate-600 mb-1 block flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Lokacija odredišta *
                </label>
                <Input
                  {...form.register("destination")}
                  className="bg-white border-slate-200 focus:border-orange-300 focus:ring-orange-300 rounded-lg transition-all duration-200 text-slate-900 placeholder:text-slate-400"
                  placeholder="Gdje se tov dostavlja"
                />
                {form.formState.errors.destination && (
                  <p className="text-red-600 text-xs mt-1">{form.formState.errors.destination.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-600 mb-1 block flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Dodatne napomene (opcionalno)
              </label>
              <Textarea
                {...form.register("notes")}
                rows={3}
                className="bg-white border-slate-200 focus:border-orange-300 focus:ring-orange-300 rounded-lg transition-all duration-200 text-slate-900 placeholder:text-slate-400 resize-none"
                placeholder="Dodatne informacije koje su važne za transport..."
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 shadow-sm transition-all duration-200 rounded-lg font-semibold"
            >
              {loading ? "Slanje..." : "Pošaljite zahtjev za transport"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
