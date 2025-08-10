import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { SupplierDetailsClient } from "@/components/admin/SupplierDetailsClient";

export const metadata: Metadata = {
  title: "Detalji dobavljača | Admin Panel",
  description: "Upravljanje detaljima dobavljača",
};

interface SupplierDetailsPageProps {
  params: {
    supplierId: string;
  };
}

const SupplierDetailsPage = async ({ params }: SupplierDetailsPageProps) => {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "ADMIN") {
    redirect("/");
  }

  const supplier = await db.supplier.findUnique({
    where: {
      id: params.supplierId,
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
