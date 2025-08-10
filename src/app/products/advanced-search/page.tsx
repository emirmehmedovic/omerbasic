import { db } from "@/lib/db";
import AdvancedProductSearchClient from "./_components/AdvancedProductSearchClient";

// Dohvaćanje svih kategorija za filter
async function getCategories() {
  return db.category.findMany({
    orderBy: { name: 'asc' },
  });
}

export default async function AdvancedProductSearchPage() {
  const categories = await getCategories();

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Napredna pretraga proizvoda</h1>
      <AdvancedProductSearchClient categories={categories} />
    </div>
  );
}
