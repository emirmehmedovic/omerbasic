'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { changePasswordSchema, type ChangePasswordFormValues } from '@/lib/validations/auth';
import { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

export function ChangePasswordForm() {
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    },
  });

  const onSubmit = async (data: ChangePasswordFormValues) => {
    setIsLoading(true);
    try {
      const response = await axios.post('/api/user/change-password', data);
      toast.success(response.data.message || 'Lozinka je uspješno promijenjena!');
      reset(); // Resetuj formu nakon uspjeha
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Došlo je do greške. Molimo pokušajte ponovo.';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-2xl font-semibold">Promjena lozinke</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">Trenutna lozinka</label>
          <input {...register('currentPassword')} id="currentPassword" type="password" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
          {errors.currentPassword && <p className="mt-1 text-sm text-red-500">{errors.currentPassword.message}</p>}
        </div>
        <div>
          <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">Nova lozinka</label>
          <input {...register('newPassword')} id="newPassword" type="password" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
          {errors.newPassword && <p className="mt-1 text-sm text-red-500">{errors.newPassword.message}</p>}
        </div>
        <div>
          <label htmlFor="confirmNewPassword" className="block text-sm font-medium text-gray-700">Potvrdite novu lozinku</label>
          <input {...register('confirmNewPassword')} id="confirmNewPassword" type="password" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
          {errors.confirmNewPassword && <p className="mt-1 text-sm text-red-500">{errors.confirmNewPassword.message}</p>}
        </div>
        <div className="flex justify-end">
          <button type="submit" disabled={isLoading} className="rounded-md bg-blue-600 py-2 px-4 font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50">
            {isLoading ? 'Spremanje...' : 'Spremi promjene'}
          </button>
        </div>
      </form>
    </div>
  );
}
