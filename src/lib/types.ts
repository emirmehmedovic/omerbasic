import { 
  Product as PrismaProduct, 
  Category as PrismaCategory, 
  VehicleGeneration as PrismaVehicleGeneration,
  VehicleModel as PrismaVehicleModel,
  VehicleBrand as PrismaVehicleBrand
} from '@/generated/prisma/client';

// Proširujemo osnovni Prisma tip da uvijek uključuje kategoriju
export type Product = PrismaProduct & {
  category: PrismaCategory;
};

export type Category = PrismaCategory;

// TecDoc tipovi za vozila
export type VehicleGeneration = PrismaVehicleGeneration;
export type VehicleModel = PrismaVehicleModel;
export type VehicleBrand = PrismaVehicleBrand;

// Tipovi za tehničke specifikacije proizvoda
export interface TechnicalSpecs {
  [key: string]: string | number | boolean | string[];
}

// Tipovi za dimenzije proizvoda
export interface ProductDimensions {
  [key: string]: number;
}

// Enum za tipove motora
export enum EngineType {
  PETROL = 'PETROL',
  DIESEL = 'DIESEL',
  HYBRID = 'HYBRID',
  ELECTRIC = 'ELECTRIC'
}
