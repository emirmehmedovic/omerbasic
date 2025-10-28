"use client";

import { useState } from "react";
import { ProductCard } from "@/components/ProductCard";
import type { Product } from "@/generated/prisma/client";

export function ProductsTabs({ latest, top }: { latest: Product[]; top: Product[] }) {
  const [tab, setTab] = useState<"latest" | "top">("latest");
  const list = tab === "latest" ? latest : top;
  return (
    <section className="mb-20">
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === "latest" ? "bg-white shadow-sm" : "text-slate-600"}`}
            onClick={() => setTab("latest")}
          >
            Najnovije
          </button>
          <button
            className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === "top" ? "bg-white shadow-sm" : "text-slate-600"}`}
            onClick={() => setTab("top")}
          >
            Top prodaja
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
        {list.map((p) => (
          <ProductCard key={p.id} product={p as any} />
        ))}
      </div>
    </section>
  );
}
