'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { resetPasswordSchema, type ResetPasswordFormValues } from '@/lib/validations/auth';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
      token: '',
    },
  });

  useEffect(() => {
    if (token) {
      setValue('token', token);
    } else {
      setError('Token za resetovanje lozinke nije pronađen. Molimo Vas da ponovo zatražite link.');
    }
  }, [token, setValue]);

  const onSubmit = async (data: ResetPasswordFormValues) => {
    setIsLoading(true);
    setError(null);
    try {
      await axios.post('/api/auth/reset-password', data);
      toast.success('Lozinka je uspješno promijenjena!');
      setIsSuccess(true);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Došlo je do greške. Molimo pokušajte ponovo.';
      toast.error(errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
      <h1 className="mb-6 text-center text-3xl font-bold text-gray-800">Postavite novu lozinku</h1>
      {isSuccess ? (
        <div className="text-center">
          <p className="text-gray-700">Vaša lozinka je uspješno promijenjena.</p>
          <Link href="/login" className="mt-4 inline-block font-medium text-blue-600 hover:text-blue-500">
            Nazad na prijavu
          </Link>
        </div>
      ) : error ? (
        <div className="text-center text-red-500">
          <p>{error}</p>
          <Link href="/forgot-password" className="mt-4 inline-block font-medium text-blue-600 hover:text-blue-500">
            Zatražite novi link
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <input {...register('token')} type="hidden" />
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Nova lozinka</label>
            <input {...register('password')} id="password" type="password" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
            {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password.message}</p>}
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Potvrdite novu lozinku</label>
            <input {...register('confirmPassword')} id="confirmPassword" type="password" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
            {errors.confirmPassword && <p className="mt-1 text-sm text-red-500">{errors.confirmPassword.message}</p>}
          </div>
          <button type="submit" disabled={isLoading || !token} className="w-full rounded-md bg-blue-600 py-3 px-4 text-lg font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50">
            {isLoading ? 'Spremanje...' : 'Spremi novu lozinku'}
          </button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-app">
      <Suspense fallback={<div>Učitavanje...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
