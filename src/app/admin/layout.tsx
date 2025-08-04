'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/admin/Sidebar';
import { Menu } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (status === 'loading') {
    return <div>Učitavanje...</div>; 
  }

  if (status === 'unauthenticated' || session?.user?.role !== 'ADMIN') {
    router.push('/');
    return null;
  }

  return (
    <div className="flex min-h-screen bg-gray-50/50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-col flex-1">
        <header className="md:hidden bg-white/50 backdrop-blur-lg border-b p-4">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-700">
            <Menu className="h-6 w-6" />
          </button>
        </header>
        <main className="flex-1 p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

