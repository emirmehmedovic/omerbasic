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
    <div className="p-6 space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-br from-white via-gray-50/80 to-blue-50/60 backdrop-blur-sm rounded-2xl p-6 border border-amber/20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-sm rounded-xl border border-amber/30">
            <svg className="w-8 h-8 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-amber via-orange to-brown bg-clip-text text-transparent">
              Atributi kategorije
            </h1>
            <p className="text-gray-600 mt-1">
              Upravljanje atributima za: <span className="font-semibold text-gray-800">{category.name}</span>
            </p>
          </div>
        </div>
      </div>

      <CategoryAttributeManager
        categoryId={categoryId}
        categoryName={category.name}
      />
    </div>
  );
}
