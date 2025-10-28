import Link from "next/link";
import { Phone, Mail, Clock, MapPin } from "lucide-react";

export function InfoBar() {
  return (
    <section className="mb-12">
      <div className="rounded-2xl bg-white border border-slate-200 p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-slate-800">
          <div className="flex items-center gap-3">
            <Phone className="w-5 h-5 text-sunfire-600" />
            <div className="text-sm">
              <div className="font-semibold">Pozovite nas</div>
              <div className="text-slate-700">032/666-658 • 061-962-359</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-sunfire-600" />
            <div className="text-sm">
              <div className="font-semibold">Pošaljite email</div>
              <Link href="mailto:veleprodajatpo@gmail.com" className="text-slate-700 hover:text-sunfire-700 transition-colors">veleprodajatpo@gmail.com</Link>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-sunfire-600" />
            <div className="text-sm">
              <div className="font-semibold">Radno vrijeme</div>
              <div className="text-slate-700">08:00 – 18:00</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-sunfire-600" />
            <div className="text-sm">
              <div className="font-semibold">Adresa</div>
              <Link href="https://maps.google.com/?q=Rosulje+bb,+Jelah" target="_blank" className="text-slate-700 hover:text-sunfire-700 transition-colors">Rosulje bb, Jelah</Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
