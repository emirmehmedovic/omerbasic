'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { type Address } from '@/generated/prisma/client';
import { AddressForm } from '@/components/AddressForm';
import { FiEdit, FiPlus, FiTrash2 } from 'react-icons/fi';

export function ManageAddresses() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);

  const fetchAddresses = async () => {
    try {
      const response = await axios.get('/api/user/addresses');
      setAddresses(response.data);
    } catch (error) {
      toast.error('Nije moguće učitati adrese.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const handleFormSuccess = () => {
    fetchAddresses();
    setIsFormOpen(false);
    setSelectedAddress(null);
  };

  const handleDelete = async (addressId: string) => {
    if (window.confirm('Da li ste sigurni da želite obrisati ovu adresu?')) {
      try {
        await axios.delete(`/api/user/addresses/${addressId}`);
        toast.success('Adresa je uspješno obrisana.');
        fetchAddresses();
      } catch (error) {
        toast.error('Nije moguće obrisati adresu.');
      }
    }
  };

  const openFormForNew = () => {
    setSelectedAddress(null);
    setIsFormOpen(true);
  };

  const openFormForEdit = (address: Address) => {
    setSelectedAddress(address);
    setIsFormOpen(true);
  };

  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">Moje adrese</h2>
        <button onClick={openFormForNew} className="flex items-center gap-2 rounded-md bg-blue-600 py-2 px-4 font-semibold text-white shadow-sm hover:bg-blue-700">
          <FiPlus /> Dodaj novu adresu
        </button>
      </div>

      {isLoading ? (
        <p>Učitavanje adresa...</p>
      ) : addresses.length === 0 ? (
        <p>Nemate spremljenih adresa.</p>
      ) : (
        <div className="space-y-4">
          {addresses.map((address) => (
            <div key={address.id} className="rounded-md border p-4 flex justify-between items-start">
              <div>
                <p className="font-semibold">{address.street}, {address.city}, {address.postalCode}, {address.country}</p>
                <div className="flex gap-4 mt-2 text-sm text-gray-600">
                  {address.isDefaultShipping && <span className="font-bold text-green-600">Zadana za dostavu</span>}
                  {address.isDefaultBilling && <span className="font-bold text-blue-600">Zadana za naplatu</span>}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openFormForEdit(address)} className="p-2 text-gray-500 hover:text-blue-600"><FiEdit size={18} /></button>
                <button onClick={() => handleDelete(address.id)} className="p-2 text-gray-500 hover:text-red-600"><FiTrash2 size={18} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-lg rounded-lg bg-white p-6">
            <h3 className="text-xl font-semibold mb-4">{selectedAddress ? 'Uredi adresu' : 'Dodaj novu adresu'}</h3>
            <AddressForm 
              onSuccess={handleFormSuccess} 
              onCancel={() => setIsFormOpen(false)} 
              initialData={selectedAddress} 
            />
          </div>
        </div>
      )}
    </div>
  );
}
