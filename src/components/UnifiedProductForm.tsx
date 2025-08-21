'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { useForm, Controller } from 'react-hook-form';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CategoryAttribute } from '@/lib/types/category-attributes';
import { Category } from '@/generated/prisma/client';
import type { CategoryWithChildren } from './HierarchicalCategorySelector';

// Extended Product type to include the fields we need for the form
type ExtendedProduct = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  stock: number;
  lowStockThreshold?: number | null;
  catalogNumber: string;
  oemNumber: string | null;
  isFeatured: boolean;
  isArchived: boolean;
  categoryId: string;
  createdAt: Date;
  updatedAt: Date;
  technicalSpecs: any | null;
  dimensions: any | null;
  standards: string[];
  // Additional fields for the form
  vehicleBrand?: string;
  vehicleModel?: string;
  yearOfManufacture?: number | null;
  engineType?: string;
  weight?: number | null;
  width?: number | null;
  height?: number | null;
  length?: number | null;
  unitOfMeasure?: string;
  generationIds?: string[];
  // Relacije
  vehicleFitments?: Array<{
    id: string;
    generationId: string;
    generation: {
      id: string;
      name: string;
      period?: string | null;
      model: {
        id: string;
        name: string;
        brand: {
          id: string;
          name: string;
        };
      };
    };
    engine?: {
      id: string;
    } | null;
  }>;
};
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MultiVehicleSelector from './multi-vehicle-selector';
import { ImageUpload } from './ImageUpload';
import { HierarchicalCategorySelector } from './HierarchicalCategorySelector';
import { productFormSchema, productApiSchema } from '@/lib/validations/product';

type ProductFormValues = z.infer<typeof productFormSchema>;

interface UnifiedProductFormProps {
  initialData?: ExtendedProduct | null;
  categories: CategoryWithChildren[];
}

