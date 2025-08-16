'use client';

import { useForm } from 'react-hook-form';
import Image from 'next/image';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginFormValues } from '@/lib/validations/auth';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { Mail, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    try {
      // Dohvati redirect parametar iz URL-a ako postoji
      const searchParams = new URLSearchParams(window.location.search);
      const redirectUrl = searchParams.get('redirect') || '/';
      
      const signInResponse = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (signInResponse?.ok) {
        toast.success('Prijava uspješna!');
        // Preusmjeri korisnika na stranicu proizvoda ili na URL iz redirect parametra
        router.push(redirectUrl);
        router.refresh();
      } else {
        toast.error(signInResponse?.error || 'Nevažeći podaci za prijavu.');
      }
    } catch (error) {
      toast.error('Došlo je do neočekivane greške.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white/60 dark:bg-slate-800/40 backdrop-blur-xl rounded-2xl shadow-lg p-8 space-y-6 border border-white/20">
      <div className="flex justify-center">
        <Image src="/images/omerbasic.png" alt="Omerbasic Logo" width={200} height={50} />
      </div>
      <h2 className="text-center text-2xl font-bold text-slate-800 dark:text-white">
        Prijavite se na svoj račun
      </h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email adresa</label>
          <div className="relative mt-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <Mail className="h-5 w-5 text-slate-400" aria-hidden="true" />
            </span>
            <input {...register('email')} id="email" type="email" required className="block w-full rounded-lg border-slate-300 dark:border-slate-600 bg-white/50 dark:bg-slate-700/50 shadow-sm pl-10 pr-3 py-2 focus:border-sunfire-500 focus:ring-sunfire-500 text-slate-900 dark:text-white" />
          </div>
          {errors.email && <p className="mt-2 text-sm text-red-500">{errors.email.message}</p>}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Lozinka</label>
          <div className="relative mt-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <Lock className="h-5 w-5 text-slate-400" aria-hidden="true" />
            </span>
            <input {...register('password')} id="password" type="password" required className="block w-full rounded-lg border-slate-300 dark:border-slate-600 bg-white/50 dark:bg-slate-700/50 shadow-sm pl-10 pr-3 py-2 focus:border-sunfire-500 focus:ring-sunfire-500 text-slate-900 dark:text-white" />
          </div>
          {errors.password && <p className="mt-2 text-sm text-red-500">{errors.password.message}</p>}
        </div>

        <div className="text-sm text-center">
          <Link href="/register" className="font-medium text-sunfire-600 hover:text-sunfire-500 dark:text-sunfire-400 dark:hover:text-sunfire-300">
            Nemate račun? Registrirajte se.
          </Link>
        </div>

        <div>
          <button type="submit" disabled={isLoading} className="flex w-full justify-center rounded-lg border border-transparent bg-sunfire-500 py-2.5 px-4 text-sm font-semibold text-white shadow-md hover:bg-sunfire-600 focus:outline-none focus:ring-2 focus:ring-sunfire-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 disabled:opacity-60 transition-all">
            {isLoading ? 'Prijava...' : 'Prijavi se'}
          </button>
        </div>
      </form>
    </div>
  );
}
