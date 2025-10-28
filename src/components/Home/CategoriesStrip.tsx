import Link from "next/link";
import { Car, Truck, ShieldCheck, SprayCan, LifeBuoy, Droplets, Box } from "lucide-react";

export interface CategoryLite {
  id: string;
  name: string;
}

export function CategoriesStrip({ categories }: { categories: CategoryLite[] }) {
  return (
    <section className="mb-16">
      <div className="relative rounded-2xl p-6 bg-white border border-slate-200 overflow-hidden">
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
        <h3 className="relative z-10 text-xl font-bold text-slate-900 mb-6 text-center">Kategorije proizvoda</h3>
        <div className="relative z-10 w-full">
          <div className="flex w-full rounded-xl border border-slate-200 overflow-x-auto flex-nowrap snap-x snap-mandatory">
            {categories.map((category, idx) => {
              const nameLc = category.name.toLowerCase();
              const usePassengerSvg = nameLc.includes('putnič') || nameLc.includes('putnick');
              const useCommercialSvg = nameLc.includes('teret');
              const useAdrSvg = nameLc.includes('adr');
              const useWashSvg = nameLc.includes('autopraon');
              const useTyresSvg = nameLc.includes('gume');
              const useOilsSvg = nameLc.includes('ulja') || nameLc.includes('maziv');
              const Icon = Box;
              return (
                <Link
                  key={category.id}
                  href={`/products?categoryId=${category.id}`}
                  className={`group relative isolate z-0 flex flex-1 items-center justify-center px-3 py-2 sm:px-4 sm:py-3 md:py-4 text-slate-900 border-r border-slate-200 transition-colors transition-shadow snap-start
                        bg-white hover:bg-sunfire-50 hover:ring-2 hover:ring-sunfire-400/60
                        ${idx === 0 ? 'rounded-l-xl' : ''}
                        ${idx === categories.length - 1 ? 'rounded-r-xl border-r-0' : ''}`}
                >
                  <div className="flex flex-col items-center gap-3 transition-transform duration-300 ease-in-out group-hover:scale-[1.03]">
                    <div className="flex items-center justify-center rounded-2xl bg-[#0c1c3a] shadow-sm w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28">
                      {usePassengerSvg ? (
                        <img
                          src="/images/putnicka-vozila.svg"
                          alt="Putnička vozila"
                          className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 opacity-90"
                        />
                      ) : useCommercialSvg ? (
                        <img
                          src="/images/teretna-vozila.svg"
                          alt="Teretna vozila"
                          className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 opacity-90"
                        />
                      ) : useAdrSvg ? (
                        <img
                          src="/images/adr.svg"
                          alt="ADR oprema"
                          className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 opacity-90"
                        />
                      ) : useWashSvg ? (
                        <img
                          src="/images/autopraonice.svg"
                          alt="Autopraonice"
                          className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 opacity-90"
                        />
                      ) : useTyresSvg ? (
                        <img
                          src="/images/gume.svg"
                          alt="Gume"
                          className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 opacity-90"
                        />
                      ) : useOilsSvg ? (
                        <img
                          src="/images/uljaimaziva.svg"
                          alt="Ulja i maziva"
                          className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 opacity-90"
                        />
                      ) : (
                        <Icon className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 text-white" />
                      )}
                    </div>
                    <span className="text-xs sm:text-sm md:text-[0.95rem] font-bold text-slate-900 text-center leading-tight">{category.name}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
