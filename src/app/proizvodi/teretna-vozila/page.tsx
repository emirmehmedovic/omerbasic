import type { Metadata } from 'next';
import Link from 'next/link';
import { db } from '@/lib/db';
import ProductsResults from '@/components/ProductsResults';

export const metadata: Metadata = {
  title: 'Kamionski dijelovi i autodijelovi za teretna vozila – Tešanj, BiH | TP Omerbašić',
  description:
    'Kamionski dijelovi i autodijelovi za teretna vozila u Tešnju i Jelahu – veliki lager, brza dostava širom BiH i stručna podrška za transportne firme i servise.',
  alternates: {
    canonical: '/proizvodi/teretna-vozila',
  },
};

export default async function TruckHubPage() {
  const category = await db.category.findFirst({
    where: { name: 'Teretna vozila' },
  });

  const categoryId = category?.id;

  return (
    <main className="bg-app min-h-screen">
      <div className="container mx-auto px-4 py-10 max-w-6xl">
        <div className="mb-8">
          <nav className="mb-3 text-sm text-slate-600 flex flex-wrap gap-1">
            <Link href="/" className="hover:text-primary">
              Početna
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-medium">Kamionski dijelovi i teretna vozila</span>
          </nav>

          <h1 className="text-3xl md:text-4xl font-bold text-primary mb-4">
            Kamionski dijelovi i autodijelovi za teretna vozila – Tešanj, BiH
          </h1>

          <div className="space-y-3 text-slate-700 max-w-3xl text-sm md:text-base">
            <p>
              TP Omerbašić nudi širok asortiman dijelova za teretna vozila, kamione i dostavna vozila. Bilo da se
              bavite transportom ili vodite servis, kod nas možete pronaći ključne dijelove za pouzdan rad vaše flote.
            </p>
            <p>
              Pomažemo vam pri odabiru pravog dijela na osnovu šasije, modela vozila i namjene. Naša lokacija u Jelahu
              (Tešanj) omogućava brzu isporuku i preuzimanje, a dostavu radimo širom BiH.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {categoryId && (
              <Link
                href={`/products?categoryId=${categoryId}`}
                className="inline-flex items-center px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary via-primary-dark to-primary text-white text-sm font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
              >
                Pogledaj sve dijelove za teretna vozila
              </Link>
            )}
            <Link
              href="/products"
              className="inline-flex items-center px-5 py-2.5 rounded-xl bg-white text-sm font-semibold text-primary border border-primary/20 shadow-sm hover:bg-primary/5 hover:-translate-y-0.5 transition-all"
            >
              Otvori katalog i filtere
            </Link>
          </div>
        </div>

        {categoryId && (
          <section className="mt-8">
            <h2 className="text-2xl font-bold text-primary mb-4">
              Izdvojeni proizvodi za teretna vozila
            </h2>
            <ProductsResults filters={{ categoryId }} />
          </section>
        )}
      </div>
    </main>
  );
}
