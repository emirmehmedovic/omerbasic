'use client';

import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/Navbar';

export function ConditionalNavbar() {
  const pathname = usePathname();

  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/ads') ||
    pathname.startsWith('/ads-plain')
  ) {
    return null;
  }

  return <Navbar />;
}
