'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useCart } from '@/context/CartContext';
import { ShoppingCart, User, Package, LogOut, ChevronDown, Menu } from 'lucide-react';
import { SearchBar } from './SearchBar';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

// Komponenta za desktop navigacijske linkove
const NavLink = ({ href, children }: { href: string, children: React.ReactNode }) => (
  <Link 
    href={href} 
    className="py-2 px-3 text-slate-700 hover:text-orange font-medium text-sm rounded-lg hover:bg-white/50 transition-colors"
  >
    {children}
  </Link>
);

// Komponenta za mobilne navigacijske linkove
const MobileNavLink = ({ 
  href, 
  onClick, 
  children 
}: { 
  href: string, 
  onClick?: () => void, 
  children: React.ReactNode 
}) => (
  <Link 
    href={href} 
    onClick={onClick}
    className="flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-white/50 hover:text-orange"
  >
    {children}
  </Link>
);

export function Navbar() {
  const { data: session, status } = useSession();
  const { cartCount } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Efekt za praćenje scroll pozicije
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav 
      className={cn(
        "sticky top-0 z-50 transition-all duration-300",
        scrolled 
          ? "bg-white/70 backdrop-blur-lg shadow-lg" 
          : "bg-transparent"
      )}
    >
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          {/* Logo i branding */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <div className="relative w-10 h-10 rounded-xl bg-accent-gradient flex items-center justify-center shadow-lg">
                <span className="text-xl font-bold text-white">A</span>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-amber via-orange to-brown bg-clip-text text-transparent hidden sm:inline-block">
                AutoDijelovi
              </span>
            </Link>
          </div>

          {/* Desktop navigacija */}
          <div className="hidden md:flex items-center space-x-1">
            <NavLink href="/">Početna</NavLink>
            <NavLink href="/products">Proizvodi</NavLink>
            {status === 'authenticated' && session.user.role === 'ADMIN' && (
              <NavLink href="/admin">Admin Panel</NavLink>
            )}
          </div>

          {/* Search bar */}
          <div className="hidden md:block flex-grow max-w-md mx-8">
            <SearchBar />
          </div>

          {/* Desni dio navigacije */}
          <div className="flex items-center space-x-4">
            {/* Košarica */}
            <Link 
              href="/cart" 
              className="relative p-2 rounded-full hover:bg-white/20 transition-colors"
              aria-label="Košarica"
            >
              <ShoppingCart className={cn(
                "h-6 w-6 transition-colors",
                scrolled ? "text-slate-800" : "text-slate-700"
              )} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent-gradient text-xs font-bold text-white shadow-md">
                  {cartCount}
                </span>
              )}
            </Link>

            {/* Korisnički meni - desktop */}
            <div className="hidden md:block relative">
              {status === 'authenticated' ? (
                <div className="relative">
                  <button 
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className={cn(
                      "flex items-center space-x-1 py-1 px-3 rounded-full transition-all",
                      userMenuOpen || scrolled ? "bg-white/80 shadow-sm" : "hover:bg-white/20"
                    )}
                  >
                    <span className={cn(
                      "text-sm font-medium",
                      scrolled ? "text-slate-800" : "text-slate-700"
                    )}>
                      {session.user.name?.split(' ')[0]}
                    </span>
                    <ChevronDown className="h-4 w-4 text-slate-600" />
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white/80 backdrop-blur-lg rounded-xl shadow-lg py-2 border border-white/30 z-50">
                      <div className="px-4 py-2 border-b border-slate-200/50">
                        <p className="text-sm font-medium text-slate-900">{session.user.name}</p>
                        <p className="text-xs text-slate-500 truncate">{session.user.email}</p>
                      </div>
                      
                      <Link 
                        href="/account/profile" 
                        className="flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-white/50 hover:text-orange"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <User className="h-4 w-4 mr-2" />
                        Moj profil
                      </Link>
                      
                      <Link 
                        href="/account/orders" 
                        className="flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-white/50 hover:text-orange"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <Package className="h-4 w-4 mr-2" />
                        Moje narudžbe
                      </Link>
                      
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          signOut({ callbackUrl: '/' });
                        }}
                        className="w-full flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-white/50 hover:text-orange"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Odjava
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Link 
                    href="/login?redirect=/products" 
                    className="py-1.5 px-4 rounded-full bg-accent-gradient text-sm font-medium text-white shadow-md hover:shadow-lg transition-all"
                  >
                    Katalog za servisere
                  </Link>
                </div>
              )}
            </div>

            {/* Mobilni meni toggle */}
            <button 
              className="md:hidden p-2 rounded-full hover:bg-white/20 transition-colors"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Otvori meni"
            >
              <Menu className={cn(
                "h-6 w-6",
                scrolled ? "text-slate-800" : "text-slate-700"
              )} />
            </button>
          </div>
        </div>
      </div>

      {/* Mobilni meni */}
      {menuOpen && (
        <div className="md:hidden bg-white/80 backdrop-blur-lg border-t border-slate-200/50 shadow-lg">
          <div className="container mx-auto px-4 py-3">
            <div className="mb-4">
              <SearchBar />
            </div>
            
            <div className="flex flex-col space-y-2">
              <MobileNavLink href="/" onClick={() => setMenuOpen(false)}>Početna</MobileNavLink>
              <MobileNavLink href="/products" onClick={() => setMenuOpen(false)}>Proizvodi</MobileNavLink>
              
              {status === 'authenticated' && session.user.role === 'ADMIN' && (
                <MobileNavLink href="/admin" onClick={() => setMenuOpen(false)}>Admin Panel</MobileNavLink>
              )}
              
              <div className="border-t border-slate-200/50 my-2 pt-2">
                {status === 'authenticated' ? (
                  <>
                    <div className="px-4 py-2 mb-2">
                      <p className="text-sm font-medium text-slate-900">Bok, {session.user.name}</p>
                      <p className="text-xs text-slate-500 truncate">{session.user.email}</p>
                    </div>
                    <MobileNavLink href="/account/profile" onClick={() => setMenuOpen(false)}>
                      <User className="h-4 w-4 mr-2" /> Moj profil
                    </MobileNavLink>
                    <MobileNavLink href="/account/orders" onClick={() => setMenuOpen(false)}>
                      <Package className="h-4 w-4 mr-2" /> Moje narudžbe
                    </MobileNavLink>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        signOut({ callbackUrl: '/' });
                      }}
                      className="w-full flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-white/50 hover:text-orange"
                    >
                      <LogOut className="h-4 w-4 mr-2" /> Odjava
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col space-y-2 px-4">
                    <Link 
                      href="/login?redirect=/products" 
                      onClick={() => setMenuOpen(false)}
                      className="py-2 px-4 text-center rounded-lg bg-accent-gradient text-sm font-medium text-white shadow-md hover:shadow-lg transition-all"
                    >
                      Katalog za servisere
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
