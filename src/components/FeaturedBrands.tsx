import Image from 'next/image';

const brands = [
  { name: 'Bosch', logoUrl: '/images/brands/bosch.png' },
  { name: 'Castrol', logoUrl: '/images/brands/castrol.png' },
  { name: 'Mann-Filter', logoUrl: '/images/brands/mannfilter.png' },
  { name: 'SKF', logoUrl: '/images/brands/skf.png' },
  { name: 'Valeo', logoUrl: '/images/brands/valeo.png' },
  { name: 'Mannol', logoUrl: '/images/brands/mannol.png' },
];

export const FeaturedBrands = () => {
  return (
    <section className="pt-8 sm:pt-12 pb-16 sm:pb-24">
      <div className="container mx-auto px-4">
        <div className="mb-8 md:mb-12 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
            Pouzdani brendovi
          </div>
          <h2 className="mt-3 text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">Pouzdani Brendovi</h2>
          <p className="mt-2 text-slate-600 max-w-2xl">Nudimo samo provjerene brendove koji garantiraju kvalitet i dugotrajnost.</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 md:gap-8">
            {brands.map((brand) => (
              <div
                key={brand.name}
                className="flex items-center justify-center rounded-xl border border-slate-200 bg-white/90 h-16 sm:h-20 md:h-24 p-3 grayscale opacity-70 hover:grayscale-0 hover:opacity-100 hover:shadow-md transition-all"
                title={brand.name}
              >
                <Image
                  src={brand.logoUrl}
                  alt={brand.name}
                  width={180}
                  height={72}
                  className="object-contain max-h-10 sm:max-h-12 md:max-h-14 w-auto"
                  loading="lazy"
                  sizes="(max-width: 640px) 45vw, (max-width: 1024px) 22vw, 180px"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
