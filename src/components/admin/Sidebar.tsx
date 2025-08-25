'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Dialog, Transition } from '@headlessui/react';
import { LayoutDashboard, ShoppingCart, Package, Users2, List, LogOut, X, Car, Tags, Search, BarChart, ClipboardList, FileText, MessageSquare, Star, MonitorPlay } from 'lucide-react';
import { signOut } from 'next-auth/react';
import Image from 'next/image';

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
  { name: 'Zahtjevi', href: '/admin/requests', icon: MessageSquare },
  { name: 'Featured Proizvodi', href: '/admin/featured-products', icon: Star },
  { name: 'Napredna pretraga', href: '/admin/advanced-search', icon: Search },
  { name: 'Reklamni Ekrani', href: '/admin/ads-screens', icon: MonitorPlay },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  const content = (
    <div className="flex flex-col h-full bg-gradient-to-b from-white via-gray-50/80 to-blue-50/60 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 px-6 pt-6 pb-4 border-b border-amber/20">
        <Link href="/" className="hover:opacity-80 transition-opacity">
          <Image src="/images/omerbasic.png" alt="Omerbasic Logo" width={180} height={40} />
        </Link>
        <button 
          onClick={onClose} 
          className="md:hidden text-gray-600 hover:text-gray-900 p-2 rounded-lg hover:bg-amber/10 transition-all duration-200"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col flex-grow px-4 overflow-y-auto">
        <div className="space-y-2">
          {sidebarItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? 'bg-gradient-to-r from-amber via-orange to-brown text-white shadow-lg shadow-amber/25'
                    : 'text-gray-700 hover:bg-gradient-to-r hover:from-amber/10 hover:via-orange/10 hover:to-brown/10 hover:text-gray-900'
                }`}
              >
                <item.icon className={`w-5 h-5 mr-3 transition-colors duration-200 ${
                  isActive ? 'text-white' : 'text-amber group-hover:text-orange'
                }`} />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-amber/20">
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center w-full px-4 py-3 text-left text-gray-700 rounded-xl hover:bg-gradient-to-r hover:from-red-50 hover:via-red-100 hover:to-red-200 hover:text-red-700 transition-all duration-200 group"
        >
          <LogOut className="w-5 h-5 mr-3 text-red-500 group-hover:text-red-600 transition-colors duration-200" />
          <span className="font-medium">Odjavi se</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Static sidebar for desktop */}
      <aside className="fixed top-0 left-0 h-full w-64 hidden md:flex flex-col bg-gradient-to-b from-white via-gray-50/80 to-blue-50/60 backdrop-blur-sm border-r border-amber/20 shadow-lg z-30">
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
            <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
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
              <Dialog.Panel className="relative flex-1 flex flex-col max-w-xs w-full bg-gradient-to-b from-white via-gray-50/80 to-blue-50/60 backdrop-blur-sm border-r border-amber/20 shadow-xl">
                {content}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>
    </>
  );
}
