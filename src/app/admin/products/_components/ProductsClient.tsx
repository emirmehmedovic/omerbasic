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
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [q, setQ] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const currentControllerRef = useRef<AbortController | null>(null);

  const baseParams = useMemo(() => {
    const p = new URLSearchParams();
    if (q && q.trim().length > 0) p.set('q', q.trim());
    if (categoryId) p.set('categoryId', categoryId);
    return p;
  }, [q, categoryId]);

  const fetchPage = async (cursor: string | null, append: boolean) => {
    // cancel previous in-flight request
    if (currentControllerRef.current) {
      currentControllerRef.current.abort();
    }
    const controller = new AbortController();
    currentControllerRef.current = controller;

    const params = new URLSearchParams(baseParams.toString());
    params.set('limit', String(PAGE_SIZE));
    if (cursor) params.set('cursor', cursor);

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
    const newCursor = res.headers.get('X-Next-Cursor');
    const data = await res.json();
    if (controller.signal.aborted) return; // ignore setState after abort
    setNextCursor(newCursor);
    setItems(prev => append ? [...prev, ...data] : data);
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        await fetchPage(null, false);
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
  };

  const onCategoryChange = (id: string) => {
    setCategoryId(id);
  };

  const onLoadMore = async () => {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      await fetchPage(nextCursor, true);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <DataTable
      columns={columns}
      data={items}
      categories={categories}
      onSearch={onSearch}
      onCategoryChange={onCategoryChange}
      hasMore={Boolean(nextCursor)}
      loadingMore={loadingMore}
      onLoadMore={onLoadMore}
      initialLoading={loading}
    />
  );
};
