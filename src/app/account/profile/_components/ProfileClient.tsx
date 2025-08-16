'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { profileFormSchema, type ProfileFormValues } from '@/lib/validations/account';
import type { Session } from 'next-auth';
import type { Address } from '@/generated/prisma/client';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { AddressModal } from './AddressModal';
import { ChangePasswordForm } from './ChangePasswordForm';

interface ProfileClientProps {
  user: Session['user'];
  addresses: Address[];
}

export const ProfileClient = ({ user, addresses = [] }: ProfileClientProps) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);

  const handleAddNewAddress = () => {
    setEditingAddress(null);
    setIsModalOpen(true);
  };

  const handleEditAddress = (address: Address) => {
    setEditingAddress(address);
    setIsModalOpen(true);
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (confirm('Jeste li sigurni da želite obrisati ovu adresu?')) {
      try {
        await axios.delete(`/api/account/addresses/${addressId}`);
        toast.success('Adresa je obrisana.');
        router.refresh();
      } catch (error) {
        toast.error('Brisanje nije uspjelo.');
      }
    }
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: user.name ?? '',
      email: user.email ?? '',
      companyName: user.companyName ?? '',
      taxId: user.taxId ?? '',
    },
  });

  const onSubmit = async (data: ProfileFormValues) => {
    setIsLoading(true);
    try {
      await axios.patch('/api/account/profile', data);
      toast.success('Profil je uspješno ažuriran!');
      router.refresh(); // Osvježi podatke na stranici
    } catch (error) {
      toast.error('Došlo je do greške. Molimo pokušajte ponovo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-slate-200 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-2">Moj profil</h1>
        <p className="text-slate-400 mb-8">Ažurirajte svoje osobne i poslovne podatke.</p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Profile Forms */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              {/* Personal Info Card */}
              <div className="rounded-2xl bg-slate-900/70 backdrop-blur-xl shadow-lg p-8 border border-slate-800">
                <h2 className="text-2xl font-bold text-white mb-6">Osobni podaci</h2>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-slate-300">Ime</label>
                    <input 
                      {...register('name')} 
                      id="name" 
                      className="mt-1 block w-full rounded-lg border-slate-700 bg-slate-800/60 shadow-sm px-4 py-2.5 text-white focus:border-sunfire-500 focus:ring-sunfire-500" 
                    />
                    {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>}
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-300">Email</label>
                    <input 
                      {...register('email')} 
                      id="email" 
                      type="email" 
                      className="mt-1 block w-full rounded-lg border-slate-700 bg-slate-800/60 shadow-sm px-4 py-2.5 text-white focus:border-sunfire-500 focus:ring-sunfire-500" 
                    />
                    {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>}
                  </div>
                </div>
              </div>

              {/* Company Info Card (conditional) */}
              {user.role === 'B2B' && (
                <div className="rounded-2xl bg-slate-900/70 backdrop-blur-xl shadow-lg p-8 border border-slate-800">
                  <h2 className="text-2xl font-bold text-white mb-6">Podaci o tvrtki</h2>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="companyName" className="block text-sm font-medium text-slate-300">Naziv tvrtke</label>
                      <input 
                        {...register('companyName')} 
                        id="companyName" 
                        className="mt-1 block w-full rounded-lg border-slate-700 bg-slate-800/60 shadow-sm px-4 py-2.5 text-white focus:border-sunfire-500 focus:ring-sunfire-500" 
                      />
                      {errors.companyName && <p className="text-sm text-red-500 mt-1">{errors.companyName.message}</p>}
                    </div>
                    <div>
                      <label htmlFor="taxId" className="block text-sm font-medium text-slate-300">Porezni broj (OIB)</label>
                      <input 
                        {...register('taxId')} 
                        id="taxId" 
                        className="mt-1 block w-full rounded-lg border-slate-700 bg-slate-800/60 shadow-sm px-4 py-2.5 text-white focus:border-sunfire-500 focus:ring-sunfire-500" 
                      />
                      {errors.taxId && <p className="text-sm text-red-500 mt-1">{errors.taxId.message}</p>}
                    </div>
                  </div>
                </div>
              )}
              
              <button 
                type="submit" 
                disabled={isLoading} 
                className="w-full rounded-lg border border-transparent bg-sunfire-500 py-2.5 px-6 text-sm font-semibold text-white shadow-md hover:bg-sunfire-600 focus:outline-none focus:ring-2 focus:ring-sunfire-500 focus:ring-offset-2 dark:focus:ring-offset-slate-950 disabled:opacity-60 transition-all"
              >
                {isLoading ? 'Spremanje...' : 'Spremi promjene'}
              </button>
            </form>
          </div>

          {/* Right Column: Addresses and Password */}
          <div className="lg:col-span-1 space-y-8">
            {/* Address Card */}
            <div className="rounded-2xl bg-slate-900/70 backdrop-blur-xl shadow-lg p-8 border border-slate-800">
              <h2 className="text-2xl font-bold text-white mb-6">Moje adrese</h2>
              <div className="space-y-4">
                  {addresses.map((address) => (
                      <div key={address.id} className="rounded-lg bg-slate-800/50 p-4 flex justify-between items-center transition-all duration-200">
                          <div>
                              <p className="font-semibold text-white">{address.street}</p>
                              <p className="text-sm text-slate-400">{address.city}, {address.postalCode}</p>
                              <p className="text-sm text-slate-400">{address.country}</p>
                          </div>
                          <div className="space-x-3">
                              <button 
                                onClick={() => handleEditAddress(address)} 
                                className="text-sm px-3 py-1 rounded-md bg-sunfire-500/10 text-sunfire-300 hover:bg-sunfire-500/20 transition-colors"
                              >
                                Uredi
                              </button>
                              <button 
                                onClick={() => handleDeleteAddress(address.id)} 
                                className="text-sm px-3 py-1 rounded-md bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
                              >
                                Obriši
                              </button>
                          </div>
                      </div>
                  ))}
                  {addresses.length === 0 && (
                      <p className="text-slate-500 italic">Nemate spremljenih adresa.</p>
                  )}
              </div>
              <button 
                onClick={handleAddNewAddress} 
                className="mt-6 w-full rounded-lg border border-transparent bg-sunfire-500 py-2.5 px-4 text-sm font-semibold text-white shadow-md hover:bg-sunfire-600 focus:outline-none focus:ring-2 focus:ring-sunfire-500 focus:ring-offset-2 dark:focus:ring-offset-slate-950 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Dodaj novu adresu
              </button>
            </div>

            {/* Change Password Card */}
            <div className="rounded-2xl bg-slate-900/70 backdrop-blur-xl shadow-lg p-8 border border-slate-800">
              <ChangePasswordForm />
            </div>
          </div>
        </div>
      </div>
      <AddressModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        initialData={editingAddress} 
      />
    </div>
  );
};
