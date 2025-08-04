'use client';

import { useState } from 'react';
import { User } from '@/generated/prisma/client';
import { FiEdit, FiPlus, FiTrash2 } from 'react-icons/fi';
import { CreateB2bUserForm } from '@/app/admin/users/_components/CreateB2bUserForm';
import { EditUserForm } from '@/app/admin/users/_components/EditUserForm';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useSession } from 'next-auth/react';

type SafeUser = Omit<User, 'password'>;

interface UsersClientProps {
  data: SafeUser[];
}

export function UsersClient({ data }: UsersClientProps) {
  const { data: session } = useSession();
  const [users, setUsers] = useState<SafeUser[]>(data);
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SafeUser | null>(null);

  const handleCreateSuccess = (newUser: SafeUser) => {
    setUsers((currentUsers) => [newUser, ...currentUsers]);
    setCreateModalOpen(false);
  };

  const handleUpdateSuccess = (updatedUser: SafeUser) => {
    setUsers((currentUsers) =>
      currentUsers.map((user) => (user.id === updatedUser.id ? updatedUser : user))
    );
    setEditModalOpen(false);
  };

  const openEditModal = (user: SafeUser) => {
    setSelectedUser(user);
    setEditModalOpen(true);
  };

  const handleDelete = async (userId: string) => {
    if (!window.confirm('Jeste li sigurni da želite obrisati ovog korisnika? Ova akcija je nepovratna.')) {
      return;
    }

    try {
      await axios.delete(`/api/admin/users/${userId}`);
      setUsers((currentUsers) => currentUsers.filter((user) => user.id !== userId));
      toast.success('Korisnik je uspješno obrisan.');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Došlo je do greške prilikom brisanja.';
      toast.error(errorMessage);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Korisnici ({users.length})</h2>
          <p className="text-sm text-muted-foreground">Upravljanje korisnicima sistema.</p>
        </div>
        <button onClick={() => setCreateModalOpen(true)} className="flex items-center gap-2 rounded-md bg-blue-600 py-2 px-4 font-semibold text-white shadow-sm hover:bg-blue-700">
          <FiPlus /> Dodaj B2B korisnika
        </button>
      </div>

      {/* Tabela korisnika */}
      <div className="mt-6 overflow-x-auto rounded-lg border bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Ime</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Email</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Uloga</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Firma</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Popust</th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Uredi</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="whitespace-nowrap px-6 py-4">{user.name}</td>
                <td className="whitespace-nowrap px-6 py-4">{user.email}</td>
                <td className="whitespace-nowrap px-6 py-4">
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${user.role === 'ADMIN' ? 'bg-red-100 text-red-800' : user.role === 'B2B' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                    {user.role}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4">{user.companyName || '-'}</td>
                <td className="whitespace-nowrap px-6 py-4">{user.discountPercentage}%</td>
                <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-x-4">
                    <button onClick={() => openEditModal(user)} className="text-indigo-600 hover:text-indigo-900">
                      <FiEdit size={18} />
                    </button>
                    {session?.user?.id !== user.id && (
                      <button onClick={() => handleDelete(user.id)} className="text-red-600 hover:text-red-900">
                        <FiTrash2 size={18} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal za dodavanje korisnika */}
      {/* Modal za dodavanje korisnika */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6">
            <h3 className="text-xl font-semibold mb-4">Kreiraj novog B2B korisnika</h3>
            <CreateB2bUserForm onSuccess={handleCreateSuccess} onCancel={() => setCreateModalOpen(false)} />
          </div>
        </div>
      )}

      {/* Modal za uređivanje korisnika */}
      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6">
            <h3 className="text-xl font-semibold mb-4">Uredi korisnika: {selectedUser.name}</h3>
            <EditUserForm
              user={selectedUser}
              onSuccess={handleUpdateSuccess}
              onCancel={() => setEditModalOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
