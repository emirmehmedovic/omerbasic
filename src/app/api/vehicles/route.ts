import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get("type");

    if (!type || !["PASSENGER", "COMMERCIAL"].includes(type)) {
      return NextResponse.json(
        { error: "Neispravan tip vozila" },
        { status: 400 }
      );
    }

    // Dohvati brandove po tipu
    const brands = await db.vehicleBrand.findMany({
      where: { type: type as "PASSENGER" | "COMMERCIAL" },
      include: {
        models: {
          include: {
            generations: true,
          },
        },
      },
    });

    // Formatiraj podatke - mapira brand + model + generation u jedan string
    const vehicles = brands.flatMap((brand) =>
      brand.models.flatMap((model) =>
        model.generations.map((generation) => ({
          id: generation.id,
          name: `${brand.name} ${model.name} ${generation.name}`,
          type: brand.type,
        }))
      )
    );

    return NextResponse.json(vehicles);
  } catch (error) {
    console.error("Greška pri dohvaćanju vozila:", error);
    return NextResponse.json(
      { error: "Greška pri dohvaćanju vozila" },
      { status: 500 }
    );
  }
}
