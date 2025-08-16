"use client";

import * as React from 'react';
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';

import { Input } from '@/components/ui/input';
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
}

export function DataTable<TData, TValue>({
  columns,
  data,
  categories,
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
    getPaginationRowModel: getPaginationRowModel(),
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
      <DataTableToolbar table={table} categories={categories} />
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
            {table.getRowModel().rows?.length ? (
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
      <div className="flex items-center justify-between py-4 px-6 bg-gradient-to-r from-white/80 to-gray-50/80 border-t border-amber/20">
        <div className="text-sm text-gray-600">
          Stranica {table.getState().pagination.pageIndex + 1} od {table.getPageCount()}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm text-gray-700 hover:from-white hover:to-gray-50 hover:shadow-sm border-amber/30 rounded-xl transition-all duration-200"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Prethodna
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm text-gray-700 hover:from-white hover:to-gray-50 hover:shadow-sm border-amber/30 rounded-xl transition-all duration-200"
          >
            Sljedeća
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Button>
        </div>
      </div>
    </div>
  );
}
