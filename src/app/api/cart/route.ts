import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
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

    // Primijeni B2B popust ako je potrebno
    let productsWithPricing = products;
    if (isB2B && discountPercentage > 0) {
      productsWithPricing = products.map(product => ({
        ...product,
        originalPrice: product.price,
        price: parseFloat((product.price * (1 - discountPercentage / 100)).toFixed(2)),
      }));
    }

    return NextResponse.json({ products: productsWithPricing });
  } catch (error) {
    console.error('[API_CART] Error:', error);
    return NextResponse.json(
      { error: 'Greška prilikom dohvaćanja proizvoda' },
      { status: 500 }
    );
  }
}
