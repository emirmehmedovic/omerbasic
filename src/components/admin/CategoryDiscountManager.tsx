"use client";

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import axios from 'axios';
import { toast } from 'react-hot-toast';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Trash2 } from 'lucide-react';

// Schema za validaciju forme
const formSchema = z.object({
  categoryId: z.string().min(1, 'Kategorija je obavezna'),
  discountPercentage: z.coerce.number().min(0).max(100, 'Popust mora biti između 0 i 100%'),
});

type FormValues = z.infer<typeof formSchema>;

interface Category {
  id: string;
  name: string;
  level: number;
  parentId: string | null;
}

interface CategoryDiscount {
  id: string;
  userId: string;
  categoryId: string;
  discountPercentage: number;
  createdAt: string;
  updatedAt: string;
  category: {
    id: string;
    name: string;
    level: number;
    parentId: string | null;
  };
}

interface CategoryDiscountManagerProps {
  userId: string;
}

export function CategoryDiscountManager({ userId }: CategoryDiscountManagerProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [discounts, setDiscounts] = useState<CategoryDiscount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      categoryId: '',
      discountPercentage: 0,
    },
  });

  // Dohvat kategorija
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get('/api/categories');
        setCategories(response.data);
      } catch (error) {
        console.error('Greška pri dohvatu kategorija:', error);
        toast.error('Greška pri dohvatu kategorija');
      }
    };

    fetchCategories();
  }, []);

  // Dohvat popusta za korisnika
  useEffect(() => {
    const fetchDiscounts = async () => {
      setIsLoading(true);
      try {
        // Koristimo novu API rutu s query parametrom umjesto path parametra
        const response = await axios.get(`/api/category-discounts?userId=${userId}`);
        setDiscounts(response.data);
      } catch (error) {
        console.error('Greška pri dohvatu popusta:', error);
        toast.error('Greška pri dohvatu popusta');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDiscounts();
  }, [userId]);

  // Dodavanje novog popusta
  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    setIsSubmitting(true);
    try {
      // Provjeri postoji li već popust za ovu kategoriju
      const existingDiscount = discounts.find(d => d.categoryId === values.categoryId);
      if (existingDiscount) {
        toast.error('Popust za ovu kategoriju već postoji');
        setIsSubmitting(false);
        return;
      }

      // Koristimo novu API rutu i dodajemo userId u podatke
      const response = await axios.post('/api/category-discounts', {
        ...values,
        userId: userId
      });
      
      setDiscounts([...discounts, response.data]);
      toast.success('Popust uspješno dodan');
      form.reset();
    } catch (error) {
      console.error('Greška pri dodavanju popusta:', error);
      toast.error('Greška pri dodavanju popusta');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Organiziranje kategorija u hijerarhiju
  const organizeCategories = (cats: Category[]) => {
    const categoryMap = new Map<string, Category & { children: Category[] }>();
    const rootCategories: (Category & { children: Category[] })[] = [];

    // Prvo dodaj sve kategorije u map
    cats.forEach(cat => {
      categoryMap.set(cat.id, { ...cat, children: [] });
    });

    // Organiziraj u hijerarhiju
    cats.forEach(cat => {
      if (cat.parentId) {
        const parent = categoryMap.get(cat.parentId);
        if (parent) {
          parent.children.push(cat);
        }
      } else {
        rootCategories.push(categoryMap.get(cat.id)!);
      }
    });

    return rootCategories;
  };

  // Filtriranje kategorija po pretrazi
  const filteredCategories = categories.filter(cat => 
    cat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const hierarchicalCategories = organizeCategories(filteredCategories);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsSelectOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Calculate dropdown position
  const getDropdownPosition = () => {
    if (!selectRef.current) return {};
    
    const rect = selectRef.current.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    const dropdownHeight = 256; // max-h-64 = 256px
    
    let top = rect.bottom + 4;
    let left = rect.left;
    let width = rect.width;
    
    // Check if dropdown would go below viewport
    if (top + dropdownHeight > windowHeight) {
      top = rect.top - dropdownHeight - 4;
    }
    
    return {
      top: `${top}px`,
      left: `${left}px`,
      width: `${width}px`
    };
  };

  // Brisanje popusta
  const handleDelete = async (discountId: string) => {
    setIsDeleting(prev => ({ ...prev, [discountId]: true }));
    try {
      // Koristimo novu API rutu s query parametrom za userId
      await axios.delete(`/api/category-discounts/${discountId}?userId=${userId}`);
      setDiscounts(discounts.filter(d => d.id !== discountId));
      toast.success('Popust uspješno obrisan');
    } catch (error) {
      console.error('Greška pri brisanju popusta:', error);
      toast.error('Greška pri brisanju popusta');
    } finally {
      setIsDeleting(prev => ({ ...prev, [discountId]: false }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Forma za dodavanje novog popusta */}
      <div className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm rounded-2xl border border-amber/20 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-white/90 to-gray-50/90 border-b border-amber/20 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-sm rounded-lg border border-amber/30">
              <svg className="w-5 h-5 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Dodaj novi popust za kategoriju</h2>
              <p className="text-gray-600 mt-1">Dodajte specifični popust za određenu kategoriju proizvoda</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-4">
              <FormField
                control={form.control as any}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 font-medium">Kategorija</FormLabel>
                    <div className="relative" ref={selectRef}>
                                              <button
                          type="button"
                          onClick={() => setIsSelectOpen(!isSelectOpen)}
                          disabled={isSubmitting}
                          className="w-full bg-white border border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 px-4 py-2 text-left flex items-center justify-between hover:border-amber/50"
                        >
                        <span className={field.value ? 'text-gray-900' : 'text-gray-500'}>
                          {field.value ? categories.find(c => c.id === field.value)?.name : 'Odaberite kategoriju'}
                        </span>
                        <svg className={`w-4 h-4 text-gray-400 transition-transform ${isSelectOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      {isSelectOpen && createPortal(
                        <div className="fixed z-[9999] bg-white border border-amber/30 rounded-xl shadow-xl max-h-64 overflow-hidden" style={getDropdownPosition()}>
                          <div className="p-3 border-b border-amber/20">
                            <input
                              type="text"
                              placeholder="Pretražite kategorije..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                  setIsSelectOpen(false);
                                  setSearchTerm('');
                                }
                              }}
                              className="w-full bg-white border border-amber/30 focus:border-amber rounded-lg transition-all duration-200 text-gray-900 placeholder:text-gray-500 px-3 py-2 text-sm"
                              autoFocus
                            />
                          </div>
                          <div className="max-h-48 overflow-y-auto">
                            {hierarchicalCategories.length === 0 ? (
                              <div className="p-3 text-center text-gray-500 text-sm">
                                Nema pronađenih kategorija
                              </div>
                            ) : (
                              <div className="py-1">
                                {hierarchicalCategories.map((category) => (
                                  <div key={category.id}>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        field.onChange(category.id);
                                        setIsSelectOpen(false);
                                        setSearchTerm('');
                                      }}
                                      className="w-full px-4 py-2 text-left hover:bg-amber/10 transition-colors duration-200 flex items-center gap-2"
                                    >
                                      <svg className="w-4 h-4 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                      </svg>
                                      <span className="font-medium text-gray-900">{category.name}</span>
                                    </button>
                                    {category.children.length > 0 && (
                                      <div className="ml-6">
                                        {category.children.map((subcategory) => (
                                          <button
                                            key={subcategory.id}
                                            type="button"
                                            onClick={() => {
                                              field.onChange(subcategory.id);
                                              setIsSelectOpen(false);
                                              setSearchTerm('');
                                            }}
                                            className="w-full px-4 py-2 text-left hover:bg-amber/10 transition-colors duration-200 flex items-center gap-2 text-sm"
                                          >
                                            <svg className="w-3 h-3 text-amber/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                            <span className="text-gray-700">{subcategory.name}</span>
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>,
                        document.body
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control as any}
                name="discountPercentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 font-medium">Postotak popusta (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        disabled={isSubmitting}
                        className="bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500 px-4 py-2"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end pt-4">
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-amber via-orange to-brown text-white hover:from-amber/90 hover:via-orange/90 hover:to-brown/90 shadow-lg hover:scale-105 transition-all duration-200 rounded-xl px-4 py-2 font-semibold disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Dodaj popust
                </button>
              </div>
            </form>
          </Form>
        </div>
      </div>

      {/* Lista postojećih popusta */}
      <div className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm rounded-2xl border border-amber/20 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-white/90 to-gray-50/90 border-b border-amber/20 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-sm rounded-lg border border-amber/30">
              <svg className="w-5 h-5 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Postojeći popusti po kategorijama</h2>
              <p className="text-gray-600 mt-1">Pregled svih specifičnih popusta za ovog B2B korisnika</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="flex items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-amber" />
                <span className="text-gray-600">Učitavanje popusta...</span>
              </div>
            </div>
          ) : discounts.length === 0 ? (
            <div className="text-center py-8">
              <div className="flex flex-col items-center gap-3">
                <div className="p-3 bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-sm rounded-xl border border-amber/30">
                  <svg className="w-8 h-8 text-amber/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Nema definiranih popusta</h3>
                  <p className="text-gray-600 mt-1">Dodajte prvi popust za kategoriju da počnete</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {discounts.map((discount) => (
                <div
                  key={discount.id}
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-sm border border-amber/20 rounded-xl hover:border-amber/40 transition-all duration-200"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-gradient-to-r from-amber/20 to-orange/20 rounded-lg border border-amber/30">
                      <svg className="w-5 h-5 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {discount.category ? discount.category.name : 'Nepoznata kategorija'}
                      </p>
                      <p className="text-sm text-gray-600">
                        Popust: <span className="badge-discount rounded-full px-2 py-1 text-xs font-semibold">
                          {discount.discountPercentage}%
                        </span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(discount.id)}
                    disabled={isDeleting[discount.id]}
                    className="btn-delete p-2 rounded-lg transition-all duration-200"
                  >
                    {isDeleting[discount.id] ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
