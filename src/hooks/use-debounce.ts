import { useState, useEffect } from "react";

/**
 * Hook za debounce vrijednosti
 * @param value Vrijednost koja se debounce-a
 * @param delay Vrijeme odgode u milisekundama
 * @returns Debounced vrijednost
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
