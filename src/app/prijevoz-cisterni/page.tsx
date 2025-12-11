import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Prijevoz cisterni i opasnih materija – Tešanj, BiH | TP Omerbašić',
  description:
    'Prijevoz cisterni i opasnih materija u skladu sa ADR propisima. TP Omerbašić – partner za siguran transport cisterni u Tešnju, Jelahu i širom BiH.',
};

export default function TankerTransportPage() {
  return (
    <main className="bg-app min-h-screen">
      <div className="container mx-auto px-4 py-10 max-w-4xl">
        <nav className="mb-4 text-sm text-slate-600 flex flex-wrap gap-1">
          <Link href="/" className="hover:text-primary">
            Početna
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-medium">Prijevoz cisterni</span>
        </nav>

        <h1 className="text-3xl md:text-4xl font-bold text-primary mb-4">
          Prijevoz cisterni i opasnih materija – Tešanj, BiH
        </h1>

        <div className="space-y-4 text-slate-700 text-sm md:text-base mb-8">
          <p>
            Za prijevoz cisterni i opasnih materija potrebna je posebna oprema, vozila i iskustvo. TP Omerbašić
            organizuje prijevoz cisterni uz poštivanje ADR standarda i važećih propisa u Bosni i Hercegovini.
          </p>
          <p>
            U saradnji sa partnerima obezbjeđujemo siguran i pouzdan transport, sa fokusom na bezbjednost ljudi,
            infrastrukture i okoliša.
          </p>
        </div>

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-primary mb-3">Vrste prijevoza koje radimo</h2>
          <ul className="list-disc list-inside space-y-1 text-slate-700 text-sm md:text-base">
            <li>Prijevoz praznih i punih cisterni.</li>
            <li>Prijevoz opasnih materija u skladu sa ADR regulativom.</li>
            <li>Dogovoreni transport za industrijske i logističke partnere.</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-primary mb-3">Proces saradnje</h2>
          <ol className="list-decimal list-inside space-y-1 text-slate-700 text-sm md:text-base">
            <li>Kontaktirate nas sa osnovnim informacijama o robi, relaciji i rokovima.</li>
            <li>Dogovaramo optimalan način prijevoza i sve potrebne detalje.</li>
            <li>Organizujemo prijevoz u skladu sa propisima i dogovorenim terminima.</li>
          </ol>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-primary mb-3">Kontakt za prijevoz cisterni</h2>
          <p className="text-slate-700 text-sm md:text-base mb-3">
            Za sve upite vezane za prijevoz cisterni i opasnih materija kontaktirajte nas:
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
