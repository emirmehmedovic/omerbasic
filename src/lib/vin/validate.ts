export function isLikelyVin(input: string): boolean {
  if (!input) return false;
  const vin = input.trim().toUpperCase();
  // VIN: 17 chars, excludes I, O, Q
  const re = /^[A-HJ-NPR-Z0-9]{17}$/;
  return re.test(vin);
}

// Model year decoding (position 10). Limited without region context; best-effort.
// Supports common year codes 1980-2039 repeating every 30 years.
const YEAR_CODE_MAP: Record<string, number[]> = {
  A: [1980, 2010, 2040], B: [1981, 2011, 2041], C: [1982, 2012, 2042], D: [1983, 2013, 2043],
  E: [1984, 2014, 2044], F: [1985, 2015, 2045], G: [1986, 2016, 2046], H: [1987, 2017, 2047],
  J: [1988, 2018, 2048], K: [1989, 2019, 2049], L: [1990, 2020, 2050], M: [1991, 2021, 2051],
  N: [1992, 2022, 2052], P: [1993, 2023, 2053], R: [1994, 2024, 2054], S: [1995, 2025, 2055],
  T: [1996, 2026, 2056], V: [1997, 2027, 2057], W: [1998, 2028, 2058], X: [1999, 2029, 2059],
  Y: [2000, 2030, 2060],
  1: [2001, 2031, 2061], 2: [2002, 2032, 2062], 3: [2003, 2033, 2063], 4: [2004, 2034, 2064],
  5: [2005, 2035, 2065], 6: [2006, 2036, 2066], 7: [2007, 2037, 2067], 8: [2008, 2038, 2068],
  9: [2009, 2039, 2069]
};

export function getModelYearFromVin(vin: string, now: Date = new Date()): number | undefined {
  const v = vin.trim().toUpperCase();
  if (v.length !== 17) return undefined;
  const code = v[9]; // 10th character, 0-indexed
  const options = YEAR_CODE_MAP[code];
  if (!options || options.length === 0) return undefined;
  const currentYear = now.getFullYear();
  // choose the closest <= currentYear + 1 (OEM sometimes encode next model year)
  let best = options[0];
  for (const yr of options) {
    if (yr <= currentYear + 1 && yr > best) best = yr;
  }
  return best;
}
