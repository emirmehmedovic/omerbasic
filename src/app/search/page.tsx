import { Suspense } from 'react';
import { SearchResults } from './_components/SearchResults';

export default function SearchPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Suspense fallback={<p className='text-center'>Učitavanje rezultata...</p>}>
        <SearchResults />
      </Suspense>
    </div>
  );
}
