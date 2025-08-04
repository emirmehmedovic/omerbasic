'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { useForm, Controller } from 'react-hook-form';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Category } from '@/generated/prisma/client';

// Extended Product type to include the fields we need for the form
type ExtendedProduct = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  stock: number;
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
};
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import VehicleSelector from './vehicle-selector';
import { ImageUpload } from './ImageUpload';
import { productFormSchema, productApiSchema } from '@/lib/validations/product';

type ProductFormValues = z.infer<typeof productFormSchema>;

interface UnifiedProductFormProps {
  initialData?: ExtendedProduct | null;
  categories: Category[];
}

export const UnifiedProductForm = ({ initialData, categories }: UnifiedProductFormProps) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showVehicleSelector, setShowVehicleSelector] = useState(false);

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
          generationIds: [], // TODO: Učitati postojeće veze
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
          generationIds: [],
        },
  });

  const selectedCategoryId = form.watch('categoryId');

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
    } else {
      setShowVehicleSelector(false);
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 bg-white p-8 rounded-lg shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Naziv proizvoda</FormLabel>
                <FormControl>
                  <Input disabled={loading} placeholder="Npr. Disk pločice ATE" {...field} />
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
                <FormLabel>Cijena (BAM)</FormLabel>
                <FormControl>
                  <Input type="number" disabled={loading} placeholder="38.90" {...field} />
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
                <FormLabel>Zalihe</FormLabel>
                <FormControl>
                  <Input type="number" disabled={loading} placeholder="0" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <FormField
            control={form.control}
            name="catalogNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Kataloški broj</FormLabel>
                <FormControl>
                  <Input disabled={loading} placeholder="Npr. PV-KOC-ATE001" {...field} />
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
                <FormLabel>OEM broj</FormLabel>
                <FormControl>
                  <Input disabled={loading} placeholder="Originalni broj proizvođača" {...field} />
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
              <FormLabel>Opis proizvoda</FormLabel>
              <FormControl>
                <Textarea
                  disabled={loading}
                  placeholder="Unesite detaljan opis proizvoda (min. 10 znakova)"
                  {...field}
                  rows={4}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <hr />
        <h3 className="text-lg font-medium leading-6 text-gray-900">Specifikacije</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          <FormField
            control={form.control}
            name="weight"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Težina (kg)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" disabled={loading} placeholder="0.00" {...field} />
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
                <FormLabel>Dužina (cm)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" disabled={loading} placeholder="0.00" {...field} />
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
                <FormLabel>Širina (cm)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" disabled={loading} placeholder="0.00" {...field} />
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
                <FormLabel>Visina (cm)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" disabled={loading} placeholder="0.00" {...field} />
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
                <FormLabel>Jedinica mjere</FormLabel>
                <FormControl>
                  <Input disabled={loading} placeholder="npr. kom, set, l" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <hr />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slika proizvoda</FormLabel>
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
          <div>
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kategorija</FormLabel>
                  <Select disabled={loading} onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue defaultValue={field.value} placeholder="Odaberite kategoriju" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-[300px] overflow-y-auto">
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {showVehicleSelector && (
          <div className='p-4 border-2 border-dashed rounded-lg mt-4'>
            <h3 className="text-lg font-medium mb-4">Poveži s vozilom</h3>
            <VehicleSelector onGenerationSelect={(id: string) => form.setValue('generationIds', [id])} />
          </div>
        )}

        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            onClick={() => router.push('/admin/products')}
            variant="outline"
            disabled={loading}
          >
            Odustani
          </Button>
          <Button disabled={loading} type="submit">
            {initialData ? 'Spremi izmjene' : 'Kreiraj proizvod'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default UnifiedProductForm;
