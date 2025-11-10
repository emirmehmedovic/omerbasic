import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      email,
      phone,
      companyName,
      vehicleType,
      cargo,
      origin,
      destination,
      notes,
    } = body;

    // Validacija
    if (
      !name ||
      !email ||
      !phone ||
      !vehicleType ||
      !cargo ||
      !origin ||
      !destination
    ) {
      return NextResponse.json(
        { error: "Sva obavezna polja moraju biti popunjena" },
        { status: 400 }
      );
    }

    // Validacija email formata
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Unesite validan email" },
        { status: 400 }
      );
    }

    // Validacija vehicleType enum-a
    const validVehicleTypes = ["TRUCK", "TRAILER", "SPECIALIZED", "OTHER"];
    if (!validVehicleTypes.includes(vehicleType)) {
      return NextResponse.json(
        { error: "Neispravan tip vozila" },
        { status: 400 }
      );
    }

    // Spremanje u bazu podataka
    const transportRequest = await db.transportRequest.create({
      data: {
        name,
        email,
        phone,
        companyName: companyName || null,
        vehicleType,
        cargo,
        origin,
        destination,
        notes: notes || null,
        status: "NEW",
      },
    });

    return NextResponse.json(
      {
        message: "Transport zahtjev uspješno poslan",
        id: transportRequest.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Greška pri spremanju transport zahtjeva:", error);
    return NextResponse.json(
      { error: "Greška pri slanju zahtjeva" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const transportRequests = await db.transportRequest.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(transportRequests);
  } catch (error) {
    console.error("Greška pri dohvaćanju transport zahtjeva:", error);
    return NextResponse.json(
      { error: "Greška pri dohvaćanju zahtjeva" },
      { status: 500 }
    );
  }
}
