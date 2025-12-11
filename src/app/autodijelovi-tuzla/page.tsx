import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Autodijelovi Tuzla – dostava iz Tešnja/Jelaha | TP Omerbašić',
  description:
    'Autodijelovi Tuzla – TP Omerbašić iz Jelaha (Tešanj) isporučuje dijelove za putnička i teretna vozila u Tuzlu i okolinu. Veliki lager i brza dostava širom BiH.',
};

export default function AutodijeloviTuzlaPage() {
  return (
    <main className="bg-app min-h-screen">
      <div className="container mx-auto px-4 py-10 max-w-4xl">
        <nav className="mb-4 text-sm text-slate-600 flex flex-wrap gap-1">
          <Link href="/" className="hover:text-primary">
            Početna
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-medium">Autodijelovi Tuzla</span>
        </nav>

        <h1 className="text-3xl md:text-4xl font-bold text-primary mb-4">
          Autodijelovi Tuzla – dostava iz Tešnja/Jelaha
        </h1>

        <div className="space-y-4 text-slate-700 text-sm md:text-base mb-8 max-w-3xl">
          <p>
            TP Omerbašić se nalazi u Jelahu (Tešanj), na adresi Rosulje bb, ali redovno isporučujemo autodijelove kupcima
            iz Tuzle i okoline. Kroz kombinaciju lagera i narudžbi, možemo obezbijediti veliki broj dijelova za putnička
            i teretna vozila.
          </p>
          <p>
            Za kupce iz Tuzle omogućavamo telefonske i online upite, provjeru dostupnosti dijelova i organizaciju dostave
            preko brzih dostavnih službi širom BiH.
          </p>
        </div>

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-primary mb-3">Kako naručiti autodijelove za Tuzlu?</h2>
          <ol className="list-decimal list-inside space-y-1 text-slate-700 text-sm md:text-base">
            <li>Kontaktirajte nas telefonom ili putem kontakt forme sa podacima o vozilu i traženom dijelu.</li>
            <li>Provjeravamo dostupnost na lageru ili mogućnost nabavke.</li>
            <li>Dogovaramo cijenu, način plaćanja i dostavu na adresu u Tuzli.</li>
          </ol>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-primary mb-3">Kontakt i online katalog</h2>
          <p className="text-slate-700 text-sm md:text-base mb-3">
            Ako tražite autodijelove za Tuzlu, javite nam se ili otvorite online katalog:
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
