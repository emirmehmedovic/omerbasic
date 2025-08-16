'use client';

import { usePathname } from 'next/navigation';
import Footer from './Footer';

export function ConditionalFooter() {
  const pathname = usePathname();
  
  // Ne prikazuj footer u admin sekciji
  if (pathname.startsWith('/admin')) {
    return null;
  }
  
  return <Footer />;
}
