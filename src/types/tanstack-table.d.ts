import { FilterFn } from '@tanstack/react-table';

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface FilterFns {
    categoryFilter: FilterFn<unknown>;
  }
}
