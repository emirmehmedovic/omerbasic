import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Ulja i maziva za putnička i teretna vozila – TP Omerbašić',
  description:
    'Motorna ulja, mjenjačka ulja, hidraulična ulja i maziva za putnička i teretna vozila. TP Omerbašić – snabdijevanje uljima i mazivima za Tešanj, Jelah i cijelu BiH.',
  alternates: {
    canonical: '/ulja-i-maziva',
  },
};

export default function UljaIMazivaPage() {
  return (
    <main className="bg-app min-h-screen">
      <div className="container mx-auto px-4 py-10 max-w-4xl">
        <nav className="mb-4 text-sm text-slate-600 flex flex-wrap gap-1">
          <Link href="/" className="hover:text-primary">
            Početna
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-medium">Ulja i maziva</span>
        </nav>

        <h1 className="text-3xl md:text-4xl font-bold text-primary mb-4">
          Ulja i maziva za putnička i teretna vozila
        </h1>

        <div className="space-y-4 text-slate-700 text-sm md:text-base mb-8 max-w-3xl">
          <p>
            TP Omerbašić nudi motorna ulja, mjenjačka ulja, hidraulična ulja i druga maziva za putnička i teretna vozila.
            U ponudi su proizvodi za svakodnevnu upotrebu, flotna vozila i zahtjevnije industrijske primjene.
          </p>
          <p>
            Pomažemo pri odabiru odgovarajućeg ulja na osnovu specifikacija proizvođača vozila, tipa motora i uslova
            eksploatacije.
          </p>
        </div>

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-primary mb-3">Šta možete pronaći kod nas?</h2>
          <ul className="list-disc list-inside space-y-1 text-slate-700 text-sm md:text-base">
            <li>Motorna ulja za benzinske i dizel motore.</li>
            <li>Mjenjačka i diferencijalna ulja.</li>
            <li>Hidraulična ulja i specijalna maziva.</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-primary mb-3">Kontakt i katalog ulja</h2>
          <p className="text-slate-700 text-sm md:text-base mb-3">
            Za provjeru dostupnosti brendova i specifikacija ulja, javite nam se ili otvorite online katalog:
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
              Otvori katalog autodijelova i ulja
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
