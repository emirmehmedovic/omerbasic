"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type VehicleEngine = {
  id: string;
  engineType: string | null;
  engineCapacity: number | null; // ccm
  enginePowerKW: number | null;
  enginePowerHP: number | null;
  engineCode: string | null;
  description: string | null;
};

type VehicleFitment = {
  id: string;
  isUniversal: boolean;
  engine: VehicleEngine | null;
};

type ProductWithFitments = {
  id: string;
  vehicleFitments?: VehicleFitment[];
};

function formatEngineDescription(engine: VehicleEngine): string {
  const parts: string[] = [];
  if (engine.engineType) parts.push(engine.engineType);
  if (engine.engineCapacity) parts.push(`${(engine.engineCapacity / 1000).toFixed(1)}L`);
  if (engine.enginePowerKW) parts.push(`${engine.enginePowerKW}kW`);
  if (engine.enginePowerHP) parts.push(`(${engine.enginePowerHP}KS)`);
  if (engine.engineCode) parts.push(engine.engineCode);
  return parts.join(" ");
}

function uniqueEngines(fitments: VehicleFitment[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const f of fitments) {
    if (f.isUniversal && !f.engine) {
      if (!seen.has("__UNIV__")) {
        seen.add("__UNIV__");
        result.push("Univerzalni dio");
      }
      continue;
    }
    if (f.engine) {
      const key = `${f.engine.engineCode || ''}|${f.engine.engineType || ''}|${f.engine.engineCapacity || ''}|${f.engine.enginePowerKW || ''}|${f.engine.enginePowerHP || ''}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(formatEngineDescription(f.engine));
      }
    }
  }
  return result;
}

export default function ProductEngineSummary({ productId, maxInline = 3 }: { productId: string; maxInline?: number }) {
  const [engines, setEngines] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);
  const enterTimer = useRef<any>(null);
  const leaveTimer = useRef<any>(null);

  useEffect(() => {
    let alive = true;
    setEngines(null);
    setError(null);
    fetch(`/api/products/${productId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      })
      .then((p: ProductWithFitments) => {
        if (!alive) return;
        const list = uniqueEngines(p.vehicleFitments || []);
        setEngines(list);
      })
      .catch((e) => {
        if (!alive) return;
        setError(typeof e?.message === 'string' ? e.message : 'Greška pri učitavanju motora');
      });
    return () => { alive = false; };
  }, [productId]);

  const inline = useMemo(() => {
    if (!engines || engines.length === 0) return [] as string[];
    return engines.slice(0, maxInline);
  }, [engines, maxInline]);

  if (error) return null;

  const onEnter = () => {
    if (leaveTimer.current) {
      clearTimeout(leaveTimer.current);
      leaveTimer.current = null;
    }
    if (enterTimer.current) clearTimeout(enterTimer.current);
    enterTimer.current = setTimeout(() => {
      if (!ref.current) return;
      const r = ref.current.getBoundingClientRect();
      setCoords({ top: r.bottom + window.scrollY + 8, left: r.left + window.scrollX, width: r.width });
      setOpen(true);
    }, 120);
  };

  const onLeave = () => {
    if (enterTimer.current) {
      clearTimeout(enterTimer.current);
      enterTimer.current = null;
    }
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    leaveTimer.current = setTimeout(() => setOpen(false), 120);
  };

  useEffect(() => () => {
    if (enterTimer.current) clearTimeout(enterTimer.current);
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
  }, []);

  return (
    <div className="relative mt-1" ref={ref} onMouseEnter={onEnter} onMouseLeave={onLeave}>
      {!engines ? (
        <div className="flex gap-1 mt-1">
          <span className="h-3 w-16 bg-slate-200 rounded animate-pulse" />
          <span className="h-3 w-12 bg-slate-200 rounded animate-pulse" />
          <span className="h-3 w-20 bg-slate-200 rounded animate-pulse hidden sm:inline-block" />
        </div>
      ) : engines.length === 0 ? null : (
        <div className="text-[11px] text-slate-600">
          <span className="mr-1 text-slate-500">Motori:</span>
          {inline.map((e, idx) => (
            <span key={idx} className="inline-flex items-center gap-1 mr-1 mb-1 px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-700">
              {e}
            </span>
          ))}
          {engines.length > inline.length && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-slate-200 bg-white text-slate-700">
              +{engines.length - inline.length}
            </span>
          )}
          {engines.length > inline.length && open && coords && typeof window !== 'undefined' && createPortal(
            <div style={{ position: 'absolute', top: 0, left: 0, zIndex: 1000 }}>
              <div style={{ position: 'absolute', top: coords.top, left: coords.left, width: Math.min(coords.width + 200, window.innerWidth - coords.left - 16) }} className="pointer-events-none rounded-xl border border-slate-200 bg-white shadow-2xl p-3">
                <div className="max-h-60 overflow-auto pr-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {engines.map((e, idx) => (
                      <div key={idx} className="text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-md px-2 py-1">
                        {e}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>, document.body)
          }
        </div>
      )}
    </div>
  );
}
