'use client';

import { useEffect, useRef, useState } from 'react';
import { columns, ProductWithCategory } from './columns';
import { DataTable } from './data-table';
import type { CategoryWithChildren } from '../page';

interface ProductsClientProps {
  categories: CategoryWithChildren[];
}

export const ProductsClient = ({ categories }: ProductsClientProps) => {
  const PAGE_SIZE = 24;
  const [items, setItems] = useState<ProductWithCategory[]>([]);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const currentControllerRef = useRef<AbortController | null>(null);

  // Use a ref to track if this is a filter change (should reset to page 1) or a page change
  const filterVersionRef = useRef(0);

  const fetchProducts = async (targetPage: number) => {
    // cancel previous in-flight request
    if (currentControllerRef.current) {
      currentControllerRef.current.abort();
    }
    const controller = new AbortController();
    currentControllerRef.current = controller;

    const params = new URLSearchParams();
    if (q && q.trim().length > 0) params.set('q', q.trim());
    if (categoryId) params.set('categoryId', categoryId);
    params.set('includeOutOfStock', inStockOnly ? 'false' : 'true');
    params.set('limit', String(PAGE_SIZE));
    params.set('page', String(targetPage));

    const url = `/api/products?${params}`;

    const attempt = async (n: number): Promise<Response> => {
      try {
        return await fetch(url, { signal: controller.signal });
      } catch (e: any) {
        if (e?.name === 'AbortError') throw e;
        if (n <= 0) throw e;
        const delay = (3 - n) * 200 + 200;
        await new Promise(r => setTimeout(r, delay));
        return attempt(n - 1);
      }
    };

    const res = await attempt(2);
    if (!res.ok) throw new Error(`Greška pri dohvaćanju (${res.status})`);
    const data = await res.json();
    const hdrTotalPages = parseInt(res.headers.get('X-Total-Pages') || '1') || 1;
    const hdrTotalCount = parseInt(res.headers.get('X-Total-Count') || '0') || 0;
    
    if (controller.signal.aborted) return;
    
    setItems(data);
    setTotalPages(hdrTotalPages);
    setTotalCount(hdrTotalCount);
    setPage(targetPage);
  };

  // Effect for initial load and filter changes - always fetches page 1
  useEffect(() => {
    filterVersionRef.current += 1;
    let mounted = true;
    
    (async () => {
      setLoading(true);
      try {
        await fetchProducts(1);
      } catch (e) {
        if ((e as any)?.name !== 'AbortError') console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    
    return () => {
      mounted = false;
      if (currentControllerRef.current) currentControllerRef.current.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, categoryId, inStockOnly]);

  const onSearch = (query: string) => {
    setQ(query);
  };

  const onCategoryChange = (id: string) => {
    setCategoryId(id);
  };

  const onInStockChange = (value: boolean) => {
    setInStockOnly(value);
  };

  const onPageChange = async (next: number) => {
    if (next < 1 || next > totalPages || next === page) return;
    setPage(next); // Optimistically update page number immediately
    setLoading(true);
    try {
      await fetchProducts(next);
    } catch (e) {
      if ((e as any)?.name !== 'AbortError') {
        console.error('[ProductsClient] Error changing page:', e);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <DataTable
      columns={columns}
      data={items}
      categories={categories}
      onSearch={onSearch}
      onCategoryChange={onCategoryChange}
      inStockOnly={inStockOnly}
      onInStockChange={onInStockChange}
      initialLoading={loading}
      page={page}
      totalPages={totalPages}
      totalCount={totalCount}
      onPageChange={onPageChange}
    />
  );
};
