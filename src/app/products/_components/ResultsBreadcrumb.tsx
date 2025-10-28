"use client";

import React, { useMemo } from "react";
import { X, Filter } from "lucide-react";
import type { Category } from "@/components/HierarchicalFilters";

export type ResultsBreadcrumbFilters = {
  categoryId?: string;
  generationId?: string;
  minPrice?: string;
  maxPrice?: string;
  q?: string;
  // specs, etc. can be added later
};

function findPathById(categories: Category[], id: string): Category[] | null {
  for (const cat of categories) {
    if (cat.id === id) return [cat];
    if (cat.children?.length) {
      const path = findPathById(cat.children, id);
      if (path) return [cat, ...path];
    }
  }
  return null;
}

export default function ResultsBreadcrumb({
  filters,
  categories,
  onRemove,
  onClearAll,
}: {
  filters: ResultsBreadcrumbFilters;
  categories: Category[];
  onRemove: (key: keyof ResultsBreadcrumbFilters) => void;
  onClearAll?: () => void;
}) {
  const segments = useMemo(() => {
    const segs: { key: keyof ResultsBreadcrumbFilters; label: string }[] = [];

    if (filters.categoryId) {
      const path = findPathById(categories, filters.categoryId);
      if (path && path.length) {
        const label = path.map((c) => c.name).join(" › ");
        segs.push({ key: "categoryId", label });
      }
    }

    if (filters.generationId) {
      segs.push({ key: "generationId", label: "Vozilo" });
    }

    // Optionally add price
    if (filters.minPrice || filters.maxPrice) {
      const from = filters.minPrice ? `${filters.minPrice}` : "";
      const to = filters.maxPrice ? `${filters.maxPrice}` : "";
      const label = `Cijena ${from && `od ${from}`} ${to && `do ${to}`}`.trim();
      segs.push({ key: "minPrice", label }); // remove will clear both min/max below
    }

    return segs;
  }, [filters, categories]);

  if (segments.length === 0) return null;

  return (
    <div className="rounded-xl px-3 py-2 bg-white border border-slate-200 mb-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Filter className="h-4 w-4 text-sunfire-500 flex-shrink-0" />
          <div className="flex items-center flex-wrap text-sm text-slate-700">
            {segments.map((s, idx) => (
              <div key={`${s.key}-${idx}`} className="flex items-center max-w-full">
                <span className="truncate">{s.label}</span>
                <button
                  onClick={() => {
                    if (s.key === "minPrice") {
                      // clear both
                      onRemove("minPrice");
                      onRemove("maxPrice");
                    } else {
                      onRemove(s.key);
                    }
                  }}
                  className="ml-1 text-slate-500 hover:text-slate-700"
                  aria-label={`Ukloni ${s.key}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                {idx < segments.length - 1 && (
                  <span className="mx-2 text-slate-400">›</span>
                )}
              </div>
            ))}
          </div>
        </div>
        <button
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold text-white bg-sunfire-600 hover:bg-sunfire-700 transition-colors shadow-sm"
          onClick={() => {
            if (onClearAll) return onClearAll();
            segments.forEach((s) => {
              if (s.key === "minPrice") {
                onRemove("minPrice");
                onRemove("maxPrice");
              } else {
                onRemove(s.key);
              }
            });
          }}
        >
          <X className="h-3.5 w-3.5" />
          Očisti sve
        </button>
      </div>
    </div>
  );
}
