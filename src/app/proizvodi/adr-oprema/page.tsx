import type { Metadata } from 'next';
import Link from 'next/link';
import { db } from '@/lib/db';
import ProductsResults from '@/components/ProductsResults';

export const metadata: Metadata = {
  title: 'ADR oprema za prijevoz opasnih materija – Tešanj, BiH | TP Omerbašić',
  description:
    'ADR oprema za prijevoz opasnih materija – trokutovi, prsluci, oznake, ploče i dodatna sigurnosna oprema uz stručnu podršku i isporuku širom BiH.',
  alternates: {
    canonical: '/proizvodi/adr-oprema',
  },
};

export default async function AdrEquipmentHubPage() {
  const category = await db.category.findFirst({
    where: { name: 'ADR oprema' },
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
            <span className="text-slate-800 font-medium">ADR oprema</span>
          </nav>

          <h1 className="text-3xl md:text-4xl font-bold text-primary mb-4">
            ADR oprema za prijevoz opasnih materija – Tešanj, BiH
          </h1>

          <div className="space-y-3 text-slate-700 max-w-3xl text-sm md:text-base">
            <p>
              Ako se bavite prijevozom opasnih materija, ispravna ADR oprema je zakonska obaveza i ključna za sigurnost
              ljudi, vozila i robe. TP Omerbašić vam nudi kompletnu opremu u skladu sa važećim propisima.
            </p>
            <p>
              U ponudi su ADR prsluci, trokutovi, ploče, naljepnice, aparati i dodatna sigurnosna oprema. Pomažemo vam
              da odaberete tačno ono što je potrebno za vašu vrstu prijevoza.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {categoryId && (
              <Link
                href={`/products?categoryId=${categoryId}`}
                className="inline-flex items-center px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary via-primary-dark to-primary text-white text-sm font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
              >
                Pogledaj ADR opremu u katalogu
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
              Izdvojena ADR oprema iz kataloga
            </h2>
            <ProductsResults filters={{ categoryId }} />
          </section>
        )}
      </div>
    </main>
  );
}
