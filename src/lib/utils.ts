import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Funkcije za formatiranje uklonjene - koristi se samo jedna implementacija ispod

/**
 * SSR-sigurno formatiranje cijena
 * Koristi fiksni format koji je isti na serveru i klijentu
 */
export function formatPrice(
  price: number | string,
  options: {
    currency?: 'USD' | 'EUR' | 'GBP' | 'BAM';
    notation?: 'compact' | 'standard';
    format?: 'international' | 'local';
  } = {}
) {
  const { currency = 'BAM', notation = 'standard', format = 'international' } = options;

  const numericPrice = typeof price === 'string' ? parseFloat(price) : price;

  // Formatiranje broja na 2 decimale
  const formattedNumber = numericPrice.toFixed(2);

  // Odabir formata ovisno o postavkama
  if (format === 'international') {
    // Format: "BAM 123.45" (bez lokalizacije)
    return `${currency} ${formattedNumber}`;
  } else {
    // Format: "123,45 KM" (lokalni format)
    const localNumber = formattedNumber.replace('.', ',');

    // Mapiranje valuta u lokalne oznake
    const currencyMap: Record<string, string> = {
      BAM: 'KM',
      EUR: '€',
      USD: '$',
      GBP: '£',
    };

    return `${localNumber} ${currencyMap[currency] || currency}`;
  }
}

/**
 * Formatira datum u željeni format
 * @param date Datum za formatiranje
 * @param format Format datuma (dd.MM.yyyy, yyyy-MM-dd, itd.)
 * @returns Formatirani datum kao string
 */
export function formatDate(
  date: Date | string | null,
  format: string = 'dd.MM.yyyy'
): string {
  if (!date) return '';

  const d = typeof date === 'string' ? new Date(date) : date;

  if (!(d instanceof Date) || isNaN(d.getTime())) {
    return '';
  }

  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const seconds = d.getSeconds().toString().padStart(2, '0');

  return format
    .replace('dd', day)
    .replace('MM', month)
    .replace('yyyy', year.toString())
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}

/**
 * Creates a URL-friendly slug from arbitrary text.
 */
export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

/**
 * Vrati URL slike proizvoda s fallbackovima (kategorija → placeholder)
 */
export function resolveProductImage(
  productImageUrl?: string | null,
  categoryImageUrl?: string | null
) {
  const placeholder = 'https://placehold.co/600x600.png?text=Slika+nije+dostupna';
  const candidate = productImageUrl || categoryImageUrl;

  // Nema slike ni na proizvodu ni na kategoriji → placeholder
  if (!candidate) return placeholder;

  let resolvedUrl: string;

  // Već je root-relative putanja (npr. "/images/foo.jpg")
  if (candidate.startsWith('/')) {
    resolvedUrl = candidate;
  }
  // Protokol-relative URL ("//domain.com/..."), prepusti ga Next/Image konfiguraciji
  else if (candidate.startsWith('//')) {
    resolvedUrl = candidate;
  }
  // Relativna putanja bez protokola i bez vodeće kose crte (npr. "uploads/foo.jpg")
  else if (!candidate.includes('://')) {
    resolvedUrl = candidate.startsWith('/') ? candidate : `/${candidate}`;
  }
  // Apsolutni URL – prihvati ga
  else {
    try {
      // eslint-disable-next-line no-new
      new URL(candidate);
      resolvedUrl = candidate;
    } catch {
      // Ako je URL nevalidan, vrati ga kao relativnu putanju
      resolvedUrl = candidate.startsWith('/') ? candidate : `/${candidate}`;
    }
  }

  // Konvertuj lokalne putanje u API route-ove za produkciju
  // Ovo osigurava da dinamički uploadovane slike i tecdoc slike rade u produkciji
  if (resolvedUrl.startsWith('/uploads/products/')) {
    resolvedUrl = resolvedUrl.replace('/uploads/products/', '/api/uploads/products/');
  } else if (resolvedUrl.startsWith('/images/tecdoc/')) {
    // Ekstraktuj filename iz putanje kao /images/tecdoc/10/4/7/477640.JPG -> 477640.JPG
    const filename = resolvedUrl.split('/').pop() || '';
    resolvedUrl = `/api/images/tecdoc/${filename}`;
  }

  return resolvedUrl;
}