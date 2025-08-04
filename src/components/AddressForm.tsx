'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { addressSchema, type AddressFormValues } from '@/lib/validations/address';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { type Address } from '@/generated/prisma/client';

interface AddressFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: Address | null;
}

export function AddressForm({ onSuccess, onCancel, initialData }: AddressFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: initialData || {
      street: '',
      city: '',
      postalCode: '',
      country: '',
      isDefaultShipping: false,
      isDefaultBilling: false,
    },
  });

  useEffect(() => {
    if (initialData) {
      reset(initialData);
    }
  }, [initialData, reset]);

  const onSubmit = async (data: AddressFormValues) => {
    setIsLoading(true);
    try {
      if (initialData) {
        // Ažuriranje postojeće adrese
        await axios.patch(`/api/user/addresses/${initialData.id}`, data);
        toast.success('Adresa je uspješno ažurirana.');
      } else {
        // Kreiranje nove adrese
        await axios.post('/api/user/addresses', data);
        toast.success('Adresa je uspješno dodana.');
      }
      onSuccess();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Došlo je do greške.';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="street">Ulica i broj</label>
        <input {...register('street')} id="street" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
        {errors.street && <p className="text-sm text-red-500">{errors.street.message}</p>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="city">Grad</label>
          <input {...register('city')} id="city" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
          {errors.city && <p className="text-sm text-red-500">{errors.city.message}</p>}
        </div>
        <div>
          <label htmlFor="postalCode">Poštanski broj</label>
          <input {...register('postalCode')} id="postalCode" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
          {errors.postalCode && <p className="text-sm text-red-500">{errors.postalCode.message}</p>}
        </div>
      </div>
      <div>
        <label htmlFor="country">Država</label>
        <input {...register('country')} id="country" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
        {errors.country && <p className="text-sm text-red-500">{errors.country.message}</p>}
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center">
          <input {...register('isDefaultShipping')} id="isDefaultShipping" type="checkbox" className="h-4 w-4 rounded border-gray-300 text-blue-600" />
          <label htmlFor="isDefaultShipping" className="ml-2 block text-sm text-gray-900">Zadana adresa za dostavu</label>
        </div>
        <div className="flex items-center">
          <input {...register('isDefaultBilling')} id="isDefaultBilling" type="checkbox" className="h-4 w-4 rounded border-gray-300 text-blue-600" />
          <label htmlFor="isDefaultBilling" className="ml-2 block text-sm text-gray-900">Zadana adresa za naplatu</label>
        </div>
      </div>
      <div className="flex justify-end gap-4 pt-4">
        <button type="button" onClick={onCancel} className="rounded-md bg-gray-200 py-2 px-4 font-semibold text-gray-800 hover:bg-gray-300">
          Odustani
        </button>
        <button type="submit" disabled={isLoading} className="rounded-md bg-blue-600 py-2 px-4 font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50">
          {isLoading ? 'Spremanje...' : 'Spremi adresu'}
        </button>
      </div>
    </form>
  );
}
