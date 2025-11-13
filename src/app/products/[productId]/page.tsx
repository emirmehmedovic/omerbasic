import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ProductDetails } from '@/components/ProductDetails';
import { type Product, type Category } from '@/generated/prisma/client';
import { calculateB2BPrice, getUserDiscountProfile } from '@/lib/b2b/discount-service';

// Tip za proizvod s potencijalnim popustom
type ProductWithDiscount = Product & {
  category: Category | null;
  originalPrice?: number;
  pricingSource?: 'FEATURED' | 'B2B' | 'BASE';
};

interface ProductPageProps {
  params: Promise<{ productId: string }>;
}



// Komponenta za header stranice proizvoda - moderan dizajn sa branding elementima
function ProductDetailHeader({ productName }: { productName: string }) {
  return (
    <div className="mb-6">
      <div className="relative overflow-hidden rounded-3xl p-4 lg:p-6 bg-gradient-to-r from-primary via-primary-dark to-primary border border-primary/20 shadow-2xl transform-gpu transition-all duration-500 hover:scale-[1.01] hover:shadow-3xl">
        {/* Animated gradient overlay */}
        <div
          className="pointer-events-none absolute inset-0 z-0 opacity-10"
          style={{
            backgroundImage:
              'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.3) 1px, transparent 0)',
            backgroundSize: '40px 40px',
          }}
        />
        
        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-4">
          {/* Lijeva strana - Branding */}
          <div className="flex items-center gap-3">
            {/* Logo/Icon */}
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-3 shadow-lg">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            
            {/* Company Info */}
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
          
          {/* Desna strana - Naziv proizvoda */}
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

const ProductPage = async ({ params }: ProductPageProps) => {
  // U Next.js 15, params treba koristiti s await
  const { productId } = await params;

  // Dohvati sesiju za B2B podatke direktno s authOptions
  const session = await getServerSession(authOptions);
  
  // Provjeri B2B status i popust
  const isB2B = session?.user?.role === 'B2B';
  const profile = isB2B && session?.user?.id
    ? await getUserDiscountProfile(session.user.id)
    : null;
  
  const product = await db.product.findUnique({
    where: { id: productId },
    include: { 
      category: true,
      manufacturer: true,
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
