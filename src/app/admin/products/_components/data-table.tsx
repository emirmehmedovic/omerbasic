"use client";

import * as React from 'react';
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { DataTableToolbar } from './data-table-toolbar';
import type { CategoryWithChildren } from '../page';
import { FilterFn } from '@tanstack/react-table';



const categoryFilter: FilterFn<any> = (row, columnId, filterValue) => {
  // If the filter value is not an array or is empty, show all rows
  if (!Array.isArray(filterValue) || filterValue.length === 0) {
    return true;
  }
  // Check if the row's categoryId is included in the filterValue array
  return filterValue.includes(row.original.categoryId);
};

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  categories: CategoryWithChildren[];
  onSearch?: (q: string) => void;
  onCategoryChange?: (categoryId: string) => void;
  initialLoading?: boolean;
  page: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (nextPage: number) => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  categories,
  onSearch,
  onCategoryChange,
  initialLoading,
  page,
  totalPages,
  totalCount,
  onPageChange,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);

  const table = useReactTable({
    filterFns: {
      categoryFilter: categoryFilter,
    },
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
  });

  return (
    <div className="space-y-6">
      <DataTableToolbar
        table={table}
        categories={categories}
        onSearch={onSearch}
        onCategoryChange={onCategoryChange}
      />
      <div className="rounded-2xl border border-amber/20 bg-gradient-to-br from-white/95 to-gray-50/95 backdrop-blur-sm overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-gradient-to-r from-white/90 to-gray-50/90 border-b border-amber/20">
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} className="text-gray-700 font-semibold py-4 px-6">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {initialLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  Učitavanje...
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className="hover:bg-gradient-to-r hover:from-amber/10 hover:to-orange/10 transition-all duration-300 hover:shadow-sm"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="text-gray-900 py-4 px-6 border-b border-amber/10">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <div className="text-gray-500">
                      <p className="font-medium">Nema pronađenih proizvoda</p>
                      <p className="text-sm">Pokušajte promijeniti filtere ili dodajte novi proizvod</p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between py-4 px-6">
        <div className="text-sm text-gray-600">Ukupno: {totalCount}</div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm text-gray-700 hover:from-white hover:to-gray-50 hover:shadow-sm border-amber/30 rounded-xl transition-all duration-200"
          >
            Prethodna
          </Button>
          <span className="text-sm text-gray-700">
            Stranica {page} / {Math.max(totalPages, 1)}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= Math.max(totalPages, 1)}
            className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm text-gray-700 hover:from-white hover:to-gray-50 hover:shadow-sm border-amber/30 rounded-xl transition-all duration-200"
          >
            Sljedeća
          </Button>
        </div>
      </div>
    </div>
  );
}
