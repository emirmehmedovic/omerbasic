import { CategoryManager, CategoryWithChildren } from '@/components/CategoryManager';
import { db } from '@/lib/db';

async function getCategories(): Promise<CategoryWithChildren[]> {
  const categories = await db.category.findMany({
    include: {
      children: {
        include: { children: true }, // Uključujemo i drugi nivo za potpunije stablo
      },
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
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Upravljanje kategorijama</h1>
      <CategoryManager initialCategories={initialCategories} />
    </div>
  );
}
