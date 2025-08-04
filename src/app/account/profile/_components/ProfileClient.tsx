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

export const ProfileClient = ({ user, addresses }: ProfileClientProps) => {
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
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="max-w-md space-y-6">
      <div className="rounded-xl bg-white/40 backdrop-blur-sm p-6 shadow-lg border border-white/20">
        <h2 className="text-xl font-medium text-gray-800 mb-4 bg-clip-text bg-gradient-to-r from-gray-700 to-gray-900">Osobni podaci</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Ime</label>
            <input 
              {...register('name')} 
              id="name" 
              className="mt-1 block w-full rounded-lg bg-white/50 border-0 px-4 py-2.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 backdrop-blur-sm focus:ring-2 focus:ring-inset focus:ring-indigo-400" 
            />
            {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
            <input 
              {...register('email')} 
              id="email" 
              type="email" 
              className="mt-1 block w-full rounded-lg bg-white/50 border-0 px-4 py-2.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 backdrop-blur-sm focus:ring-2 focus:ring-inset focus:ring-indigo-400" 
            />
            {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>}
          </div>
        </div>
      </div>

      {user.role === 'B2B' && (
        <div className="rounded-xl bg-white/40 backdrop-blur-sm p-6 shadow-lg border border-white/20">
          <h2 className="text-xl font-medium text-gray-800 mb-4 bg-clip-text bg-gradient-to-r from-gray-700 to-gray-900">Podaci o tvrtki</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">Naziv tvrtke</label>
              <input 
                {...register('companyName')} 
                id="companyName" 
                className="mt-1 block w-full rounded-lg bg-white/50 border-0 px-4 py-2.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 backdrop-blur-sm focus:ring-2 focus:ring-inset focus:ring-indigo-400" 
              />
              {errors.companyName && <p className="text-sm text-red-500 mt-1">{errors.companyName.message}</p>}
            </div>
            <div>
              <label htmlFor="taxId" className="block text-sm font-medium text-gray-700">Porezni broj (OIB)</label>
              <input 
                {...register('taxId')} 
                id="taxId" 
                className="mt-1 block w-full rounded-lg bg-white/50 border-0 px-4 py-2.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 backdrop-blur-sm focus:ring-2 focus:ring-inset focus:ring-indigo-400" 
              />
              {errors.taxId && <p className="text-sm text-red-500 mt-1">{errors.taxId.message}</p>}
            </div>
          </div>
        </div>
      )}

      <button 
        type="submit" 
        disabled={isLoading} 
        className="rounded-lg bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 py-2.5 px-6 text-sm font-medium text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        {isLoading ? 'Spremanje...' : 'Spremi promjene'}
      </button>
    </form>

    <div className="mt-12">
        <div className="rounded-xl bg-white/40 backdrop-blur-sm p-6 shadow-lg border border-white/20">
          <h2 className="text-xl font-medium text-gray-800 mb-4 bg-clip-text bg-gradient-to-r from-gray-700 to-gray-900">Moje adrese</h2>
          <div className="space-y-4">
              {addresses.map((address) => (
                  <div key={address.id} className="rounded-lg bg-white/60 backdrop-blur-sm p-4 shadow-md border border-white/30 flex justify-between items-center hover:shadow-lg transition-all duration-200">
                      <div>
                          <p className="font-semibold">{address.street}</p>
                          <p className="text-sm text-gray-600">{address.city}, {address.postalCode}</p>
                          <p className="text-sm text-gray-600">{address.country}</p>
                      </div>
                      <div className="space-x-3">
                          <button 
                            onClick={() => handleEditAddress(address)} 
                            className="text-sm px-3 py-1 rounded-md bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors"
                          >
                            Uredi
                          </button>
                          <button 
                            onClick={() => handleDeleteAddress(address.id)} 
                            className="text-sm px-3 py-1 rounded-md bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                          >
                            Obriši
                          </button>
                      </div>
                  </div>
              ))}
              {addresses.length === 0 && (
                  <p className="text-gray-500 italic">Nemate spremljenih adresa.</p>
              )}
          </div>
          <button 
            onClick={handleAddNewAddress} 
            className="mt-6 rounded-lg bg-gradient-to-r from-gray-500 to-gray-700 py-2 px-4 text-sm font-medium text-white shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Dodaj novu adresu
          </button>
        </div>
    </div>

    <AddressModal 
      isOpen={isModalOpen} 
      onClose={() => setIsModalOpen(false)} 
      initialData={editingAddress} 
    />

    <div className="my-12 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />

    <div className="rounded-xl bg-white/40 backdrop-blur-sm p-6 shadow-lg border border-white/20 mb-8">
      <ChangePasswordForm />
    </div>
    </>
  );
};
