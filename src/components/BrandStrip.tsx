"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

// Icons
import Audi from "@/components/icons/audi";
import Volkswagen from "@/components/icons/volkswagen";
import Mercedes from "@/components/icons/mercedes";
import Bmw from "@/components/icons/bmw";
import Volvo from "@/components/icons/volvo";
import Seat from "@/components/icons/seat";
import Skoda from "@/components/icons/skoda";
import Opel from "@/components/icons/opel";
import Citroen from "@/components/icons/citroen";
import Kia from "@/components/icons/kia";
import Peugeot from "@/components/icons/peugeot";
import Alfaromeo from "@/components/icons/alfaromeo";
import Chevrolet from "@/components/icons/chevrolet";
import Dacia from "@/components/icons/dacia";
import Daewoo from "@/components/icons/daewoo";
import Fiat from "@/components/icons/fiat";
import Honda from "@/components/icons/honda";
import Hyundai from "@/components/icons/hyundai";
import Jaguar from "@/components/icons/jaguar";
import Lancia from "@/components/icons/lancia";
import LandRover from "@/components/icons/landrover";
import Mazda from "@/components/icons/mazda";
import Mini from "@/components/icons/mini";
import Mitsubishi from "@/components/icons/mitsubishi";
import Nissan from "@/components/icons/nissan";
import Porsche from "@/components/icons/porsche";
import Smart from "@/components/icons/smart";
import Toyota from "@/components/icons/toyota";

// Types
type VehicleBrand = { id: string; name: string };

// Helpers
const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

import Scania from "@/components/icons/scania";
import Man from "@/components/icons/man";
import Daf from "@/components/icons/daf";
import Iveco from "@/components/icons/iveco";
import Renault from "@/components/icons/renault";
import Link from "next/link";

type BrandStripVariant = "passenger" | "commercial";
type BrandStripLayout = "row" | "grid";
type BrandStripAppearance = "default" | "passenger" | "commercial";

