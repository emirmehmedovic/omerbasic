'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createAdminUserFormSchema, type CreateAdminUserFormValues } from '@/lib/validations/admin';
import { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { User } from '@/generated/prisma/client';

type SafeUser = Omit<User, 'password'>;

interface CreateAdminUserFormProps {
  onSuccess: (newUser: SafeUser) => void;
  onCancel: () => void;
}

export function CreateAdminUserForm({ onSuccess, onCancel }: CreateAdminUserFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateAdminUserFormValues>({
    resolver: zodResolver(createAdminUserFormSchema),
  });

  const onSubmit = async (data: CreateAdminUserFormValues) => {
    setIsLoading(true);
    try {
      const response = await axios.post('/api/admin/users/admin', data);
      toast.success('Admin korisnik je uspješno kreiran.');
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
        <div className="md:col-span-2">
          <label htmlFor="name" className="text-gray-700 font-medium">Puno ime</label>
          <input {...register('name')} id="name" className="mt-1 block w-full bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500 px-4 py-2" />
          {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <label htmlFor="email" className="text-gray-700 font-medium">Email adresa</label>
          <input {...register('email')} id="email" type="email" className="mt-1 block w-full bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500 px-4 py-2" />
          {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>}
        </div>
        <div>
          <label htmlFor="password" className="text-gray-700 font-medium">Lozinka</label>
          <input {...register('password')} id="password" type="password" className="mt-1 block w-full bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500 px-4 py-2" />
          {errors.password && <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>}
        </div>
      </div>
      <div className="flex justify-end gap-4 pt-4">
        <button type="button" onClick={onCancel} className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm text-gray-700 hover:from-white hover:to-gray-50 border-amber/30 hover:border-amber/50 rounded-xl transition-all duration-200 shadow-sm px-4 py-2 font-semibold">
          Odustani
        </button>
        <button type="submit" disabled={isLoading} className="bg-gradient-to-r from-amber via-orange to-brown text-white hover:from-amber/90 hover:via-orange/90 hover:to-brown/90 shadow-lg hover:scale-105 transition-all duration-200 rounded-xl px-4 py-2 font-semibold disabled:opacity-50">
          {isLoading ? 'Kreiranje...' : 'Kreiraj admina'}
        </button>
      </div>
    </form>
  );
}
