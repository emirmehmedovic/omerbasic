'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useDebounce } from 'use-debounce';
import { ProductCard } from '@/components/ProductCard';
import VehicleSelector from '@/components/vehicle-selector';
import { Input } from '@/components/ui/input';
import { Product, VehicleGeneration, VehicleModel, VehicleBrand } from '@/generated/prisma/client';

type GenerationWithDetails = VehicleGeneration & {
  model: VehicleModel & {
    brand: VehicleBrand;
  };
};

export const SearchResults = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const generationId = searchParams.get('generationId');
  const initialQuery = searchParams.get('q') || '';

  const [products, setProducts] = useState<Product[]>([]);
  const [generation, setGeneration] = useState<GenerationWithDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery] = useDebounce(query, 500);

  useEffect(() => {
    const newParams = new URLSearchParams();
    if (generationId) newParams.set('generationId', generationId);
    if (debouncedQuery) newParams.set('q', debouncedQuery);
    router.replace(`/search?${newParams.toString()}`);

    if (!debouncedQuery && !generationId) {
      setProducts([]);
      setGeneration(null);
      setLoading(false);
      setError(null);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const productParams = new URLSearchParams();
        if (generationId) productParams.set('generationId', generationId);
        if (debouncedQuery) productParams.set('q', debouncedQuery);

        const productUrl = `/api/products?${productParams.toString()}`;

        const generationPromise = generationId
          ? fetch(`/api/generations/${generationId}`).then(res => {
              if (!res.ok) throw new Error('Greška pri dohvaćanju detalja o generaciji.');
              return res.json();
            })
          : Promise.resolve(null);

        const productsPromise = fetch(productUrl).then(res => {
          if (!res.ok) throw new Error('Greška pri dohvaćanju proizvoda.');
          return res.json();
        });

        const [genData, prodData] = await Promise.all([generationPromise, productsPromise]);

        setGeneration(genData);
        setProducts(prodData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [debouncedQuery, generationId, router]);

  const handleGenerationSelect = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (id) {
      params.set('generationId', id);
    } else {
      params.delete('generationId');
    }
    router.push(`/search?${params.toString()}`);
  };

  const title = generation
    ? `Dijelovi za ${generation.model.brand.name} ${generation.model.name} ${generation.name} (${generation.period})`
    : 'Rezultati pretrage';

  const showResults = !loading && !error && (debouncedQuery || generationId);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <div>
          <h2 className="text-2xl font-semibold mb-4">Pretraga po vozilu</h2>
          <VehicleSelector onGenerationSelect={handleGenerationSelect} />
        </div>
        <div>
          <h2 className="text-2xl font-semibold mb-4">Pretraga po nazivu ili broju</h2>
          <Input
            type="search"
            placeholder="Npr. filter ulja, 123456..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full"
          />
        </div>
      </div>

      {loading && <p className="text-center">Učitavanje rezultata...</p>}
      {error && <p className="text-center text-red-500">{error}</p>}

      {showResults && (
        <div>
          <h1 className="text-3xl font-bold mb-8">
            {title} {debouncedQuery && <span className='text-gray-500'>za "{debouncedQuery}"</span>}
          </h1>
          {products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map(product => (
                <ProductCard key={product.id} product={product as any} />
              ))}
            </div>
          ) : (
            <div className="text-center border-2 border-dashed rounded-lg p-12">
              <h2 className="text-xl font-semibold">Nema rezultata</h2>
              <p className="mt-2 text-gray-600">Nažalost, nismo pronašli proizvode za Vašu pretragu.</p>
            </div>
          )}
        </div>
      )}

      {!loading && !debouncedQuery && !generationId && (
        <div className="text-center border-2 border-dashed rounded-lg p-12">
          <h2 className="text-xl font-semibold">Pretraga dijelova</h2>
          <p className="mt-2 text-gray-600">Koristite izbornike iznad kako biste pronašli odgovarajuće dijelove.</p>
        </div>
      )}
    </div>
  );
};
