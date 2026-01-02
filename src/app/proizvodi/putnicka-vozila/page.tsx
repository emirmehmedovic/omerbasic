import type { Metadata } from 'next';
import Link from 'next/link';
import { db } from '@/lib/db';
import ProductsResults from '@/components/ProductsResults';
import { seoAutodijeloviPages } from '@/lib/seo-autodijelovi-pages';

export const metadata: Metadata = {
  title: 'Autodijelovi za putnička vozila – Tešanj, BiH | TP Omerbašić',
  description:
    'Autodijelovi za putnička vozila u Tešnju i Jelahu – veliki lager, brza dostava širom BiH i stručna podrška. TP Omerbašić, Rosulje bb, Jelah.',
  alternates: {
    canonical: '/proizvodi/putnicka-vozila',
  },
};

export default async function PassengerCarsHubPage() {
  const category = await db.category.findFirst({
    where: { name: 'Putnička vozila' },
  });

  const categoryId = category?.id;
  const popularModelSlugs = [
    'vw-golf-4',
    'vw-golf-5',
    'vw-golf-6',
    'vw-golf-7',
    'vw-passat-6',
    'vw-passat-7',
    'audi-a4',
    'audi-a6',
  ];
  const filterSlugs = ['filteri-goriva', 'filteri-ulja', 'filteri-mjenjaca'];

  const popularModels = seoAutodijeloviPages.filter((page) => popularModelSlugs.includes(page.slug));
  const filterPages = seoAutodijeloviPages.filter((page) => filterSlugs.includes(page.slug));

  const filters = categoryId ? { categoryId } : {};

  return (
    <main className="bg-app min-h-screen">
      <div className="container mx-auto px-4 py-10 max-w-6xl">
        <div className="mb-8">
          <nav className="mb-3 text-sm text-slate-600 flex flex-wrap gap-1">
            <Link href="/" className="hover:text-primary">
              Početna
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-medium">Autodijelovi za putnička vozila</span>
          </nav>

          <h1 className="text-3xl md:text-4xl font-bold text-primary mb-4">
            Autodijelovi za putnička vozila – Tešanj, BiH
          </h1>

          <div className="space-y-3 text-slate-700 max-w-3xl text-sm md:text-base">
            <p>
              TP Omerbašić je specijalizovana prodavnica autodijelova za putnička vozila. Kod nas ćete pronaći
              veliki izbor dijelova za najčešće brendove i modele vozila, uz stručnu podršku i brzu isporuku širom BiH.
            </p>
            <p>
              Nalazimo se u Jelahu (Tešanj), na adresi Rosulje bb. Ako niste sigurni koji dio odgovara vašem vozilu,
              naš tim će vam pomoći na osnovu marke, modela, generacije i šifre motora.
            </p>
            <p>
              Za hitne upite nas možete kontaktirati na 032/666-658 ili 061-962-359, ili poslati upit preko kontakt
              forme.
            </p>
          </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {categoryId && (
              <Link
                href={`/products?categoryId=${categoryId}`}
                className="inline-flex items-center px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary via-primary-dark to-primary text-white text-sm font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
              >
                Pogledaj sve autodijelove za putnička vozila
              </Link>
            )}
            <Link
              href="/products"
              className="inline-flex items-center px-5 py-2.5 rounded-xl bg-white text-sm font-semibold text-primary border border-primary/20 shadow-sm hover:bg-primary/5 hover:-translate-y-0.5 transition-all"
            >
              Otvori katalog i filtere
          </Link>
        </div>

        <section className="mt-10">
          <h2 className="text-2xl font-bold text-primary mb-4">Popularni modeli</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {popularModels.map((page) => (
              <Link
                key={page.slug}
                href={`/autodijelovi/${page.slug}`}
                className="rounded-xl border border-white/60 bg-white/80 px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                {page.h1}
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-bold text-primary mb-4">Filteri za putnička vozila</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filterPages.map((page) => (
              <Link
                key={page.slug}
                href={`/autodijelovi/${page.slug}`}
                className="rounded-xl border border-white/60 bg-white/80 px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                {page.h1}
              </Link>
            ))}
          </div>
        </section>
      </div>

        {/* Mali katalog direktno na hub stranici – koristi postojeći ProductsResults */}
        {categoryId && (
          <section className="mt-8">
            <h2 className="text-2xl font-bold text-primary mb-4">
              Izdvojeni proizvodi za putnička vozila
            </h2>
            <ProductsResults filters={{ categoryId }} source="passenger-hub" />
          </section>
        )}
      </div>
    </main>
  );
}
