import type { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const urls = ['/', '/products', '/contact'];

  return urls.map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified,
    changeFrequency: 'daily',
    priority: path === '/' ? 1.0 : 0.8,
  }));
}
