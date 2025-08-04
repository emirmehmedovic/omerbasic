import { UnifiedProductForm } from '@/components/UnifiedProductForm';
import { db } from '@/lib/db';

async function getProduct(id: string) {
  return db.product.findUnique({
    where: { id },
    include: {
      vehicleGenerations: {
        select: {
          engineType: true,
          enginePowerKW: true,
          engineCapacity: true,
          engineCode: true,
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
  
  // Extract vehicle information from the first generation if available
  let extendedProduct = product;
  
  if (product && product.vehicleGenerations && product.vehicleGenerations.length > 0) {
    const generation = product.vehicleGenerations[0];
    // Parse dimensions from JSON
    const dimensions = product.dimensions ? (typeof product.dimensions === 'string' ? JSON.parse(product.dimensions as string) : product.dimensions) : {};
    
    extendedProduct = {
      ...product,
      vehicleBrand: generation.model?.brand?.name || '',
      vehicleModel: generation.model?.name || '',
      engineType: generation.engineType || '',
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
      <h1 className="text-2xl font-bold mb-4">Uredi proizvod</h1>
      <UnifiedProductForm initialData={extendedProduct} categories={categories} />
    </div>
  );
}
