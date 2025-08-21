import { Suspense } from 'react';
import { db as prisma } from '@/lib/db';
import SearchPageClient from './_components/SearchPageClient';

async function getFilterData() {
  // Dohvati sve kategorije i izgradi punu hijerarhiju (sve dubine)
  const allCategories = await prisma.category.findMany({
    include: { children: true },
  });
  const brands = await prisma.vehicleBrand.findMany();

  // Korijenske kategorije (bez parenta)
  const rootCategories = allCategories.filter(cat => cat.parentId === null);

  // Rekurzivno izgradi hijerarhiju iz ravne liste koristeći parentId veze
  const buildHierarchy = (categories: typeof allCategories): any[] => {
    return categories.map(category => {
      const children = allCategories.filter(c => c.parentId === category.id);
      return {
        ...category,
        children: children.length > 0 ? buildHierarchy(children) : []
      };
    });
  };

  return {
    categories: buildHierarchy(rootCategories),
    brands,
  };
}

export default async function SearchPage() {
  const filterData = await getFilterData();

  return (
    <Suspense fallback={<p className='text-center py-12'>Učitavanje...</p>}>
      <SearchPageClient filterData={filterData} />
    </Suspense>
  );
}
