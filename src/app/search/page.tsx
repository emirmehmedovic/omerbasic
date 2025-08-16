import { Suspense } from 'react';
import { db as prisma } from '@/lib/db';
import SearchPageClient from './_components/SearchPageClient';

async function getFilterData() {
  const categories = await prisma.category.findMany({
    where: { parentId: null },
    include: { children: true },
  });
  const brands = await prisma.vehicleBrand.findMany();
  return { categories, brands };
}

export default async function SearchPage() {
  const filterData = await getFilterData();

  return (
    <Suspense fallback={<p className='text-center py-12'>Učitavanje...</p>}>
      <SearchPageClient filterData={filterData} />
    </Suspense>
  );
}
