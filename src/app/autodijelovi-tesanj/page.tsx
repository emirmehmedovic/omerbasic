import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Autodijelovi Tešanj – TP Omerbašić | Prodavnica auto dijelova Jelah',
  description:
    'Autodijelovi Tešanj i Jelah – TP Omerbašić, Rosulje bb, Jelah. Veliki lager, brza dostava širom BiH i stručna podrška za putnička i teretna vozila.',
};

export default function AutodijeloviTesanjPage() {
  return (
    <main className="bg-app min-h-screen">
      <div className="container mx-auto px-4 py-10 max-w-4xl">
        <nav className="mb-4 text-sm text-slate-600 flex flex-wrap gap-1">
          <Link href="/" className="hover:text-primary">
            Početna
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-medium">Autodijelovi Tešanj</span>
        </nav>

        <h1 className="text-3xl md:text-4xl font-bold text-primary mb-4">
          Autodijelovi Tešanj – TP Omerbašić
        </h1>

        <div className="space-y-4 text-slate-700 text-sm md:text-base mb-8 max-w-3xl">
          <p>
            TP Omerbašić je prodavnica autodijelova koja pokriva područje Tešnja, Jelaha i okolnih mjesta. Na adresi
            Rosulje bb (Jelah) nalazimo se uz magistralni put, sa jednostavnim pristupom i parkingom ispred objekta.
          </p>
          <p>
            U ponudi imamo dijelove za putnička i teretna vozila, ADR opremu i opremu za autopraonice. Naš tim pomaže
            pri odabiru odgovarajućih dijelova na osnovu marke, modela, generacije i šifre motora.
          </p>
          <p>
            Kupcima iz Tešnja nudimo brzu isporuku, rezervacije dijelova i mogućnost narudžbe specifičnih artikala po
            potrebi.
          </p>
        </div>

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-primary mb-3">Kako do nas iz Tešnja?</h2>
          <p className="text-slate-700 text-sm md:text-base mb-3">
            Prodavnica se nalazi u Jelahu, naselje Rosulje bb, nekoliko minuta vožnje od centra Tešnja:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-700 text-sm md:text-base">
            <li>Vozite prema Jelahu i pratite putokaze za poslovnu zonu i naselje Rosulje.</li>
            <li>Objekat TP Omerbašić nalazi se uz glavnu cestu, sa vidljivom tablom i parkingom ispred prodavnice.</li>
          </ul>
          <p className="mt-3 text-slate-700 text-sm md:text-base">
            Za navigaciju možete koristiti Google Maps unos <span className="font-semibold">"TP Omerbašić Rosulje Jelah"</span>.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-primary mb-3">Zašto kupci iz Tešnja biraju TP Omerbašić?</h2>
          <ul className="list-disc list-inside space-y-1 text-slate-700 text-sm md:text-base">
            <li>Veliki lager autodijelova za najčešće modele vozila u BiH.</li>
            <li>Stručna podrška pri odabiru dijelova prema vozilu i namjeni.</li>
            <li>Brza dostava širom BiH i mogućnost preuzimanja u prodavnici.</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-primary mb-3">Kontakt i katalog autodijelova</h2>
          <p className="text-slate-700 text-sm md:text-base mb-3">
            Ako tražite autodijelove u Tešnju ili okolini, kontaktirajte nas ili otvorite online katalog:
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
