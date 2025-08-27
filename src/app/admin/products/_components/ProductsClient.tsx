'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
  const currentControllerRef = useRef<AbortController | null>(null);

  const baseParams = useMemo(() => {
    const p = new URLSearchParams();
    if (q && q.trim().length > 0) p.set('q', q.trim());
    if (categoryId) p.set('categoryId', categoryId);
    return p;
  }, [q, categoryId]);

  const fetchPage = async (targetPage: number) => {
    // cancel previous in-flight request
    if (currentControllerRef.current) {
      currentControllerRef.current.abort();
    }
    const controller = new AbortController();
    currentControllerRef.current = controller;

    const params = new URLSearchParams(baseParams.toString());
    params.set('limit', String(PAGE_SIZE));
    params.set('page', String(targetPage));

    const url = `/api/products?${params}`;

    const attempt = async (n: number): Promise<Response> => {
      try {
        return await fetch(url, { signal: controller.signal });
      } catch (e: any) {
        if (e?.name === 'AbortError') throw e; // do not retry aborts
        if (n <= 0) throw e;
        // backoff: 200ms, 400ms
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
    const hdrPage = parseInt(res.headers.get('X-Page') || String(targetPage)) || targetPage;
    if (controller.signal.aborted) return; // ignore setState after abort
    setItems(data);
    setTotalPages(hdrTotalPages);
    setTotalCount(hdrTotalCount);
    setPage(hdrPage);
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        await fetchPage(1);
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
  }, [baseParams.toString()]);

  const onSearch = (query: string) => {
    setQ(query);
    setPage(1);
  };

  const onCategoryChange = (id: string) => {
    setCategoryId(id);
    setPage(1);
  };

  const onPageChange = async (next: number) => {
    if (next < 1 || next > totalPages) return;
    setLoading(true);
    try {
      await fetchPage(next);
    } catch (e) {
      console.error(e);
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
      initialLoading={loading}
      page={page}
      totalPages={totalPages}
      totalCount={totalCount}
      onPageChange={onPageChange}
    />
  );
};
