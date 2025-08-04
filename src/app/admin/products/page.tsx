import Link from 'next/link';

export const dynamic = 'force-dynamic';
import { ProductsClient } from './_components/ProductsClient';
import { db } from '@/lib/db';
import type { Category } from '@/generated/prisma/client';

export type CategoryWithChildren = Category & {
  children?: CategoryWithChildren[];
};

async function getData() {
  const products = await db.product.findMany({
    include: { category: true },
    orderBy: { createdAt: 'desc' },
  });

  const allCategories: CategoryWithChildren[] = await db.category.findMany({
    include: {
      children: {
        include: { children: true }, // 2 levels deep
      },
    },
    orderBy: { name: 'asc' },
  });

  // Filter for top-level categories to pass to the client
  const categories = allCategories.filter((c) => !c.parentId);

  return { products, categories };
}

export default async function AdminProductsPage() {
  const { products, categories } = await getData();

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold text-gray-800">Proizvodi</h1>
        <Link href="/admin/products/new" className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 bg-gray-800 text-white hover:bg-gray-700">
          Dodaj novi proizvod
        </Link>
      </div>
      <ProductsClient products={products} categories={categories} />
    </div>
  );
}
