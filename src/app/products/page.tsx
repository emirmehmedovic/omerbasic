import { Suspense } from 'react';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import ClientTecDocFilters from '@/components/ClientTecDocFilters';
import { ProductCard } from '@/components/ProductCard';
import { type Product, type Category } from '@/generated/prisma/client';
import { getCategoryWithAncestors } from '../../lib/categories';

// Ova linija osigurava da se stranica uvijek dinamički renderira i da su searchParams dostupni
export const dynamic = 'force-dynamic';

interface ProductsPageProps {
  searchParams: { 
    categoryId?: string;
    generationId?: string;
    minPrice?: string;
    maxPrice?: string;
    q?: string;
  }
}

// Definiramo specifičniji tip za proizvod s uključenom kategorijom
type ProductWithCategory = Product & {
  category: Category | null;
  originalPrice?: number; // Dodano za B2B cijene
};

// Helper funkcija za dohvaćanje proizvoda
async function getProducts(filters: { 
  categoryId?: string; 
  generationId?: string; 
  minPrice?: string; 
  maxPrice?: string; 
  q?: string; 
}): Promise<ProductWithCategory[]> {
  const { categoryId, generationId, minPrice, maxPrice, q } = filters;
  
  // Dohvati sesiju za B2B podatke direktno s authOptions
  const session = await getServerSession(authOptions);
  
  // Provjeri B2B status i popust
  const isB2B = session?.user?.role === 'B2B';
  const discountPercentage = isB2B ? (session?.user?.discountPercentage || 0) : 0;
  
  console.log('[SERVER_PRODUCTS] Session:', session ? 'postoji' : 'ne postoji');
  console.log('[SERVER_PRODUCTS] isB2B:', isB2B);
  console.log('[SERVER_PRODUCTS] discountPercentage:', discountPercentage);

  // Direktno koristi Prisma umjesto pozivanja API rute
  let query: any = {
    where: {},
    include: {
      category: true,
    },
  };
  
  // Dodaj filtere u query
  if (categoryId) {
    // Ako je odabrana kategorija, dohvati i sve potkategorije
    const categoryWithChildren = await getCategoryWithAncestors(categoryId);
    if (categoryWithChildren) {
      // Koristimo categoryId kao string jer je u shemi definiran kao String
      query.where.categoryId = categoryId;
    }
  }
  
  if (generationId) {
    // Koristimo relaciju vehicleFitments za filtriranje po generationId
    query.where.vehicleFitments = {
      some: {
        generation: {
          id: generationId
        }
      }
    };
  }
  
  if (minPrice) {
    query.where.price = { ...query.where.price, gte: parseFloat(minPrice) };
  }
  
  if (maxPrice) {
    query.where.price = { ...query.where.price, lte: parseFloat(maxPrice) };
  }
  
  if (q) {
    query.where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
    ];
  }
  
  // Dohvati proizvode direktno iz baze
  const products = await db.product.findMany(query);
  
  // Primijeni B2B popust ako je potrebno
  if (isB2B && discountPercentage > 0) {
    return products.map(product => ({
      ...product,
      originalPrice: product.price,
      price: parseFloat((product.price * (1 - discountPercentage / 100)).toFixed(2)),
    })) as ProductWithCategory[];
  }
  
  return products as ProductWithCategory[];
}

// Sva async logika je sada sigurno unutar ove komponente
interface ProductsContentProps {
  initialFilters: {
    categoryId?: string;
    generationId?: string;
    minPrice?: string;
    maxPrice?: string;
    q?: string;
  }
}

async function ProductsContent({ initialFilters }: ProductsContentProps) {
  const categories = await db.category.findMany({ orderBy: { name: 'asc' } });



  const products = await getProducts(initialFilters);

  let showVehicleFilters = false;
  if (initialFilters.categoryId) {
    const categoryWithAncestors = await getCategoryWithAncestors(initialFilters.categoryId);
    if (categoryWithAncestors) {
      const vehicleCategoryNames = ["Putnička vozila", "Teretna vozila"];
      const isVehicleCategory = vehicleCategoryNames.includes(categoryWithAncestors.name) || 
                                categoryWithAncestors.ancestors.some((anc: Category) => vehicleCategoryNames.includes(anc.name));
      if (isVehicleCategory) {
        showVehicleFilters = true;
      }
    }
  }

  return (
    <div className="space-y-8">
      {/* TecDoc Style Filters */}
      <div className="w-full">
        <ClientTecDocFilters initialFilters={initialFilters} />
      </div>
      
      {/* Products Grid */}
      <main>
        {products.length > 0 ? (
          <div className="relative p-6 bg-white/40 backdrop-blur-md rounded-2xl border border-white/30 shadow-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map((product: ProductWithCategory) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-16 bg-white/40 backdrop-blur-md rounded-2xl border border-white/30 shadow-lg">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 mb-4 rounded-full bg-gradient-to-br from-orange/20 to-brown/20 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-brown" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-xl text-slate-600 font-medium">Nema proizvoda koji odgovaraju odabranim filterima.</p>
              <p className="text-slate-500 mt-2">Pokušajte promijeniti filtere za više rezultata.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Glavna komponenta stranice mora biti async zbog searchParams
export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  // U Next.js 15+ moramo koristiti await za pristup searchParams
  // Službeni način prema Next.js dokumentaciji
  const params = await searchParams;
  
  const initialFilters = {
    categoryId: params.categoryId || undefined,
    generationId: params.generationId || undefined,
    minPrice: params.minPrice || undefined,
    maxPrice: params.maxPrice || undefined,
    q: params.q || undefined,
  };

  return (
    <div className="relative">
      {/* Decorative background elements */}
      <div className="absolute top-20 left-10 w-64 h-64 bg-gradient-to-br from-orange/30 to-brown/30 rounded-full filter blur-3xl opacity-20 -z-10"></div>
      <div className="absolute bottom-40 right-20 w-80 h-80 bg-gradient-to-tl from-orange/20 to-brown/20 rounded-full filter blur-3xl opacity-20 -z-10"></div>
      
      <div className="container mx-auto px-4 py-12">
        {/* Header with glassmorphism */}
        <div className="relative mb-12 p-8 bg-white/50 backdrop-blur-lg rounded-2xl border border-white/30 shadow-lg">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-orange to-brown bg-clip-text text-transparent">Svi proizvodi</h1>
          <p className="text-slate-600 mt-2">Pronađite dijelove koji vam trebaju</p>
        </div>
        
        <Suspense fallback={
          <div className="text-center py-12 bg-white/50 backdrop-blur-md rounded-xl border border-white/30 shadow-md">
            <div className="animate-pulse flex flex-col items-center">
              <div className="h-8 w-64 bg-gradient-to-r from-orange/30 to-brown/30 rounded mb-4"></div>
              <div className="h-4 w-48 bg-slate-200 rounded"></div>
            </div>
          </div>
        }>
          <ProductsContent initialFilters={initialFilters} />
        </Suspense>
      </div>
    </div>
  );
}
