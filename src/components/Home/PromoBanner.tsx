import Link from "next/link";
import { Percent, Headphones, Truck, Receipt, ShieldCheck, Users } from "lucide-react";

export function PromoBanner() {
  return (
    <section className="mb-12">
      <div className="relative overflow-hidden rounded-3xl border border-sunfire-200/60 bg-white">
        {/* Dense grid background overlay */}
        <div
          className="pointer-events-none absolute inset-0 z-0 opacity-65"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(100,116,139,0.14) 1px, transparent 1px), linear-gradient(to bottom, rgba(100,116,139,0.14) 1px, transparent 1px)",
            backgroundSize: "2px 2px",
            maskImage: "radial-gradient(ellipse at center, black 92%, transparent 100%)",
            WebkitMaskImage: "radial-gradient(ellipse at center, black 92%, transparent 100%)",
          }}
        />
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-sunfire-200/40 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-orange-200/30 blur-3xl" />
        <div className="relative z-10 p-7 md:p-12">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-center">
            <div className="md:col-span-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-sunfire-200/80 bg-sunfire-50/80 px-3 py-1 text-xs font-semibold text-sunfire-700">
                <Users className="w-3.5 h-3.5" /> B2B program
              </div>
              <h3 className="mt-3 text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">Specijalne pogodnosti za B2B partnere</h3>
              <p className="mt-2 text-slate-700 max-w-2xl">Ostvarite bolje cijene, prioritetnu podršku i bržu isporuku kroz partnerstvo za firme, servise i trgovine.</p>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3">
                  <div className="rounded-md bg-sunfire-100 p-2"><Percent className="w-4 h-4 text-sunfire-700" /></div>
                  <div>
                    <div className="text-slate-900 font-semibold leading-tight">Posebne cijene i rabati</div>
                    <div className="text-slate-600 text-sm">Individualni popusti i korporativne cijene.</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3">
                  <div className="rounded-md bg-sunfire-100 p-2"><Headphones className="w-4 h-4 text-sunfire-700" /></div>
                  <div>
                    <div className="text-slate-900 font-semibold leading-tight">Prioritetna podrška</div>
                    <div className="text-slate-600 text-sm">Dedicirani kontakt i brza obrada upita.</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3">
                  <div className="rounded-md bg-sunfire-100 p-2"><Truck className="w-4 h-4 text-sunfire-700" /></div>
                  <div>
                    <div className="text-slate-900 font-semibold leading-tight">Brža isporuka</div>
                    <div className="text-slate-600 text-sm">Prioritetna obrada narudžbi i isporuke.</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3">
                  <div className="rounded-md bg-sunfire-100 p-2"><Receipt className="w-4 h-4 text-sunfire-700" /></div>
                  <div>
                    <div className="text-slate-900 font-semibold leading-tight">Računi i fakturisanje</div>
                    <div className="text-slate-600 text-sm">Ugovoreni rokovi plaćanja za partnere.</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3">
                  <div className="rounded-md bg-sunfire-100 p-2"><ShieldCheck className="w-4 h-4 text-sunfire-700" /></div>
                  <div>
                    <div className="text-slate-900 font-semibold leading-tight">Provjereni brendovi</div>
                    <div className="text-slate-600 text-sm">Garancija i podrška proizvođača.</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="md:col-span-2 flex flex-col items-stretch gap-3">
              <Link href="/b2b" className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-sunfire-600 text-white hover:bg-sunfire-700 shadow-md">
                Postani B2B partner
              </Link>
              <Link href="/contact" className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white border border-slate-200 text-slate-800 hover:bg-slate-50">
                Kontaktiraj prodaju
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
