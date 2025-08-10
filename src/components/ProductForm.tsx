'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { productFormSchema, productApiSchema } from '@/lib/validations/product';
import type { Category, Product } from '@/generated/prisma/client';
import { ProductFormData } from '@/types/product';
import { ImageUpload } from './ImageUpload';

interface ProductFormProps {
  initialData: ProductFormData | null;
  categories: Category[];
}

// Tipovi za formu se baziraju na shemi za formu (cijena je string)
type ProductFormValues = z.infer<typeof productFormSchema>;

export const ProductForm: React.FC<ProductFormProps> = ({ initialData, categories }) => {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    control,
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: initialData
      ? {
          ...initialData,
          description: initialData.description ?? '',
          imageUrl: initialData.imageUrl ?? '',
          price: String(initialData.price),
          // Izvlačimo dimenzije iz JSON polja ako postoje
          weight: String(initialData.weight ?? 
            (initialData.dimensions ? (initialData.dimensions as any)?.weight ?? '' : '')),
          width: String(initialData.width ?? 
            (initialData.dimensions ? (initialData.dimensions as any)?.width ?? '' : '')),
          height: String(initialData.height ?? 
            (initialData.dimensions ? (initialData.dimensions as any)?.height ?? '' : '')),
          length: String(initialData.length ?? 
            (initialData.dimensions ? (initialData.dimensions as any)?.length ?? '' : '')),
          unitOfMeasure: initialData.unitOfMeasure ?? 
            (initialData.technicalSpecs ? (initialData.technicalSpecs as any)?.unitOfMeasure ?? '' : ''),
          // Podaci o vozilu iz relacija ili tehničkih specifikacija
          vehicleBrand: initialData.vehicleBrand ?? 
            (initialData.technicalSpecs ? (initialData.technicalSpecs as any)?.vehicleBrand ?? '' : ''),
          vehicleModel: initialData.vehicleModel ?? 
            (initialData.technicalSpecs ? (initialData.technicalSpecs as any)?.vehicleModel ?? '' : ''),
          yearOfManufacture: String(initialData.yearOfManufacture ?? 
            (initialData.technicalSpecs ? (initialData.technicalSpecs as any)?.yearOfManufacture ?? '' : '')),
          engineType: initialData.engineType ?? 
            (initialData.technicalSpecs ? (initialData.technicalSpecs as any)?.engineType ?? '' : ''),
          catalogNumber: initialData.catalogNumber ?? '',
          oemNumber: initialData.oemNumber ?? '',
          stock: String(initialData.stock ?? 0),
        }
      : {
          name: '',
          description: '',
          price: '',
          imageUrl: '',
          categoryId: '',
          // Inicijalizacija novih atributa
          vehicleBrand: '',
          vehicleModel: '',
          yearOfManufacture: '',
          engineType: '',
          catalogNumber: '',
          oemNumber: '',
          weight: '',
          width: '',
          height: '',
          length: '',
          unitOfMeasure: '',
          stock: '0',
        },
  });

  const onSubmit = async (data: ProductFormValues) => {
    // Validacija i transformacija podataka sa API shemom prije slanja
    const parsedData = productApiSchema.safeParse(data);

    if (!parsedData.success) {
      toast.error('Podaci u formi nisu ispravni.');
      console.error(parsedData.error.flatten().fieldErrors);
      return;
    }

    // Pripremamo podatke za slanje na API
    const dimensions = {
      weight: parsedData.data.weight,
      width: parsedData.data.width,
      height: parsedData.data.height,
      length: parsedData.data.length
    };
    
    const technicalSpecs = {
      unitOfMeasure: parsedData.data.unitOfMeasure,
      vehicleBrand: parsedData.data.vehicleBrand,
      vehicleModel: parsedData.data.vehicleModel,
      yearOfManufacture: parsedData.data.yearOfManufacture,
      engineType: parsedData.data.engineType
    };
    
    // Uklanjamo polja koja ne postoje direktno na Product modelu
    const { 
      weight, width, height, length, unitOfMeasure,
      vehicleBrand, vehicleModel, yearOfManufacture, engineType,
      ...productData 
    } = parsedData.data;

    try {
      if (initialData) {
        // Šaljemo transformirane podatke (cijena je sada broj)
        await axios.patch(`/api/products/${initialData.id}`, { ...productData, dimensions, technicalSpecs });
        toast.success('Proizvod ažuriran.');
      } else {
        await axios.post('/api/products', { ...productData, dimensions, technicalSpecs });
        toast.success('Proizvod kreiran.');
      }
      router.push('/admin/products');
      router.refresh();
    } catch (error) {
      console.error('Greška:', error);
      toast.error('Došlo je do greške.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 bg-white p-8 rounded-lg shadow-md">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">Naziv</label>
          <input
            id="name"
            {...register('name')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="Unesite naziv proizvoda"
          />
          {errors.name && <p className="mt-2 text-sm text-red-600">{errors.name.message}</p>}
        </div>
        <div>
          <label htmlFor="price" className="block text-sm font-medium text-gray-700">Cijena (KM)</label>
          <input
            id="price"
            type="number"
            step="0.01"
            {...register('price')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="0.00"
          />
          {errors.price && <p className="mt-2 text-sm text-red-600">{errors.price.message}</p>}
        </div>
        <div>
          <label htmlFor="stock" className="block text-sm font-medium text-gray-700">Zalihe</label>
          <input
            id="stock"
            type="number"
            step="1"
            {...register('stock')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="0"
          />
          {errors.stock && <p className="mt-2 text-sm text-red-600">{errors.stock.message}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">Opis</label>
        <textarea
          id="description"
          {...register('description')}
          rows={4}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          placeholder="Unesite detaljan opis proizvoda"
        />
        {errors.description && <p className="mt-2 text-sm text-red-600">{errors.description.message}</p>}
      </div>

      <hr />

      <h3 className="text-lg font-medium leading-6 text-gray-900">Specifikacije</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <label htmlFor="catalogNumber" className="block text-sm font-medium text-gray-700">Kataloški broj</label>
            <input id="catalogNumber" {...register('catalogNumber')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
            {errors.catalogNumber && <p className="mt-2 text-sm text-red-600">{errors.catalogNumber.message}</p>}
          </div>
          <div>
            <label htmlFor="oemNumber" className="block text-sm font-medium text-gray-700">OEM broj</label>
            <input id="oemNumber" {...register('oemNumber')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
            {errors.oemNumber && <p className="mt-2 text-sm text-red-600">{errors.oemNumber.message}</p>}
          </div>
          <div>
            <label htmlFor="vehicleBrand" className="block text-sm font-medium text-gray-700">Marka vozila</label>
            <input id="vehicleBrand" {...register('vehicleBrand')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
            {errors.vehicleBrand && <p className="mt-2 text-sm text-red-600">{errors.vehicleBrand.message}</p>}
          </div>
          <div>
            <label htmlFor="vehicleModel" className="block text-sm font-medium text-gray-700">Model vozila</label>
            <input id="vehicleModel" {...register('vehicleModel')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
            {errors.vehicleModel && <p className="mt-2 text-sm text-red-600">{errors.vehicleModel.message}</p>}
          </div>
          <div>
            <label htmlFor="yearOfManufacture" className="block text-sm font-medium text-gray-700">Godište</label>
            <input id="yearOfManufacture" type="number" {...register('yearOfManufacture')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
            {errors.yearOfManufacture && <p className="mt-2 text-sm text-red-600">{errors.yearOfManufacture.message}</p>}
          </div>
           <div>
            <label htmlFor="engineType" className="block text-sm font-medium text-gray-700">Tip motora</label>
            <input id="engineType" {...register('engineType')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
            {errors.engineType && <p className="mt-2 text-sm text-red-600">{errors.engineType.message}</p>}
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          <div>
            <label htmlFor="weight" className="block text-sm font-medium text-gray-700">Težina (kg)</label>
            <input id="weight" type="number" step="0.01" {...register('weight')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
            {errors.weight && <p className="mt-2 text-sm text-red-600">{errors.weight.message}</p>}
          </div>
          <div>
            <label htmlFor="length" className="block text-sm font-medium text-gray-700">Dužina (cm)</label>
            <input id="length" type="number" step="0.01" {...register('length')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
            {errors.length && <p className="mt-2 text-sm text-red-600">{errors.length.message}</p>}
          </div>
           <div>
            <label htmlFor="width" className="block text-sm font-medium text-gray-700">Širina (cm)</label>
            <input id="width" type="number" step="0.01" {...register('width')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
            {errors.width && <p className="mt-2 text-sm text-red-600">{errors.width.message}</p>}
          </div>
          <div>
            <label htmlFor="height" className="block text-sm font-medium text-gray-700">Visina (cm)</label>
            <input id="height" type="number" step="0.01" {...register('height')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
            {errors.height && <p className="mt-2 text-sm text-red-600">{errors.height.message}</p>}
          </div>
          <div>
            <label htmlFor="unitOfMeasure" className="block text-sm font-medium text-gray-700">Jedinica mjere</label>
            <input id="unitOfMeasure" {...register('unitOfMeasure')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" placeholder="npr. kom, set, l"/>
            {errors.unitOfMeasure && <p className="mt-2 text-sm text-red-600">{errors.unitOfMeasure.message}</p>}
          </div>
      </div>

      <hr />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <label className="block text-sm font-medium text-gray-700">Slika proizvoda</label>
          <Controller
            name="imageUrl"
            control={control}
            render={({ field }) => (
              <ImageUpload
                value={field.value ?? ''}
                onChange={field.onChange}
                disabled={isSubmitting}
              />
            )}
          />
          {errors.imageUrl && <p className="mt-2 text-sm text-red-600">{errors.imageUrl.message}</p>}
        </div>
        <div>
          <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700">Kategorija</label>
          <select
            id="categoryId"
            {...register('categoryId')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="">Odaberi kategoriju</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {errors.categoryId && <p className="mt-2 text-sm text-red-600">{errors.categoryId.message}</p>}
        </div>
      </div>

      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={() => router.push('/admin/products')}
          className="inline-flex justify-center rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Odustani
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {isSubmitting ? 'Spremanje...' : (initialData ? 'Spremi promjene' : 'Kreiraj proizvod')}
        </button>
      </div>
    </form>
  );
};
