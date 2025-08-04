'use client';

import Link from 'next/link';
import { signOut } from 'next-auth/react';

export function AdminNav() {
  return (
    <nav className="bg-gray-800 text-white p-4 mb-4">
      <div className="container mx-auto flex justify-between items-center">
        <div className="space-x-4">
          <Link href="/admin/categories" className="hover:text-gray-300">Kategorije</Link>
          <Link href="/admin/users" className="hover:text-gray-300">Korisnici</Link>
          <Link href="/admin/products" className="hover:text-gray-300">Proizvodi</Link>
        </div>
        <button 
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded"
        >
          Odjavi se
        </button>
      </div>
    </nav>
  );
}
