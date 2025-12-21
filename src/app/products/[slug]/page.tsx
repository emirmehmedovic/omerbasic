import { db } from '@/lib/db';
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import type { Metadata } from 'next';
import { authOptions } from '@/lib/auth';
import { ProductDetails } from '@/components/ProductDetails';
import { type Product, type Category } from '@/generated/prisma/client';
import { calculateB2BPrice, getUserDiscountProfile } from '@/lib/b2b/discount-service';
import { PageContainer } from '@/components/PageContainer';
import { unstable_cache } from 'next/cache';

// Enable ISR-style caching - revalidate every 60 seconds
export const revalidate = 60;

// Tip za proizvod s potencijalnim popustom
// Usklađeno sa ProductDetails props (manufacturer: { id: string; name: string } | null)
type ProductWithDiscount = Product & {
  category: Category | null;
  manufacturer: { id: string; name: string } | null;
  originalPrice?: number;
  pricingSource?: 'FEATURED' | 'B2B' | 'BASE';
};

interface ProductPageProps {
  params: Promise<{ slug?: string; productId?: string }>;
}

// Cached product query - shared between generateMetadata and ProductPage
// This prevents duplicate database queries
const getProductByParam = unstable_cache(
  async (param: string) => {
    return db.product.findFirst({
      where: {
        OR: [
          { slug: param },
          { id: param },
        ],
      },
      include: {
        category: true,
        manufacturer: { select: { id: true, name: true } },
        articleOENumbers: {
          select: {
            id: true,
            oemNumber: true,
            manufacturer: true,
            referenceType: true,
          },
        },
        // Limit vehicleFitments for faster loading - full list can be loaded client-side
        vehicleFitments: {
          take: 20,
          include: {
            generation: {
              include: {
                model: {
                  include: {
                    brand: { select: { id: true, name: true } },
                  },
                },
              },
            },
            engine: {
              select: {
                id: true,
                engineCode: true,
                enginePowerKW: true,
                enginePowerHP: true,
                engineCapacity: true,
              },
            },
          },
        },
        attributeValues: {
          include: {
            attribute: { select: { id: true, name: true, unit: true } },
          },
        },
        originalReferences: {
          include: {
            // Include the replacement product data to avoid N+1 queries in ProductDetails
            replacement: {
              select: {
                id: true,
                name: true,
                slug: true,
                price: true,
                stock: true,
                imageUrl: true,
                catalogNumber: true,
                oemNumber: true,
                categoryId: true,
                category: { select: { id: true, name: true, imageUrl: true } },
              },
            },
          },
        },
        replacementFor: {
          include: {
            // Include the original product data
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                price: true,
                stock: true,
                imageUrl: true,
                catalogNumber: true,
                oemNumber: true,
                categoryId: true,
                category: { select: { id: true, name: true, imageUrl: true } },
              },
            },
          },
        },
      },
    });
  },
  ['product-detail'],
  { revalidate: 60, tags: ['products'] }
);

// Cached featured product check
const getFeaturedProductDiscount = unstable_cache(
  async (productId: string) => {
    return db.featuredProduct.findUnique({
      where: { productId },
      select: {
        isActive: true,
        isDiscountActive: true,
        discountType: true,
        discountValue: true,
        startsAt: true,
        endsAt: true,
      },
    });
  },
  ['featured-product'],
  { revalidate: 60, tags: ['featured-products'] }
);

function getFirstFitmentSummary(product: ProductWithDiscount & {
  manufacturer: { id: string; name: string } | null;
  vehicleFitments: {
    generation: {
      name: string;
      model: { name: string; brand: { name: string } };
    } | null;
    engine: { engineCode: string | null } | null;
  }[];
}) {
  const fit = product.vehicleFitments?.[0];
  if (!fit || !fit.generation) return null;
  const brand = fit.generation.model?.brand?.name;
  const model = fit.generation.model?.name;
  const gen = fit.generation.name;
  const engine = fit.engine?.engineCode || undefined;
  if (!brand || !model) return null;
  return { brand, model, gen, engine };
}

