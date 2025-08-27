import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    // Dohvati sesiju za B2B podatke direktno s authOptions
    const session = await getServerSession(authOptions);
    
    // Provjeri B2B status i popust
    const isB2B = session?.user?.role === 'B2B';
    const discountPercentage = isB2B ? (session?.user?.discountPercentage || 0) : 0;
    
    console.log('[API_CART] Session:', session ? 'postoji' : 'ne postoji');
    console.log('[API_CART] isB2B:', isB2B);
    console.log('[API_CART] discountPercentage:', discountPercentage);

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
      if (isB2B && discountPercentage > 0) {
        const price = parseFloat((p.price * (1 - discountPercentage / 100)).toFixed(2));
        return { ...p, originalPrice: p.price, price, pricingSource: 'B2B' } as any;
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
