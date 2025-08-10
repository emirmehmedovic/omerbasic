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
}


export function DataTableToolbar<TData>({ table, categories }: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;
  const [selectedCategoryId, setSelectedCategoryId] = React.useState('');

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        <Input
          placeholder="Pretraži po nazivu..."
          value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
          onChange={(event) => table.getColumn('name')?.setFilterValue(event.target.value)}
          className="h-10 w-[150px] lg:w-[250px] bg-white/80 backdrop-blur-sm"
        />
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
          }}
        />
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.resetColumnFilters()}
            className="h-10 px-2 lg:px-3"
          >
            Reset
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
      <div>
        <Button
          variant="outline"
          onClick={() => window.open('/api/products/export', '_blank')}
          className="h-10 px-2 lg:px-3 flex items-center"
        >
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>
    </div>
  );
}
