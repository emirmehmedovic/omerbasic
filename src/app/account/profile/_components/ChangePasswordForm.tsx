'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { changePasswordFormSchema, type ChangePasswordFormValues } from '@/lib/validations/account';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import axios from 'axios';

export const ChangePasswordForm = () => {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordFormSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: ChangePasswordFormValues) => {
    setIsLoading(true);
    try {
      await axios.patch('/api/account/change-password', data);
      toast.success('Lozinka je uspješno promijenjena!');
      form.reset();
    } catch (error: any) {
      const errorMessage = error.response?.data || 'Došlo je do greške.';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <h2 className="text-xl font-medium text-gray-800 mb-4 bg-clip-text bg-gradient-to-r from-gray-700 to-gray-900">Promjena lozinke</h2>
      <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-md space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Trenutna lozinka</label>
            <input 
              {...form.register('currentPassword')} 
              type="password" 
              className="mt-1 block w-full rounded-lg bg-white/50 border-0 px-4 py-2.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 backdrop-blur-sm focus:ring-2 focus:ring-inset focus:ring-indigo-400" 
            />
            {form.formState.errors.currentPassword && <p className="text-red-500 text-sm mt-1">{form.formState.errors.currentPassword.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Nova lozinka</label>
            <input 
              {...form.register('newPassword')} 
              type="password" 
              className="mt-1 block w-full rounded-lg bg-white/50 border-0 px-4 py-2.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 backdrop-blur-sm focus:ring-2 focus:ring-inset focus:ring-indigo-400" 
            />
            {form.formState.errors.newPassword && <p className="text-red-500 text-sm mt-1">{form.formState.errors.newPassword.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Potvrdi novu lozinku</label>
            <input 
              {...form.register('confirmPassword')} 
              type="password" 
              className="mt-1 block w-full rounded-lg bg-white/50 border-0 px-4 py-2.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 backdrop-blur-sm focus:ring-2 focus:ring-inset focus:ring-indigo-400" 
            />
            {form.formState.errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{form.formState.errors.confirmPassword.message}</p>}
          </div>
        </div>
        <button 
          type="submit" 
          disabled={isLoading} 
          className="rounded-lg bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 py-2.5 px-6 text-sm font-medium text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {isLoading ? 'Spremanje...' : 'Promijeni lozinku'}
        </button>
      </form>
    </>
  );
};
