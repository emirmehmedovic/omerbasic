'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginFormValues } from '@/lib/validations/auth';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/admin/products';
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    try {
      const result = await signIn('credentials', {
        ...data,
        redirect: false,
      });

      if (result?.error) {
        toast.error('Neispravan email ili lozinka.');
      } else {
        toast.success('Prijava uspješna!');
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (error) {
      console.error('Greška prilikom prijave:', error);
      toast.error('Došlo je do neočekivane greške.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
      <h1 className="mb-6 text-center text-3xl font-bold text-gray-800">Prijavite se</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
          <input {...register('email')} id="email" type="email" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
          {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>}
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">Lozinka</label>
          <input {...register('password')} id="password" type="password" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
          {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password.message}</p>}
        </div>
        <button type="submit" disabled={isLoading} className="w-full rounded-md bg-blue-600 py-3 px-4 text-lg font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50">
          {isLoading ? 'Prijava...' : 'Prijavi se'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-gray-600">
        Nemate nalog?{' '}
        <Link href="/register" className="font-medium text-blue-600 hover:text-blue-500">
          Registrujte se
        </Link>
      </p>
    </div>
  );
}