export async function generateMetadata(
  { params }: ProductPageProps,
): Promise<Metadata> {
  const rawParams = await params as { slug?: string; productId?: string };
  const param = rawParams.slug ?? rawParams.productId;

  if (!param) {
    return {
      title: 'Proizvod nije pronađen | TP Omerbašić',
      robots: { index: false, follow: false },
    };
  }

  // Use cached query - same cache as ProductPage
  const product = await getProductByParam(param);

  if (!product) {
    return {
      title: 'Proizvod nije pronađen | TP Omerbašić',
      robots: { index: false, follow: false },
    };
  }

  const fit = getFirstFitmentSummary(product as any);

  const baseTitleParts: string[] = [];
  if (product.manufacturer?.name) baseTitleParts.push(product.manufacturer.name);
  if (product.name) baseTitleParts.push(product.name);
  const titleBase = baseTitleParts.join(' ');

  const title = titleBase
    ? `${titleBase} – autodijelovi Tešanj | TP Omerbašić`
    : 'Autodijelovi Tešanj | TP Omerbašić';

  const descParts: string[] = [];
  descParts.push(
    `${titleBase || 'Proizvod'} dostupan u TP Omerbašić – autodijelovi za putnička i teretna vozila, kamione, ADR opremu i opremu za autopraonice.`,
  );
  if (fit) {
    const vehicleText = fit.engine
      ? ` Pogodno za ${fit.brand} ${fit.model} ${fit.gen} (${fit.engine}).`
      : ` Pogodno za ${fit.brand} ${fit.model} ${fit.gen}.`;
    descParts.push(vehicleText);
  }
  descParts.push(
    'Rosulje bb, Jelah (Tešanj). Dostava širom BiH. Kontakt: 032/666-658, 061-962-359.',
  );

  return {
    title,
    description: descParts.join(' '),
    alternates: {
      canonical: `/products/${product.slug || param}`,
    },
  };
}

