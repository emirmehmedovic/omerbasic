import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth";

// Schema za validaciju ažuriranja stavke
const updateItemSchema = z.object({
  receivedQty: z.number().int().min(0, "Primljena količina ne može biti negativna"),
  notes: z.string().optional().nullable(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ purchaseOrderId: string; itemId: string }>}
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const { purchaseOrderId, itemId } = await params;
    if (!purchaseOrderId || !itemId) {
      return new NextResponse("Purchase order ID and item ID are required", { status: 400 });
    }

    const body = await req.json();
    const validatedData = updateItemSchema.parse(body);

    // Dohvati stavku narudžbenice
    const item = await db.purchaseOrderItem.findUnique({
      where: {
        id: itemId,
      },
      include: {
        purchaseOrder: true,
        product: true,
      },
    });

    if (!item) {
      return new NextResponse("Item not found", { status: 404 });
    }

    if (item.purchaseOrderId !== purchaseOrderId) {
      return new NextResponse("Item does not belong to the specified purchase order", { status: 400 });
    }

    // Provjeri je li narudžbenica u odgovarajućem statusu
    if (item.purchaseOrder.status === "DRAFT" || item.purchaseOrder.status === "CANCELLED") {
      return new NextResponse("Cannot receive items for draft or cancelled orders", { status: 400 });
    }

    // Ažuriraj primljenu količinu
    const updatedItem = await db.purchaseOrderItem.update({
      where: {
        id: itemId,
      },
      data: {
        receivedQty: validatedData.receivedQty,
        notes: validatedData.notes,
      },
      include: {
        product: true,
      },
    });

    // Ažuriraj stanje proizvoda u inventaru
    if (validatedData.receivedQty > item.receivedQty) {
      // Dodajemo razliku na stanje
      const qtyDifference = validatedData.receivedQty - item.receivedQty;
      
      await db.product.update({
        where: {
          id: item.productId,
        },
        data: {
          stock: {
            increment: qtyDifference,
          },
        },
      });
    } else if (validatedData.receivedQty < item.receivedQty) {
      // Oduzimamo razliku od stanja
      const qtyDifference = item.receivedQty - validatedData.receivedQty;
      
      await db.product.update({
        where: {
          id: item.productId,
        },
        data: {
          stock: {
            decrement: qtyDifference,
          },
        },
      });
    }

    // Provjeri status svih stavki i ažuriraj status narudžbenice ako je potrebno
    const allItems = await db.purchaseOrderItem.findMany({
      where: {
        purchaseOrderId,
      },
    });

    const totalQuantity = allItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalReceivedQuantity = allItems.reduce((sum, item) => sum + item.receivedQty, 0);

    let newStatus = item.purchaseOrder.status;

    if (totalReceivedQuantity === 0) {
      newStatus = "CONFIRMED";
    } else if (totalReceivedQuantity < totalQuantity) {
      newStatus = "PARTIALLY_RECEIVED";
    } else if (totalReceivedQuantity >= totalQuantity) {
      newStatus = "RECEIVED";
    }

    // Ažuriraj status narudžbenice ako je promijenjen
    if (newStatus !== item.purchaseOrder.status) {
      await db.purchaseOrder.update({
        where: {
          id: purchaseOrderId,
        },
        data: {
          status: newStatus,
          updatedById: session.user.id,
        },
      });

      // Dodaj zapis u povijest statusa
      await db.purchaseOrderStatusHistory.create({
        data: {
          purchaseOrderId,
          status: newStatus,
          changedById: session.user.id,
          notes: `Status automatski ažuriran nakon primanja proizvoda.`,
        },
      });
    }

    return NextResponse.json(updatedItem);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify({ errors: error.format() }), { status: 400 });
    }
    
    console.error("[PURCHASE_ORDER_ITEM_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