export default function BrandStrip({
  className,
  prefillCategoryId,
  variant = "passenger",
  layout = "row",
  title,
  appearance = "default",
  showViewAll = true,
  viewAllLabel = "Pregledaj sve",
  viewAllHref,
}: {
  className?: string;
  prefillCategoryId?: string;
  variant?: BrandStripVariant;
  layout?: BrandStripLayout;
  title?: string;
  appearance?: BrandStripAppearance;
  showViewAll?: boolean;
  viewAllLabel?: string;
  viewAllHref?: string;
}) {
  const router = useRouter();
  const [brands, setBrands] = useState<VehicleBrand[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const passengerBrands = useMemo(
    () => [
      { key: "volkswagen", label: "Volkswagen", Icon: Volkswagen },
      { key: "audi", label: "Audi", Icon: Audi },
      { key: "bmw", label: "BMW", Icon: Bmw },
      { key: "mercedes", label: "Mercedes", Icon: Mercedes },
      { key: "opel", label: "Opel", Icon: Opel },
      { key: "peugeot", label: "Peugeot", Icon: Peugeot },
      { key: "seat", label: "Seat", Icon: Seat },
      { key: "skoda", label: "Škoda", Icon: Skoda },
      { key: "citroen", label: "Citroën", Icon: Citroen },
      { key: "volvo", label: "Volvo", Icon: Volvo },
      { key: "kia", label: "Kia", Icon: Kia },
      { key: "alfaromeo", label: "Alfa Romeo", Icon: Alfaromeo },
      { key: "chevrolet", label: "Chevrolet", Icon: Chevrolet },
      { key: "dacia", label: "Dacia", Icon: Dacia },
      { key: "daewoo", label: "Daewoo", Icon: Daewoo },
      { key: "fiat", label: "Fiat", Icon: Fiat },
      { key: "honda", label: "Honda", Icon: Honda },
      { key: "hyundai", label: "Hyundai", Icon: Hyundai },
      { key: "jaguar", label: "Jaguar", Icon: Jaguar },
      { key: "lancia", label: "Lancia", Icon: Lancia },
      { key: "land rover", label: "Land Rover", Icon: LandRover },
      { key: "mazda", label: "Mazda", Icon: Mazda },
      { key: "mini", label: "Mini", Icon: Mini },
      { key: "mitsubishi", label: "Mitsubishi", Icon: Mitsubishi },
      { key: "nissan", label: "Nissan", Icon: Nissan },
      { key: "porsche", label: "Porsche", Icon: Porsche },
      { key: "smart", label: "Smart", Icon: Smart },
      { key: "toyota", label: "Toyota", Icon: Toyota },
    ],
    []
  );

  const commercialBrands = useMemo(
    () => [
      { key: "volvo", label: "Volvo", Icon: Volvo },
      { key: "scania", label: "Scania", Icon: Scania },
      { key: "daf", label: "DAF", Icon: Daf },
      { key: "man", label: "MAN", Icon: Man },
      { key: "iveco", label: "Iveco", Icon: Iveco },
      { key: "renault", label: "Renault", Icon: Renault },
      { key: "mercedes", label: "Mercedes", Icon: Mercedes },
    ],
    []
  );

  const nameToId = useMemo(() => {
    const map = new Map<string, string>();
    const aliases = new Map<string, string>([
      ["mercedes-benz", "mercedes"],
      ["vw", "volkswagen"],
      ["volvo trucks", "volvo"],
      ["mercedes-benz trucks", "mercedes"],
      ["mercedes trucks", "mercedes"],
    ]);
    for (const b of brands) {
      const n = normalize(b.name);
      map.set(n, b.id);
      const aliasTarget = aliases.get(n);
      if (aliasTarget) map.set(aliasTarget, b.id);
    }
    return map;
  }, [brands]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/vehicle-brands");
        if (!res.ok) throw new Error("Greška pri dohvaćanju marki");
        const data = await res.json();
        setBrands(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const containerTone = useMemo(() => {
    // Gradient overlays per theme (used on absolute overlay layer)
    if (appearance === 'passenger') return "from-sky-400/30 via-blue-500/20 to-indigo-600/30";
    if (appearance === 'commercial') return "from-blue-700/30 via-blue-900/25 to-slate-900/40";
    return "from-white/10 via-white/5 to-transparent";
  }, [appearance]);

  const glowTone = useMemo(() => {
    if (appearance === 'passenger') return "bg-sky-400/20";
    if (appearance === 'commercial') return "bg-blue-700/20";
    return "bg-white/10";
  }, [appearance]);

  const viewAllUrl = useMemo(() => {
    if (viewAllHref) return viewAllHref;
    if (prefillCategoryId) return `/products?categoryId=${encodeURIComponent(prefillCategoryId)}`;
    return "/products";
  }, [viewAllHref, prefillCategoryId]);

  return (
    <div className={cn(
      "relative overflow-hidden p-6 rounded-2xl bg-white/10 backdrop-blur-2xl",
      "shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)]",
      className
    )}>
      {/* Themed gradient overlay */}
      <div className={cn(
        "pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br opacity-30",
        containerTone
      )} />
      {/* Subtle top highlight */}
      <div className="pointer-events-none absolute -top-1/2 left-0 right-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent opacity-80" />
      {/* Soft corner glows */}
      <div className={cn("pointer-events-none absolute -bottom-24 -right-24 w-80 h-80 rounded-full blur-[100px] opacity-40", glowTone)} />
      <div className={cn("pointer-events-none absolute -top-24 -left-24 w-72 h-72 rounded-full blur-[90px] opacity-35", glowTone)} />
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white">{title ?? (variant === "commercial" ? "Popularne marke (teretna)" : "Popularne marke")}</h3>
        {showViewAll && (
          <Link
            href={viewAllUrl}
            className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border border-white/20 text-white/90 hover:text-white hover:border-white/40 hover:bg-white/10 transition-colors"
          >
            {viewAllLabel}
          </Link>
        )}
      </div>
      <div className={cn("relative", layout === 'row' && "-mx-2 px-2")}
      >
        {layout === 'row' && (
          <>
            <div className="pointer-events-none absolute left-0 top-0 h-full w-8 bg-gradient-to-r from-black/20 to-transparent rounded-l-2xl" />
            <div className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-black/20 to-transparent rounded-r-2xl" />
          </>
        )}
        <div className={cn(
          layout === 'grid'
            ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4"
            : "flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-none"
        )}
        >
        {(variant === "commercial" ? commercialBrands : passengerBrands).map(({ key, label, Icon }) => {
          const id = nameToId.get(key);
          const isDisabled = !id || loading;
          return (
            <button
              key={key}
              type="button"
              disabled={isDisabled}
              onClick={() => {
                if (!id) return;
                const params = new URLSearchParams();
                params.set('makeId', id);
                params.set('brandId', id);
                if (prefillCategoryId) params.set('categoryId', prefillCategoryId);
                router.push(`/products?${params.toString()}`);
              }}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors snap-start",
                layout === 'row' ? "whitespace-nowrap" : "w-full",
                "bg-slate-800/50 border-slate-700 text-white hover:border-sunfire-400",
                isDisabled && "opacity-40 cursor-not-allowed"
              )}
            >
              <Icon size="24" color="#fff" />
              <span className="text-sm leading-none">{label}</span>
            </button>
          );
        })}
        </div>
      </div>
    </div>
  );
}
