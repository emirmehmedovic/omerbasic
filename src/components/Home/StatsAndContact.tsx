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

        <div className="relative z-10 p-6 md:p-10">
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map(({ label, value, note, Icon }) => (
              <div
                key={label}
                className="group rounded-2xl border border-white/60 bg-white/90 backdrop-blur-sm p-6 shadow-lg hover:-translate-y-1 hover:shadow-2xl transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="rounded-xl bg-gradient-to-br from-[#E85A28] to-[#FF6B35] p-2.5 shadow-lg">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-3xl md:text-4xl font-extrabold tracking-tight text-primary">{value}</div>
                </div>
                <div className="text-slate-900 font-bold leading-tight text-lg">{label}</div>
                <div className="text-slate-600 text-sm mt-1 leading-tight font-medium">{note}</div>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="my-7 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

          {/* Contact tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-slate-800">
            <a href="tel:+38732666536" className="flex items-center gap-3 rounded-xl border border-white/60 bg-white/90 backdrop-blur-sm p-4 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300">
              <div className="rounded-xl bg-gradient-to-br from-primary to-primary-dark p-2.5 shadow-lg"><Phone className="w-5 h-5 text-white" /></div>
              <div className="text-sm">
                <div className="font-bold text-primary">Pozovite nas</div>
                <div className="text-slate-700 font-medium">032/666-536 • 061/847-203</div>
              </div>
            </a>
            <Link href="mailto:tpomerbasic@bih.net.ba" className="flex items-center gap-3 rounded-xl border border-white/60 bg-white/90 backdrop-blur-sm p-4 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300">
              <div className="rounded-xl bg-gradient-to-br from-primary to-primary-dark p-2.5 shadow-lg"><Mail className="w-5 h-5 text-white" /></div>
              <div className="text-sm">
                <div className="font-bold text-primary">Pošaljite email</div>
                <div className="text-slate-700 font-medium">tpomerbasic@bih.net.ba</div>
              </div>
            </Link>
            <div className="flex items-center gap-3 rounded-xl border border-white/60 bg-white/90 backdrop-blur-sm p-4 shadow-lg">
              <div className="rounded-xl bg-gradient-to-br from-primary to-primary-dark p-2.5 shadow-lg"><Clock className="w-5 h-5 text-white" /></div>
              <div className="text-sm">
                <div className="font-bold text-primary">Radno vrijeme</div>
                <div className="text-slate-700 font-medium">08:00 – 18:00</div>
              </div>
            </div>
            <Link
              href="https://maps.google.com/?q=Brace+Omerbasic+65,+Jelah,+Tesanj"
              target="_blank"
              className="flex items-center gap-3 rounded-xl border border-white/60 bg-white/90 backdrop-blur-sm p-4 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
            >
              <div className="rounded-xl bg-gradient-to-br from-primary to-primary-dark p-2.5 shadow-lg"><MapPin className="w-5 h-5 text-white" /></div>
              <div className="text-sm">
                <div className="font-bold text-primary">Adresa</div>
                <div className="text-slate-700 font-medium">Braće Omerbasić 65, Tešanj</div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
