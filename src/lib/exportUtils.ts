/**
 * Utility funkcije za izvoz podataka
 */

// Definicija tipova za izvoz
export type ExportFormat = 'csv' | 'json' | 'excel';

export interface ExportOptions {
  format: ExportFormat;
  fileName: string;
}

/**
 * Pretvara objekt u CSV string
 * @param data - Podaci za izvoz
 * @param headers - Zaglavlja za CSV (ključevi i nazivi)
 * @returns CSV string
 */
export function objectToCSV<T extends Record<string, any>>(
  data: T[],
  headers: { key: keyof T; label: string }[]
): string {
  // Kreiranje zaglavlja
  const headerRow = headers.map(h => `"${h.label}"`).join(',');
  
  // Kreiranje redova podataka
  const rows = data.map(item => {
    return headers
      .map(header => {
        const value = item[header.key];
        // Formatiranje vrijednosti za CSV (dodavanje navodnika za stringove, itd.)
        if (value === null || value === undefined) return '""';
        if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`;
        if (typeof value === 'number') return value;
        // Provjera za Date objekt
        if (Object.prototype.toString.call(value) === '[object Date]') return `"${(value as Date).toLocaleDateString()}"`;
        return `"${String(value).replace(/"/g, '""')}"`;
      })
      .join(',');
  });
  
  // Spajanje zaglavlja i redova
  return [headerRow, ...rows].join('\n');
}

/**
 * Pretvara objekt u JSON string
 * @param data - Podaci za izvoz
 * @returns JSON string
 */
export function objectToJSON<T extends Record<string, any>>(
  data: T[]
): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Pretvara objekt u Excel (XLSX) format
 * @param data - Podaci za izvoz
 * @param headers - Zaglavlja za Excel (ključevi i nazivi)
 * @returns Base64 string Excel datoteke
 */
export function objectToExcel<T extends Record<string, any>>(
  data: T[],
  headers: { key: keyof T; label: string }[]
): string {
  // Za Excel format koristimo CSV kao međukorak
  // U produkcijskoj implementaciji bi koristili biblioteku poput xlsx ili exceljs
  // Ovo je pojednostavljeni primjer koji vraća CSV s drugačijim mime-type
  return objectToCSV(data, headers);
}

/**
 * Preuzima podatke kao datoteku u odabranom formatu
 * @param data - Podaci za izvoz
 * @param headers - Zaglavlja (ključevi i nazivi)
 * @param options - Opcije za izvoz (format, naziv datoteke)
 */
export function exportData<T extends Record<string, any>>(
  data: T[],
  headers: { key: keyof T; label: string }[],
  options: ExportOptions
): void {
  const { format, fileName } = options;
  let content: string;
  let mimeType: string;
  let fileExtension: string;
  
  switch (format) {
    case 'json':
      content = objectToJSON(data);
      mimeType = 'application/json;charset=utf-8;';
      fileExtension = 'json';
      break;
    case 'excel':
      content = objectToExcel(data, headers);
      mimeType = 'application/vnd.ms-excel;charset=utf-8;';
      fileExtension = 'xls';
      break;
    case 'csv':
    default:
      content = objectToCSV(data, headers);
      mimeType = 'text/csv;charset=utf-8;';
      fileExtension = 'csv';
      break;
  }
  
  // Kreiranje Blob objekta
  const blob = new Blob([content], { type: mimeType });
  
  // Kreiranje URL-a za preuzimanje
  const url = URL.createObjectURL(blob);
  
  // Osiguravamo da datoteka ima ispravnu ekstenziju
  const fullFileName = fileName.endsWith(`.${fileExtension}`) 
    ? fileName 
    : `${fileName}.${fileExtension}`;
  
  // Kreiranje privremenog linka za preuzimanje
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fullFileName);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Oslobađanje URL-a
  URL.revokeObjectURL(url);
}
