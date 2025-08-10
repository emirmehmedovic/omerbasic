import { VehicleType } from "@/generated/prisma/client";

export interface VehicleBrand {
  id: string;
  name: string;
  type: VehicleType;
  models: VehicleModel[];
}

export interface VehicleModel {
  id: string;
  name: string;
  brandId: string;
  generations: VehicleGeneration[];
}

export interface VehicleGeneration {
  id: string;
  modelId: string;
  name: string;
  period?: string | null;
  vinCode?: string | null;
  bodyStyles?: any | null; // JSON
  engines?: any | null; // JSON
  engineType?: string | null;
  enginePowerKW?: number | null;
  enginePowerHP?: number | null;
  engineCapacity?: number | null;
  engineCode?: string | null;
  constructionType?: string | null;
  wheelbase?: number | null;
  brakeSystem?: string | null;
  driveType?: string | null;
  fuelType?: string | null;
  transmission?: string | null;
  doors?: number | null;
  axles?: number | null;
  weight?: number | null;
  productionStart?: Date | null;
  productionEnd?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
