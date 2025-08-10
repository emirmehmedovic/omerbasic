import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth";

// Schema za validaciju podataka za ažuriranje narudžbenice
const updatePurchaseOrderSchema = z.object({
  expectedDeliveryDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(["DRAFT", "SENT", "CONFIRMED", "PARTIALLY_RECEIVED", "RECEIVED", "CANCELLED"]).optional(),
  statusNote: z.string().optional().nullable(),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ purchaseOrderId: string }>}
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const { purchaseOrderId } = await params;
    if (!purchaseOrderId) {
      return new NextResponse("Purchase order ID is required", { status: 400 });
    }

    const purchaseOrder = await db.purchaseOrder.findUnique({
      where: {
        id: purchaseOrderId,
      },
      include: {
        supplier: true,
        items: {
          include: {
            product: true,
            supplierProduct: true,
          },
        },
        statusHistory: {
          include: {
            changedBy: {
              select: {
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            changedAt: "desc",
          },
        },
        comments: {
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
        },
        createdBy: {
          select: {
            name: true,
            email: true,
          },
        },
        updatedBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!purchaseOrder) {
      return new NextResponse("Purchase order not found", { status: 404 });
    }

    return NextResponse.json(purchaseOrder);
  } catch (error) {
    console.error("[PURCHASE_ORDER_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ purchaseOrderId: string }>}
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const { purchaseOrderId } = await params;
    if (!purchaseOrderId) {
      return new NextResponse("Purchase order ID is required", { status: 400 });
    }

    const body = await req.json();
    const validatedData = updatePurchaseOrderSchema.parse(body);

    // Dohvati trenutnu narudžbenicu
    const currentOrder = await db.purchaseOrder.findUnique({
      where: {
        id: purchaseOrderId,
      },
    });

    if (!currentOrder) {
      return new NextResponse("Purchase order not found", { status: 404 });
    }

    // Pripremi podatke za ažuriranje
    const updateData: any = {
      updatedById: session.user.id,
    };

    if (validatedData.expectedDeliveryDate !== undefined) {
      updateData.expectedDeliveryDate = validatedData.expectedDeliveryDate 
        ? new Date(validatedData.expectedDeliveryDate) 
        : null;
    }

    if (validatedData.notes !== undefined) {
      updateData.notes = validatedData.notes;
    }

    // Ako je status promijenjen, dodaj zapis u povijest statusa
    if (validatedData.status && validatedData.status !== currentOrder.status) {
      updateData.status = validatedData.status;
      await db.purchaseOrderStatusHistory.create({
        data: {
          purchaseOrderId,
          status: validatedData.status,
          changedById: session.user.id,
          notes: validatedData.statusNote || null,
        },
      });
    }

    // Ažuriraj narudžbenicu
    const updatedOrder = await db.purchaseOrder.update({
      where: {
        id: purchaseOrderId,
      },
      data: updateData,
      include: {
        supplier: true,
        items: {
          include: {
            product: true,
          },
        },
        statusHistory: {
          include: {
            changedBy: {
              select: {
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            changedAt: "desc",
          },
          take: 5,
        },
      },
    });

    return NextResponse.json(updatedOrder);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify({ errors: error.format() }), { status: 400 });
    }
    
    console.error("[PURCHASE_ORDER_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ purchaseOrderId: string }>}
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const { purchaseOrderId } = await params;
    if (!purchaseOrderId) {
      return new NextResponse("Purchase order ID is required", { status: 400 });
    }

    // Provjeri postoji li narudžbenica
    const purchaseOrder = await db.purchaseOrder.findUnique({
      where: {
        id: purchaseOrderId,
      },
    });

    if (!purchaseOrder) {
      return new NextResponse("Purchase order not found", { status: 404 });
    }

    // Dozvoli brisanje samo narudžbenica u statusu DRAFT
    if (purchaseOrder.status !== "DRAFT") {
      return new NextResponse("Only draft purchase orders can be deleted", { status: 400 });
    }

    // Obriši narudžbenicu
    await db.purchaseOrder.delete({
      where: {
        id: purchaseOrderId,
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[PURCHASE_ORDER_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
