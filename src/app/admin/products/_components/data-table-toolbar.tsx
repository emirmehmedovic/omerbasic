"use client";

import { Table } from '@tanstack/react-table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import React from 'react';

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
import { X, Download } from 'lucide-react';
import { CategoryCombobox } from './category-combobox';
import type { CategoryWithChildren } from '../page';

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  categories: CategoryWithChildren[];
  onSearch?: (q: string) => void;
  onCategoryChange?: (categoryId: string) => void;
}


export function DataTableToolbar<TData>({ table, categories, onSearch, onCategoryChange }: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;
  const [selectedCategoryId, setSelectedCategoryId] = React.useState('');
  const [search, setSearch] = React.useState('');

  // debounce search -> 300ms
  React.useEffect(() => {
    const id = setTimeout(() => {
      const q = search.trim();
      // update table filter for UI consistency
      table.getColumn('name')?.setFilterValue(q);
      // server-driven callback
      if (onSearch) onSearch(q);
    }, 300);
    return () => clearTimeout(id);
  }, [search]);

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
              onClick={() => table.resetColumnFilters()}
              className="h-11 px-4 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all duration-200"
            >
              <X className="mr-2 h-4 w-4" />
              Reset
            </Button>
          )}
        </div>
        
        {/* Export Button */}
        <Button
          variant="outline"
          onClick={() => window.open('/api/products/export', '_blank')}
          className="h-11 px-6 flex items-center bg-gradient-to-r from-white/90 to-gray-50/90 backdrop-blur-sm text-gray-700 hover:from-white hover:to-gray-50 border-amber/30 hover:border-amber/50 rounded-xl transition-all duration-200 shadow-sm"
        >
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
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
