import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { SuppliersClient } from "@/components/admin/SuppliersClient";

export const metadata: Metadata = {
  title: "Dobavljači | Admin Panel",
  description: "Upravljanje dobavljačima",
};

const SuppliersPage = async () => {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="p-6 space-y-6">
      <SuppliersClient />
    </div>
  );
};

export default SuppliersPage;
