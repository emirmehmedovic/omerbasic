import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";

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
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <SupplierProductsClient />
      </div>
    </div>
  );
};

export default SupplierProductsPage;
