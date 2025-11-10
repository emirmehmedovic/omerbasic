import { TransportForm } from '@/components/TransportForm';
import { TransportVehicleForm } from '@/components/TransportVehicleForm';
import { Truck, ArrowRight, Package, MapPin, Shield, CheckCircle, Clock, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function TransportPage() {
  return (
    <div className="min-h-screen bg-app relative">
      {/* Hero sekcija - 50/50 Layout */}
      <div className="relative overflow-hidden py-12 sm:py-16 mb-8">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Lijeva kolona - Tekst kartica */}
            <div className="relative overflow-hidden rounded-3xl p-8 sm:p-12 bg-gradient-to-br from-primary via-primary-dark to-[#0F1F35] shadow-2xl h-full min-h-[500px] md:min-h-[600px]">
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
              <div className="relative z-10 h-full flex flex-col justify-center">
                <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-white leading-tight mb-4">
                  Brz i siguran transport
                </h1>

                <p className="text-lg md:text-xl text-white/90 max-w-2xl leading-relaxed">
                  TP OMERBAŠIĆ nudi pouzdane transportne usluge za sve vrste robe - od paletne robe i industrijskih proizvoda do specijalnog i vanrednog tereta. Specijaliziramo se za transport iz EU i Skandinavije sa profesionalnim timom i modernom flotom.
                </p>
              </div>
            </div>

            {/* Desna kolona - Dvije slike stacked */}
            <div className="flex flex-col gap-6">
              {/* Gornja slika - Mercedes (dominira) */}
              <div className="relative overflow-hidden rounded-3xl shadow-2xl h-96">
                <img
                  src="/images/Mercedes-Benz-Model-Cars-029.jpg"
                  alt="Mercedes transporteri"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              </div>

              {/* Donja slika - Flota vozila (manji) */}
              <div className="relative overflow-hidden rounded-3xl shadow-2xl h-48">
                <img
                  src="/images/1860x1050-volvo-trucks-new-range-new.jpg"
                  alt="Flota vozila"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info sekcija */}
      <div className="container mx-auto px-4 max-w-7xl mb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Ostavite upit */}
          <div className="relative rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-sm p-8">
            <div className="absolute top-0 right-0 w-20 h-20 bg-blue-100 rounded-full blur-2xl opacity-50 pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl bg-blue-100 border border-blue-200">
                  <Truck className="w-6 h-6 text-blue-700" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Ostavite upit</h3>
              </div>
              <p className="text-slate-700 mb-4 text-sm">
                Ispunite formu sa detaljima o vašem transportu. Odaberite tip vozila ili unesite opis.
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">Brzo</p>
                    <p className="text-xs text-slate-600">Samo nekoliko minuta</p>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">Sigurno</p>
                    <p className="text-xs text-slate-600">Zaštita podataka</p>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">Odgovor u 24h</p>
                    <p className="text-xs text-slate-600">Direktan kontakt</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          {/* Kontakt info */}
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary/5 via-blue-50/5 to-slate-50 border border-slate-200 shadow-sm p-8">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 flex-shrink-0">
                  <Phone className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-slate-600">Pozovite nas:</p>
                  <p className="font-semibold text-slate-900">032/666-536</p>
                  <p className="font-semibold text-slate-900">061/847-203</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 flex-shrink-0">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-slate-600">Radno vrijeme:</p>
                  <p className="font-semibold text-slate-900">08:00 - 18:00</p>
                  <p className="text-xs text-slate-600">Pon - Sub</p>
                </div>
              </div>
            </div>
          </div>

          {/* Specijalizacije */}
          <div className="relative rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-sm p-8">
            <div className="relative z-10">
              <h4 className="text-lg font-bold text-slate-900 mb-3">Specijaliziramo se u:</h4>
              <ul className="space-y-2 text-xs text-slate-700">
                <li className="flex items-center gap-2">
                  <ArrowRight className="w-3 h-3 text-primary flex-shrink-0" />
                  Transport EU/Skandinavije
                </li>
                <li className="flex items-center gap-2">
                  <ArrowRight className="w-3 h-3 text-primary flex-shrink-0" />
                  Tekućine (ADR)
                </li>
                <li className="flex items-center gap-2">
                  <ArrowRight className="w-3 h-3 text-primary flex-shrink-0" />
                  Paletna roba
                </li>
                <li className="flex items-center gap-2">
                  <ArrowRight className="w-3 h-3 text-primary flex-shrink-0" />
                  Specijalni tereti
                </li>
                <li className="flex items-center gap-2">
                  <ArrowRight className="w-3 h-3 text-primary flex-shrink-0" />
                  Domaći transport
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Forma sekcija */}
      <div className="container mx-auto px-4 max-w-7xl mb-16">
        <Tabs defaultValue="vehicle" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-white border border-slate-200 rounded-xl p-1 mb-8">
            <TabsTrigger
              value="vehicle"
              className="text-slate-700 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:via-primary-dark data-[state=active]:to-[#0F1F35] data-[state=active]:text-white rounded-lg transition-all duration-200 font-semibold"
            >
              Transport vozila
            </TabsTrigger>
            <TabsTrigger
              value="cargo"
              className="text-slate-700 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:via-primary-dark data-[state=active]:to-[#0F1F35] data-[state=active]:text-white rounded-lg transition-all duration-200 font-semibold"
            >
              Ostali transporti
            </TabsTrigger>
          </TabsList>

          <TabsContent value="vehicle" className="space-y-6 mt-0">
            <TransportVehicleForm />
          </TabsContent>

          <TabsContent value="cargo" className="space-y-6 mt-0">
            <TransportForm />
          </TabsContent>
        </Tabs>
      </div>

      {/* Zašto TP Omerbašić sekcija */}
      <div className="container mx-auto px-4 py-16 max-w-7xl">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-slate-900 mb-4">Zašto TP Omerbašić?</h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Dugogodišnje iskustvo i dedikacija kvaliteti čini nas idealnom izboru za sve vrste transporta
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { title: "Brza i pouzdana isporuka", desc: "Garantiramo točne vremenske rokove i siguran transport" },
            { title: "Sigurnost i praćenje", desc: "Praćenje pošiljki u realnom vremenu i potpuna sigurnost" },
            { title: "Iskustvo", desc: "Dugogodišnje iskustvo u međunarodnom transportu" },
            { title: "Konkurentne cijene", desc: "Fleksibilne cijene prilagođene vašim potrebama" },
            { title: "Ljubazna podrška", desc: "Transparentna komunikacija na svakom koraku" },
            { title: "Moderni flota", desc: "Moderna vozila i oprema za sve vrste transporta" },
          ].map((item, idx) => (
            <div
              key={idx}
              className="relative rounded-xl overflow-hidden bg-white border border-slate-200 shadow-sm p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
            >
              <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-full blur-xl opacity-50 pointer-events-none" />
              <div className="relative z-10">
                <h4 className="text-lg font-bold text-slate-900 mb-2">✓ {item.title}</h4>
                <p className="text-slate-600 text-sm">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA sekcija */}
      <div className="container mx-auto px-4 py-16 max-w-7xl">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-primary via-primary-dark to-[#0F1F35] shadow-2xl p-8 sm:p-16">
          {/* Texture overlay */}
          <div
            className="pointer-events-none absolute inset-0 z-0 opacity-[0.04]"
            style={{
              backgroundImage:
                'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.3) 1px, transparent 0), radial-gradient(circle at 50% 50%, rgba(255,107,53,0.15) 0%, transparent 70%)',
              backgroundSize: '32px 32px, 100% 100%',
            }}
          />

          {/* Content */}
          <div className="relative z-10 text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Trebate transport?</h2>
            <p className="text-xl text-white/90 max-w-2xl mx-auto mb-8">
              Ostavite upit gore i dobijte odgovor u roku od 24 sata!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
