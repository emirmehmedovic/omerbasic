import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, subject, message } = body;

    // Validacija
    if (!name || !email || !phone || !subject || !message) {
      return NextResponse.json(
        { error: "Sva polja su obavezna" },
        { status: 400 }
      );
    }

    // Spremanje u bazu podataka
    const contactRequest = await db.contactRequest.create({
      data: {
        name,
        email,
        phone,
        subject,
        message,
        status: "new",
      },
    });

    return NextResponse.json(
      { message: "Kontakt zahtjev uspješno poslan", id: contactRequest.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Greška pri spremanju kontakt zahtjeva:", error);
    return NextResponse.json(
      { error: "Greška pri slanju zahtjeva" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const contactRequests = await db.contactRequest.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(contactRequests);
  } catch (error) {
    console.error("Greška pri dohvaćanju kontakt zahtjeva:", error);
    return NextResponse.json(
      { error: "Greška pri dohvaćanju zahtjeva" },
      { status: 500 }
    );
  }
}
