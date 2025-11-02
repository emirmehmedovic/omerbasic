"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

type InitialGeneration = {
  id: string;
  name: string;
  model: { id: string; name: string; brand: { id: string; name: string } };
} | null;

type InitialEngine = { id: string; label: string };

export default function VehicleProductLinker({
  initialGeneration,
  initialEngines,
}: {
  initialGeneration: InitialGeneration;
  initialEngines: InitialEngine[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const generationId = (searchParams.get("generationId") || initialGeneration?.id || "");

  const [engineMode, setEngineMode] = useState<"none" | "all" | "selected">("none");
  const [selectedEngineIds, setSelectedEngineIds] = useState<string[]>([]);

  const [q, setQ] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());

  const [links, setLinks] = useState<any[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(false);

  const linkedProductIds = useMemo(() => new Set<string>(links.map((l: any) => l.productId)), [links]);
  const [filterMode, setFilterMode] = useState<'all' | 'unlinked' | 'linked'>('all');

  const hasScope = Boolean(generationId);

  useEffect(() => {
    if (!hasScope) return;
    (async () => {
      try {
        setLoadingLinks(true);
        const res = await fetch(`/api/admin/vehicle-fitments?generationId=${generationId}`);
        const data = await res.json();
        setLinks(Array.isArray(data) ? data : []);
      } catch (e) {
        // ignore
      } finally {
        setLoadingLinks(false);
      }
    })();
  }, [generationId]);

  const fetchProducts = async (append = false) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      params.set("limit", "20");
      if (append && nextCursor) params.set("cursor", nextCursor);
      const res = await fetch(`/api/products?${params.toString()}`);
      if (!res.ok) throw new Error("Greška pri pretrazi proizvoda");
      const newCursor = res.headers.get("X-Next-Cursor");
      const items = await res.json();
      setNextCursor(newCursor);
      setProducts(prev => append ? [...prev, ...items] : items);
    } catch (e: any) {
      toast.error(e.message || "Greška pri pretrazi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // initial load
    fetchProducts(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleProduct = (id: string) => {
    setSelectedProductIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const visibleProducts = useMemo(() => {
    if (filterMode === 'linked') return products.filter(p => linkedProductIds.has(p.id));
    if (filterMode === 'unlinked') return products.filter(p => !linkedProductIds.has(p.id));
    return products;
  }, [products, filterMode, linkedProductIds]);

  const linkSelected = async () => {
    if (!hasScope) {
      toast.error("Odredište nije definirano (generacija)");
      return;
    }
    const productIds = Array.from(selectedProductIds);
    if (productIds.length === 0) {
      toast("Nema odabranih proizvoda");
      return;
    }
    try {
      const body: any = { productIds, generationId };
      if (engineMode === "all") body.linkAllEngines = true;
      else if (engineMode === "selected") body.engineIds = selectedEngineIds;
      // engineMode none -> generation-level only
      const res = await fetch("/api/admin/vehicle-fitments/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Greška pri linkanju proizvoda");
      const data = await res.json();
      toast.success(`Dodano: ${data.created}, preskočeno: ${data.skipped}`);
      setSelectedProductIds(new Set());
      // refresh current links
      const rl = await fetch(`/api/admin/vehicle-fitments?generationId=${generationId}`);
      setLinks(await rl.json());
    } catch (e: any) {
      toast.error(e.message || "Greška");
    }
  };

  const unlinkOne = async (productId: string, engineId?: string | null) => {
    try {
      const body: any = { productIds: [productId], generationId };
      if (engineId) body.engineIds = [engineId];
      const res = await fetch("/api/admin/vehicle-fitments/batch", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Greška pri uklanjanju veze");
      toast.success("Veza uklonjena");
      setLinks(prev => prev.filter((f: any) => !(f.productId === productId && (engineId ? f.engineId === engineId : f.engineId == null))));
    } catch (e: any) {
      toast.error(e.message || "Greška");
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-amber/20 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-2xl font-bold text-slate-900">Povezivanje proizvoda s vozilima</h1>
          <div className="flex items-center gap-2 text-sm">
            <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-700">Rezultata: {products.length}</span>
            <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-700">Odabrano: {selectedProductIds.size}</span>
            <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-700">Povezano: {links.length}</span>
          </div>
        </div>
        {initialGeneration && (
          <p className="text-sm text-slate-600 mt-1">
            Odredište: {initialGeneration.model.brand.name} / {initialGeneration.model.name} / {initialGeneration.name}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Scope */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm w-full">
          <h2 className="text-sm font-semibold text-slate-800 mb-3">Odredište (generacija i motori)</h2>
          {!hasScope ? (
            <p className="text-sm text-slate-600">Nije proslijeđen generationId. Vratite se i odaberite generaciju.</p>
          ) : (
            <>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" name="engineMode" checked={engineMode === "none"} onChange={() => setEngineMode("none")} />
                  <span>Poveži s generacijom (bez motora)</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" name="engineMode" checked={engineMode === "all"} onChange={() => setEngineMode("all")} />
                  <span>Svi motori u generaciji</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" name="engineMode" checked={engineMode === "selected"} onChange={() => setEngineMode("selected")} />
                  <span>Odabrani motori</span>
                </label>
              </div>
              {engineMode === "selected" && (
                <div className="mt-3 max-h-52 overflow-auto border rounded-md p-2">
                  {initialEngines.length === 0 ? (
                    <p className="text-xs text-slate-500">Nema motora za ovu generaciju</p>
                  ) : (
                    initialEngines.map(e => (
                      <label key={e.id} className="flex items-center gap-2 py-1 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedEngineIds.includes(e.id)}
                          onChange={(ev) => {
                            setSelectedEngineIds(prev => ev.target.checked ? [...prev, e.id] : prev.filter(x => x !== e.id));
                          }}
                        />
                        <span className="truncate">{e.label}</span>
                      </label>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Product search */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm w-full">
          <h2 className="text-sm font-semibold text-slate-800 mb-3">Pretraga proizvoda</h2>
          <div className="flex items-center gap-2 mb-3">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') fetchProducts(false); }}
              className="h-9 w-full rounded-md border border-slate-300 px-3 text-sm"
              placeholder="Ime, OEM, kataloški broj"
            />
            <button onClick={() => fetchProducts(false)} className="h-9 px-3 rounded-md bg-sunfire-600 text-white text-sm">Pretraži</button>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-slate-600">Filter:</span>
            <button className={`text-xs px-2 py-1 rounded ${filterMode==='all'?'bg-slate-900 text-white':'border'}`} onClick={()=>setFilterMode('all')}>Svi</button>
            <button className={`text-xs px-2 py-1 rounded ${filterMode==='unlinked'?'bg-slate-900 text-white':'border'}`} onClick={()=>setFilterMode('unlinked')}>Nepovezani</button>
            <button className={`text-xs px-2 py-1 rounded ${filterMode==='linked'?'bg-slate-900 text-white':'border'}`} onClick={()=>setFilterMode('linked')}>Povezani</button>
          </div>
          <div className="max-h-80 overflow-auto divide-y">
            {visibleProducts.map((p) => (
              <label key={p.id} className="flex items-center gap-2 py-2">
                <input type="checkbox" checked={selectedProductIds.has(p.id)} onChange={() => toggleProduct(p.id)} />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-900 truncate">{p.name}</div>
                  <div className="text-xs text-slate-600 flex items-center gap-2">
                    <span>OEM: {(p as any).oemNumber || '-' } · Kataloški: {(p as any).catalogNumber || '-'}</span>
                    {linkedProductIds.has(p.id) && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-green-100 text-green-700">Povezan</span>
                    )}
                  </div>
                </div>
              </label>
            ))}
            {visibleProducts.length === 0 && <p className="text-sm text-slate-500 py-6 text-center">Nema rezultata</p>}
          </div>
          {nextCursor && (
            <div className="mt-2 text-center">
              <button onClick={() => fetchProducts(true)} className="text-sm px-3 py-1.5 border rounded-md">Učitaj još</button>
            </div>
          )}
          <div className="mt-3 flex justify-end">
            <button
              disabled={selectedProductIds.size === 0 || !hasScope}
              onClick={linkSelected}
              className="h-9 px-3 rounded-md bg-sunfire-600 text-white text-sm disabled:opacity-50"
            >
              Poveži {selectedProductIds.size > 0 ? `(${selectedProductIds.size})` : ""}
            </button>
          </div>
        </div>

        {/* Existing links */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm w-full">
          <h2 className="text-sm font-semibold text-slate-800 mb-3">Već povezani proizvodi</h2>
          <div className="max-h-96 overflow-auto divide-y">
            {links.map((f: any) => (
              <div key={f.id} className="flex items-center justify-between py-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-900 truncate">{f.product?.name || f.productId}</div>
                  <div className="text-xs text-slate-600 flex items-center gap-2">
                    {f.engineId ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">Motor: {f.engine?.engineCode || f.engine?.description || f.engineId}</span>
                    ) : (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">Generacija</span>
                    )}
                  </div>
                </div>
                <button onClick={() => unlinkOne(f.productId, f.engineId)} className="text-xs px-2 py-1 rounded-md border">Ukloni</button>
              </div>
            ))}
            {links.length === 0 && <p className="text-sm text-slate-500 py-6 text-center">Nema povezanih proizvoda</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
