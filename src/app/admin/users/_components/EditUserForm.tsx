'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateUserFormSchema, type UpdateUserFormValues } from '@/lib/validations/admin';
import { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { User } from '@/generated/prisma/client';

type SafeUser = Omit<User, 'password'>;

interface EditUserFormProps {
  user: SafeUser;
  onSuccess: (updatedUser: SafeUser) => void;
  onCancel: () => void;
}

export function EditUserForm({ user, onSuccess, onCancel }: EditUserFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateUserFormValues>({
    resolver: zodResolver(updateUserFormSchema),
    defaultValues: {
      name: user.name || '',
      email: user.email || '',
      companyName: user.companyName || '',
      taxId: user.taxId || '',
      discountPercentage: String(user.discountPercentage || '0'),
      password: '',
    },
  });

  const onSubmit = async (data: UpdateUserFormValues) => {
    setIsLoading(true);
    try {
      const apiPayload: any = {
        name: data.name,
        email: data.email,
        companyName: data.companyName,
        taxId: data.taxId,
        discountPercentage: parseFloat(data.discountPercentage || '0'),
      };

      if (data.password) {
        apiPayload.password = data.password;
      }

      const response = await axios.patch(`/api/admin/users/${user.id}`, apiPayload);
      toast.success('Korisnik je uspješno ažuriran.');
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
          <label htmlFor="name" className="text-gray-700 font-medium">Puno ime</label>
          <input {...register('name')} id="name" className="mt-1 block w-full bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500 px-4 py-2" />
          {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <label htmlFor="email" className="text-gray-700 font-medium">Email adresa</label>
          <input {...register('email')} id="email" type="email" className="mt-1 block w-full bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500 px-4 py-2" />
          {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>}
        </div>
      </div>
      <div>
        <label htmlFor="password" className="text-gray-700 font-medium">Nova lozinka (opcionalno)</label>
        <input {...register('password')} id="password" type="password" className="mt-1 block w-full bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500 px-4 py-2" placeholder="Ostavite prazno ako ne mijenjate" />
        {errors.password && <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="companyName" className="text-gray-700 font-medium">Naziv firme</label>
          <input {...register('companyName')} id="companyName" className="mt-1 block w-full bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500 px-4 py-2" />
          {errors.companyName && <p className="text-sm text-red-500 mt-1">{errors.companyName.message}</p>}
        </div>
        <div>
          <label htmlFor="taxId" className="text-gray-700 font-medium">Porezni broj / OIB</label>
          <input {...register('taxId')} id="taxId" className="mt-1 block w-full bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500 px-4 py-2" />
          {errors.taxId && <p className="text-sm text-red-500 mt-1">{errors.taxId.message}</p>}
        </div>
      </div>
      <div>
        <label htmlFor="discountPercentage" className="text-gray-700 font-medium">Popust (%)</label>
        <input {...register('discountPercentage')} id="discountPercentage" type="number" step="0.01" className="mt-1 block w-full bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500 px-4 py-2" />
        {errors.discountPercentage && <p className="text-sm text-red-500 mt-1">{errors.discountPercentage.message}</p>}
      </div>
      <div className="flex justify-end gap-4 pt-4">
        <button type="button" onClick={onCancel} className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm text-gray-700 hover:from-white hover:to-gray-50 border-amber/30 hover:border-amber/50 rounded-xl transition-all duration-200 shadow-sm px-4 py-2 font-semibold">
          Odustani
        </button>
        <button type="submit" disabled={isLoading} className="bg-gradient-to-r from-amber via-orange to-brown text-white hover:from-amber/90 hover:via-orange/90 hover:to-brown/90 shadow-lg hover:scale-105 transition-all duration-200 rounded-xl px-4 py-2 font-semibold disabled:opacity-50">
          {isLoading ? 'Spremanje...' : 'Spremi promjene'}
        </button>
      </div>
    </form>
  );
}
