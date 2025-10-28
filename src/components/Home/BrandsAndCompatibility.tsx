import Link from "next/link";
import BrandStrip from "@/components/BrandStrip";
import { ArrowRight } from "lucide-react";

export function BrandsAndCompatibility() {
  const PASSENGER_CATEGORY_ID = "cmer01ok30001rqbwu15hej6j";
  const COMMERCIAL_CATEGORY_ID = "cmer01z6s0001rqcokur4f0bn";
  return (
    <section className="mb-20">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
        <div className="lg:col-span-2 space-y-8">
          <div>
            <div className="my-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-sm text-slate-700">Putnička vozila</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>
            <BrandStrip layout="row" appearance="passenger" title="Popularni brendovi za putnička vozila" prefillCategoryId={PASSENGER_CATEGORY_ID} />
          </div>
          <div>
            <div className="my-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-sm text-slate-700">Teretna vozila</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>
            <BrandStrip layout="row" appearance="commercial" title="Popularni brendovi za teretna vozila" variant="commercial" prefillCategoryId={COMMERCIAL_CATEGORY_ID} />
          </div>
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Provjera kompatibilnosti</h3>
            <p className="text-slate-600 text-sm">Brzo provjerite koji dijelovi odgovaraju vašem vozilu.</p>
          </div>
          <div className="mt-6">
            <Link href="/products/vehicle-compatibility" className="inline-flex items-center gap-2 text-sunfire-700 font-semibold hover:underline">
              Otvori provjeru
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