// Header komponenta s brandingom
function ProductDetailHeader({ productName }: { productName: string }) {
  return (
    <div className="mb-6">
      <div className="relative overflow-hidden rounded-3xl p-4 lg:p-6 bg-gradient-to-r from-primary via-primary-dark to-primary border border-primary/20 shadow-2xl transform-gpu transition-all duration-500 hover:scale-[1.01] hover:shadow-3xl">
        <div
          className="pointer-events-none absolute inset-0 z-0 opacity-10"
          style={{
            backgroundImage:
              'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.3) 1px, transparent 0)',
            backgroundSize: '40px 40px',
          }}
        />

        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-3 shadow-lg">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                />
              </svg>
            </div>

            <div className="text-left">
              <div className="flex items-center gap-2 mb-0.5">
                <h2 className="text-lg font-bold text-white">TP Omerbašić</h2>
                <span className="px-2 py-0.5 bg-gradient-to-r from-[#E85A28] to-[#FF6B35] text-white text-xs font-bold rounded-full shadow-lg">
                  Premium
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-white/80">
                <span>📞 032/666-658</span>
                <span>•</span>
                <span>📍 Rosulje bb, Jelah</span>
                <span className="hidden sm:inline">•</span>
                <span className="hidden sm:inline">🕐 08:00-18:00</span>
              </div>
            </div>
          </div>

          <div className="flex-1 text-center lg:text-right">
            <h1 className="font-bold text-2xl lg:text-3xl text-white tracking-tight drop-shadow-lg">
              {productName}
            </h1>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function ProductPage({ params }: ProductPageProps) {
  const rawParams = await params as { slug?: string; productId?: string };
  const param = rawParams.slug ?? rawParams.productId;

  if (!param) {
    notFound();
  }

  // Fetch product and session in parallel for maximum performance
  const [product, session] = await Promise.all([
    getProductByParam(param),
    getServerSession(authOptions),
  ]);

  if (!product) {
    notFound();
  }

  // Ako je URL još uvijek /products/{id}, redirectaj na canonical /products/{slug}
  if (product.slug && product.slug !== param) {
    redirect(`/products/${product.slug}`);
  }

  // Now fetch featured discount and B2B profile in parallel
  const isB2B = session?.user?.role === 'B2B';
  const [fp, profile] = await Promise.all([
    getFeaturedProductDiscount(product.id),
    isB2B && session?.user?.id ? getUserDiscountProfile(session.user.id) : Promise.resolve(null),
  ]);

  let productWithDiscount = product as ProductWithDiscount;
  try {
    const now = new Date();
    const featuredApplies =
      !!fp &&
      fp.isActive !== false &&
      !!fp.isDiscountActive &&
      (!fp.startsAt || fp.startsAt <= now) &&
      (!fp.endsAt || fp.endsAt >= now) &&
      !!fp.discountType &&
      !!fp.discountValue;
    if (featuredApplies) {
      const original = Number(product.price);
      let discounted = original;
      if (fp!.discountType === 'PERCENTAGE') {
        discounted = Math.max(0, original * (1 - Number(fp!.discountValue) / 100));
      } else if (fp!.discountType === 'FIXED') {
        discounted = Math.max(0, original - Number(fp!.discountValue));
      }
      discounted = Math.round(discounted * 100) / 100;
      productWithDiscount = {
        ...(product as any),
        originalPrice: original,
        price: discounted,
        pricingSource: 'FEATURED',
      } as any;
    } else if (profile) {
      const resolved = calculateB2BPrice(product.price, profile, {
        categoryId: product.categoryId,
        manufacturerId: product.manufacturerId ?? null,
      });
      if (resolved) {
        productWithDiscount = {
          ...product,
          originalPrice: product.price,
          price: resolved.price,
          pricingSource: resolved.source,
        } as any;
      }
    }
  } catch {}

  const breadcrumbItems = [
    { name: 'Početna', href: '/' },
    { name: 'Autodijelovi', href: '/products' },
  ];
  if (productWithDiscount.category) {
    breadcrumbItems.push({ name: productWithDiscount.category.name, href: '/products' });
  }
  breadcrumbItems.push({ name: productWithDiscount.name, href: `/products/${product.slug || param}` });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';

  const productLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: productWithDiscount.name,
    image: productWithDiscount.imageUrl ? [productWithDiscount.imageUrl] : undefined,
    description: productWithDiscount.description || undefined,
    sku: productWithDiscount.sku || undefined,
    mpn: productWithDiscount.catalogNumber || undefined,
    brand: productWithDiscount.manufacturer?.name
      ? {
          '@type': 'Brand',
          name: productWithDiscount.manufacturer.name,
        }
      : undefined,
    offers: {
      '@type': 'Offer',
      url: `${siteUrl}/products/${product.slug || param}`,
      priceCurrency: 'BAM',
      price: productWithDiscount.price,
      availability: 'https://schema.org/InStock',
    },
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbItems.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${siteUrl}${item.href}`,
    })),
  };

  return (
    <div className="min-h-screen bg-app relative">
      <PageContainer maxWidth="adaptive" padding="md" className="relative z-10">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
        />

        <nav className="mb-4 text-sm text-slate-600 flex flex-wrap gap-1">
          {breadcrumbItems.map((item, index) => (
            <span key={`${item.href}-${index}`} className="flex items-center gap-1">
              {index > 0 && <span>/</span>}
              <a href={item.href} className="hover:text-primary">
                {item.name}
              </a>
            </span>
          ))}
        </nav>

        <ProductDetailHeader productName={productWithDiscount.name} />
        <ProductDetails product={productWithDiscount} />
      </PageContainer>
    </div>
  );
}
