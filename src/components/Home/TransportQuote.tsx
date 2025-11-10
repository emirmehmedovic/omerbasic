'use client';

import Link from "next/link";
import { Truck, MapPin, Shield, Zap, Globe, FileText } from "lucide-react";

export function TransportQuote() {
  const services = [
    {
      icon: Truck,
      title: "PRUZIMANJE VOZILA NA ZELJENOM MJESTU",
      description: "Preuzimamo vozila na vašoj željnoj lokaciji u EU i Skandinaviji"
    },
    {
      icon: Shield,
      title: "OSIGURANJE VOZILA U TOKU TRANSPORTA",
      description: "Potpuna zaštita i osiguranje za sve vrste vozila tijekom transporta"
    },
    {
      icon: Zap,
      title: "ISPORUKA U NAJKRACEMO ROKU",
      description: "Brza i efikasna isporuka sa praćenjem statusa u realnom vremenu"
    },
    {
      icon: Globe,
      title: "TRANSPORT VOZILA UNUTAR EU & SKANDINAVIA",
      description: "Pokrivamo sve glavne zemlje Europe sa pouzdanom mrežom partnera"
    },
    {
      icon: FileText,
      title: "USLUGE SPEDICIJE I CARINJENJA",
      description: "Kompletan opis carinskih procedura i spedicijski dokumenti"
    },
    {
      icon: MapPin,
      title: "DOSTAVA VOZILA NA ZELJENU ADRESU",
      description: "Dostavljamo vozila direktno na vašu željnu adresu u Bosni i Hercegovini"
    }
  ];

  return (
    <section className="mb-20">
      <div className="relative overflow-hidden rounded-3xl">
        {/* Header sekcija sa plavo-narandžastim gradijentom */}
        <div className="relative bg-gradient-to-br from-primary via-primary-dark to-[#0F1F35] shadow-2xl rounded-t-3xl p-8 md:p-12">
          {/* Texture overlay */}
          <div
            className="pointer-events-none absolute inset-0 z-0 opacity-[0.06]"
            style={{
              backgroundImage:
                'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.3) 1px, transparent 0), radial-gradient(circle at 50% 50%, rgba(255,255,255,0.05) 0%, transparent 70%)',
              backgroundSize: '32px 32px, 100% 100%',
            }}
          />

          {/* Decorative glow effect */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-60 h-60 bg-black/10 rounded-full blur-3xl pointer-events-none" />

          {/* Content */}
          <div className="relative z-10 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-sunfire-600 px-4 py-2 text-sm font-bold text-white shadow-lg mb-4">
              <Truck className="w-4 h-4" />
              Transport vozila iz EU
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Siguran transport vozila iz EU u BiH</h2>
            <p className="text-lg text-white/90 max-w-3xl mx-auto">
              Brza organizacija prevoza, carinska koordinacija i isporuka na vašu adresu
            </p>
          </div>
        </div>

        {/* Services grid sekcija sa bijelom pozadinom */}
        <div className="bg-white rounded-b-3xl p-8 md:p-12 shadow-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {services.map((service, idx) => {
              const Icon = service.icon;
              return (
                <div
                  key={idx}
                  className="group rounded-2xl border-2 border-slate-100 bg-gradient-to-br from-slate-50 to-white p-6 hover:border-sunfire-400 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="rounded-xl bg-gradient-to-br from-primary to-primary-dark p-3 shadow-lg group-hover:from-sunfire-600 group-hover:to-sunfire-500 transition-all">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm leading-tight">{service.title}</h3>
                  </div>
                  <p className="text-slate-600 text-sm">{service.description}</p>
                </div>
              );
            })}
          </div>

          {/* CTA Button */}
          <div className="flex justify-center pt-4">
            <Link
              href="/transporti"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sunfire-600 to-sunfire-500 px-8 py-3.5 text-white font-bold hover:from-sunfire-700 hover:to-sunfire-600 shadow-lg shadow-sunfire-500/30 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
            >
              <Truck className="w-5 h-5" />
              Zatraži ponudu za transport
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
