import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { SupplierDetailsClient } from "@/components/admin/SupplierDetailsClient";

export const metadata: Metadata = {
  title: "Detalji dobavljača | Admin Panel",
  description: "Upravljanje detaljima dobavljača",
};

const SupplierDetailsPage = async ({ params }: { params: Promise<{ supplierId: string }> }) => {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "ADMIN") {
    redirect("/");
  }

  const { supplierId } = await params;
  const supplier = await db.supplier.findUnique({
    where: {
      id: supplierId,
    },
  });

  if (!supplier) {
    redirect("/admin/suppliers");
  }

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <SupplierDetailsClient supplier={supplier} />
      </div>
    </div>
  );
};

export default SupplierDetailsPage;
