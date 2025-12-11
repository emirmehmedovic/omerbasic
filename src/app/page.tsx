import { Suspense } from 'react';
import { db } from '@/lib/db';
import { unstable_cache } from 'next/cache';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { ProductCard } from '@/components/ProductCard';
import { FeaturedBrands } from '@/components/FeaturedBrands';
import { Hero } from '@/components/Home/Hero';
import { CategoryGrid } from '@/components/Home/CategoryGrid';
import { CategoriesStrip } from '@/components/Home/CategoriesStrip';
import { PromoBanner } from '@/components/Home/PromoBanner';
import { ProductsTabs } from '@/components/Home/ProductsTabs';
import { FeaturedProductsSlider } from '@/components/Home/FeaturedProductsSlider';
import { SocialProof } from '@/components/Home/SocialProof';
import { InfoBar } from '@/components/Home/InfoBar';
import { StatsAndContact } from '@/components/Home/StatsAndContact';
import { TransportQuote } from '@/components/Home/TransportQuote';

const MAIN_CATEGORIES = ["Putnička vozila", "Teretna vozila", "ADR oprema", "Autopraonice"];

const getMainCategories = unstable_cache(
  async () => {
    const cats = await db.category.findMany({
      where: {
        name: { in: MAIN_CATEGORIES }
      },
    });
    // Deduplicate by name in case DB contains duplicates (e.g., Autopraonice added twice)
    const uniqueByName = Array.from(new Map(cats.map(c => [c.name, c])).values());
    // Sort to match the order defined in MAIN_CATEGORIES
    uniqueByName.sort((a, b) => MAIN_CATEGORIES.indexOf(a.name) - MAIN_CATEGORIES.indexOf(b.name));
    return uniqueByName;
  },
  ['home-main-categories'],
  { tags: ['categories'] }
);

async function getLatestProducts() {
  return db.product.findMany({
    take: 50,
    orderBy: { createdAt: 'desc' },
    include: { category: true },
  });
}

// legacy homepage-only components removed in favor of new Home/* components

export default async function HomePage() {
  const [mainCategories, latestProducts] = await Promise.all([
    getMainCategories(),
    getLatestProducts(),
  ]);

  // Mapiranje slika na kategorije - koristite stvarne URL-ove slika ovdje
  const categoryImages: { [key: string]: string } = {
    "Teretna vozila": "/images/teretna.jpg",
    "Putnička vozila": "/images/putnicka.jpg",
    "ADR oprema": "/images/adr.jpg",
    "Autopraonice": "/images/autopraonice.jpg",
  };

  return (
    <main className="bg-app font-sans min-h-screen">
      {/* JSON-LD: Organization / LocalBusiness */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': ['Organization', 'AutoPartsStore', 'LocalBusiness'],
            name: 'TP Omerbašić',
            email: 'mailto:veleprodajatpo@gmail.com',
            telephone: ['+387-32-666-658', '+387-61-962-359'],
            address: {
              '@type': 'PostalAddress',
              streetAddress: 'Rosulje bb',
              addressLocality: 'Jelah',
              addressCountry: 'BA',
            },
            openingHours: 'Mo-Sa 08:00-18:00',
            description:
              'Autodijelovi za putnička i teretna vozila, ADR oprema i oprema za autopraonice. TP Omerbašić, Rosulje bb, Jelah.',
            areaServed: 'Bosnia and Herzegovina',
          }),
        }}
      />
      <div className="container mx-auto px-4 py-12 sm:py-16 relative z-10">
        <Suspense fallback={null}>
          <Hero />
        </Suspense>
        <CategoriesStrip categories={mainCategories as any} />
        <ProductsTabs latest={latestProducts as any} top={latestProducts as any} />
        <FeaturedProductsSlider products={latestProducts as any} />
        <TransportQuote />
        <PromoBanner />
        <StatsAndContact />
      </div>

        {/* Featured Brands */}
        <FeaturedBrands />

      </main>
  );
}
