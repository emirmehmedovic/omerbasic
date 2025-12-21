/**
 * Utility funkcije za detekciju egzaktnih matchova u pretrazi
 */

/**
 * Normalizuje OEM broj ili kataloški broj - uklanja sve što nije slovo ili broj i pretvara u uppercase
 */
export function normalizeSearchTerm(term: string | null | undefined): string {
  if (!term) return '';
  return term.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

/**
 * Provjerava da li je query egzaktan match za OEM broj ili kataloški broj proizvoda
 * @param query - Search query korisnika
 * @param productOemNumber - OEM broj proizvoda
 * @param productCatalogNumber - Kataloški broj proizvoda
 * @returns true ako je egzaktan match
 */
export function isExactMatch(
  query: string | null | undefined,
  productOemNumber: string | null | undefined,
  productCatalogNumber: string | null | undefined
): boolean {
  if (!query || !query.trim()) return false;

  const normalizedQuery = normalizeSearchTerm(query);
  if (!normalizedQuery) return false;

  // Provjeri egzaktan match za OEM broj
  if (productOemNumber) {
    const normalizedOem = normalizeSearchTerm(productOemNumber);
    if (normalizedOem === normalizedQuery) {
      return true;
    }
    
    // Provjeri i da li je query jedan od OEM brojeva ako je OEM broj višestruki (razdvojen sa / ili ,)
    const oemParts = productOemNumber.split(/[\/,|]/).map(part => normalizeSearchTerm(part.trim()));
    if (oemParts.includes(normalizedQuery)) {
      return true;
    }
  }

  // Provjeri egzaktan match za kataloški broj
  if (productCatalogNumber) {
    const normalizedCatalog = normalizeSearchTerm(productCatalogNumber);
    if (normalizedCatalog === normalizedQuery) {
      return true;
    }
  }

  return false;
}

/**
 * Dodaje isExactMatch flag na proizvode u rezultatu pretrage
 */
export function markExactMatches<T extends { oemNumber?: string | null; catalogNumber?: string }>(
  products: T[],
  query: string | null | undefined
): (T & { isExactMatch?: boolean })[] {
  if (!query || !query.trim()) {
    return products.map(p => ({ ...p, isExactMatch: false }));
  }

  return products.map(product => ({
    ...product,
    isExactMatch: isExactMatch(query, product.oemNumber, product.catalogNumber),
  }));
}

/**
 * Sortira proizvode tako da egzaktni matchovi budu na vrhu
 */
export function sortWithExactMatchesFirst<T extends { isExactMatch?: boolean }>(
  products: T[]
): T[] {
  const exactMatches: T[] = [];
  const fuzzyMatches: T[] = [];

  products.forEach(product => {
    if (product.isExactMatch) {
      exactMatches.push(product);
    } else {
      fuzzyMatches.push(product);
    }
  });

  return [...exactMatches, ...fuzzyMatches];
}