export const UnifiedProductForm = ({ initialData, categories }: UnifiedProductFormProps) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showVehicleSelector, setShowVehicleSelector] = useState(false);
  const [categoryAttributes, setCategoryAttributes] = useState<CategoryAttribute[]>([]);
  const [loadingAttributes, setLoadingAttributes] = useState(false);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: initialData
      ? {
          name: initialData.name,
          description: initialData.description ?? '',
          price: String(initialData.price),
          categoryId: initialData.categoryId,
          catalogNumber: initialData.catalogNumber ?? '',
          imageUrl: initialData.imageUrl ?? '',
          oemNumber: initialData.oemNumber ?? '',
          vehicleBrand: initialData.vehicleBrand ?? '',
          vehicleModel: initialData.vehicleModel ?? '',
          yearOfManufacture: initialData.yearOfManufacture ? String(initialData.yearOfManufacture) : '',
          engineType: initialData.engineType ?? '',
          weight: initialData.weight ? String(initialData.weight) : '',
          width: initialData.width ? String(initialData.width) : '',
          height: initialData.height ? String(initialData.height) : '',
          length: initialData.length ? String(initialData.length) : '',
          unitOfMeasure: initialData.unitOfMeasure ?? '',
          stock: initialData.stock ? String(initialData.stock) : '0',
          lowStockThreshold: initialData.lowStockThreshold != null ? String(initialData.lowStockThreshold) : '',
          generationIds: initialData.vehicleFitments?.map(f => f.engine?.id ? `${f.generationId}::${f.engine.id}` : f.generationId) || [],
          categoryAttributes: {}, // Dinamički atributi kategorije
        }
      : {
          name: '',
          description: '',
          price: '',
          categoryId: '',
          catalogNumber: '',
          imageUrl: '',
          oemNumber: '',
          vehicleBrand: '',
          vehicleModel: '',
          yearOfManufacture: '',
          engineType: '',
          weight: '',
          width: '',
          height: '',
          length: '',
          unitOfMeasure: '',
          stock: '0',
          lowStockThreshold: '',
          generationIds: [],
          categoryAttributes: {}, // Dinamički atributi kategorije
        },
  });

  const selectedCategoryId = form.watch('categoryId');

  // Explicitno registrujemo polje generationIds kako bi ušlo u payload i kada nije renderovano
  useEffect(() => {
    form.register('generationIds');
  }, [form]);

  // Funkcija za dohvaćanje atributa kategorije
  const fetchCategoryAttributes = async (categoryId: string) => {
    if (!categoryId) return;
    
    try {
      setLoadingAttributes(true);
      const response = await fetch(`/api/categories/${categoryId}/attributes`);
      
      if (!response.ok) {
        throw new Error('Greška prilikom dohvaćanja atributa kategorije');
      }
      
      const data = await response.json();
      setCategoryAttributes(data);
    } catch (error) {
      console.error('Greška prilikom dohvaćanja atributa kategorije:', error);
      toast.error('Nije moguće dohvatiti atribute kategorije.');
      setCategoryAttributes([]);
    } finally {
      setLoadingAttributes(false);
    }
  };

  useEffect(() => {
    if (selectedCategoryId) {
      // Pronalazimo puno stablo kategorije da vidimo je li dio vozila
      const findParent = (catId: string): Category | null => {
        const cat = categories.find(c => c.id === catId);
        if (!cat) return null;
        if (!cat.parentId) return cat; // Ovo je glavna kategorija
        return findParent(cat.parentId);
      };
      
      const parentCategory = findParent(selectedCategoryId);
      const vehicleCategoryNames = ['Putnička vozila', 'Teretna vozila'];



      if (parentCategory && vehicleCategoryNames.includes(parentCategory.name)) {
        setShowVehicleSelector(true);
      } else {
        setShowVehicleSelector(false);
      }
      
      // Dohvaćamo atribute za odabranu kategoriju
      fetchCategoryAttributes(selectedCategoryId);
    } else {
      setShowVehicleSelector(false);
      setCategoryAttributes([]);
    }
  }, [selectedCategoryId, categories]);

  const onSubmit = async (formData: ProductFormValues) => {
    try {
      setLoading(true);

      // Transformacija i validacija podataka za API
      const apiData = productApiSchema.parse({
        ...formData,
        price: parseFloat(formData.price),
      });

      // Debug: provjera da li saljemo generationIds
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.log('[UnifiedProductForm] generationIds to send:', apiData.generationIds);
      }

      if (initialData) {
        // Ažuriranje postojećeg proizvoda
        await toast.promise(
          fetch(`/api/products/${initialData.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(apiData),
          }).then(res => {
            if (!res.ok) {
              throw new Error('Ažuriranje proizvoda nije uspjelo');
            }
            return res.json();
          }),
          {
            loading: 'Ažuriranje proizvoda...',
            success: () => {
              router.refresh();
              router.push('/admin/products');
              return 'Proizvod uspješno ažuriran!';
            },
            error: 'Došlo je do greške.',
          }
        );
      } else {
        // Kreiranje novog proizvoda
        await toast.promise(
          fetch('/api/products', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(apiData),
          }).then(res => {
            if (!res.ok) {
              throw new Error('Slanje podataka nije uspjelo');
            }
            return res.json();
          }),
          {
            loading: 'Spremanje proizvoda...',
            success: () => {
              router.refresh();
              router.push('/admin/products');
              return 'Proizvod uspješno kreiran!';
            },
            error: 'Došlo je do greške.',
          }
        );
      }
    } catch (error) {
      console.error('Greška prilikom slanja forme:', error);
      toast.error('Došlo je do greške prilikom spremanja proizvoda.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Kategorija - prva stavka */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <svg className="w-5 h-5 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            Kategorija proizvoda
          </h3>
          <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700 font-medium">Odaberite kategoriju</FormLabel>
                <FormControl>
                  <HierarchicalCategorySelector
                    categories={categories}
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder="Odaberite kategoriju proizvoda"
                    disabled={loading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <hr className="border-gray-200" />

        {/* Osnovne informacije */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <svg className="w-5 h-5 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            Osnovne informacije
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700 font-medium">Naziv proizvoda</FormLabel>
                  <FormControl>
                    <Input 
                      disabled={loading} 
                      placeholder="Npr. Disk pločice ATE" 
                      className="bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700 font-medium">Cijena (BAM)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      disabled={loading} 
                      placeholder="38.90" 
                      className="bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="stock"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700 font-medium">Zalihe</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      disabled={loading} 
                      placeholder="0" 
                      className="bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="catalogNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700 font-medium">Kataloški broj</FormLabel>
                <FormControl>
                  <Input 
                    disabled={loading} 
                    placeholder="Npr. PV-KOC-ATE001" 
                    className="bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="oemNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700 font-medium">OEM broj</FormLabel>
                <FormControl>
                  <Input 
                    disabled={loading} 
                    placeholder="Originalni broj proizvođača" 
                    className="bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-700 font-medium">Opis proizvoda</FormLabel>
              <FormControl>
                <Textarea
                  disabled={loading}
                  placeholder="Unesite detaljan opis proizvoda (min. 10 znakova)"
                  className="bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 resize-none text-gray-900 placeholder:text-gray-500"
                  {...field}
                  rows={4}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <hr className="border-gray-200" />
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <svg className="w-5 h-5 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Specifikacije proizvoda
          </h3>

        {/* Dinamički atributi kategorije */}
        {categoryAttributes.length > 0 && (
          <div className="space-y-4">
            <h4 className="text-md font-semibold text-gray-800 flex items-center gap-2">
              <svg className="w-4 h-4 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              Atributi kategorije
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {categoryAttributes.map((attribute) => (
                <div key={attribute.id} className="bg-gradient-to-r from-white/90 to-gray-50/90 backdrop-blur-sm border border-amber/20 rounded-xl p-4 shadow-sm">
                  <h5 className="font-medium mb-2 text-gray-800">{attribute.label}</h5>
                  <p className="text-sm text-gray-600 mb-3">
                    {attribute.isRequired ? (
                      <span className="text-red-500 font-medium">Obavezno</span>
                    ) : (
                      <span className="text-gray-500">Opcionalno</span>
                    )}
                    {attribute.unit && ` (${attribute.unit})`}
                  </p>
                  
                  {/* Različiti tipovi inputa ovisno o tipu atributa */}
                  <Controller
                    name={`categoryAttributes.${attribute.name}`}
                    control={form.control}
                    render={({ field }) => {
                      // Koristimo React.Fragment kao fallback umjesto null
                      let inputElement = <></>;
                      
                      if (attribute.type === "string") {
                        inputElement = (
                          <Input 
                            placeholder={`Unesite ${attribute.label.toLowerCase()}`} 
                            className="w-full bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500"
                            {...field}
                            value={field.value || ''}
                          />
                        );
                      } else if (attribute.type === "number") {
                        inputElement = (
                          <Input 
                            type="number" 
                            placeholder={`Unesite ${attribute.label.toLowerCase()}`} 
                            className="w-full bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm border-amber/30 focus:border-amber rounded-xl transition-all duration-200"
                            {...field}
                            value={field.value || ''}
                          />
                        );
                      } else if (attribute.type === "boolean") {
                        inputElement = (
                          <div className="flex items-center">
                            <input 
                              type="checkbox" 
                              id={`attr-${attribute.id}`} 
                              className="mr-2 h-4 w-4"
                              checked={field.value === 'true'}
                              onChange={(e) => field.onChange(e.target.checked ? 'true' : 'false')}
                            />
                            <label htmlFor={`attr-${attribute.id}`}>Da</label>
                          </div>
                        );
                      } else if (attribute.type === "enum" && attribute.options) {
                        inputElement = (
                          <Select 
                            onValueChange={field.onChange}
                            value={field.value || ''}
                          >
                            <SelectTrigger className="bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900">
                              <SelectValue placeholder={`Odaberite ${attribute.label.toLowerCase()}`} />
                            </SelectTrigger>
                            <SelectContent className="bg-white/95 backdrop-blur-sm border-gray-200 rounded-xl shadow-xl">
                              {attribute.options.map((option, index) => (
                                <SelectItem key={index} value={option} className="text-gray-700 hover:bg-gray-100">
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        );
                      }
                      
                      return inputElement;
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Standardne specifikacije */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <FormField
            control={form.control}
            name="weight"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700 font-medium">Težina (kg)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01" 
                    disabled={loading} 
                    placeholder="0.00" 
                    className="bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="length"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700 font-medium">Dužina (cm)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01" 
                    disabled={loading} 
                    placeholder="0.00" 
                    className="bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="width"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700 font-medium">Širina (cm)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01" 
                    disabled={loading} 
                    placeholder="0.00" 
                    className="bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="height"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700 font-medium">Visina (cm)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01" 
                    disabled={loading} 
                    placeholder="0.00" 
                    className="bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="unitOfMeasure"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700 font-medium">Jedinica mjere</FormLabel>
                <FormControl>
                  <Input 
                    disabled={loading} 
                    placeholder="npr. kom, set, l" 
                    className="bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        </div>

        <hr className="border-gray-200" />

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <svg className="w-5 h-5 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Slika proizvoda
          </h3>
          <FormField
            control={form.control}
            name="imageUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700 font-medium">Dodaj sliku proizvoda</FormLabel>
                <FormControl>
                  <ImageUpload
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    disabled={loading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {showVehicleSelector && (
          <div className='bg-gradient-to-r from-amber/5 to-orange/5 backdrop-blur-sm border-2 border-dashed border-amber/30 rounded-xl p-6 mt-4'>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Poveži s vozilima
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Odaberite sva vozila s kojima je ovaj proizvod kompatibilan. Možete dodati više vozila.
            </p>
            <MultiVehicleSelector 
              onGenerationsChange={(ids: string[]) => form.setValue('generationIds', ids, { shouldDirty: true, shouldTouch: true })}
              initialGenerationIds={initialData?.vehicleFitments?.map(fit => fit.engine?.id ? `${fit.generationId}::${fit.engine.id}` : fit.generationId) || []}
            />
          </div>
        )}

        <div className="flex justify-end space-x-4 pt-6">
          <Button
            type="button"
            onClick={() => router.push('/admin/products')}
            variant="outline"
            disabled={loading}
            className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm text-gray-700 hover:from-white hover:to-gray-50 border-amber/30 hover:border-amber/50 rounded-xl transition-all duration-200 shadow-sm"
          >
            Odustani
          </Button>
          <Button 
            disabled={loading} 
            type="submit"
            className="bg-gradient-to-r from-amber via-orange to-brown text-white hover:from-amber/90 hover:via-orange/90 hover:to-brown/90 shadow-lg hover:scale-105 transition-all duration-200"
          >
            {initialData ? 'Spremi izmjene' : 'Kreiraj proizvod'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default UnifiedProductForm;
