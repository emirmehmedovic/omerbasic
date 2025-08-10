import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Validacijska shema za parametre
const vehicleCompatibilityParamsSchema = z.object({
  vehicleGenerationId: z.string().optional(),
  vehicleEngineId: z.string().optional(),
  bodyStyle: z.string().optional(),
  position: z.string().optional(),
  year: z.coerce.number().optional(),
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(10),
  sortBy: z.enum(["name", "price", "createdAt"]).default("name"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    
    // Parsiranje i validacija parametara
    const params = {
      vehicleGenerationId: url.searchParams.get("vehicleGenerationId") || undefined,
      vehicleEngineId: url.searchParams.get("vehicleEngineId") || undefined,
      bodyStyle: url.searchParams.get("bodyStyle") || undefined,
      position: url.searchParams.get("position") || undefined,
      year: url.searchParams.get("year") ? Number(url.searchParams.get("year")) : undefined,
      page: url.searchParams.get("page") ? Number(url.searchParams.get("page")) : 1,
      limit: url.searchParams.get("limit") ? Number(url.searchParams.get("limit")) : 10,
      sortBy: url.searchParams.get("sortBy") as "name" | "price" | "createdAt" || "name",
      sortOrder: url.searchParams.get("sortOrder") as "asc" | "desc" || "asc",
    };
    
    const validatedParams = vehicleCompatibilityParamsSchema.parse(params);
    
    // Izračun offseta za paginaciju
    const skip = (validatedParams.page - 1) * validatedParams.limit;
    
    // Izgradnja upita za filtriranje
    const where: any = {
      isArchived: false,
    };
    
    // Filteri za ProductVehicleFitment
    const fitmentWhere: any = {};
    
    if (validatedParams.vehicleGenerationId) {
      fitmentWhere.generationId = validatedParams.vehicleGenerationId;
    }
    
    if (validatedParams.vehicleEngineId) {
      fitmentWhere.engineId = validatedParams.vehicleEngineId;
    }
    
    if (validatedParams.position) {
      fitmentWhere.position = validatedParams.position;
    }
    
    if (validatedParams.bodyStyle) {
      fitmentWhere.bodyStyles = {
        has: validatedParams.bodyStyle
      };
    }
    
    // Filtriranje po godini (ako je unutar raspona yearFrom-yearTo)
    if (validatedParams.year) {
      fitmentWhere.OR = [
        {
          AND: [
            { yearFrom: { lte: validatedParams.year } },
            { yearTo: { gte: validatedParams.year } }
          ]
        },
        {
          AND: [
            { yearFrom: { lte: validatedParams.year } },
            { yearTo: null }
          ]
        },
        {
          AND: [
            { yearFrom: null },
            { yearTo: { gte: validatedParams.year } }
          ]
        },
        {
          AND: [
            { yearFrom: null },
            { yearTo: null },
            { isUniversal: true }
          ]
        }
      ];
    }
    
    // Ako postoje fitment filteri, dodaj ih u glavni upit
    if (Object.keys(fitmentWhere).length > 0) {
      where.vehicleFitments = {
        some: fitmentWhere
      };
    }
    
    // Dohvaćanje ukupnog broja proizvoda koji odgovaraju upitu
    const totalProducts = await db.product.count({ where });
    
    // Dohvaćanje proizvoda s paginacijom i sortiranjem
    const products = await db.product.findMany({
      where,
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
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
      },
      orderBy: {
        [validatedParams.sortBy]: validatedParams.sortOrder,
      },
      skip,
      take: validatedParams.limit,
    });
    
    // Izračun ukupnog broja stranica
    const totalPages = Math.ceil(totalProducts / validatedParams.limit);
    
    return NextResponse.json({
      products,
      total: totalProducts,
      page: validatedParams.page,
      limit: validatedParams.limit,
      totalPages,
    });
  } catch (error) {
    console.error("[VEHICLE_COMPATIBILITY_ERROR]", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Nevažeći parametri", details: error.format() },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: "Interna greška servera" },
      { status: 500 }
    );
  }
}
