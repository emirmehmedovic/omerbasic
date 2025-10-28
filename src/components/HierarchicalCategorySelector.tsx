'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { ChevronsUpDown, Check, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Category } from '@/generated/prisma/client';

export type CategoryWithChildren = Category & {
  children?: CategoryWithChildren[];
};

interface HierarchicalCategorySelectorProps {
  categories: CategoryWithChildren[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function HierarchicalCategorySelector({
  categories,
  value,
  onValueChange,
  placeholder = "Odaberite kategoriju",
  disabled = false
}: HierarchicalCategorySelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const findCategoryName = (categoryId: string, cats: CategoryWithChildren[]): string => {
    for (const cat of cats) {
      if (cat.id === categoryId) {
        return cat.name;
      }
      if (cat.children) {
        const found = findCategoryName(categoryId, cat.children);
        if (found) return found;
      }
    }
    return '';
  };

  const selectedCategoryName = value ? findCategoryName(value, categories) : '';

  // Funkcija za filtriranje kategorija na osnovu search query
  const filterCategories = (cats: CategoryWithChildren[], query: string): CategoryWithChildren[] => {
    if (!query) return cats;
    
    return cats.filter(cat => {
      const matchesName = cat.name.toLowerCase().includes(query.toLowerCase());
      const hasMatchingChildren = cat.children && filterCategories(cat.children, query).length > 0;
      return matchesName || hasMatchingChildren;
    }).map(cat => ({
      ...cat,
      children: cat.children ? filterCategories(cat.children, query) : undefined
    }));
  };

  // Filtrirati samo top-level kategorije za početni prikaz
  const topLevelCategories = categories.filter(cat => !cat.parentId);
  const filteredCategories = filterCategories(topLevelCategories, searchQuery);

  const renderCategoryItem = (category: CategoryWithChildren, level: number = 0) => {
    const hasChildren = category.children && category.children.length > 0;
    
    return (
      <div key={category.id}>
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start text-left font-normal h-auto p-3",
            level > 0 && "ml-4",
            value === category.id && "bg-sunfire/10 text-sunfire-700"
          )}
          onClick={() => {
            onValueChange(category.id);
            setOpen(false);
            setSearchQuery(''); // Reset search when selecting
          }}
        >
          <div className="flex items-center justify-between w-full">
            <span className={cn(
              "truncate",
              level === 0 ? "font-medium" : "font-normal"
            )}>
              {category.name}
            </span>
            {value === category.id && (
              <Check className="h-4 w-4 ml-2 text-sunfire-600" />
            )}
          </div>
        </Button>
        {hasChildren && (
          <div className="border-l border-gray-200 ml-4">
            {category.children!.map(child => renderCategoryItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm h-11 text-gray-700 border-amber/30 hover:border-amber/50 focus:border-amber rounded-xl transition-all duration-200 shadow-sm"
          disabled={disabled}
        >
          {selectedCategoryName || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0 bg-white/95 backdrop-blur-sm border-gray-200 rounded-xl shadow-xl max-h-[400px] overflow-hidden">
        {/* Search Input */}
        <div className="p-3 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Pretraži kategorije..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200"
              style={{ 
                color: '#111827',
                '--tw-placeholder-opacity': '0.5'
              } as React.CSSProperties}
            />
          </div>
        </div>
        
        {/* Categories List */}
        <div className="max-h-[320px] overflow-y-auto">
          {filteredCategories.length > 0 ? (
            <div className="py-2">
              {filteredCategories.map(category => renderCategoryItem(category))}
            </div>
          ) : (
            <div className="py-8 text-center text-gray-500">
              <Search className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p>Nema pronađenih kategorija</p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
