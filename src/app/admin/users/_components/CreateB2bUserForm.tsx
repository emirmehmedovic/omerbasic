'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createB2bUserFormSchema, type CreateB2bUserFormValues } from '@/lib/validations/admin';
import { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { User } from '@/generated/prisma/client';

type SafeUser = Omit<User, 'password'>;

interface CreateB2bUserFormProps {
  onSuccess: (newUser: SafeUser) => void;
  onCancel: () => void;
}

export function CreateB2bUserForm({ onSuccess, onCancel }: CreateB2bUserFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateB2bUserFormValues>({
    resolver: zodResolver(createB2bUserFormSchema),
    defaultValues: {
      discountPercentage: '0',
    },
  });

  const onSubmit = async (data: CreateB2bUserFormValues) => {
    setIsLoading(true);
    try {
      const apiPayload = {
        ...data,
        discountPercentage: parseFloat(data.discountPercentage || '0'),
      };
      const response = await axios.post('/api/admin/users', apiPayload);
      toast.success('B2B korisnik je uspješno kreiran.');
      onSuccess(response.data);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Došlo je do greške.';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="name">Puno ime</label>
          <input {...register('name')} id="name" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
          {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
        </div>
        <div>
          <label htmlFor="email">Email adresa</label>
          <input {...register('email')} id="email" type="email" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
          {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
        </div>
      </div>
      <div>
        <label htmlFor="password">Lozinka</label>
        <input {...register('password')} id="password" type="password" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
        {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="companyName">Naziv firme</label>
          <input {...register('companyName')} id="companyName" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
          {errors.companyName && <p className="text-sm text-red-500">{errors.companyName.message}</p>}
        </div>
        <div>
          <label htmlFor="taxId">Porezni broj / OIB</label>
          <input {...register('taxId')} id="taxId" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
          {errors.taxId && <p className="text-sm text-red-500">{errors.taxId.message}</p>}
        </div>
      </div>
      <div>
        <label htmlFor="discountPercentage">Popust (%)</label>
        <input {...register('discountPercentage')} id="discountPercentage" type="number" step="0.01" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
        {errors.discountPercentage && <p className="text-sm text-red-500">{errors.discountPercentage.message}</p>}
      </div>
      <div className="flex justify-end gap-4 pt-4">
        <button type="button" onClick={onCancel} className="rounded-md bg-gray-200 py-2 px-4 font-semibold text-gray-800 hover:bg-gray-300">
          Odustani
        </button>
        <button type="submit" disabled={isLoading} className="rounded-md bg-blue-600 py-2 px-4 font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50">
          {isLoading ? 'Kreiranje...' : 'Kreiraj korisnika'}
        </button>
      </div>
    </form>
  );
}
