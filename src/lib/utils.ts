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
      'BAM': 'KM',
      'EUR': '€',
      'USD': '$',
      'GBP': '£'
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
