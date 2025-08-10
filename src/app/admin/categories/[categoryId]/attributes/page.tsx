import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import CategoryAttributeManager from "@/components/admin/CategoryAttributeManager";

export const metadata: Metadata = {
  title: "Atributi kategorije | Admin panel",
  description: "Upravljanje atributima kategorije",
};

export default async function CategoryAttributesPage({
  params,
}: {
  params: Promise<{ categoryId: string }>;
}) {
  const session = await getServerSession(authOptions);

  // Provjera autorizacije
  if (!session || session.user.role !== "ADMIN") {
    return notFound();
  }

  // Dohvaćamo categoryId iz params objekta (Next.js 15 async params)
  const { categoryId } = await params;

  // Dohvat kategorije
  const category = await db.category.findUnique({
    where: { id: categoryId },
  });

  if (!category) {
    return notFound();
  }

  return (
    <div className="container py-8">
      <CategoryAttributeManager
        categoryId={categoryId}
        categoryName={category.name}
      />
    </div>
  );
}
