'use client';

import { usePathname } from 'next/navigation';
import Footer from './Footer';

export function ConditionalFooter() {
  const pathname = usePathname();
  
  // Ne prikazuj footer u admin i ads sekcijama
  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/ads') ||
    pathname.startsWith('/ads-plain')
  ) {
    return null;
  }
  
  return <Footer />;
}
