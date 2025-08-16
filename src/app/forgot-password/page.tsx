'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema, type ForgotPasswordFormValues } from '@/lib/validations/auth';
import { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setIsLoading(true);
    try {
      await axios.post('/api/auth/forgot-password', data);
      setIsSubmitted(true);
    } catch (error: any) {
      console.error('Greška prilikom slanja zahtjeva:', error);
      toast.error('Došlo je do greške. Molimo pokušajte ponovo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-app">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
        <h1 className="mb-6 text-center text-3xl font-bold text-gray-800">Zaboravljena lozinka</h1>
        {isSubmitted ? (
          <div className="text-center">
            <p className="text-gray-700">Ako nalog sa unesenom email adresom postoji, poslan Vam je link za resetovanje lozinke. Molimo provjerite Vaš inbox (i spam folder).</p>
            <Link href="/login" className="mt-4 inline-block font-medium text-blue-600 hover:text-blue-500">
              Nazad na prijavu
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <p className="text-sm text-gray-600">Unesite Vašu email adresu i poslat ćemo Vam link za resetovanje lozinke.</p>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
              <input {...register('email')} id="email" type="email" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
              {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>}
            </div>
            <button type="submit" disabled={isLoading} className="w-full rounded-md bg-blue-600 py-3 px-4 text-lg font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50">
              {isLoading ? 'Slanje...' : 'Pošalji link za resetovanje'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
