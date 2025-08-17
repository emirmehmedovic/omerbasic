import { CategoryManager, CategoryWithChildren } from '@/components/CategoryManager';
import { db } from '@/lib/db';

async function getCategories(): Promise<CategoryWithChildren[]> {
  const categories = await db.category.findMany({
    include: {
      children: {
        include: { 
          children: true,
          _count: {
            select: { products: true }
          }
        }, // Uključujemo i drugi nivo za potpunije stablo
      },
      _count: {
        select: { products: true }
      }
    },
    orderBy: {
      name: 'asc',
    },
  });
  // Filtriramo samo top-level kategorije za prosljeđivanje
  return categories.filter(c => !c.parentId);
}

export default async function CategoriesPage() {
  const initialCategories = await getCategories();

  return (
    <div className="p-6 space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-br from-white via-gray-50/80 to-blue-50/60 backdrop-blur-sm rounded-2xl p-6 border border-amber/20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-sm rounded-xl border border-amber/30">
            <svg className="w-8 h-8 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-amber via-orange to-brown bg-clip-text text-transparent">
              Upravljanje kategorijama
            </h1>
            <p className="text-gray-600 mt-1">
              Organizujte proizvode u hijerarhijske kategorije
            </p>
          </div>
        </div>
      </div>

      <CategoryManager initialCategories={initialCategories} />
    </div>
  );
}
