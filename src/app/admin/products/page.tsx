import Link from 'next/link';
import { unstable_cache } from 'next/cache';

// Revalidate svakih 60 sekundi umjesto force-dynamic (bolje za performans)
export const revalidate = 60;

import { ProductsClient } from './_components/ProductsClient';
import { db } from '@/lib/db';
import type { Category } from '@/generated/prisma/client';

export type CategoryWithChildren = Category & {
  children?: CategoryWithChildren[];
};

const getData = unstable_cache(
  async () => {
    const flat: Category[] = await db.category.findMany({
      orderBy: { name: 'asc' },
    });

    // Build full tree from flat list (no depth limit)
    const byId = new Map<string, CategoryWithChildren>();
    flat.forEach(c => byId.set(c.id, { ...c, children: [] }));
    const roots: CategoryWithChildren[] = [];
    byId.forEach((cat) => {
      if (cat.parentId) {
        const parent = byId.get(cat.parentId);
        if (parent) parent.children = [...(parent.children || []), cat];
      } else {
        roots.push(cat);
      }
    });

    const categories = roots;
    return { categories };
  },
  ['admin-products-categories'],
  { tags: ['categories'] }
);

export default async function AdminProductsPage() {
  const { categories } = await getData();

  return (
    <div className="p-6 space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-br from-white via-gray-50/80 to-blue-50/60 backdrop-blur-sm rounded-2xl p-6 border border-amber/20 shadow-sm">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-sm rounded-xl border border-amber/30">
              <svg className="w-8 h-8 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-amber via-orange to-brown bg-clip-text text-transparent">
                Proizvodi
              </h1>
              <p className="text-gray-600 mt-1">Upravljajte proizvodima i kategorijama</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link 
              href="/admin/products/import" 
              className="inline-flex items-center justify-center rounded-xl text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm text-gray-700 hover:from-white hover:to-gray-50 hover:shadow-lg hover:scale-105 border border-amber/30 h-11 px-6 py-2 shadow-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Import CSV
            </Link>
            <Link
              href="/api/admin/products/export"
              prefetch={false}
              className="inline-flex items-center justify-center rounded-xl text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm text-gray-700 hover:from-white hover:to-gray-50 hover:shadow-lg hover:scale-105 border border-amber/30 h-11 px-6 py-2 shadow-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v12m0 0l-3-3m3 3l3-3M4 20h16" />
              </svg>
              Export CSV
            </Link>
            <Link 
              href="/admin/products/new" 
              className="inline-flex items-center justify-center rounded-xl text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-gradient-to-r from-amber via-orange to-brown text-white hover:from-amber/90 hover:via-orange/90 hover:to-brown/90 hover:shadow-lg hover:scale-105 h-11 px-6 py-2"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Dodaj novi proizvod
            </Link>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-gradient-to-br from-white via-gray-50/80 to-blue-50/60 backdrop-blur-sm rounded-2xl p-6 border border-amber/20 shadow-sm">
        <ProductsClient categories={categories} />
      </div>
    </div>
  );
}
