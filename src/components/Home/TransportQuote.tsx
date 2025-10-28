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
      <div className="rounded-3xl border border-sunfire-200/60 bg-white/40 backdrop-blur shadow-md overflow-hidden p-1">
        <div className="relative rounded-[22px] overflow-hidden bg-gradient-to-br from-white/90 to-sunfire-50/60">
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
          <div className="relative z-10 p-6 md:p-10">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-start">
              {/* Info panel */}
              <div className="md:col-span-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-sunfire-200/60 bg-white/70 px-3 py-1 text-xs font-semibold text-sunfire-700">Transport iz EU</div>
                <h2 className="mt-3 text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">Siguran transport vozila iz EU u BiH</h2>
                <p className="mt-2 text-slate-600">Brza organizacija prevoza, carinska koordinacija i isporuka na vašu adresu. Zatražite okvirnu cijenu u 1 minuti.</p>

                <div className="mt-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-sunfire-200/60 p-2"><MapPin className="w-4 h-4 text-sunfire-700" /></div>
                    <div>
                      <div className="text-slate-900 font-semibold">Preuzimanje širom EU</div>
                      <div className="text-slate-600 text-sm">Njemačka, Austrija, Slovenija, Italija, Nizozemska i druge zemlje.</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-sunfire-200/60 p-2"><Truck className="w-4 h-4 text-sunfire-700" /></div>
                    <div>
                      <div className="text-slate-900 font-semibold">Brza isporuka</div>
                      <div className="text-slate-600 text-sm">Prosječno 3–7 dana, uz stalno informisanje o statusu.</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-sunfire-200/60 p-2"><Mail className="w-4 h-4 text-sunfire-700" /></div>
                    <div>
                      <div className="text-slate-900 font-semibold">Brza ponuda</div>
                      <div className="text-slate-600 text-sm">Odgovaramo u najkraćem roku sa jasnim koracima i cijenom.</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form panel */}
              <div className="md:col-span-3">
                <form onSubmit={handleSubmit} className="rounded-2xl border border-sunfire-200/60 bg-white/80 backdrop-blur shadow p-5 md:p-6">
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

                  <div className="mt-4 flex flex-col sm:flex-row items-center gap-3">
                    <button type="submit" disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sunfire-600 to-sunfire-500 px-6 py-3 text-white font-semibold hover:from-sunfire-700 hover:to-sunfire-600 disabled:opacity-60 shadow">
                      {loading ? "Slanje…" : (<><Send className="w-4 h-4" /> Zatraži ponudu</>)}
                    </button>
                    <span className="text-xs text-slate-500">Ili nas kontaktirajte: veleprodajatpo@gmail.com • 032/666-658 • 061-962-359</span>
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
