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
      <div className="relative bg-slate-900/70 backdrop-blur-xl rounded-2xl p-8 w-full max-w-md shadow-2xl border border-slate-800 animate-fade-in-up">
        <h2 className="text-2xl font-bold text-white mb-6">
          {initialData ? 'Uredi adresu' : 'Dodaj novu adresu'}
        </h2>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label htmlFor="street" className="block text-sm font-medium text-slate-300 mb-1">Ulica</label>
            <input 
              {...form.register('street')} 
              className="block w-full rounded-lg border-slate-700 bg-slate-800/60 shadow-sm px-4 py-2.5 text-white focus:border-sunfire-500 focus:ring-sunfire-500" 
            />
            {form.formState.errors.street && <p className="mt-2 text-sm text-red-500">{form.formState.errors.street.message}</p>}
          </div>
          <div>
            <label htmlFor="city" className="block text-sm font-medium text-slate-300 mb-1">Grad</label>
            <input 
              {...form.register('city')} 
              className="block w-full rounded-lg border-slate-700 bg-slate-800/60 shadow-sm px-4 py-2.5 text-white focus:border-sunfire-500 focus:ring-sunfire-500" 
            />
            {form.formState.errors.city && <p className="mt-2 text-sm text-red-500">{form.formState.errors.city.message}</p>}
          </div>
          <div>
            <label htmlFor="postalCode" className="block text-sm font-medium text-slate-300 mb-1">Poštanski broj</label>
            <input 
              {...form.register('postalCode')} 
              className="block w-full rounded-lg border-slate-700 bg-slate-800/60 shadow-sm px-4 py-2.5 text-white focus:border-sunfire-500 focus:ring-sunfire-500" 
            />
            {form.formState.errors.postalCode && <p className="mt-2 text-sm text-red-500">{form.formState.errors.postalCode.message}</p>}
          </div>
          <div>
            <label htmlFor="country" className="block text-sm font-medium text-slate-300 mb-1">Država</label>
            <input 
              {...form.register('country')} 
              className="block w-full rounded-lg border-slate-700 bg-slate-800/60 shadow-sm px-4 py-2.5 text-white focus:border-sunfire-500 focus:ring-sunfire-500" 
            />
            {form.formState.errors.country && <p className="mt-2 text-sm text-red-500">{form.formState.errors.country.message}</p>}
          </div>
          <div className="flex justify-end gap-4 pt-6">
            <button 
              type="button" 
              onClick={onClose} 
              disabled={isLoading} 
              className="rounded-lg bg-slate-700 py-2.5 px-5 text-sm font-medium text-slate-200 shadow-md hover:bg-slate-600 transition-all duration-200"
            >
              Odustani
            </button>
            <button 
              type="submit" 
              disabled={isLoading} 
              className="rounded-lg border border-transparent bg-sunfire-500 py-2.5 px-5 text-sm font-semibold text-white shadow-md hover:bg-sunfire-600 focus:outline-none focus:ring-2 focus:ring-sunfire-500 focus:ring-offset-2 dark:focus:ring-offset-slate-950 disabled:opacity-60 transition-all"
            >
              {isLoading ? 'Spremanje...' : 'Spremi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
