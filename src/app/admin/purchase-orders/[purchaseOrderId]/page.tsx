import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import PurchaseOrderDetails from "../components/PurchaseOrderDetails";

interface PurchaseOrderPageProps {
  params: {
    purchaseOrderId: string;
  };
}

export default async function PurchaseOrderPage({ params }: PurchaseOrderPageProps) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "ADMIN") {
    redirect("/auth/signin");
  }

  // Dohvati narudžbenicu
  const purchaseOrder = await db.purchaseOrder.findUnique({
    where: {
      id: params.purchaseOrderId,
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
    redirect("/admin/purchase-orders");
  }

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <PurchaseOrderDetails purchaseOrder={purchaseOrder} />
      </div>
    </div>
  );
}
