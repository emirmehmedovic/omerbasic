import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import PurchaseOrderForm from "../components/PurchaseOrderForm";

export default async function NewPurchaseOrderPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "ADMIN") {
    redirect("/auth/signin");
  }

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <PurchaseOrderForm />
      </div>
    </div>
  );
}
