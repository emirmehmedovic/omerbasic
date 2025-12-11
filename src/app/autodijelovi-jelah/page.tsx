import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Autodijelovi Jelah – TP Omerbašić | Prodavnica auto dijelova Rosulje bb',
  description:
    'Autodijelovi Jelah – TP Omerbašić, Rosulje bb. Lokalna prodavnica autodijelova za putnička i teretna vozila, ADR opremu i opremu za autopraonice.',
};

export default function AutodijeloviJelahPage() {
  return (
    <main className="bg-app min-h-screen">
      <div className="container mx-auto px-4 py-10 max-w-4xl">
        <nav className="mb-4 text-sm text-slate-600 flex flex-wrap gap-1">
          <Link href="/" className="hover:text-primary">
            Početna
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-medium">Autodijelovi Jelah</span>
        </nav>

        <h1 className="text-3xl md:text-4xl font-bold text-primary mb-4">
          Autodijelovi Jelah – TP Omerbašić
        </h1>

        <div className="space-y-4 text-slate-700 text-sm md:text-base mb-8 max-w-3xl">
          <p>
            TP Omerbašić je lokalna prodavnica autodijelova u Jelahu, na adresi Rosulje bb. Snabdijevamo kupce iz
            Jelaha, Tešnja i šire okoline dijelovima za putnička i teretna vozila.
          </p>
          <p>
            U ponudi su originalni i zamjenski dijelovi, ADR oprema i oprema za autopraonice. Pomažemo pri odabiru
            dijelova u skladu sa vašim vozilom i načinom korištenja.
          </p>
        </div>

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-primary mb-3">Kako nas pronaći u Jelahu?</h2>
          <p className="text-slate-700 text-sm md:text-base mb-3">
            Prodavnica se nalazi u naselju Rosulje bb, uz glavnu cestu kroz Jelah:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-700 text-sm md:text-base">
            <li>Vidljiva tabla TP Omerbašić uz cestu.</li>
            <li>Parking ispred objekta za putnička i manja teretna vozila.</li>
          </ul>
          <p className="mt-3 text-slate-700 text-sm md:text-base">
            U navigaciji potražite <span className="font-semibold">"TP Omerbašić Rosulje Jelah"</span> kako biste dobili tačnu rutu.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-primary mb-3">Prednosti za kupce iz Jelaha</h2>
          <ul className="list-disc list-inside space-y-1 text-slate-700 text-sm md:text-base">
            <li>Blizina prodavnice i mogućnost brzog preuzimanja dijelova.</li>
            <li>Mogućnost narudžbe dijelova koji nisu trenutno na lageru.</li>
            <li>Podrška pri pronalasku pravog dijela za vaše vozilo.</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-primary mb-3">Kontakt i online katalog</h2>
          <p className="text-slate-700 text-sm md:text-base mb-3">
            Za informacije o dostupnosti dijelova i cijenama, javite nam se ili otvorite online katalog:
          </p>
          <ul className="space-y-1 text-slate-800 text-sm md:text-base mb-4">
            <li>
              Telefon: <a href="tel:+38732666658" className="text-primary font-semibold hover:underline">032/666-658</a>
            </li>
            <li>
              Mobitel: <a href="tel:+38761962359" className="text-primary font-semibold hover:underline">061-962-359</a>
            </li>
            <li>
              Email: <a href="mailto:veleprodajatpo@gmail.com" className="text-primary font-semibold hover:underline">veleprodajatpo@gmail.com</a>
            </li>
          </ul>

          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/products"
              className="inline-flex items-center px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary via-primary-dark to-primary text-white text-sm font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
            >
              Otvori katalog autodijelova
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center px-5 py-2.5 rounded-xl bg-white text-sm font-semibold text-primary border border-primary/20 shadow-sm hover:bg-primary/5 hover:-translate-y-0.5 transition-all"
            >
              Pošalji upit preko kontakt forme
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
