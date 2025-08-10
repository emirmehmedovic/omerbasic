'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { ProductCard } from '@/components/ProductCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import type { Product, Category } from '@/lib/types';

interface FilterData {
  brands: string[];
  models: string[];
  categories: Category[];
}

interface ProductFilterClientProps {
  filterData: FilterData;
}

export function ProductFilterClient({ filterData }: ProductFilterClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState({
    categoryId: searchParams.get('categoryId') || 'all',
    vehicleBrand: searchParams.get('vehicleBrand') || 'all',
    vehicleModel: searchParams.get('vehicleModel') || 'all',
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.categoryId && filters.categoryId !== 'all') params.set('categoryId', filters.categoryId);
      if (filters.vehicleBrand && filters.vehicleBrand !== 'all') params.set('vehicleBrand', filters.vehicleBrand);
      if (filters.vehicleModel && filters.vehicleModel !== 'all') params.set('vehicleModel', filters.vehicleModel);

      // Ažuriramo URL bez ponovnog učitavanja stranice
      router.push(`${pathname}?${params.toString()}`);

      try {
        const res = await fetch(`/api/products?${params.toString()}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          const formattedProducts = data.map(p => ({ ...p, createdAt: new Date(p.createdAt), updatedAt: new Date(p.updatedAt) }));
          setProducts(formattedProducts);
        }
      } catch (error) {
        console.error('Failed to fetch products:', error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [filters, pathname, router]);

    const handleFilterChange = (filterName: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const clearFilters = () => {
    setFilters({ categoryId: '', vehicleBrand: '', vehicleModel: '' });
  };

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 p-4 bg-gray-100 rounded-lg">
        {/* Category Filter */}
                <Select value={filters.categoryId} onValueChange={(value: string) => handleFilterChange('categoryId', value)}>
          <SelectTrigger><SelectValue placeholder="Sve kategorije" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Sve kategorije</SelectItem>
            {filterData.categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Brand Filter */}
                <Select value={filters.vehicleBrand} onValueChange={(value: string) => handleFilterChange('vehicleBrand', value)}>
          <SelectTrigger><SelectValue placeholder="Sve marke vozila" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Sve marke</SelectItem>
            {filterData.brands.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Model Filter */}
                <Select value={filters.vehicleModel} onValueChange={(value: string) => handleFilterChange('vehicleModel', value)}>
          <SelectTrigger><SelectValue placeholder="Svi modeli vozila" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Svi modeli</SelectItem>
            {filterData.models.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>

        <Button onClick={clearFilters} variant="outline">Očisti filtere</Button>
      </div>

      {loading ? (
        <p className="text-center text-gray-500 py-10">Učitavanje proizvoda...</p>
      ) : products.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-500 py-10">Nema proizvoda koji odgovaraju odabranim filterima.</p>
      )}
    </div>
  );
}
