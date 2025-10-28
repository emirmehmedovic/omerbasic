"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import VehicleSelector from "@/components/vehicle/VehicleSelector";
import { SearchBar } from "@/components/SearchBar";

export function Hero() {
  return (
    <section className="relative mb-16 rounded-3xl">
      <div className="relative z-10 grid gap-10 md:grid-cols-2 p-8 md:p-12 rounded-3xl bg-white border border-slate-200 shadow-lg overflow-hidden">
        {/* Dense grid background overlay */}
        <div
          className="pointer-events-none absolute inset-0 z-0 opacity-65"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(100,116,139,0.14) 1px, transparent 1px), linear-gradient(to bottom, rgba(100,116,139,0.14) 1px, transparent 1px)",
            backgroundSize: "2px 2px",
            maskImage: "radial-gradient(ellipse at center, black 92%, transparent 100%)",
            WebkitMaskImage: "radial-gradient(ellipse at center, black 92%, transparent 100%)",
          }}
        />
        {/* Left: headline + search */}
        <div className="relative z-10 space-y-6">
          <div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-slate-900 mb-4">
              Sve za vaše vozilo, brzo i pouzdano.
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl">
              Pronađite autodijelove prema vozilu ili pretrazi. Brza dostava, provjerena kvaliteta i stručna podrška.
            </p>
          </div>
          <SearchBar className="max-w-[720px]" />
          <div className="flex gap-3">
            <Button asChild size="lg" className="bg-sunfire-600 hover:bg-sunfire-700 text-white">
              <Link href="/products" className="flex items-center gap-2">
                Istraži proizvode
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="text-slate-700 hover:bg-slate-50">
              <Link href="/contact">Kontakt</Link>
            </Button>
          </div>
        </div>

        {/* Right: embedded vehicle selector (clean, no extra boxes) */}
        <div className="relative z-10 space-y-3">
          <div className="text-sm font-medium text-slate-700">Ili odaberite vozilo</div>
          <VehicleSelector compact appearance="light" variant="embedded" />
        </div>
      </div>
    </section>
  );
}
