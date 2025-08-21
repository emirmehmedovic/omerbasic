'use client';

import { useState } from 'react';
import { User } from '@/generated/prisma/client';
import { FiEdit, FiPlus, FiTrash2 } from 'react-icons/fi';
import { CreateB2bUserForm } from '@/app/admin/users/_components/CreateB2bUserForm';
import { CreateAdminUserForm } from '@/app/admin/users/_components/CreateAdminUserForm';
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
  const [isCreateAdminModalOpen, setCreateAdminModalOpen] = useState(false);
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
      {/* Header Section */}
      <div className="bg-gradient-to-br from-white via-gray-50/80 to-blue-50/60 backdrop-blur-sm rounded-2xl p-6 border border-amber/20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-sm rounded-xl border border-amber/30">
            <svg className="w-8 h-8 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-amber via-orange to-brown bg-clip-text text-transparent">
              Upravljanje korisnicima
            </h1>
            <p className="text-gray-600 mt-1">
              Upravljajte korisnicima sistema i B2B partnerima
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm rounded-2xl border border-amber/20 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-white/90 to-gray-50/90 border-b border-amber/20 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Korisnici ({users.length})
              </h2>
              <p className="text-gray-600 mt-1">
                Pregled i upravljanje svim korisnicima sistema
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setCreateModalOpen(true)} 
                className="bg-gradient-to-r from-amber via-orange to-brown text-white hover:from-amber/90 hover:via-orange/90 hover:to-brown/90 shadow-lg hover:scale-105 transition-all duration-200 rounded-xl px-4 py-2 font-semibold flex items-center gap-2"
              >
                <FiPlus /> Dodaj B2B korisnika
              </button>
              <button 
                onClick={() => setCreateAdminModalOpen(true)} 
                className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-600 text-white hover:from-slate-900 hover:via-slate-800 hover:to-slate-700 shadow-lg hover:scale-105 transition-all duration-200 rounded-xl px-4 py-2 font-semibold flex items-center gap-2"
              >
                <FiPlus /> Dodaj Admina
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="overflow-x-auto rounded-lg border border-amber/20 bg-white">
            <table className="min-w-full divide-y divide-amber/20">
              <thead className="bg-gradient-to-r from-amber/10 to-orange/10">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-amber/70">Ime</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-amber/70">Email</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-amber/70">Uloga</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-amber/70">Firma</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-amber/70">Popust</th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Uredi</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber/20 bg-white">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gradient-to-r hover:from-amber/5 hover:to-orange/5 transition-colors duration-200">
                    <td className="whitespace-nowrap px-6 py-4 text-gray-900 font-medium">{user.name}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-gray-700">{user.email}</td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${user.role === 'ADMIN' ? 'badge-admin' : user.role === 'B2B' ? 'badge-b2b' : 'badge-user'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-gray-700">{user.companyName || '-'}</td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="badge-discount rounded-full px-3 py-1 text-xs font-semibold">
                        {user.discountPercentage}%
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-x-4">
                        <button onClick={() => openEditModal(user)} className="btn-edit p-2 rounded-lg transition-all duration-200">
                          <FiEdit size={18} />
                        </button>
                        {session?.user?.id !== user.id && (
                          <button onClick={() => handleDelete(user.id)} className="btn-delete p-2 rounded-lg transition-all duration-200">
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
        </div>
      </div>

      {/* Modal za dodavanje korisnika */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-2xl bg-gradient-to-br from-white via-gray-50/80 to-blue-50/60 backdrop-blur-sm border border-amber/20 shadow-xl rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-sm rounded-lg border border-amber/30">
                <svg className="w-5 h-5 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Kreiraj novog B2B korisnika</h3>
            </div>
            <CreateB2bUserForm onSuccess={handleCreateSuccess} onCancel={() => setCreateModalOpen(false)} />
          </div>
        </div>
      )}

      {/* Modal za dodavanje ADMIN korisnika */}
      {isCreateAdminModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-2xl bg-gradient-to-br from-white via-gray-50/80 to-blue-50/60 backdrop-blur-sm border border-amber/20 shadow-xl rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-sm rounded-lg border border-amber/30">
                <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 10-8 0v4M5 20h14a2 2 0 002-2v-5a2 2 0 00-2-2H5a2 2 0 00-2 2v5a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Kreiraj novog ADMIN korisnika</h3>
            </div>
            <CreateAdminUserForm onSuccess={(u) => { handleCreateSuccess(u); setCreateAdminModalOpen(false); }} onCancel={() => setCreateAdminModalOpen(false)} />
          </div>
        </div>
      )}

      {/* Modal za uređivanje korisnika */}
      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-2xl bg-gradient-to-br from-white via-gray-50/80 to-blue-50/60 backdrop-blur-sm border border-amber/20 shadow-xl rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-sm rounded-lg border border-amber/30">
                <svg className="w-5 h-5 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Uredi korisnika: {selectedUser.name}</h3>
            </div>
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
