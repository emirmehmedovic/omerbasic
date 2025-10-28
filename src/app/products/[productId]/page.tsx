import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ProductDetails } from '@/components/ProductDetails';
import { type Product, type Category } from '@/generated/prisma/client';

// Tip za proizvod s potencijalnim popustom
type ProductWithDiscount = Product & {
  category: Category | null;
  originalPrice?: number;
  pricingSource?: 'FEATURED' | 'B2B' | 'BASE';
};

interface ProductPageProps {
  params: Promise<{ productId: string }>;
}



// Komponenta za header stranice proizvoda
function ProductDetailHeader({ productName }: { productName: string }) {
  return (
    <div className="mb-8">
      <div className="relative overflow-hidden rounded-2xl p-8 bg-white border border-slate-200 shadow-sm flex items-center justify-center h-full transform-gpu transition-transform duration-300 hover:scale-[1.01]">
        {/* Light grid overlay */}
        <div
          className="pointer-events-none absolute inset-0 z-0 opacity-65"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(100,116,139,0.14) 1px, transparent 1px), linear-gradient(to bottom, rgba(100,116,139,0.14) 1px, transparent 1px)',
            backgroundSize: '2px 2px',
            maskImage: 'radial-gradient(ellipse at center, black 92%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse at center, black 92%, transparent 100%)',
          }}
        />
        <h1 className="relative z-10 font-bold text-4xl text-slate-900 text-center tracking-tight">
          {productName}
        </h1>
      </div>
    </div>
  );
}

const ProductPage = async ({ params }: ProductPageProps) => {
  // U Next.js 15, params treba koristiti s await
  const { productId } = await params;

  // Dohvati sesiju za B2B podatke direktno s authOptions
  const session = await getServerSession(authOptions);
  
  // Provjeri B2B status i popust
  const isB2B = session?.user?.role === 'B2B';
  const discountPercentage = isB2B ? (session?.user?.discountPercentage || 0) : 0;
  
  console.log('[PRODUCT_DETAILS] Session:', session ? 'postoji' : 'ne postoji');
  console.log('[PRODUCT_DETAILS] isB2B:', isB2B);
  console.log('[PRODUCT_DETAILS] discountPercentage:', discountPercentage);

  const product = await db.product.findUnique({
    where: { id: productId },
    include: { 
      category: true,
      vehicleFitments: {
        include: {
          generation: {
            include: {
              model: {
                include: {
                  brand: true,
                },
              },
            },
          },
          engine: true,
        },
      },
      attributeValues: {
        include: {
          attribute: true,
        },
      },
      originalReferences: true,
      replacementFor: true,
    },
  });

  if (!product) {
    notFound(); // Prikazuje 404 stranicu ako proizvod nije pronađen
  }
  
  // Primijeni FEATURED popust (globalni override) s rasporedom; ako nije aktivan, tek onda B2B fallback
  let productWithDiscount = product as ProductWithDiscount;
  try {
    const fp = await db.featuredProduct.findUnique({
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
    const now = new Date();
    const featuredApplies = !!fp && fp.isActive !== false && !!fp.isDiscountActive && (!fp.startsAt || fp.startsAt <= now) && (!fp.endsAt || fp.endsAt >= now) && !!fp.discountType && !!fp.discountValue;
    if (featuredApplies) {
      const original = Number(product.price);
      let discounted = original;
      if (fp!.discountType === 'PERCENTAGE') {
        discounted = Math.max(0, original * (1 - Number(fp!.discountValue) / 100));
      } else if (fp!.discountType === 'FIXED') {
        discounted = Math.max(0, original - Number(fp!.discountValue));
      }
      discounted = Math.round(discounted * 100) / 100;
      productWithDiscount = { ...(product as any), originalPrice: original, price: discounted, pricingSource: 'FEATURED' } as any;
    } else if (isB2B && discountPercentage > 0) {
      productWithDiscount = {
        ...product,
        originalPrice: product.price,
        price: parseFloat((product.price * (1 - discountPercentage / 100)).toFixed(2)),
        pricingSource: 'B2B',
      } as any;
    }
  } catch {}

  return (
    <div className="min-h-screen bg-app relative">
      <div className="container mx-auto px-4 py-6 max-w-7xl relative z-10">
        <ProductDetailHeader productName={product.name} />
        <ProductDetails product={productWithDiscount} />
      </div>
    </div>
  );
};

export default ProductPage;
