"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import VehicleSelector from "@/components/vehicle/VehicleSelector";
import { Button } from "@/components/ui/button";

type DecodeResponse = {
  vin: string;
  year?: number;
  brandName?: string;
  brand: { id: string; name: string } | null;
  models: { id: string; name: string }[];
  error?: string;
};

export default function VinClient() {
  const sp = useSearchParams();
  const router = useRouter();
  const code = (sp.get("code") || "").toUpperCase();

  const [data, setData] = useState<DecodeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasValidVin = useMemo(() => /^[A-HJ-NPR-Z0-9]{17}$/i.test(code), [code]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!hasValidVin) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/vin/decode?vin=${encodeURIComponent(code)}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Greška prilikom dekodiranja VIN-a");
        if (!cancelled) setData(json);
        // Preselect brand in URL for VehicleSelector
        if (json?.brand?.id) {
          const p = new URLSearchParams(sp.toString());
          p.set("brandId", json.brand.id);
          router.replace(`/vin?${p.toString()}`);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Greška prilikom dekodiranja VIN-a");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [code, hasValidVin]);

  const onBrowseProducts = () => {
    // Route to advanced search; VehicleSelector button will do a better job once generation selected.
    router.push(`/products/advanced-search`);
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Pretraga po VIN</h1>
      {!code || !hasValidVin ? (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded">
          Unesite puni VIN (17 znakova) u pretrazi gore. Primjer: WAUZZZ8K9AA123456
        </div>
      ) : loading ? (
        <div className="flex items-center gap-2 text-slate-300"><Loader2 className="h-5 w-5 animate-spin"/> Obrada VIN-a...</div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded">{error}</div>
      ) : data ? (
        <div className="space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-lg">
            <div className="text-slate-200">
              <div><span className="text-slate-400">VIN:</span> {data.vin}</div>
              {data.brand?.name && (<div><span className="text-slate-400">Marka:</span> {data.brand.name}</div>)}
              {data.year && (<div><span className="text-slate-400">Godina (model year):</span> {data.year}</div>)}
              {!data.brand && data.brandName && (
                <div className="text-slate-400">Prepoznata marka: {data.brandName} (nije pronađena u bazi)</div>
              )}
              {data.models?.length ? (
                <div className="text-slate-400">Pronađeno modela za marku: {data.models.length}</div>
              ) : null}
            </div>
          </div>

          <div className="bg-gradient-to-t from-black/60 to-transparent p-4 rounded-2xl border border-sunfire-500/30">
            <div className="mb-3 text-slate-300 text-sm">Dovršite odabir (model → generacija → motor) za prikaz kompatibilnih dijelova:</div>
            <VehicleSelector vehicleType="ALL" />
          </div>

          <div className="flex gap-3">
            <Button onClick={onBrowseProducts} variant="outline">Otvori naprednu pretragu</Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
