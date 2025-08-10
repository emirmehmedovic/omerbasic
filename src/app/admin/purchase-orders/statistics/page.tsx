import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import PurchaseOrderStatisticsClient from "./components/PurchaseOrderStatisticsClient";

export default async function PurchaseOrderStatisticsPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "ADMIN") {
    redirect("/auth/signin");
  }

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <PurchaseOrderStatisticsClient />
      </div>
    </div>
  );
}
