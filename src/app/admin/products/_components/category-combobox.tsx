'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, ChevronDown, ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { CategoryWithChildren } from '../page';

interface CategoryComboboxProps {
  categories: CategoryWithChildren[];
  value: string;
  onChange: (value: string) => void;
}

export function CategoryCombobox({ categories, value, onChange }: CategoryComboboxProps) {
  const [open, setOpen] = React.useState(false);

  const findCategoryName = (cats: CategoryWithChildren[], id: string): string | undefined => {
    for (const cat of cats) {
      if (cat.id === id) return cat.name;
      if (cat.children) {
        const found = findCategoryName(cat.children, id);
        if (found) return found;
      }
    }
  };

  const selectedCategoryName = value ? findCategoryName(categories, value) : 'Sve kategorije';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[250px] justify-between bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm h-11 text-gray-700 border-amber/30 hover:border-amber/50 focus:border-amber rounded-xl transition-all duration-200 shadow-sm"
        >
          {selectedCategoryName}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0 bg-white/95 backdrop-blur-sm border-gray-200 rounded-xl shadow-xl">
        <Command>
          <CommandInput placeholder="Pronađi kategoriju..." />
          <CommandList>
            <CommandEmpty>Nema rezultata.</CommandEmpty>
            <CommandGroup>
                <CommandItem
                    key="all-categories"
                    value="all-categories"
                    onSelect={() => {
                        onChange('');
                        setOpen(false);
                    }}
                >
                    <Check className={cn('mr-2 h-4 w-4', value === '' ? 'opacity-100' : 'opacity-0')} />
                    Sve kategorije
                </CommandItem>
                {categories.map((category) => (
                    <CategoryOption
                        key={category.id}
                        category={category}
                        currentValue={value}
                        onSelect={(id) => {
                            onChange(id);
                            setOpen(false);
                        }}
                        level={0}
                    />
                ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// Helper component for recursive rendering
function CategoryOption({ category, currentValue, onSelect, level }: {
    category: CategoryWithChildren;
    currentValue: string;
    onSelect: (value: string) => void;
    level: number;
}) {
    const [isOpen, setIsOpen] = React.useState(true); // Default to open for better UX in a combobox
    const hasChildren = category.children && category.children.length > 0;

    return (
        <>
            <CommandItem
                key={category.id}
                value={category.name} // Use name for searchability
                onSelect={() => onSelect(category.id)}
                style={{ paddingLeft: `${level * 1.5}rem` }}
                className="flex items-center w-full"
            >
                <div className="flex-grow flex items-center">
                    <Check className={cn('mr-2 h-4 w-4', currentValue === category.id ? 'opacity-100' : 'opacity-0')} />
                    <span className="flex-grow">{category.name}</span>
                </div>
                {hasChildren && (
                    <button
                        className="ml-auto p-1 hover:bg-gray-100 rounded-sm"
                        onClick={(e) => {
                            e.stopPropagation(); // Prevent CommandItem's onSelect
                            setIsOpen(!isOpen);
                        }}
                    >
                        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                )}
            </CommandItem>
            {isOpen && hasChildren && (
                category.children?.map(child => (
                    <CategoryOption
                        key={child.id}
                        category={child}
                        currentValue={currentValue}
                        onSelect={onSelect}
                        level={level + 1}
                    />
                ))
            )}
        </>
    );
}
