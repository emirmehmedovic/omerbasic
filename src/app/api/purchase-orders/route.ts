import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth";

// Schema za validaciju podataka narudžbenice
const purchaseOrderSchema = z.object({
  supplierId: z.string().min(1, "Dobavljač je obavezan"),
  expectedDeliveryDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(z.object({
    productId: z.string().min(1, "Proizvod je obavezan"),
    quantity: z.number().int().min(1, "Količina mora biti najmanje 1"),
    unitPrice: z.number().min(0, "Cijena ne može biti negativna"),
  })).min(1, "Narudžba mora sadržavati barem jednu stavku"),
});

// Pomoćna funkcija za generiranje broja narudžbe
async function generateOrderNumber() {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  
  // Dohvati broj narudžbi za trenutni mjesec
  const ordersThisMonth = await db.purchaseOrder.count({
    where: {
      createdAt: {
        gte: new Date(date.getFullYear(), date.getMonth(), 1),
        lt: new Date(date.getFullYear(), date.getMonth() + 1, 1),
      },
    },
  });
  
  // Format: PO-YY-MM-XXXX (npr. PO-23-05-0001)
  const sequenceNumber = (ordersThisMonth + 1).toString().padStart(4, '0');
  return `PO-${year}-${month}-${sequenceNumber}`;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const body = await req.json();
    const validatedData = purchaseOrderSchema.parse(body);

    // Izračunaj ukupne iznose
    const items = validatedData.items.map(item => ({
      ...item,
      totalPrice: item.quantity * item.unitPrice,
    }));

    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const taxRate = 0.17; // 17% PDV
    const taxAmount = subtotal * taxRate;
    const totalAmount = subtotal + taxAmount;

    // Generiraj broj narudžbe
    const orderNumber = await generateOrderNumber();

    // Kreiraj narudžbenicu
    const purchaseOrder = await db.purchaseOrder.create({
      data: {
        orderNumber,
        supplierId: validatedData.supplierId,
        expectedDeliveryDate: validatedData.expectedDeliveryDate ? new Date(validatedData.expectedDeliveryDate) : null,
        notes: validatedData.notes || null,
        subtotal,
        taxAmount,
        totalAmount,
        createdById: session.user.id,
        items: {
          create: items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
          })),
        },
        statusHistory: {
          create: {
            status: "DRAFT",
            changedById: session.user.id,
          },
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        supplier: true,
      },
    });

    return NextResponse.json(purchaseOrder);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify({ errors: error.format() }), { status: 400 });
    }
    
    console.error("[PURCHASE_ORDERS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const supplierId = searchParams.get("supplierId") || undefined;
    const fromDate = searchParams.get("fromDate") || undefined;
    const toDate = searchParams.get("toDate") || undefined;

    // Pripremi filtere
    const filters: any = {};
    
    if (status) {
      filters.status = status;
    }
    
    if (supplierId) {
      filters.supplierId = supplierId;
    }
    
    if (fromDate || toDate) {
      filters.orderDate = {};
      
      if (fromDate) {
        filters.orderDate.gte = new Date(fromDate);
      }
      
      if (toDate) {
        // Dodaj jedan dan za uključivanje cijelog dana
        const endDate = new Date(toDate);
        endDate.setDate(endDate.getDate() + 1);
        filters.orderDate.lt = endDate;
      }
    }

    // Dohvati narudžbenice s filtriranjem
    const purchaseOrders = await db.purchaseOrder.findMany({
      where: filters,
      include: {
        supplier: true,
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        orderDate: "desc",
      },
    });

    return NextResponse.json(purchaseOrders);
  } catch (error) {
    console.error("[PURCHASE_ORDERS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
