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
    <section className="py-16 sm:py-24">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold tracking-tight text-white">Pouzdani Brendovi</h2>
          <p className="mt-4 text-lg text-white/80">
            Nudimo samo provjerene brendove koji garantiraju kvalitet i dugotrajnost.
          </p>
        </div>
        <div className="glass-card rounded-2xl p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 items-center">
            {brands.map((brand) => (
              <div
                key={brand.name}
                className="flex items-center justify-center h-12 sm:h-14 md:h-16 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
              >
                <Image
                  src={brand.logoUrl}
                  alt={brand.name}
                  width={160}
                  height={64}
                  className="object-contain max-h-10 sm:max-h-12 md:max-h-14 w-auto"
                  loading="lazy"
                  sizes="(max-width: 640px) 45vw, (max-width: 1024px) 22vw, 160px"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
