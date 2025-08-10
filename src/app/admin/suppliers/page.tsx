import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
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
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <SuppliersClient />
      </div>
    </div>
  );
};

export default SuppliersPage;
