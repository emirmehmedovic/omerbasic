'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Category } from '@/generated/prisma/client';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import VehicleSelector from './vehicle-selector';
import { productFormSchema, productApiSchema } from '@/lib/validations/product';

type ProductFormValues = z.infer<typeof productFormSchema>;

interface NewProductFormProps {
  initialData?: {
    name: string;
    description: string | null;
    price: number | any; // any to handle Decimal type from Prisma
    categoryId: string;
    catalogNumber: string;
  };
  categories: Category[];
}

export const NewProductForm = ({ initialData, categories }: NewProductFormProps) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showVehicleSelector, setShowVehicleSelector] = useState(false);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: initialData ? {
      name: initialData.name,
      description: initialData.description ?? undefined,
      price: String(initialData.price),
      categoryId: initialData.categoryId,
      catalogNumber: initialData.catalogNumber,
      generationIds: [], // TODO: Učitati postojeće veze
    } : {
      name: '',
      description: undefined,
      price: '',
      categoryId: '',
      catalogNumber: '',
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

      // 1. Transformacija i validacija podataka za API
      const apiData = productApiSchema.parse({
        ...formData,
        price: parseFloat(formData.price),
      });

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

    } catch (error) {
      console.error('Greška prilikom slanja forme:', error);
      // TODO: Prikazati grešku korisniku (npr. toast notifikacija)
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Opis proizvoda</FormLabel>
                <FormControl>
                  <Textarea
                    disabled={loading}
                    placeholder="Unesite detaljan opis proizvoda (min. 10 znakova)"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {showVehicleSelector && (
          <div className='p-4 border-2 border-dashed rounded-lg mt-4'>
            <h3 className="text-lg font-medium mb-4">Poveži s vozilom</h3>
            <VehicleSelector onGenerationSelect={(id: string) => form.setValue('generationIds', [id])} />
          </div>
        )}

        <Button disabled={loading} className="ml-auto" type="submit">
          {initialData ? 'Spremi izmjene' : 'Kreiraj proizvod'}
        </Button>
      </form>
    </Form>
  );
};
