import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

import { SupplierProductsClient } from "@/components/admin/SupplierProductsClient";

export const metadata: Metadata = {
  title: "Admin | Proizvodi dobavljača",
  description: "Upravljanje proizvodima dobavljača",
};

const SupplierProductsPage = async () => {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="p-6 space-y-6">
      <SupplierProductsClient />
    </div>
  );
};

export default SupplierProductsPage;
