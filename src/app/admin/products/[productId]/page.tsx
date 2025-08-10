import { UnifiedProductForm } from '@/components/UnifiedProductForm';
import { db } from '@/lib/db';
import Link from 'next/link';
import { Settings } from 'lucide-react';

async function getProduct(id: string) {
  return db.product.findUnique({
    where: { id },
    include: {
      vehicleFitments: {
        include: {
          generation: {
            include: {
              vehicleEngines: true,
              model: {
                select: {
                  name: true,
                  brand: {
                    select: {
                      name: true
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  });
}

async function getCategories() {
  return db.category.findMany({
    orderBy: { name: 'asc' },
  });
}

export default async function EditProductPage({ params }: { params: { productId: string } }) {
  const product = await getProduct(params.productId);
  const categories = await getCategories();
  
  // Extract vehicle information from the first fitment if available
  let extendedProduct = product;
  
  if (product && product.vehicleFitments && product.vehicleFitments.length > 0) {
    const fitment = product.vehicleFitments[0];
    const generation = fitment.generation;
    // Parse dimensions from JSON
    const dimensions = product.dimensions ? (typeof product.dimensions === 'string' ? JSON.parse(product.dimensions as string) : product.dimensions) : {};
    
    // Uzmi podatke o motoru iz prvog motora ako postoji
    const engine = generation.vehicleEngines && generation.vehicleEngines.length > 0 ? generation.vehicleEngines[0] : null;
    
    extendedProduct = {
      ...product,
      vehicleBrand: generation.model?.brand?.name || '',
      vehicleModel: generation.model?.name || '',
      engineType: engine?.engineType || '',
      // Extract dimensions from the dimensions JSON if available
      weight: dimensions.weight || null,
      width: dimensions.width || null,
      height: dimensions.height || null,
      length: dimensions.length || null,
      unitOfMeasure: dimensions.unitOfMeasure || '',
    } as any; // Use type assertion to avoid TypeScript errors
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Uredi proizvod</h1>
        <Link 
          href={`/admin/products/${params.productId}/attributes`} 
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
        >
          <Settings className="h-4 w-4 mr-2" /> Atributi i reference
        </Link>
      </div>
      <UnifiedProductForm initialData={extendedProduct as any} categories={categories} />
    </div>
  );
}
