'use client';

import { columns, ProductWithCategory } from './columns';
import { DataTable } from './data-table';
import type { CategoryWithChildren } from '../page';

interface ProductsClientProps {
  products: ProductWithCategory[];
  categories: CategoryWithChildren[];
}

export const ProductsClient = ({ products, categories }: ProductsClientProps) => {
  return <DataTable columns={columns} data={products} categories={categories} />;
};
