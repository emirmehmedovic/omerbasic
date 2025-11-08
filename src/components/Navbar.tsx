'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useCart } from '@/context/CartContext';
import Image from 'next/image';
import { ShoppingCart, User, Package, LogOut, ChevronDown, Menu, Search } from 'lucide-react';
import { SearchBar } from './SearchBar';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

// Komponenta za desktop navigacijske linkove - moderan dizajn
const NavLink = ({ href, children }: { href: string, children: React.ReactNode }) => (
  <Link 
    href={href} 
    className="py-2.5 px-4 text-slate-700 hover:text-white font-semibold text-sm rounded-xl hover:bg-gradient-to-r hover:from-[#E85A28] hover:to-[#FF6B35] hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5"
  >
    {children}
  </Link>
);

// Komponenta za mobilne navigacijske linkove - moderan dizajn
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
    className="flex items-center px-4 py-2.5 text-sm text-slate-700 hover:bg-gradient-to-r hover:from-[#E85A28] hover:to-[#FF6B35] hover:text-white rounded-xl transition-all duration-300 font-medium"
  >
    {children}
  </Link>
);

export function Navbar() {
  const { data: session, status } = useSession();
  const { cartCount } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <nav className="relative z-50 py-4 transition-all duration-300">
      <div
        className={cn(
          "container mx-auto relative overflow-visible transition-all duration-300 backdrop-blur-md bg-gradient-to-r from-white/90 via-white/85 to-white/90 border border-white/60 rounded-3xl shadow-2xl",
          menuOpen || searchOpen ? "rounded-t-3xl" : "rounded-3xl"
        )}
      >
        {/* Modern texture overlay */}
        <div
          className="pointer-events-none absolute inset-0 z-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 2px 2px, rgba(27,58,95,0.2) 1px, transparent 0), radial-gradient(circle at 50% 50%, rgba(255,107,53,0.05) 0%, transparent 70%)",
            backgroundSize: "32px 32px, 100% 100%",
          }}
        />
        <div className="relative z-10 flex justify-between items-center py-2 px-4">
          {/* Logo i branding */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <Image src="/images/omerbasic.png" alt="Omerbasic Auto Dijelovi Logo" width={180} height={40} />
            </Link>
          </div>

          {/* Desktop navigacija */}
          <div className="hidden md:flex items-center space-x-1">
            <NavLink href="/products">Proizvodi</NavLink>
            <NavLink href="/contact">Kontakt</NavLink>
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
            {/* Košarica - moderan dizajn */}
            <Link 
              href="/cart" 
              className="relative p-2.5 rounded-xl hover:bg-gradient-to-r hover:from-[#E85A28] hover:to-[#FF6B35] hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 group"
              aria-label="Košarica"
            >
              <ShoppingCart className="h-6 w-6 text-slate-800 group-hover:text-white transition-colors" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-[#E85A28] to-[#FF6B35] text-xs font-bold text-white shadow-lg">
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
                      "flex items-center space-x-2 py-2 px-4 rounded-xl transition-all duration-300 font-semibold",
                      userMenuOpen 
                        ? "bg-gradient-to-r from-primary to-primary-dark text-white shadow-lg" 
                        : "hover:bg-gradient-to-r hover:from-primary hover:to-primary-dark hover:text-white hover:shadow-lg"
                    )}
                  >
                    <span className="text-sm">
                      {session.user.name?.split(' ')[0]}
                    </span>
                    <ChevronDown className={cn("h-4 w-4 transition-transform", userMenuOpen && "rotate-180")} />
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 mt-3 w-56 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl py-2 border border-white/60 z-50">
                      <div className="px-4 py-3 border-b border-slate-200/50 bg-gradient-to-r from-slate-50 to-slate-100 rounded-t-2xl">
                        <p className="text-sm font-bold text-primary">{session.user.name}</p>
                        <p className="text-xs text-slate-600 truncate">{session.user.email}</p>
                      </div>
                      
                      <Link 
                        href="/account/profile" 
                        className="flex items-center px-4 py-2.5 mx-2 my-1 text-sm text-slate-700 hover:bg-gradient-to-r hover:from-[#E85A28] hover:to-[#FF6B35] hover:text-white rounded-xl transition-all duration-300 font-medium"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <User className="h-4 w-4 mr-3" />
                        Moj profil
                      </Link>
                      
                      <Link 
                        href="/account/orders" 
                        className="flex items-center px-4 py-2.5 mx-2 my-1 text-sm text-slate-700 hover:bg-gradient-to-r hover:from-[#E85A28] hover:to-[#FF6B35] hover:text-white rounded-xl transition-all duration-300 font-medium"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <Package className="h-4 w-4 mr-3" />
                        Moje narudžbe
                      </Link>
                      
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          signOut({ callbackUrl: '/' });
                        }}
                        className="w-full flex items-center px-4 py-2.5 mx-2 my-1 text-sm text-slate-700 hover:bg-gradient-to-r hover:from-[#E85A28] hover:to-[#FF6B35] hover:text-white rounded-xl transition-all duration-300 font-medium"
                      >
                        <LogOut className="h-4 w-4 mr-3" /> Odjava
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Link 
                    href="/login?redirect=/products" 
                    className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-[#E85A28] to-[#FF6B35] text-sm font-bold text-white shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300"
                  >
                    Katalog za servisere
                  </Link>
                </div>
              )}
            </div>

            {/* Mobilni meni i search toggle */}
            <div className="md:hidden flex items-center space-x-2">
              <button 
                className="p-2 rounded-full hover:bg-white/50 transition-colors"
                onClick={() => setSearchOpen(!searchOpen)}
                aria-label="Otvori pretragu"
              >
                <Search className="h-6 w-6 text-orange-500" />
              </button>
              <button 
                className="p-2 rounded-full hover:bg-white/50 transition-colors"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="Otvori meni"
              >
                <Menu className="h-6 w-6 text-orange-500" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobilna pretraga - moderan dizajn */}
      {searchOpen && (
        <div className="md:hidden bg-white/95 backdrop-blur-md border-t border-white/60 shadow-2xl container mx-auto rounded-b-3xl">
          <div className="container mx-auto px-4 py-4">
            <SearchBar />
          </div>
        </div>
      )}

      {/* Mobilni meni - moderan dizajn */}
      {menuOpen && (
        <div className="md:hidden bg-white/95 backdrop-blur-md border-t border-white/60 shadow-2xl container mx-auto rounded-b-3xl">
          <div className="container mx-auto px-4 py-4">
            
            <div className="flex flex-col space-y-2">
              <MobileNavLink href="/products" onClick={() => setMenuOpen(false)}>Proizvodi</MobileNavLink>
              <MobileNavLink href="/contact" onClick={() => setMenuOpen(false)}>Kontakt</MobileNavLink>
              
              {status === 'authenticated' && session.user.role === 'ADMIN' && (
                <MobileNavLink href="/admin" onClick={() => setMenuOpen(false)}>Admin Panel</MobileNavLink>
              )}
              
              <div className="border-t border-slate-200/50 my-3 pt-3">
                {status === 'authenticated' ? (
                  <>
                    <div className="px-4 py-3 mb-2 rounded-xl bg-gradient-to-r from-slate-50 to-slate-100">
                      <p className="text-sm font-bold text-primary">Bok, {session.user.name}</p>
                      <p className="text-xs text-slate-600 truncate">{session.user.email}</p>
                    </div>
                    <MobileNavLink href="/account/profile" onClick={() => setMenuOpen(false)}>
                      <User className="h-4 w-4 mr-3" /> Moj profil
                    </MobileNavLink>
                    <MobileNavLink href="/account/orders" onClick={() => setMenuOpen(false)}>
                      <Package className="h-4 w-4 mr-3" /> Moje narudžbe
                    </MobileNavLink>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        signOut({ callbackUrl: '/' });
                      }}
                      className="w-full flex items-center px-4 py-2.5 text-sm text-slate-700 hover:bg-gradient-to-r hover:from-[#E85A28] hover:to-[#FF6B35] hover:text-white rounded-xl transition-all duration-300 font-medium"
                    >
                      <LogOut className="h-4 w-4 mr-3" /> Odjava
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col space-y-2 px-4">
                    <Link 
                      href="/login?redirect=/products" 
                      onClick={() => setMenuOpen(false)}
                      className="py-3 px-6 text-center rounded-xl bg-gradient-to-r from-[#E85A28] to-[#FF6B35] text-sm font-bold text-white shadow-xl hover:shadow-2xl transition-all duration-300"
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
