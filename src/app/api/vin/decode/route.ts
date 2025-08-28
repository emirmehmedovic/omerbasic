import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rateLimit, keyFromIpAndPath } from "@/lib/ratelimit";
import { isLikelyVin } from "@/lib/vin/validate";
import { decodeBasicVin } from "@/lib/vin/decode-basic";

export const revalidate = 10;

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

const BRAND_ALIASES: Record<string, string> = {
  "mercedes": "mercedes-benz",
  "mercedes benz": "mercedes-benz",
  "vw": "volkswagen",
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const vin = (searchParams.get("vin") || "").trim();

    // rate limit per IP
    const ip = (req as any).ip
      || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || null;
    const key = keyFromIpAndPath(ip, '/api/vin/decode');
    const rl = rateLimit(key, 20, 60_000);
    if (!rl.ok) {
      const res = NextResponse.json({ error: 'Previše zahtjeva. Pokušajte ponovo kasnije.' }, { status: 429 });
      res.headers.set('RateLimit-Limit', '20');
      res.headers.set('RateLimit-Remaining', String(rl.remaining));
      res.headers.set('RateLimit-Reset', String(Math.ceil(rl.resetInMs / 1000)));
      return res;
    }

    if (!vin || !isLikelyVin(vin)) {
      return NextResponse.json({ error: 'Neispravan VIN (mora imati 17 znakova)' }, { status: 400 });
    }

    const basic = decodeBasicVin(vin);
    const brandNameRaw = basic?.brandName;
    const year = basic?.year;

    // Load all brands and try to match by name/alias
    const brands = await db.vehicleBrand.findMany();
    let matchedBrand = null as null | typeof brands[number];
    const target = brandNameRaw ? normalize(brandNameRaw) : '';

    if (target) {
      // apply alias
      const aliased = BRAND_ALIASES[target] || target;
      matchedBrand = brands.find(b => normalize(b.name) === aliased) || null;
      if (!matchedBrand) {
        // fuzzy-ish: contains check
        matchedBrand = brands.find(b => normalize(b.name).includes(aliased) || aliased.includes(normalize(b.name))) || null;
      }
    }

    if (!matchedBrand) {
      // return info we have, and let UI decide next steps
      return NextResponse.json({ vin, year, brandName: brandNameRaw, brand: null, models: [] });
    }

    // Fetch models for brand
    const models = await db.vehicleModel.findMany({
      where: { brandId: matchedBrand.id },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      vin,
      year,
      brandName: matchedBrand.name,
      brand: { id: matchedBrand.id, name: matchedBrand.name },
      models,
    });
  } catch (err) {
    console.error('VIN decode error', err);
    return NextResponse.json({ error: 'Greška prilikom dekodiranja VIN-a' }, { status: 500 });
  }
}
