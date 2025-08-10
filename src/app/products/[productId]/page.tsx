import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ProductDetails } from '@/components/ProductDetails';
import { type Product } from '@/generated/prisma/client';

// Tip za proizvod s B2B popustom
type ProductWithDiscount = Product & {
  category: { id: string; name: string; parentId: string | null };
  originalPrice?: number;
};

interface ProductPageProps {
  params: {
    productId: string;
  };
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
  
  // Primijeni B2B popust ako je potrebno
  let productWithDiscount = product;
  if (isB2B && discountPercentage > 0) {
    productWithDiscount = {
      ...product,
      originalPrice: product.price,
      price: parseFloat((product.price * (1 - discountPercentage / 100)).toFixed(2))
    } as any; // Koristimo as any za rješavanje TypeScript greške
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <ProductDetails product={productWithDiscount} />
    </div>
  );
};

export default ProductPage;
