// Tipovi za naprednu pretragu proizvoda

// Tip za operatore usporedbe
export type ComparisonOperator = 'eq' | 'gt' | 'lt' | 'gte' | 'lte' | 'between' | 'contains';

// Tip za filter atributa
export interface AttributeFilter {
  name: string;
  operator: ComparisonOperator;
  value?: string | number;
  min?: number;
  max?: number;
}

// Tip za filter JSON polja
export interface JsonFilter {
  field: 'dimensions' | 'technicalSpecs';
  path: string;
  operator: ComparisonOperator;
  value?: string | number;
  min?: number;
  max?: number;
}

// Tip za sortiranje
export interface SortOption {
  field: string;
  direction: 'asc' | 'desc';
}

// Tip za parametre napredne pretrage
export interface SearchParams {
  query?: string;
  fuzzy?: boolean;
  categoryId?: string;
  attributes?: AttributeFilter[];
  dimensions?: JsonFilter[];
  specs?: JsonFilter[];
  reference?: string;
  referenceType?: 'oem' | 'original' | 'replacement' | 'all';
  standards?: string[];
  page: number;
  limit: number;
  sort?: SortOption;
  // Optional relevance keyset cursor (used when query is present)
  cursorScore?: number;
  cursorId?: string;
}

// Tip za rezultat pretrage
export interface SearchResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  // Optional next cursor for relevance keyset mode
  nextCursor?: { score: number; id: string } | null;
}
