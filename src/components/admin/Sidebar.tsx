'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Dialog, Transition } from '@headlessui/react';
import { LayoutDashboard, ShoppingCart, Package, Users2, List, LogOut, X, Car, Tags, Search, BarChart, ClipboardList, FileText } from 'lucide-react';
import { signOut } from 'next-auth/react';

const sidebarItems = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Statistika', href: '/admin/statistics', icon: BarChart },
  { name: 'Proizvodi', href: '/admin/products', icon: ShoppingCart },
  { name: 'Narudžbe', href: '/admin/orders', icon: Package },
  { name: 'Kategorije', href: '/admin/categories', icon: List },
  { name: 'Atributi', href: '/admin/attribute-management', icon: Tags },
  { name: 'Korisnici', href: '/admin/users', icon: Users2 },
  { name: 'B2B korisnici', href: '/admin/users/b2b', icon: Users2 },
  { name: 'Vozila', href: '/admin/vehicles', icon: Car },
  { name: 'Dobavljači', href: '/admin/suppliers', icon: Users2 },
  { name: 'Proizvodi dobavljača', href: '/admin/supplier-products', icon: Package },
  { name: 'Narudžbenice', href: '/admin/purchase-orders', icon: ClipboardList },
  { name: 'Statistika narudžbenica', href: '/admin/purchase-orders/statistics', icon: FileText },
  { name: 'Napredna pretraga', href: '/admin/advanced-search', icon: Search },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  const content = (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-8 px-4 pt-4">
        <Link href="/" className="text-2xl font-bold text-gray-800">Webshop</Link>
        <button onClick={onClose} className="md:hidden text-gray-600">
          <X className="h-6 w-6" />
        </button>
      </div>
      <nav className="flex flex-col flex-grow p-4">
        {sidebarItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onClose}
              className={`flex items-center px-4 py-3 mb-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-[#92000A] text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-200/50'
              }`}>
              <item.icon className="w-5 h-5 mr-3" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
      <div className='p-4'>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center w-full px-4 py-3 text-left text-gray-600 rounded-lg hover:bg-gray-200/50 transition-colors">
          <LogOut className="w-5 h-5 mr-3" />
          <span>Odjavi se</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Static sidebar for desktop */}
      <aside className="h-screen w-64 hidden md:flex flex-col bg-white/50 backdrop-blur-lg border-r border-gray-200/60">
        {content}
      </aside>

      {/* Mobile sidebar as a dialog */}
      <Transition.Root show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-40 md:hidden" onClose={onClose}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 flex z-40">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative flex-1 flex flex-col max-w-xs w-full bg-white/80 backdrop-blur-lg">
                {content}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>
    </>
  );
}
