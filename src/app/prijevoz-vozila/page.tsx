import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Prijevoz vozila – transport automobila Tešanj, BiH | TP Omerbašić',
  description:
    'Prijevoz vozila i transport automobila sa područja Tešnja i Jelaha širom BiH. Siguran utovar, osiguranje i pouzdan partner za šlepanje i transport vozila.',
  alternates: {
    canonical: '/prijevoz-vozila',
  },
};

export default function VehicleTransportPage() {
  return (
    <main className="bg-app min-h-screen">
      <div className="container mx-auto px-4 py-10 max-w-4xl">
        <nav className="mb-4 text-sm text-slate-600 flex flex-wrap gap-1">
          <Link href="/" className="hover:text-primary">
            Početna
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-medium">Prijevoz vozila</span>
        </nav>

        <h1 className="text-3xl md:text-4xl font-bold text-primary mb-4">
          Prijevoz vozila – siguran transport automobila širom BiH
        </h1>

        <div className="space-y-4 text-slate-700 text-sm md:text-base mb-8">
          <p>
            Pored prodaje autodijelova, TP Omerbašić nudi i uslugu prijevoza vozila sa područja Tešnja i Jelaha prema
            ostatku Bosne i Hercegovine. Bilo da je u pitanju havarisano vozilo, uvoz automobila ili prevoz službenih
            vozila, nudimo siguran transport uz dogovorene rokove.
          </p>
          <p>
            Koristimo odgovarajuća vozila za šlepanje i prijevoz, uz pažljiv utovar i istovar. Po potrebi je moguće
            organizovati i prijevoz više vozila u jednoj turi, u dogovoru sa našim timom.
          </p>
        </div>

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-primary mb-3">Za koga je usluga prijevoza vozila?</h2>
          <ul className="list-disc list-inside space-y-1 text-slate-700 text-sm md:text-base">
            <li>Privatne osobe koje kupuju ili prodaju vozilo i trebaju siguran transport.</li>
            <li>Auto servisi i limarije kojima je potreban dovoz ili odvoz vozila.</li>
            <li>Auto kuće i trgovci koji organizuju prevoz više vozila.</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-primary mb-3">Kako izgleda proces?</h2>
          <ol className="list-decimal list-inside space-y-1 text-slate-700 text-sm md:text-base">
            <li>Pozovite nas ili pošaljite upit sa osnovnim informacijama o vozilu i relaciji.</li>
            <li>Dogovaramo termin, cijenu i detalje (lokacija utovara/istovara, posebni zahtjevi).</li>
            <li>Preuzimamo i isporučujemo vozilo na dogovorenu adresu.</li>
          </ol>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-primary mb-3">Kontakt za prijevoz vozila</h2>
          <p className="text-slate-700 text-sm md:text-base mb-3">
            Za sve upite vezane za prijevoz vozila možete nas kontaktirati direktno:
          </p>
          <ul className="space-y-1 text-slate-800 text-sm md:text-base">
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

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/contact"
              className="inline-flex items-center px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary via-primary-dark to-primary text-white text-sm font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
            >
              Pošalji upit preko kontakt forme
            </Link>
            <Link
              href="/transporti"
              className="inline-flex items-center px-5 py-2.5 rounded-xl bg-white text-sm font-semibold text-primary border border-primary/20 shadow-sm hover:bg-primary/5 hover:-translate-y-0.5 transition-all"
            >
              Pogledaj detalje usluga prijevoza
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
