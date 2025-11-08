import type { Product as PrismaProduct } from '@/generated/prisma/client';

// Extended product type for the form that includes fields from JSON and relations
export interface ProductFormData extends Omit<PrismaProduct, 'unitOfMeasure' | 'lowStockThreshold' | 'lowStockAlerted'> {
  // Fields from dimensions JSON
  weight?: number | null;
  width?: number | null;
  height?: number | null;
  length?: number | null;
  unitOfMeasure?: string | null;
  
  // Fields from vehicle relations
  vehicleBrand?: string | null;
  vehicleModel?: string | null;
  yearOfManufacture?: number | null;
  engineType?: string | null;
  
  // Fields that might be in technicalSpecs JSON
  generationIds?: string[];

  // Low stock configuration (new)
  lowStockThreshold: number | null;
  lowStockAlerted: boolean;
}
