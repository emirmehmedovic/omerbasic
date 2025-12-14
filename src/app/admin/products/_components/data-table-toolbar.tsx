"use client";

import { Table } from '@tanstack/react-table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { CheckedState } from '@radix-ui/react-checkbox';

const getCategoryAndChildrenIds = (categoryId: string, categories: CategoryWithChildren[]): string[] => {
  const ids: string[] = [];
  const findCategory = (cats: CategoryWithChildren[], id: string): CategoryWithChildren | null => {
    for (const cat of cats) {
      if (cat.id === id) return cat;
      if (cat.children) {
        const found = findCategory(cat.children, id);
        if (found) return found;
      }
    }
    return null;
  };
  const collectIds = (category: CategoryWithChildren) => {
    ids.push(category.id);
    category.children?.forEach(collectIds);
  };
  const startCategory = findCategory(categories, categoryId);
  if (startCategory) {
    collectIds(startCategory);
  }
  return ids;
};
import { X, Download, RefreshCcw, Loader2 } from 'lucide-react';
import { CategoryCombobox } from './category-combobox';
import type { CategoryWithChildren } from '../page';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  categories: CategoryWithChildren[];
  onSearch?: (q: string) => void;
  onCategoryChange?: (categoryId: string) => void;
  inStockOnly?: boolean;
  onInStockChange?: (value: boolean) => void;
}


