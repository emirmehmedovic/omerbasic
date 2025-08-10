import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { db } from "@/lib/db";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// Schema za validaciju komentara
const commentSchema = z.object({
  comment: z.string().min(1, "Komentar ne može biti prazan"),
});

export async function POST(
  req: Request,
  { params }: { params: { purchaseOrderId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    if (!params.purchaseOrderId) {
      return new NextResponse("Purchase order ID is required", { status: 400 });
    }

    // Provjeri postoji li narudžbenica
    const purchaseOrder = await db.purchaseOrder.findUnique({
      where: {
        id: params.purchaseOrderId,
      },
    });

    if (!purchaseOrder) {
      return new NextResponse("Purchase order not found", { status: 404 });
    }

    const body = await req.json();
    const validatedData = commentSchema.parse(body);

    // Dodaj komentar
    const comment = await db.purchaseOrderComment.create({
      data: {
        purchaseOrderId: params.purchaseOrderId,
        comment: validatedData.comment,
        createdById: session.user.id,
      },
      include: {
        createdBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(comment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify({ errors: error.format() }), { status: 400 });
    }
    
    console.error("[PURCHASE_ORDER_COMMENT_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function GET(
  req: Request,
  { params }: { params: { purchaseOrderId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    if (!params.purchaseOrderId) {
      return new NextResponse("Purchase order ID is required", { status: 400 });
    }

    // Dohvati komentare za narudžbenicu
    const comments = await db.purchaseOrderComment.findMany({
      where: {
        purchaseOrderId: params.purchaseOrderId,
      },
      include: {
        createdBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(comments);
  } catch (error) {
    console.error("[PURCHASE_ORDER_COMMENTS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
