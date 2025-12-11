import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Oprema za autopraonice – rješenja i snabdijevanje | TP Omerbašić',
  description:
    'Oprema za autopraonice, kemija i potrošni materijal – TP Omerbašić pomaže novim i postojećim autopraonicama u odabiru opreme i snabdijevanju.',
};

export default function OpremaZaAutopraoniceServicePage() {
  return (
    <main className="bg-app min-h-screen">
      <div className="container mx-auto px-4 py-10 max-w-4xl">
        <nav className="mb-4 text-sm text-slate-600 flex flex-wrap gap-1">
          <Link href="/" className="hover:text-primary">
            Početna
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-medium">Oprema za autopraonice</span>
        </nav>

        <h1 className="text-3xl md:text-4xl font-bold text-primary mb-4">
          Oprema za autopraonice i kemija za pranje vozila
        </h1>

        <div className="space-y-4 text-slate-700 text-sm md:text-base mb-8 max-w-3xl">
          <p>
            TP Omerbašić snabdijeva opremu i potrošni materijal za autopraonice – od visokotlačnih perača i usisivača,
            do kemije za pranje i održavanje vozila. Podržavamo nove i postojeće autopraonice širom BiH.
          </p>
          <p>
            Pomažemo pri odabiru opreme u skladu sa kapacitetom praonice, lokacijom i tipom usluge koju nudite
            (samouslužne, portali, ručno pranje itd.).
          </p>
        </div>

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-primary mb-3">Za koga je ova ponuda?</h2>
          <ul className="list-disc list-inside space-y-1 text-slate-700 text-sm md:text-base">
            <li>Nove autopraonice u fazi planiranja ili otvaranja.</li>
            <li>Postojeće autopraonice koje žele unaprijediti opremu ili kemiju.</li>
            <li>Servisi i poslovni korisnici koji trebaju opremu za interno pranje vozila.</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-primary mb-3">Sljedeći koraci</h2>
          <ol className="list-decimal list-inside space-y-1 text-slate-700 text-sm md:text-base">
            <li>Kontaktirajte nas sa osnovnim informacijama o vašoj praonici i planiranom obimu posla.</li>
            <li>Zajedno definišemo potrebnu opremu i potrošni materijal.</li>
            <li>Preporučujemo konkretne proizvode i rješenja iz našeg kataloga.</li>
          </ol>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-primary mb-3">Kontakt i katalog opreme</h2>
          <p className="text-slate-700 text-sm md:text-base mb-3">
            Za ponude i savjete vezane za opremu autopraonica, javite nam se ili otvorite katalog opreme i kemije:
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
              href="/proizvodi/oprema-za-autopraonice"
              className="inline-flex items-center px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary via-primary-dark to-primary text-white text-sm font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
            >
              Katalog opreme za autopraonice
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
