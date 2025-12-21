"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Wrench, Search, Car } from "lucide-react";
import VehicleSelector from "@/components/vehicle/VehicleSelector";
import { SearchBar } from "@/components/SearchBar";

export function Hero() {
  return (
    <section className="relative mb-16">
      {/* Hero Grid - 3 Elements */}
      <div className="flex flex-col lg:flex-row gap-6 p-6 sm:p-8 lg:p-12 xl:p-16 2xl:p-20 3xl:p-24">
        
        {/* 1. Left Section - Main Content - 40% width, Full Height */}
        <div className="w-full lg:w-[40%] relative overflow-hidden rounded-3xl min-h-[600px] lg:min-h-[85vh] bg-gradient-to-br from-primary via-primary-dark to-[#0F1F35] shadow-2xl">
          {/* Texture overlay */}
          <div 
            className="pointer-events-none absolute inset-0 z-0 opacity-[0.04]"
            style={{
              backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.3) 1px, transparent 0), radial-gradient(circle at 50% 50%, rgba(255,107,53,0.15) 0%, transparent 70%)',
              backgroundSize: '32px 32px, 100% 100%'
            }}
          />

          {/* Content */}
          <div className="relative z-10 h-full flex flex-col justify-center p-8 lg:p-12 space-y-10">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#E85A28] to-[#FF6B35] text-white text-sm font-bold shadow-lg w-fit">
              <Wrench className="w-4 h-4" />
              Autodijelovi za sve tipove vozila
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight">
              Originalni i zamjenski autodijelovi
            </h1>
            
            <p className="text-lg md:text-xl text-slate-200 font-medium max-w-xl">
              Preko 12.000 artikala za putnička i teretna vozila. Brza dostava, provjerena kvaliteta i stručna podrška.
            </p>

            <Button asChild size="lg" className="w-fit bg-white text-primary hover:bg-slate-50 hover:shadow-xl font-bold rounded-xl transform hover:-translate-y-0.5 transition-all duration-300 px-8">
              <Link href="/products" className="flex items-center justify-center gap-2">
                Pregledaj katalog
                <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Right Column - 60% width */}
        <div className="w-full lg:w-[60%] flex flex-col gap-6">
          
          {/* 2. Vehicle Selector Card */}
          <div className="relative rounded-3xl flex-1 overflow-hidden bg-white shadow-xl p-8 lg:p-10 border-2 border-slate-100">
            {/* Subtle gradient overlay */}
            <div
              className="pointer-events-none absolute inset-0 z-0 opacity-[0.02]"
              style={{
                backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(27,58,95,0.2) 1px, transparent 0), radial-gradient(circle at 50% 50%, rgba(255,107,53,0.05) 0%, transparent 70%)',
                backgroundSize: '32px 32px, 100% 100%'
              }}
            />

            {/* Content */}
            <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b-2 border-primary/10">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-primary to-primary-dark shadow-lg">
                  <Car className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-primary">Odabir vozila</h3>
              </div>
              <VehicleSelector compact appearance="light" variant="embedded" heroMode />
            </div>
          </div>

          {/* 3. Search Card */}
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-primary via-[#1e4976] to-primary-dark shadow-2xl p-8">
            {/* Texture overlay */}
            <div 
              className="pointer-events-none absolute inset-0 z-0 opacity-[0.06]"
              style={{
                backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.3) 1px, transparent 0), radial-gradient(circle at 50% 50%, rgba(255,107,53,0.15) 0%, transparent 70%)',
                backgroundSize: '32px 32px, 100% 100%'
              }}
            />

            {/* Decorative glow effect */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF6B35]/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary-dark/20 rounded-full blur-3xl pointer-events-none" />

            {/* Content */}
            <div className="relative z-10 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-[#E85A28] to-[#FF6B35] shadow-xl ring-2 ring-white/20">
                    <Search className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">Pretraži artikle</h3>
                    <p className="text-sm text-slate-200 mt-0.5">Brza pretraga po nazivu ili šifri</p>
                  </div>
                </div>
                <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
                  <div className="w-2 h-2 rounded-full bg-[#FF6B35] animate-pulse" />
                  <span className="text-xs font-medium text-white/90">12.000+ artikala</span>
                </div>
              </div>
              <SearchBar className="w-full" variant="dark" />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
