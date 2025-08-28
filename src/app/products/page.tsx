import { Suspense } from 'react';
import type { Metadata } from 'next';
import { db as prisma } from '@/lib/db';
import { unstable_cache } from 'next/cache';
import ProductsPageClient from './_components/ProductsPageClient';
import Link from 'next/link';

const getFilterData = unstable_cache(
  async () => {
    const categories = await prisma.category.findMany({
      where: {
        parentId: null,
      },
      include: {
        children: {
          include: {
            children: true,
          },
        },
      },
    });

    const brands = await prisma.vehicleBrand.findMany({
      orderBy: {
        name: 'asc',
      },
    });

    // Type mapping funkcija za kategorije
    const mapCategories = (cats: any[]): any[] => {
      return cats.map(cat => ({
        ...cat,
        children: mapCategories(cat.children || [])
      }));
    };

    return { 
      categories: mapCategories(categories), 
      brands 
    };
  },
  ['products-filter-data'],
  { tags: ['categories'] }
);

export const metadata: Metadata = {
  title: 'Autodijelovi – Putnička i Teretna vozila, ADR, Autopraonice',
  description:
    'TP Omerbašić – Autodijelovi za putnička i teretna vozila, ADR oprema i oprema za autopraonice. Rosulje bb, Jelah. Pozovite: 032/666-658, 061-962-359. Radno vrijeme: 08:00–18:00.',
};

function ProductsLoading() {
  return (
    <div className="text-center py-12 glass-card rounded-xl">
      <div className="animate-pulse flex flex-col items-center">
        <div className="w-12 h-12 mb-4 rounded-full bg-slate-200"></div>
        <div className="h-4 w-32 bg-slate-200 rounded mb-3"></div>
        <div className="h-3 w-24 bg-slate-200 rounded"></div>
      </div>
    </div>
  );
}

export default async function ProductsPage() {
  const filterData = await getFilterData();

  return (
    <Suspense fallback={<ProductsLoading />}>
      <ProductsPageClient filterData={filterData} />
    </Suspense>
  );
}
