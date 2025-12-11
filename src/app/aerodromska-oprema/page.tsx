import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Aerodromska oprema i dijelovi za aerodromska vozila – BiH | TP Omerbašić',
  description:
    'Dijelovi za aerodromska vozila i aerodromsku opremu – TP Omerbašić, Tešanj/Jelah. Podrška za ground handling, tankere, vučna i specijalna vozila, sa fokusom na teretna vozila.',
};

export default function AerodromskaOpremaPage() {
  return (
    <main className="bg-app min-h-screen">
      <div className="container mx-auto px-4 py-10 max-w-4xl">
        <nav className="mb-4 text-sm text-slate-600 flex flex-wrap gap-1">
          <Link href="/" className="hover:text-primary">
            Početna
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-medium">Aerodromska oprema</span>
        </nav>

        <h1 className="text-3xl md:text-4xl font-bold text-primary mb-4">
          Aerodromska oprema i dijelovi za aerodromska vozila
        </h1>

        <div className="space-y-4 text-slate-700 text-sm md:text-base mb-8 max-w-3xl">
          <p>
            TP Omerbašić snabdijeva dijelove za specijalna vozila koja se koriste na aerodromima – vučna vozila,
            tanker kamione, servisna vozila i drugu prateću opremu. Većina tih vozila je bazirana na šasijama teretnih
            vozila, pa se dijelovi vode u kategoriji kamionskih dijelova.
          </p>
          <p>
            Pomažemo vam da pronađete odgovarajuće dijelove uzimajući u obzir bazno vozilo (marku, model, generaciju),
            namjenu opreme i radne uslove na aerodromu.
          </p>
        </div>

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-primary mb-3">Za koga je ova ponuda?</h2>
          <ul className="list-disc list-inside space-y-1 text-slate-700 text-sm md:text-base">
            <li>Aerodromi i ground handling kompanije.</li>
            <li>Operateri tanker kamiona i cisterni za gorivo.</li>
            <li>Servisi i radionice koje održavaju specijalna aerodromska vozila.</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-primary mb-3">Sljedeći koraci</h2>
          <p className="text-slate-700 text-sm md:text-base mb-3">
            Za većinu aerodromske opreme dijelovi se traže kroz kategoriju teretnih vozila. Preporučujemo da:
          </p>
          <ol className="list-decimal list-inside space-y-1 text-slate-700 text-sm md:text-base">
            <li>Pripremite podatke o vozilu (marka, model, generacija, šifra motora).</li>
            <li>Otvorite katalog dijelova za teretna vozila i filtrirate po vozilu i kategoriji dijela.</li>
            <li>Kontaktirate nas za provjeru dostupnosti i specifične dijelove za aerodromsku opremu.</li>
          </ol>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-primary mb-3">Kontakt i katalog</h2>
          <p className="text-slate-700 text-sm md:text-base mb-3">
            Za upite vezane za aerodromsku opremu i dijelove za aerodromska vozila, javite nam se ili otvorite katalog
            kamionskih dijelova:
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
              href="/proizvodi/teretna-vozila"
              className="inline-flex items-center px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary via-primary-dark to-primary text-white text-sm font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
            >
              Katalog dijelova za teretna vozila
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center px-5 py-2.5 rounded-xl bg-white text-sm font-semibold text-primary border border-primary/20 shadow-sm hover:bg-primary/5 hover:-translate-y-0.5 transition-all"
            >
              Pošalji B2B upit
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
