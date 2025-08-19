import { FilterFn } from '@tanstack/react-table';

declare module '@tanstack/react-table' {
   
  interface FilterFns {
    categoryFilter: FilterFn<unknown>;
  }
}
