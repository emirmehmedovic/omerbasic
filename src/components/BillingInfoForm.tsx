'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { billingInfoSchema, type BillingInfoFormValues } from '@/lib/validations/billing';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useSession } from 'next-auth/react';

export function BillingInfoForm() {
  const { data: session, update } = useSession();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BillingInfoFormValues>({
    resolver: zodResolver(billingInfoSchema),
  });

  useEffect(() => {
    if (session?.user) {
      reset({
        companyName: session.user.companyName || '',
        taxId: session.user.taxId || '',
      });
    }
  }, [session, reset]);

  const onSubmit = async (data: BillingInfoFormValues) => {
    setIsLoading(true);
    try {
      await axios.patch('/api/user/billing-info', data);
      toast.success('Podaci su uspješno ažurirani.');
      // Ažuriraj sesiju da prikaže nove podatke bez potrebe za ponovnim prijavljivanjem
      await update({
        ...session,
        user: {
          ...session?.user,
          companyName: data.companyName,
          taxId: data.taxId,
        },
      });
    } catch (error: any) {
      toast.error('Došlo je do greške.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-2xl font-semibold">Podaci za fakturisanje (opcionalno)</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">Naziv firme</label>
          <input {...register('companyName')} id="companyName" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
          {errors.companyName && <p className="mt-1 text-sm text-red-500">{errors.companyName.message}</p>}
        </div>
        <div>
          <label htmlFor="taxId" className="block text-sm font-medium text-gray-700">Porezni broj / OIB</label>
          <input {...register('taxId')} id="taxId" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
          {errors.taxId && <p className="mt-1 text-sm text-red-500">{errors.taxId.message}</p>}
        </div>
        <div className="flex justify-end">
          <button type="submit" disabled={isLoading} className="rounded-md bg-blue-600 py-2 px-4 font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50">
            {isLoading ? 'Spremanje...' : 'Spremi podatke'}
          </button>
        </div>
      </form>
    </div>
  );
}