export function DataTableToolbar<TData>({
  table,
  categories,
  onSearch,
  onCategoryChange,
  inStockOnly = false,
  onInStockChange,
}: DataTableToolbarProps<TData>) {
  const tableHasFilters = table.getState().columnFilters.length > 0;
  const [selectedCategoryId, setSelectedCategoryId] = React.useState('');
  const [search, setSearch] = React.useState('');
  const trimmedSearch = search.trim();
  const isFiltered = tableHasFilters || trimmedSearch.length > 0 || inStockOnly;
  const [slugDialogOpen, setSlugDialogOpen] = React.useState(false);
  const [slugMode, setSlugMode] = React.useState<'missing' | 'all'>('missing');
  const [slugStatus, setSlugStatus] = React.useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [slugResult, setSlugResult] = React.useState<{ total: number; updated: number } | null>(null);
  const [slugError, setSlugError] = React.useState<string | null>(null);

  // debounce search -> 300ms
  React.useEffect(() => {
    const id = setTimeout(() => {
      if (onSearch) onSearch(trimmedSearch);
    }, 300);
    return () => clearTimeout(id);
  }, [trimmedSearch, onSearch]);

  const handleRunSlugRegeneration = async () => {
    setSlugStatus('running');
    setSlugError(null);
    setSlugResult(null);

    try {
      const res = await fetch('/api/admin/products/regenerate-slugs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mode: slugMode }),
      });

      if (!res.ok) {
        const text = await res.text();
        setSlugStatus('error');
        setSlugError(text || `Greška (${res.status}).`);
        return;
      }

      const data = await res.json();
      setSlugResult({ total: data.total ?? 0, updated: data.updated ?? 0 });
      setSlugStatus('done');
    } catch (error) {
      console.error('Error regenerating product slugs', error);
      setSlugStatus('error');
      setSlugError('Došlo je do greške pri regenerisanju slugova.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters Row */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-1">
          <div className="relative">
            <Input
              placeholder="Pretraži proizvode..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-11 w-[200px] lg:w-[300px] bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm text-gray-900 placeholder:text-gray-500 border-amber/30 rounded-xl focus:border-amber focus:ring-amber/20 shadow-sm"
            />
            <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <CategoryCombobox
            categories={categories}
            value={selectedCategoryId}
            onChange={(value) => {
              setSelectedCategoryId(value);
              if (!value) {
                table.getColumn('category')?.setFilterValue(undefined);
              } else {
                const allRelatedIds = getCategoryAndChildrenIds(value, categories);
                table.getColumn('category')?.setFilterValue(allRelatedIds);
              }
              if (onCategoryChange) onCategoryChange(value);
            }}
          />
          {isFiltered && (
            <Button
              variant="ghost"
              onClick={() => {
                setSearch('');
                setSelectedCategoryId('');
                table.resetColumnFilters();
                onCategoryChange?.('');
                onSearch?.('');
                onInStockChange?.(false);
              }}
              className="h-11 px-4 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all duration-200"
            >
              <X className="mr-2 h-4 w-4" />
              Reset
            </Button>
          )}
        </div>
        
        {/* Export Button */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="in-stock-only"
              checked={inStockOnly}
              onCheckedChange={(checked: CheckedState) => onInStockChange?.(checked === true)}
            />
            <Label htmlFor="in-stock-only" className="text-sm text-gray-700">Samo na stanju</Label>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              const params = new URLSearchParams();
              if (trimmedSearch) params.set('q', trimmedSearch);
              if (selectedCategoryId) params.set('categoryId', selectedCategoryId);
              if (inStockOnly) params.set('inStockOnly', 'true');
              const url = `/api/products/export${params.toString() ? `?${params.toString()}` : ''}`;
              window.open(url, '_blank');
            }}
            className="h-11 px-6 flex items-center bg-gradient-to-r from-white/90 to-gray-50/90 backdrop-blur-sm text-gray-700 hover:from-white hover:to-gray-50 border-amber/30 hover:border-amber/50 rounded-xl transition-all duration-200 shadow-sm"
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Dialog open={slugDialogOpen} onOpenChange={(open) => {
            setSlugDialogOpen(open);
            if (!open) {
              setSlugStatus('idle');
              setSlugResult(null);
              setSlugError(null);
              setSlugMode('missing');
            }
          }}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="h-11 px-6 flex items-center bg-gradient-to-r from-white/90 to-gray-50/90 backdrop-blur-sm text-gray-700 hover:from-white hover:to-gray-50 border-amber/30 hover:border-amber/50 rounded-xl transition-all duration-200 shadow-sm"
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                Regeneriši slugove
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Regeneracija slugova proizvoda</DialogTitle>
                <DialogDescription>
                  Možete regenerisati slugove za sve proizvode ili samo za proizvode koji trenutno nemaju slug.
                  Ovo može promijeniti URL-ove proizvoda, pa koristite opciju za sve proizvode samo ako ste sigurni.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-2">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Opseg regeneracije</p>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setSlugMode('missing')}
                      className={`w-full text-left px-3 py-2 rounded-lg border text-sm ${
                        slugMode === 'missing'
                          ? 'border-amber-500 bg-amber-50 text-amber-900'
                          : 'border-gray-200 hover:border-amber-300 hover:bg-amber-50/40'
                      }`}
                    >
                      <span className="font-medium">Samo proizvodi bez sluga (preporučeno)</span>
                      <br />
                      <span className="text-xs text-gray-600">
                        Popuni slug samo tamo gdje nedostaje. Postojeći URL-ovi proizvoda ostaju nepromijenjeni.
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSlugMode('all')}
                      className={`w-full text-left px-3 py-2 rounded-lg border text-sm ${
                        slugMode === 'all'
                          ? 'border-red-500 bg-red-50 text-red-900'
                          : 'border-gray-200 hover:border-red-300 hover:bg-red-50/40'
                      }`}
                    >
                      <span className="font-medium">Svi proizvodi</span>
                      <br />
                      <span className="text-xs text-gray-600">
                        Ponovno izračunaj slug za sve proizvode. Ovo će promijeniti URL-ove postojećih proizvoda.
                      </span>
                    </button>
                  </div>
                </div>

                <div className="rounded-md bg-gray-50 border border-gray-200 px-3 py-2 text-sm text-gray-700 flex items-center gap-2 min-h-[40px]">
                  {slugStatus === 'idle' && (
                    <span>Spremno za regeneraciju slugova.</span>
                  )}
                  {slugStatus === 'running' && (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
                      <span>Regenerišem slugove, molimo sačekajte...</span>
                    </>
                  )}
                  {slugStatus === 'done' && slugResult && (
                    <span>
                      Gotovo. Ažurirano {slugResult.updated} od {slugResult.total} proizvoda.
                    </span>
                  )}
                  {slugStatus === 'error' && (
                    <span className="text-red-600">
                      {slugError || 'Došlo je do greške pri regenerisanju slugova.'}
                    </span>
                  )}
                </div>
              </div>

              <DialogFooter className="mt-4">
                <DialogClose asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl"
                    disabled={slugStatus === 'running'}
                  >
                    Zatvori
                  </Button>
                </DialogClose>
                <Button
                  type="button"
                  onClick={handleRunSlugRegeneration}
                  disabled={slugStatus === 'running'}
                  className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-2"
                >
                  {slugStatus === 'running' && <Loader2 className="h-4 w-4 animate-spin" />}
                  {slugMode === 'missing' ? 'Regeneriši slugove (bez sluga)' : 'Regeneriši slugove (svi proizvodi)'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          Prikazano {table.getFilteredRowModel().rows.length} od {table.getRowModel().rows.length} proizvoda
        </span>
        {isFiltered && (
          <span className="text-amber-600 font-medium">
            Filtri aktivni
          </span>
        )}
      </div>
    </div>
  );
}
