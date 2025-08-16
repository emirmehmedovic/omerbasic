'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { changePasswordFormSchema, type ChangePasswordFormValues } from '@/lib/validations/account';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { Lock } from 'lucide-react';

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
      <h2 className="text-2xl font-bold text-white mb-6">Promjena lozinke</h2>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <div>
            <label htmlFor="currentPassword" className="block text-sm font-medium text-slate-300">Trenutna lozinka</label>
            <div className="relative mt-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <Lock className="h-5 w-5 text-slate-400" aria-hidden="true" />
              </span>
              <input {...form.register('currentPassword')} id="currentPassword" type="password" required className="block w-full rounded-lg border-slate-700 bg-slate-800/60 shadow-sm pl-10 pr-3 py-2.5 text-white focus:border-sunfire-500 focus:ring-sunfire-500" />
            </div>
            {form.formState.errors.currentPassword && <p className="mt-2 text-sm text-red-500">{form.formState.errors.currentPassword.message}</p>}
          </div>
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-slate-300">Nova lozinka</label>
            <div className="relative mt-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <Lock className="h-5 w-5 text-slate-400" aria-hidden="true" />
              </span>
              <input {...form.register('newPassword')} id="newPassword" type="password" required className="block w-full rounded-lg border-slate-700 bg-slate-800/60 shadow-sm pl-10 pr-3 py-2.5 text-white focus:border-sunfire-500 focus:ring-sunfire-500" />
            </div>
            {form.formState.errors.newPassword && <p className="mt-2 text-sm text-red-500">{form.formState.errors.newPassword.message}</p>}
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300">Potvrdi novu lozinku</label>
            <div className="relative mt-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <Lock className="h-5 w-5 text-slate-400" aria-hidden="true" />
              </span>
              <input {...form.register('confirmPassword')} id="confirmPassword" type="password" required className="block w-full rounded-lg border-slate-700 bg-slate-800/60 shadow-sm pl-10 pr-3 py-2.5 text-white focus:border-sunfire-500 focus:ring-sunfire-500" />
            </div>
            {form.formState.errors.confirmPassword && <p className="mt-2 text-sm text-red-500">{form.formState.errors.confirmPassword.message}</p>}
          </div>
        </div>
        <button 
          type="submit" 
          disabled={isLoading} 
          className="w-full rounded-lg border border-transparent bg-sunfire-500 py-2.5 px-6 text-sm font-semibold text-white shadow-md hover:bg-sunfire-600 focus:outline-none focus:ring-2 focus:ring-sunfire-500 focus:ring-offset-2 dark:focus:ring-offset-slate-950 disabled:opacity-60 transition-all"
        >
          {isLoading ? 'Spremanje...' : 'Promijeni lozinku'}
        </button>
      </form>
    </>
  );
};
