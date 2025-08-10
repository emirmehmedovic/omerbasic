import { 
  Product as PrismaProduct, 
  Category as PrismaCategory, 
  VehicleGeneration as PrismaVehicleGeneration,
  VehicleModel as PrismaVehicleModel,
  VehicleBrand as PrismaVehicleBrand,
  CategoryAttribute as PrismaCategoryAttribute,
  ProductAttributeValue as PrismaProductAttributeValue,
  AttributeGroup as PrismaAttributeGroup,
  AttributeTemplate as PrismaAttributeTemplate
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

// Enum za tipove atributa
export enum AttributeType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  ENUM = 'enum',
  RANGE = 'range',
  DIMENSION = 'dimension'
}

// Tipovi za grupe atributa
export type AttributeGroup = PrismaAttributeGroup & {
  attributes?: CategoryAttribute[];
  category?: Category;
};

// Tipovi za atribute kategorija
export type CategoryAttribute = PrismaCategoryAttribute & {
  values?: ProductAttributeValue[];
  category?: Category;
  group?: AttributeGroup | null;
};

// Tipovi za validacijska pravila atributa
export interface ValidationRules {
  min?: number;
  max?: number;
  pattern?: string;
  required?: boolean;
  [key: string]: any;
}

// Tipovi za podržane jedinice mjere
export interface SupportedUnits {
  defaultUnit: string;
  units: string[];
  conversionFactors: {
    [key: string]: number;
  };
}

// Tipovi za vrijednosti atributa proizvoda
export type ProductAttributeValue = PrismaProductAttributeValue & {
  product?: Product;
  attribute?: CategoryAttribute;
};

// Tipovi za predloške atributa
export type AttributeTemplate = PrismaAttributeTemplate & {
  attributes: {
    name: string;
    label: string;
    type: AttributeType;
    unit?: string;
    options?: any;
    isRequired?: boolean;
    isFilterable?: boolean;
    isComparable?: boolean;
    validationRules?: ValidationRules;
    supportedUnits?: SupportedUnits;
  }[];
};
