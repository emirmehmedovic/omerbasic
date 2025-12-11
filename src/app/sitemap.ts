import type { MetadataRoute } from 'next';
import { db } from '@/lib/db';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tpomerbasic.ba';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();

  const staticPaths = [
    '/',
    '/products',
    '/contact',
    '/proizvodi/putnicka-vozila',
    '/proizvodi/teretna-vozila',
    '/proizvodi/adr-oprema',
    '/proizvodi/oprema-za-autopraonice',
    '/prijevoz-vozila',
    '/prijevoz-cisterni',
    '/autodijelovi-tesanj',
    '/autodijelovi-jelah',
    '/autodijelovi-tuzla',
    '/aerodromska-oprema',
    '/oprema-za-autopraonice',
    '/ulja-i-maziva',
    '/gume',
  ];

  const staticEntries: MetadataRoute.Sitemap = staticPaths.map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified,
    changeFrequency: 'daily',
    priority: path === '/' ? 1.0 : 0.8,
  }));

  const products = await db.product.findMany({
    where: {
      slug: { not: null },
      isArchived: false,
    },
    select: {
      slug: true,
      updatedAt: true,
    },
  });

  const productEntries: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${siteUrl}/products/${product.slug}`,
    lastModified: product.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  return [...staticEntries, ...productEntries];
}
