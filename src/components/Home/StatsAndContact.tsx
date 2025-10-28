import Link from "next/link";
import { Star, Award, Users, Truck, Phone, Mail, Clock, MapPin } from "lucide-react";

export function StatsAndContact() {
  const stats = [
    { label: "Ocjena", value: "4.9/5", note: "1200+ recenzija", Icon: Star },
    { label: "Godina iskustva", value: "15+", note: "u industriji", Icon: Award },
    { label: "Kupaca", value: "1,200+", note: "aktivnih", Icon: Users },
    { label: "Isporuka", value: "24h", note: "široka mreža", Icon: Truck },
  ];

  return (
    <section className="mb-12">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white">
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
        {/* Decorative accents */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full bg-sunfire-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -left-28 h-96 w-96 rounded-full bg-orange-200/30 blur-3xl" />

        <div className="relative z-10 p-6 md:p-10">
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map(({ label, value, note, Icon }) => (
              <div
                key={label}
                className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="rounded-lg bg-sunfire-100 p-2">
                    <Icon className="w-4 h-4 text-sunfire-700" />
                  </div>
                  <div className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">{value}</div>
                </div>
                <div className="text-slate-800 font-semibold leading-tight">{label}</div>
                <div className="text-slate-500 text-xs mt-1 leading-tight">{note}</div>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="my-7 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

          {/* Contact tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-slate-800">
            <a href="tel:+38732666658" className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 hover:bg-sunfire-50 transition-colors">
              <div className="rounded-lg bg-sunfire-100 p-2"><Phone className="w-5 h-5 text-sunfire-700" /></div>
              <div className="text-sm">
                <div className="font-semibold">Pozovite nas</div>
                <div className="text-slate-700">032/666-658 • 061-962-359</div>
              </div>
            </a>
            <Link href="mailto:veleprodajatpo@gmail.com" className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 hover:bg-sunfire-50 transition-colors">
              <div className="rounded-lg bg-sunfire-100 p-2"><Mail className="w-5 h-5 text-sunfire-700" /></div>
              <div className="text-sm">
                <div className="font-semibold">Pošaljite email</div>
                <div className="text-slate-700">veleprodajatpo@gmail.com</div>
              </div>
            </Link>
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
              <div className="rounded-lg bg-sunfire-100 p-2"><Clock className="w-5 h-5 text-sunfire-700" /></div>
              <div className="text-sm">
                <div className="font-semibold">Radno vrijeme</div>
                <div className="text-slate-700">08:00 – 18:00</div>
              </div>
            </div>
            <Link
              href="https://maps.google.com/?q=Rosulje+bb,+Jelah"
              target="_blank"
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 hover:bg-sunfire-50 transition-colors"
            >
              <div className="rounded-lg bg-sunfire-100 p-2"><MapPin className="w-5 h-5 text-sunfire-700" /></div>
              <div className="text-sm">
                <div className="font-semibold">Adresa</div>
                <div className="text-slate-700">Rosulje bb, Jelah</div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
