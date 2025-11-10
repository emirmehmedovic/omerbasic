'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const brands = [
  { name: 'Bosch', logoUrl: '/images/brands/bosch.png' },
  { name: 'Castrol', logoUrl: '/images/brands/castrol.png' },
  { name: 'Mann-Filter', logoUrl: '/images/brands/mannfilter.png' },
  { name: 'SKF', logoUrl: '/images/brands/skf.png' },
  { name: 'Valeo', logoUrl: '/images/brands/valeo.png' },
  { name: 'Mannol', logoUrl: '/images/brands/mannol.png' },
];

export const FeaturedBrands = () => {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  return (
    <section className="pt-12 sm:pt-16 pb-20 sm:pb-32">
      <div className="container mx-auto px-4">
        <div className="mb-10 md:mb-16 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
            Pouzdani brendovi
          </div>
          <h2 className="mt-4 text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">Pouzdani Brendovi</h2>
          <p className="mt-3 text-slate-600 max-w-2xl">Nudimo samo provjerene brendove koji garantiraju kvalitet i dugotrajnost.</p>
        </div>

        <div className="rounded-3xl border-2 border-primary/30 bg-white p-8 md:p-12 shadow-lg">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 md:gap-8">
            {brands.map((brand) => (
              <div
                key={brand.name}
                className="relative group"
              >
                {/* Brand Card */}
                <button
                  onClick={() => setOpenDropdown(openDropdown === brand.name ? null : brand.name)}
                  className="w-full flex items-center justify-center rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-primary/5 to-primary/10 h-24 sm:h-32 md:h-36 p-4 grayscale opacity-70 hover:grayscale-0 hover:opacity-100 hover:border-primary hover:shadow-lg transition-all duration-300 relative"
                  title={brand.name}
                >
                  <Image
                    src={brand.logoUrl}
                    alt={brand.name}
                    width={180}
                    height={72}
                    className="object-contain max-h-10 sm:max-h-12 md:max-h-14 w-auto"
                    loading="lazy"
                    sizes="(max-width: 640px) 45vw, (max-width: 1024px) 22vw, 180px"
                  />

                  {/* Dropdown indicator */}
                  <div className="absolute top-2 right-2 p-1 rounded-lg bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronDown className={`w-4 h-4 text-primary transition-transform ${openDropdown === brand.name ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {/* Dropdown Menu */}
                {openDropdown === brand.name && (
                  <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white border-2 border-primary/40 rounded-2xl shadow-xl overflow-hidden">
                    <Link
                      href={`/products?q=${brand.name}`}
                      className="block w-full px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-primary/10 transition-colors border-b border-primary/10"
                    >
                      Pretraži proizvode
                    </Link>
                    <Link
                      href={`/products?q=${brand.name}`}
                      className="block w-full px-4 py-3 text-sm font-semibold text-primary hover:bg-primary/10 transition-colors"
                    >
                      Svi proizvodi od {brand.name}
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
