import { db } from '@/lib/db';
import { UnifiedProductForm } from '@/components/UnifiedProductForm';
import type { Category } from '@/generated/prisma/client';

export type CategoryWithChildren = Category & {
  children?: CategoryWithChildren[];
};

const NewProductPage = async () => {
  const allCategories: CategoryWithChildren[] = await db.category.findMany({
    include: {
      children: {
        include: { children: true }, // 2 levels deep
      },
    },
    orderBy: { name: 'asc' },
  });

  // Pass all categories to the form for proper hierarchical selection
  const categories = allCategories;

  return (
    <div className="p-6 space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-br from-white via-gray-50/80 to-blue-50/60 backdrop-blur-sm rounded-2xl p-6 border border-amber/20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-sm rounded-xl border border-amber/30">
            <svg className="w-8 h-8 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-amber via-orange to-brown bg-clip-text text-transparent">
              Dodaj novi proizvod
            </h1>
            <p className="text-gray-600 mt-1">Ispunite osnovne informacije i odaberite kategoriju</p>
          </div>
        </div>
      </div>

      {/* Form Section */}
      <div className="bg-gradient-to-br from-white via-gray-50/80 to-blue-50/60 backdrop-blur-sm rounded-2xl p-6 border border-amber/20 shadow-sm">
        <UnifiedProductForm categories={categories} />
      </div>
    </div>
  );
};

export default NewProductPage;
