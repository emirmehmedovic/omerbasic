import type { Metadata } from 'next';
import Link from 'next/link';
import { db } from '@/lib/db';
import ProductsResults from '@/components/ProductsResults';

export const metadata: Metadata = {
  title: 'Oprema za autopraonice i kemija – Tešanj, BiH | TP Omerbašić',
  description:
    'Oprema za autopraonice, usisivači, pumpe, dodatna oprema i kemija za pranje vozila. Podrška za praonice u Tešnju, Jelahu i širom BiH.',
};

export default async function CarWashEquipmentHubPage() {
  const category = await db.category.findFirst({
    where: { name: 'Autopraonice' },
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
            <span className="text-slate-800 font-medium">Oprema za autopraonice</span>
          </nav>

          <h1 className="text-3xl md:text-4xl font-bold text-primary mb-4">
            Oprema za autopraonice i kemija za pranje vozila – Tešanj, BiH
          </h1>

          <div className="space-y-3 text-slate-700 max-w-3xl text-sm md:text-base">
            <p>
              Za kvalitetnu autopraonicu potrebna je pouzdana oprema i provjerena kemija. TP Omerbašić nudi rješenja
              za nove i postojeće autopraonice, od opreme do potrošnog materijala.
            </p>
            <p>
              Bilo da tek otvarate praonicu ili želite optimizirati postojeću, pomoći ćemo vam da odaberete opremu koja
              odgovara vašem prometu, prostoru i tipu usluge.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {categoryId && (
              <Link
                href={`/products?categoryId=${categoryId}`}
                className="inline-flex items-center px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary via-primary-dark to-primary text-white text-sm font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
              >
                Pogledaj opremu za autopraonice u katalogu
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
              Izdvojeni proizvodi za autopraonice
            </h2>
            <ProductsResults filters={{ categoryId }} />
          </section>
        )}
      </div>
    </main>
  );
}
