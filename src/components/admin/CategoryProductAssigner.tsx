'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface AssignableProduct {
  id: string;
  name: string;
  catalogNumber: string;
  oemNumber: string | null;
  category?: { id: string; name: string } | null;
}

interface SelectedProductSummary {
  id: string;
  name: string;
  catalogNumber: string;
}

interface CategoryProductAssignerProps {
  categoryId: string;
  categoryName: string;
  initialSelected: SelectedProductSummary[];
}

const FETCH_LIMIT = 50;

type FetchState = 'idle' | 'loading' | 'error';

export default function CategoryProductAssigner({
  categoryId,
  categoryName,
  initialSelected,
}: CategoryProductAssignerProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [fetchState, setFetchState] = useState<FetchState>('idle');
  const [products, setProducts] = useState<AssignableProduct[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(initialSelected.map((item) => item.id))
  );
  const [selectedSummaries, setSelectedSummaries] = useState<Map<string, SelectedProductSummary>>(
    () => new Map(initialSelected.map((item) => [item.id, item]))
  );
  const [isSaving, setIsSaving] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const debouncedQuery = useDebouncedValue(query, 300);

  useEffect(() => {
    let active = true;
    const fetchProducts = async () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
      const controller = new AbortController();
      abortRef.current = controller;
      setFetchState('loading');
      try {
        const searchParams = new URLSearchParams();
        searchParams.set('limit', String(FETCH_LIMIT));
        searchParams.set('page', '1');
        searchParams.set('includeOutOfStock', 'true');
        if (debouncedQuery.trim()) {
          searchParams.set('q', debouncedQuery.trim());
        }
        const res = await fetch(`/api/products?${searchParams.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new Error(`Greška ${res.status}`);
        }
        const data: AssignableProduct[] = await res.json();
        if (!active) return;
        setProducts(data);
        // Store summary info for newly fetched products so they can appear in the selected list.
        setSelectedSummaries((prev) => {
          const next = new Map(prev);
          for (const product of data) {
            if (!next.has(product.id)) {
              next.set(product.id, {
                id: product.id,
                name: product.name,
                catalogNumber: product.catalogNumber,
              });
            }
          }
          return next;
        });
        setFetchState('idle');
      } catch (error: any) {
        if (error?.name === 'AbortError') return;
        console.error('Greška pri dohvaćanju proizvoda za povezivanje:', error);
        if (!active) return;
        setFetchState('error');
        toast.error('Neuspješno dohvaćanje proizvoda.');
      }
    };

    fetchProducts();
    return () => {
      active = false;
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, [debouncedQuery]);

  const selectedCount = selectedIds.size;
  const allCurrentIds = useMemo(() => products.map((product) => product.id), [products]);
  const allCurrentAreSelected = useMemo(() => allCurrentIds.length > 0 && allCurrentIds.every((id) => selectedIds.has(id)), [allCurrentIds, selectedIds]);
  const someCurrentSelected = useMemo(() => allCurrentIds.some((id) => selectedIds.has(id)), [allCurrentIds, selectedIds]);
  const headerCheckedState = useMemo(() => {
    if (allCurrentIds.length === 0) return false;
    if (allCurrentAreSelected) return true;
    if (someCurrentSelected) return 'indeterminate' as const;
    return false;
  }, [allCurrentIds.length, allCurrentAreSelected, someCurrentSelected]);
  const selectedList = useMemo(() => Array.from(selectedSummaries.values()).filter((item) => selectedIds.has(item.id)), [selectedSummaries, selectedIds]);

  const toggleSelectAllCurrent = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        for (const id of allCurrentIds) {
          next.add(id);
        }
      } else {
        for (const id of allCurrentIds) {
          next.delete(id);
        }
      }
      return next;
    });

    if (checked) {
      setSelectedSummaries((prev) => {
        const next = new Map(prev);
        for (const product of products) {
          if (!next.has(product.id)) {
            next.set(product.id, {
              id: product.id,
              name: product.name,
              catalogNumber: product.catalogNumber,
            });
          }
        }
        return next;
      });
    }
  };

  const toggleProduct = (product: AssignableProduct, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(product.id);
      } else {
        next.delete(product.id);
      }
      return next;
    });

    setSelectedSummaries((prev) => {
      const next = new Map(prev);
      if (!next.has(product.id)) {
        next.set(product.id, {
          id: product.id,
          name: product.name,
          catalogNumber: product.catalogNumber,
        });
      }
      return next;
    });
  };

  const removeSelected = (productId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(productId);
      return next;
    });
  };

  const onSave = async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) {
      toast.error('Odaberite barem jedan proizvod.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/categories/${categoryId}/assign-products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds: ids }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Greška pri spremanju.');
      }
      toast.success('Proizvodi uspješno dodijeljeni kategoriji.');
      router.refresh();
    } catch (error: any) {
      console.error('Greška pri spremanju dodjele proizvoda:', error);
      toast.error(error?.message || 'Greška pri spremanju.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-white via-gray-50/80 to-blue-50/60 backdrop-blur-sm border border-amber/20 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold text-gray-900">Poveži proizvode</h2>
          <p className="text-sm text-gray-600">
            Odaberite proizvode koje želite dodijeliti kategoriji <span className="font-medium text-gray-900">{categoryName}</span>.
            Ako je proizvod već u drugoj kategoriji, bit će premješten u ovu podkategoriju.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative w-full sm:w-80">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Pretraži proizvode (naziv, kataloški broj, OEM)"
              className="h-11 bg-white border-amber/30 focus:border-amber shadow-sm"
            />
            <svg className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 10.5A6.5 6.5 0 104 10.5a6.5 6.5 0 0013 0z" />
            </svg>
          </div>
          <div className="text-sm text-gray-600">
            Pronađeno: {products.length} | Označeno: <span className="font-semibold text-gray-900">{selectedCount}</span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-amber/20 bg-gradient-to-br from-white/95 to-gray-50/95 backdrop-blur-sm shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-gradient-to-r from-white/90 to-gray-50/90">
              <TableHead className="w-12 text-gray-700 font-semibold">
                <Checkbox
                  checked={headerCheckedState}
                  onCheckedChange={(value) => toggleSelectAllCurrent(Boolean(value))}
                  aria-label="Označi sve prikazane proizvode"
                />
              </TableHead>
              <TableHead className="text-gray-700 font-semibold">Naziv</TableHead>
              <TableHead className="text-gray-700 font-semibold">Kataloški broj</TableHead>
              <TableHead className="text-gray-700 font-semibold">OEM</TableHead>
              <TableHead className="text-gray-700 font-semibold">Trenutna kategorija</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fetchState === 'loading' && (
              <TableRow>
                <TableCell colSpan={5} className="py-6 text-center text-gray-600">
                  Učitavanje...
                </TableCell>
              </TableRow>
            )}
            {fetchState === 'error' && (
              <TableRow>
                <TableCell colSpan={5} className="py-6 text-center text-red-600">
                  Greška pri dohvaćanju proizvoda.
                </TableCell>
              </TableRow>
            )}
            {fetchState === 'idle' && products.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-6 text-center text-gray-500">
                  Nema rezultata za odabrane filtere.
                </TableCell>
              </TableRow>
            )}
            {products.map((product) => {
              const checked = selectedIds.has(product.id);
              return (
                <TableRow key={product.id} className="hover:bg-gradient-to-r hover:from-amber/10 hover:to-orange/10 transition-all duration-300">
                  <TableCell>
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(value) => toggleProduct(product, Boolean(value))}
                    />
                  </TableCell>
                  <TableCell className="text-gray-900 font-medium flex flex-col">
                    <span>{product.name}</span>
                  </TableCell>
                  <TableCell className="text-gray-700">{product.catalogNumber}</TableCell>
                  <TableCell className="text-gray-700">{product.oemNumber || '—'}</TableCell>
                  <TableCell className="text-gray-600">
                    {product.category && product.category.id !== categoryId ? (
                      <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                        {product.category.name}
                      </span>
                    ) : product.category?.id === categoryId ? (
                      <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                        Već dodijeljen
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">Bez kategorije</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="bg-gradient-to-br from-white via-gray-50/80 to-blue-50/60 backdrop-blur-sm border border-amber/20 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Označeni proizvodi ({selectedList.length})</h3>
          <Button onClick={onSave} disabled={isSaving || selectedIds.size === 0}>
            {isSaving ? 'Spremanje...' : 'Spremi dodjelu'}
          </Button>
        </div>
        {selectedList.length === 0 ? (
          <p className="text-sm text-gray-500">Još niste odabrali proizvode.</p>
        ) : (
          <div className="max-h-56 overflow-y-auto space-y-2 pr-2">
            {selectedList.map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between rounded-xl border border-amber/20 bg-white px-4 py-2 shadow-sm"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-900">{product.name}</span>
                  <span className="text-xs text-gray-500">{product.catalogNumber}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeSelected(product.id)}
                  className="border-red-200 text-red-600 hover:bg-red-50"
                >
                  Ukloni
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debounced;
}
