import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { format, parseISO, startOfMonth, endOfMonth } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    // Provjera autentikacije
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Dohvati parametre
    const { searchParams } = new URL(req.url);
    const fromDateParam = searchParams.get("fromDate");
    const toDateParam = searchParams.get("toDate");
    const status = searchParams.get("status");
    const supplierId = searchParams.get("supplierId");

    // Postavi datume
    const fromDate = fromDateParam ? parseISO(fromDateParam) : new Date(new Date().getFullYear(), 0, 1);
    const toDate = toDateParam ? parseISO(toDateParam) : new Date();

    // Osnovni filter
    const baseFilter: any = {
      createdAt: {
        gte: fromDate,
        lte: toDate,
      },
    };

    // Dodaj filter za status ako je specificiran
    if (status) {
      baseFilter.status = status;
    }

    // Dodaj filter za dobavljača ako je specificiran
    if (supplierId) {
      baseFilter.supplierId = supplierId;
    }

    // 1. Dohvati sve narudžbenice prema filteru
    const purchaseOrders = await db.purchaseOrder.findMany({
      where: baseFilter,
      include: {
        supplier: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    // 2. Izračunaj ukupne statistike
    const totalOrders = purchaseOrders.length;
    const totalAmount = purchaseOrders.reduce((sum, order) => {
      const orderTotal = order.items.reduce((itemSum, item) => {
        return itemSum + (item.unitPrice * item.quantity);
      }, 0);
      return sum + orderTotal;
    }, 0);
    const averageOrderValue = totalOrders > 0 ? totalAmount / totalOrders : 0;

    // 3. Izračunaj statistiku po statusima
    const statusCounts = await db.purchaseOrder.groupBy({
      by: ["status"],
      where: baseFilter,
      _count: {
        id: true,
      },
    });

    const formattedStatusCounts = statusCounts.map((item) => ({
      status: item.status,
      count: item._count.id,
    }));

    // 4. Izračunaj mjesečnu statistiku
    const monthlyData: Record<string, { month: string, orders: number, amount: number }> = {};
    
    // Inicijaliziraj sve mjesece u rasponu
    let currentDate = new Date(fromDate);
    while (currentDate <= toDate) {
      const monthKey = format(currentDate, "yyyy-MM");
      const monthLabel = format(currentDate, "MMM yyyy");
      
      monthlyData[monthKey] = {
        month: monthLabel,
        orders: 0,
        amount: 0,
      };
      
      currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    }
    
    // Popuni podatke za svaki mjesec
    purchaseOrders.forEach(order => {
      const monthKey = format(order.createdAt, "yyyy-MM");
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].orders += 1;
        
        const orderTotal = order.items.reduce((sum, item) => {
          return sum + (item.unitPrice * item.quantity);
        }, 0);
        
        monthlyData[monthKey].amount += orderTotal;
      }
    });
    
    const monthlyStats = Object.values(monthlyData).sort((a, b) => {
      return new Date(a.month).getTime() - new Date(b.month).getTime();
    });

    // 5. Izračunaj top dobavljače
    const supplierStats: Record<string, { 
      supplierId: string, 
      supplierName: string, 
      orderCount: number, 
      totalAmount: number 
    }> = {};
    
    purchaseOrders.forEach(order => {
      if (!supplierStats[order.supplierId]) {
        supplierStats[order.supplierId] = {
          supplierId: order.supplierId,
          supplierName: order.supplier.name,
          orderCount: 0,
          totalAmount: 0,
        };
      }
      
      const orderTotal = order.items.reduce((sum, item) => {
        return sum + (item.unitPrice * item.quantity);
      }, 0);
      
      supplierStats[order.supplierId].orderCount += 1;
      supplierStats[order.supplierId].totalAmount += orderTotal;
    });
    
    const topSuppliers = Object.values(supplierStats)
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 10);

    // 6. Izračunaj top proizvode
    const productStats: Record<string, { 
      productId: string, 
      productName: string, 
      quantity: number, 
      totalAmount: number 
    }> = {};
    
    purchaseOrders.forEach(order => {
      order.items.forEach(item => {
        if (!productStats[item.productId]) {
          productStats[item.productId] = {
            productId: item.productId,
            productName: item.product.name,
            quantity: 0,
            totalAmount: 0,
          };
        }
        
        productStats[item.productId].quantity += item.quantity;
        productStats[item.productId].totalAmount += (item.unitPrice * item.quantity);
      });
    });
    
    const topProducts = Object.values(productStats)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    // Vrati sve statistike
    return NextResponse.json({
      totalOrders,
      totalAmount,
      averageOrderValue,
      statusCounts: formattedStatusCounts,
      monthlyStats,
      topSuppliers,
      topProducts,
    });
  } catch (error) {
    console.error("[PURCHASE_ORDER_STATISTICS_ERROR]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
