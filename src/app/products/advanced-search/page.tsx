import { db } from "@/lib/db";
import AdvancedProductSearchClient from "./_components/AdvancedProductSearchClient";
import { Suspense } from "react";

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
      <Suspense fallback={<div className="flex justify-center py-10">Učitavanje...</div>}>
        <AdvancedProductSearchClient categories={categories} />
      </Suspense>
    </div>
  );
}
