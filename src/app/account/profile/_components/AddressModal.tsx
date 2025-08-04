'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { addressFormSchema, type AddressFormValues } from '@/lib/validations/account';
import type { Address } from '@/generated/prisma/client';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { useRouter } from 'next/navigation';

interface AddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Address | null;
}

export const AddressModal = ({ isOpen, onClose, initialData }: AddressModalProps) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<AddressFormValues>({
    resolver: zodResolver(addressFormSchema),
    defaultValues: initialData || {
      street: '',
      city: '',
      postalCode: '',
      country: '',
    },
  });

  const onSubmit = async (data: AddressFormValues) => {
    setIsLoading(true);
    try {
      if (initialData) {
        await axios.patch(`/api/account/addresses/${initialData.id}`, data);
        toast.success('Adresa je uspješno ažurirana!');
      } else {
        await axios.post('/api/account/addresses', data);
        toast.success('Adresa je uspješno dodana!');
      }
      router.refresh();
      onClose();
    } catch (error) {
      toast.error('Došlo je do greške.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-center items-center">
      <div className="bg-white/90 backdrop-blur-md rounded-xl p-8 w-full max-w-md shadow-2xl border border-white/20 animate-fade-in-up">
        <h2 className="text-xl font-semibold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
          {initialData ? 'Uredi adresu' : 'Dodaj novu adresu'}
        </h2>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ulica</label>
            <input 
              {...form.register('street')} 
              className="block w-full rounded-lg bg-white/50 border-0 px-4 py-2.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 backdrop-blur-sm focus:ring-2 focus:ring-inset focus:ring-indigo-400" 
            />
            {form.formState.errors.street && <p className="text-red-500 text-sm mt-1">{form.formState.errors.street.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Grad</label>
            <input 
              {...form.register('city')} 
              className="block w-full rounded-lg bg-white/50 border-0 px-4 py-2.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 backdrop-blur-sm focus:ring-2 focus:ring-inset focus:ring-indigo-400" 
            />
            {form.formState.errors.city && <p className="text-red-500 text-sm mt-1">{form.formState.errors.city.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Poštanski broj</label>
            <input 
              {...form.register('postalCode')} 
              className="block w-full rounded-lg bg-white/50 border-0 px-4 py-2.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 backdrop-blur-sm focus:ring-2 focus:ring-inset focus:ring-indigo-400" 
            />
            {form.formState.errors.postalCode && <p className="text-red-500 text-sm mt-1">{form.formState.errors.postalCode.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Država</label>
            <input 
              {...form.register('country')} 
              className="block w-full rounded-lg bg-white/50 border-0 px-4 py-2.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 backdrop-blur-sm focus:ring-2 focus:ring-inset focus:ring-indigo-400" 
            />
            {form.formState.errors.country && <p className="text-red-500 text-sm mt-1">{form.formState.errors.country.message}</p>}
          </div>
          <div className="flex justify-end gap-4 pt-6">
            <button 
              type="button" 
              onClick={onClose} 
              disabled={isLoading} 
              className="rounded-lg bg-gray-200 py-2.5 px-5 text-sm font-medium text-gray-800 shadow-md hover:bg-gray-300 transition-all duration-200"
            >
              Odustani
            </button>
            <button 
              type="submit" 
              disabled={isLoading} 
              className="rounded-lg bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 py-2.5 px-5 text-sm font-medium text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isLoading ? 'Spremanje...' : 'Spremi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
