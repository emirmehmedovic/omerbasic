import Image from 'next/image';

const brands = [
  { name: 'Bosch', logoUrl: '/images/brands/bosch.svg' },
  { name: 'Castrol', logoUrl: '/images/brands/castrol.svg' },
  { name: 'Brembo', logoUrl: '/images/brands/brembo.svg' },
  { name: 'Mann-Filter', logoUrl: '/images/brands/mann-filter.svg' },
  { name: 'Valeo', logoUrl: '/images/brands/valeo.svg' },
  { name: 'SKF', logoUrl: '/images/brands/skf.svg' },
];

export const FeaturedBrands = () => {
  return (
    <section className="py-16 sm:py-24">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold tracking-tight text-slate-900">Pouzdani Brendovi</h2>
          <p className="mt-4 text-lg text-slate-600">
            Nudimo samo provjerene brendove koji garantiraju kvalitet i dugotrajnost.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 items-center">
          {brands.map((brand) => (
            <div key={brand.name} className="flex justify-center grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-300">
              <Image
                src={brand.logoUrl}
                alt={brand.name}
                width={140}
                height={70}
                className="object-contain"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
