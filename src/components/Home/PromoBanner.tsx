import Link from "next/link";
import { Percent, Headphones, Truck, Receipt, ShieldCheck, Users } from "lucide-react";

export function PromoBanner() {
  return (
    <section className="mb-20">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 shadow-xl">
        {/* Tekstura overlay */}
        <div
          className="pointer-events-none absolute inset-0 z-0 opacity-[0.04]"
          style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(27,58,95,0.2) 1px, transparent 0), radial-gradient(circle at 50% 50%, rgba(255,107,53,0.08) 0%, transparent 70%)',
            backgroundSize: '32px 32px, 100% 100%'
          }}
        />
        <div className="relative z-10 p-8 md:p-12">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-center">
            <div className="md:col-span-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#E85A28] to-[#FF6B35] px-4 py-2 text-sm font-bold text-white shadow-lg">
                <Users className="w-4 h-4" /> B2B program
              </div>
              <h3 className="mt-4 text-3xl md:text-4xl font-extrabold tracking-tight text-primary">Specijalne pogodnosti za B2B partnere</h3>
              <p className="mt-2 text-slate-700 max-w-2xl">Ostvarite bolje cijene, prioritetnu podršku i bržu isporuku kroz partnerstvo za firme, servise i trgovine.</p>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3 rounded-xl border border-white/60 bg-white/90 backdrop-blur-sm p-4 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300">
                  <div className="rounded-xl bg-gradient-to-br from-primary to-primary-dark p-2.5 shadow-lg"><Percent className="w-5 h-5 text-white" /></div>
                  <div>
                    <div className="text-primary font-bold leading-tight">Posebne cijene i rabati</div>
                    <div className="text-slate-600 text-sm font-medium">Individualni popusti i korporativne cijene.</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-xl border border-white/60 bg-white/90 backdrop-blur-sm p-4 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300">
                  <div className="rounded-xl bg-gradient-to-br from-primary to-primary-dark p-2.5 shadow-lg"><Headphones className="w-5 h-5 text-white" /></div>
                  <div>
                    <div className="text-primary font-bold leading-tight">Prioritetna podrška</div>
                    <div className="text-slate-600 text-sm font-medium">Dedicirani kontakt i brza obrada upita.</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-xl border border-white/60 bg-white/90 backdrop-blur-sm p-4 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300">
                  <div className="rounded-xl bg-gradient-to-br from-primary to-primary-dark p-2.5 shadow-lg"><Truck className="w-5 h-5 text-white" /></div>
                  <div>
                    <div className="text-primary font-bold leading-tight">Brža isporuka</div>
                    <div className="text-slate-600 text-sm font-medium">Prioritetna obrada narudžbi i isporuke.</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-xl border border-white/60 bg-white/90 backdrop-blur-sm p-4 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300">
                  <div className="rounded-xl bg-gradient-to-br from-primary to-primary-dark p-2.5 shadow-lg"><Receipt className="w-5 h-5 text-white" /></div>
                  <div>
                    <div className="text-primary font-bold leading-tight">Računi i fakturisanje</div>
                    <div className="text-slate-600 text-sm font-medium">Ugovoreni rokovi plaćanja za partnere.</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-xl border border-white/60 bg-white/90 backdrop-blur-sm p-4 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300">
                  <div className="rounded-xl bg-gradient-to-br from-primary to-primary-dark p-2.5 shadow-lg"><ShieldCheck className="w-5 h-5 text-white" /></div>
                  <div>
                    <div className="text-primary font-bold leading-tight">Provjereni brendovi</div>
                    <div className="text-slate-600 text-sm font-medium">Garancija i podrška proizvođača.</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="md:col-span-2 flex flex-col items-stretch gap-4">
              <Link href="/b2b" className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-gradient-to-r from-primary via-primary-dark to-primary text-white font-bold shadow-xl hover:shadow-2xl transform hover:-translate-y-0.5 transition-all duration-300">
                Postani B2B partner
              </Link>
              <Link href="/contact" className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-white/90 backdrop-blur-sm border border-white/60 text-primary font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300">
                Kontaktiraj prodaju
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
