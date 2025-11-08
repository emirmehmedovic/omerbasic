"use client";

import { useState } from "react";
import { ProductCard } from "@/components/ProductCard";
import { Sparkles, TrendingUp, Package } from "lucide-react";
import type { Product } from "@/generated/prisma/client";

export function ProductsTabs({ latest, top }: { latest: Product[]; top: Product[] }) {
  const [tab, setTab] = useState<"latest" | "top">("latest");
  const list = tab === "latest" ? latest : top;
  return (
    <section className="relative mb-16">
      <div className="relative rounded-3xl p-6 sm:p-8 lg:p-12 bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 shadow-xl overflow-hidden">
        {/* Tekstura overlay */}
        <div
          className="pointer-events-none absolute inset-0 z-0 opacity-[0.04]"
          style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(27,58,95,0.2) 1px, transparent 0), radial-gradient(circle at 50% 50%, rgba(255,107,53,0.08) 0%, transparent 70%)',
            backgroundSize: '32px 32px, 100% 100%'
          }}
        />
        
        {/* Decorative elements */}
        <div className="absolute top-10 left-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-32 h-32 bg-[#FF6B35]/5 rounded-full blur-3xl pointer-events-none" />
      {/* Header sa naslovom i tab switcherima */}
      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-primary-dark shadow-lg">
              <Package className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-primary">
              Izdvojeni proizvodi
            </h2>
          </div>
          <p className="text-slate-600 font-medium text-lg">
            Pregledajte najnovije artikle i najprodavanije proizvode
          </p>
        </div>
        <div className="flex gap-2 bg-white/90 backdrop-blur-sm p-2 rounded-2xl border border-white/60 shadow-xl">
          <button
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${
              tab === "latest" 
                ? "bg-gradient-to-r from-primary via-primary-dark to-primary text-white shadow-xl scale-[1.02]" 
                : "text-slate-700 hover:bg-white/80 hover:shadow-md"
            }`}
            onClick={() => setTab("latest")}
          >
            <Sparkles className="w-5 h-5" />
            Najnovije
          </button>
          <button
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${
              tab === "top" 
                ? "bg-gradient-to-r from-primary via-primary-dark to-primary text-white shadow-xl scale-[1.02]" 
                : "text-slate-700 hover:bg-white/80 hover:shadow-md"
            }`}
            onClick={() => setTab("top")}
          >
            <TrendingUp className="w-5 h-5" />
            Top prodaja
          </button>
        </div>
      </div>
      
      {/* Grid sa proizvodima */}
      <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {list.slice(0, 12).map((p) => (
          <ProductCard key={p.id} product={p as any} compact />
        ))}
      </div>
      </div>
    </section>
  );
}
