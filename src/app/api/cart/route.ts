import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { calculateB2BPrice, getUserDiscountProfile } from '@/lib/b2b/discount-service';

export async function POST(request: Request) {
  try {
    // Dohvati sesiju za B2B podatke direktno s authOptions
    const session = await getServerSession(authOptions);
    
    // Provjeri B2B status i popust
    const isB2B = session?.user?.role === 'B2B';
    const profile = isB2B && session?.user?.id
      ? await getUserDiscountProfile(session.user.id)
      : null;
    
    console.log('[API_CART] Session:', session ? 'postoji' : 'ne postoji');
    console.log('[API_CART] isB2B:', isB2B);
    console.log('[API_CART] hasProfile:', !!profile);

    // Dohvati podatke o proizvodima iz zahtjeva
    const { productIds } = await request.json();

    if (!productIds || !Array.isArray(productIds)) {
      return NextResponse.json(
        { error: 'Nedostaju podaci o proizvodima' },
        { status: 400 }
      );
    }

    // Dohvati proizvode iz baze
    const products = await db.product.findMany({
      where: {
        id: {
          in: productIds
        }
      },
      include: {
        category: true
      }
    });

    // Dohvati featured zapise za tražene proizvode
    // Napomena: nakon pokretanja Prisma migracije/generiranja, dodati where/select na nova polja
    const featured = await db.featuredProduct.findMany({
      where: {
        productId: { in: productIds },
        isActive: true,
      },
    });

    const featuredMap = new Map<string, any>();
    for (const f of featured as any[]) featuredMap.set(f.productId, f);

    const now = new Date();

    const applyFeaturedPrice = (p: typeof products[number]) => {
      const f = featuredMap.get(p.id) as any;
      if (!f) return null;
      if (!f.isDiscountActive) return null;
      // Provjera datuma (ako su zadani)
      if (f.startsAt && now < new Date(f.startsAt)) return null;
      if (f.endsAt && now > new Date(f.endsAt)) return null;
      if (!f.discountType || !f.discountValue || f.discountValue <= 0) return null;
      let newPrice = p.price;
      if (f.discountType === 'PERCENTAGE') {
        newPrice = p.price * (1 - f.discountValue / 100);
      } else if (f.discountType === 'FIXED') {
        newPrice = p.price - f.discountValue;
      }
      newPrice = Math.max(newPrice, 0);
      return parseFloat(newPrice.toFixed(2));
    };

    const productsWithPricing = products.map(p => {
      const featuredPrice = applyFeaturedPrice(p);
      if (featuredPrice !== null) {
        // Featured popust vrijedi za sve i nadjačava B2B
        return {
          ...p,
          originalPrice: p.price,
          price: featuredPrice,
          pricingSource: 'FEATURED',
        } as any;
      }
      // Inače primijeni B2B ako postoji
      if (profile) {
        const resolved = calculateB2BPrice(p.price, profile, {
          categoryId: p.categoryId,
          manufacturerId: p.manufacturerId ?? null,
        });
        if (resolved) {
          return {
            ...p,
            originalPrice: p.price,
            price: resolved.price,
            pricingSource: resolved.source,
          } as any;
        }
      }
      return p as any;
    });

    return NextResponse.json({ products: productsWithPricing });
  } catch (error) {
    console.error('[API_CART] Error:', error);
    return NextResponse.json(
      { error: 'Greška prilikom dohvaćanja proizvoda' },
      { status: 500 }
    );
  }
}
