import wmiMap from './wmi.json';
import { getModelYearFromVin, isLikelyVin } from './validate';

export type BasicVinDecode = {
  vin: string;
  brandName?: string;
  year?: number;
};

export function decodeBasicVin(vinInput: string): BasicVinDecode | null {
  if (!isLikelyVin(vinInput)) return null;
  const vin = vinInput.trim().toUpperCase();
  const wmi = vin.slice(0, 3);
  // try exact WMI first
  let brandName = (wmiMap as Record<string, string>)[wmi];
  // Some WMIs use first 2 characters (rare). Fallback to first 2.
  if (!brandName) {
    const wmi2 = vin.slice(0, 2);
    for (const key of Object.keys(wmiMap)) {
      if (key.startsWith(wmi2)) {
        brandName = (wmiMap as Record<string, string>)[key];
        break;
      }
    }
  }
  const year = getModelYearFromVin(vin);
  return { vin, brandName, year };
}
