import { Truck, Shield, Headphones, Handshake } from "lucide-react";

export function ValueProps() {
  const items = [
    { title: "Brza dostava", desc: "Isporuka u 24h širom BiH", icon: Truck },
    { title: "Provjerena kvaliteta", desc: "Provjereni brendovi i garancija", icon: Shield },
    { title: "Stručna podrška", desc: "Savjet i pomoć pri odabiru", icon: Headphones },
    { title: "B2B pogodnosti", desc: "Posebni uslovi za partnere", icon: Handshake },
  ];
  return (
    <section className="mb-20">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <div key={it.title} className="group relative rounded-2xl bg-white/80 backdrop-blur-sm border border-white/60 p-6 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-primary-dark shadow-lg group-hover:shadow-xl transition-all duration-300">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-primary font-bold mb-1 text-lg">{it.title}</div>
                  <div className="text-slate-600 text-sm font-medium">{it.desc}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
