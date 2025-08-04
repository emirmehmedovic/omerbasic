import { db } from '@/lib/db';
import { UnifiedProductForm } from '@/components/UnifiedProductForm';

const NewProductPage = async () => {
  const categories = await db.category.findMany({
    orderBy: { name: 'asc' },
  });

  return (
    <div className="container mx-auto p-4">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Dodaj novi proizvod</h1>
        <p className="text-sm text-gray-500">Ispunite osnovne informacije i odaberite kategoriju.</p>
      </div>
      <UnifiedProductForm categories={categories} />
    </div>
  );
};

export default NewProductPage;
