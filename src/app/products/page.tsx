import { Suspense } from 'react';
import type { Metadata } from 'next';
import { db as prisma } from '@/lib/db';
import { unstable_cache } from 'next/cache';
import ProductsPageClient from './_components/ProductsPageClient';
import Link from 'next/link';

// Enable ISR with 60 second revalidation
export const revalidate = 60;

const getFilterData = unstable_cache(
  async () => {
    // Paralelno učitavanje kategorija, marki i featured products
    const [categories, brands, featuredProducts] = await Promise.all([
      prisma.category.findMany({
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
      }),
      prisma.vehicleBrand.findMany({
        orderBy: {
          name: 'asc',
        },
      }),
      prisma.featuredProduct.findMany({
        where: {
          isActive: true,
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              price: true,
              stock: true,
              imageUrl: true,
              catalogNumber: true,
              oemNumber: true,
              categoryId: true,
              category: {
                select: {
                  id: true,
                  name: true,
                  imageUrl: true,
                }
              },
            }
          },
        },
        orderBy: {
          displayOrder: 'asc',
        },
      })
    ]);

    // Type mapping funkcija za kategorije
    const mapCategories = (cats: any[]): any[] => {
      return cats.map(cat => ({
        ...cat,
        children: mapCategories(cat.children || [])
      }));
    };

    // Process featured products pricing
    const now = new Date();
    const processedFeatured = featuredProducts.map((fp: any) => {
      const p = fp.product;
      if (!p) return fp;
      const discountActive = !!fp.isDiscountActive;
      const withinWindow = (!fp.startsAt || new Date(fp.startsAt) <= now) && (!fp.endsAt || new Date(fp.endsAt) >= now);

      if (discountActive && withinWindow && fp.discountType && fp.discountValue) {
        const original = Number(p.price);
        let discounted = original;
        if (fp.discountType === 'PERCENTAGE') {
          discounted = Math.max(0, original * (1 - Number(fp.discountValue) / 100));
        } else if (fp.discountType === 'FIXED') {
          discounted = Math.max(0, original - Number(fp.discountValue));
        }
        discounted = Math.round(discounted * 100) / 100;

        return {
          ...fp,
          product: {
            ...p,
            originalPrice: original,
            price: discounted,
            pricingSource: 'FEATURED',
          },
        };
      }
      return fp;
    });

    return {
      categories: mapCategories(categories),
      brands,
      featuredProducts: processedFeatured.filter((fp: any) => fp.product)
    };
  },
  ['products-filter-data'],
  { tags: ['categories', 'featured-products'] }
);

export const metadata: Metadata = {
  title: 'Autodijelovi Tešanj – putnička i teretna vozila, ADR, autopraonice',
  description:
    'TP Omerbašić – autodijelovi za putnička i teretna vozila, kamione, ADR opremu i opremu za autopraonice. Rosulje bb, Jelah (Tešanj). Dostava širom BiH. Pozovite: 032/666-658, 061-962-359. Radno vrijeme: 08:00–18:00.',
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
