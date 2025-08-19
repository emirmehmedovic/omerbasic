import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      companyName, 
      contactPerson, 
      email, 
      phone, 
      address, 
      city, 
      businessType, 
      description 
    } = body;

    // Validacija
    if (!companyName || !contactPerson || !email || !phone || !address || !city || !businessType || !description) {
      return NextResponse.json(
        { error: "Sva polja su obavezna" },
        { status: 400 }
      );
    }

    // Spremanje u bazu podataka
    const b2bRequest = await db.b2BRequest.create({
      data: {
        companyName,
        contactPerson,
        email,
        phone,
        address,
        city,
        businessType,
        description,
        status: "new",
      },
    });

    return NextResponse.json(
      { message: "B2B aplikacija uspješno poslana", id: b2bRequest.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Greška pri spremanju B2B aplikacije:", error);
    return NextResponse.json(
      { error: "Greška pri slanju aplikacije" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const b2bRequests = await db.b2BRequest.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(b2bRequests);
  } catch (error) {
    console.error("Greška pri dohvaćanju B2B aplikacija:", error);
    return NextResponse.json(
      { error: "Greška pri dohvaćanju aplikacija" },
      { status: 500 }
    );
  }
}
