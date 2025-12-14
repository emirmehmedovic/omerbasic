import { db } from './db';

function normalizeBosnianChars(input: string): string {
  return input
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .replace(/č/g, 'c')
    .replace(/Č/g, 'c')
    .replace(/ć/g, 'c')
    .replace(/Ć/g, 'c')
    .replace(/š/g, 's')
    .replace(/Š/g, 's')
    .replace(/ž/g, 'z')
    .replace(/Ž/g, 'z');
}

function slugifyProduct(raw: string): string {
  const normalized = normalizeBosnianChars(raw)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) return '';

  return normalized
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export async function generateUniqueProductSlug(params: {
  productId: string;
  name?: string | null;
  catalogNumber?: string | null;
  manufacturerName?: string | null;
}): Promise<string> {
  const { productId, name, catalogNumber, manufacturerName } = params;

  const parts: string[] = [];
  if (manufacturerName) parts.push(manufacturerName);
  if (name) parts.push(name);
  if (catalogNumber) parts.push(catalogNumber);

  let base = slugifyProduct(parts.join(' '));

  if (!base) {
    base = slugifyProduct(catalogNumber || productId) || `proizvod-${productId.slice(0, 8)}`;
  }

  let candidate = base;
  let counter = 2;

  while (true) {
    const existing = await db.product.findUnique({ where: { slug: candidate } });
    if (!existing || existing.id === productId) {
      return candidate;
    }
    candidate = `${base}-${counter++}`;
  }
}
