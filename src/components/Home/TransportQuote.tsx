'use client';

import { useState } from "react";
import { Truck, MapPin, Mail, Phone, User, Car as CarIcon, Send } from "lucide-react";

export function TransportQuote() {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    origin: "",
    destination: "Jelah, BiH",
    vehicle: "",
    message: "",
  });

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!form.name || !form.phone || !form.origin || !form.vehicle) {
      alert("Molimo popunite obavezna polja: Ime i prezime, Telefon, Polazište, Vozilo.");
      return;
    }
    setLoading(true);
    try {
      const subject = encodeURIComponent("Upit za transport vozila iz EU");
      const body = encodeURIComponent(
        `Ime i prezime: ${form.name}\n` +
          `Email: ${form.email || "-"}\n` +
          `Telefon: ${form.phone}\n` +
          `Polazište (zemlja/grad): ${form.origin}\n` +
          `Odredište: ${form.destination || "Jelah, BiH"}\n` +
          `Vozilo (marka/model/godina): ${form.vehicle}\n` +
          `Napomena: ${form.message || "-"}`
      );
      window.location.href = `mailto:veleprodajatpo@gmail.com?subject=${subject}&body=${body}`;
    } finally {
      setTimeout(() => setLoading(false), 600);
    }
  };

  return (
    <section className="mb-20">
      <div className="rounded-3xl bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 shadow-xl overflow-hidden">
        <div className="relative rounded-3xl overflow-hidden">
          {/* Tekstura overlay */}
          <div
            className="pointer-events-none absolute inset-0 z-0 opacity-[0.04]"
            style={{
              backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(27,58,95,0.2) 1px, transparent 0), radial-gradient(circle at 50% 50%, rgba(255,107,53,0.08) 0%, transparent 70%)',
              backgroundSize: '32px 32px, 100% 100%'
            }}
          />
          <div className="relative z-10 p-6 md:p-10">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-start">
              {/* Info panel */}
              <div className="md:col-span-2">
                <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#E85A28] to-[#FF6B35] px-4 py-2 text-sm font-bold text-white shadow-lg">
                  <Truck className="w-4 h-4" />
                  Transport iz EU
                </div>
                <h2 className="mt-4 text-3xl md:text-4xl font-extrabold tracking-tight text-primary">Siguran transport vozila iz EU u BiH</h2>
                <p className="mt-2 text-slate-600">Brza organizacija prevoza, carinska koordinacija i isporuka na vašu adresu. Zatražite okvirnu cijenu u 1 minuti.</p>

                <div className="mt-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-gradient-to-br from-primary to-primary-dark p-2.5 shadow-lg"><MapPin className="w-5 h-5 text-white" /></div>
                    <div>
                      <div className="text-primary font-bold text-lg">Preuzimanje širom EU</div>
                      <div className="text-slate-600 text-sm font-medium">Njemačka, Austrija, Slovenija, Italija, Nizozemska i druge zemlje.</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-gradient-to-br from-primary to-primary-dark p-2.5 shadow-lg"><Truck className="w-5 h-5 text-white" /></div>
                    <div>
                      <div className="text-primary font-bold text-lg">Brza isporuka</div>
                      <div className="text-slate-600 text-sm font-medium">Prosječno 3–7 dana, uz stalno informisanje o statusu.</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-gradient-to-br from-primary to-primary-dark p-2.5 shadow-lg"><Mail className="w-5 h-5 text-white" /></div>
                    <div>
                      <div className="text-primary font-bold text-lg">Brza ponuda</div>
                      <div className="text-slate-600 text-sm font-medium">Odgovaramo u najkraćem roku sa jasnim koracima i cijenom.</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form panel */}
              <div className="md:col-span-3">
                <form onSubmit={handleSubmit} className="rounded-2xl border border-white/60 bg-white/90 backdrop-blur-sm shadow-xl p-6 md:p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Ime i prezime*</label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input name="name" value={form.name} onChange={onChange} className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-sunfire-200" placeholder="Vaše ime i prezime" />
                      </div>
                    </div>
                    <div className="relative">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Telefon*</label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input name="phone" value={form.phone} onChange={onChange} className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-sunfire-200" placeholder="npr. +387 61 000 000" />
                      </div>
                    </div>
                    <div className="relative">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input name="email" type="email" value={form.email} onChange={onChange} className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-sunfire-200" placeholder="vas@email.com" />
                      </div>
                    </div>
                    <div className="relative">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Polazište (zemlja/grad)*</label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input name="origin" value={form.origin} onChange={onChange} className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-sunfire-200" placeholder="npr. Njemačka, Berlin" />
                      </div>
                    </div>
                    <div className="relative">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Odredište</label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input name="destination" value={form.destination} onChange={onChange} className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-sunfire-200" />
                      </div>
                    </div>
                    <div className="relative">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Vozilo (marka/model/godina)*</label>
                      <div className="relative">
                        <CarIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input name="vehicle" value={form.vehicle} onChange={onChange} className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-sunfire-200" placeholder="npr. VW Golf 7, 2016" />
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Napomena</label>
                      <textarea name="message" value={form.message} onChange={onChange} rows={4} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-sunfire-200" placeholder="Dodatne informacije (link na oglas, rok isporuke, itd.)" />
                    </div>
                  </div>

                  <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
                    <button type="submit" disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary via-primary-dark to-primary px-8 py-3.5 text-white font-bold hover:shadow-2xl shadow-xl disabled:opacity-60 transition-all duration-300 transform hover:-translate-y-0.5">
                      {loading ? "Slanje…" : (<><Send className="w-5 h-5" /> Zatraži ponudu</>)}
                    </button>
                    <span className="text-xs text-slate-600 font-medium">Ili nas kontaktirajte: veleprodajatpo@gmail.com • 032/666-658 • 061-962-359</span>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
