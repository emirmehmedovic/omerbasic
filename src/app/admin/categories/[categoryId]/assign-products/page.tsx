import Link from "next/link";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import CategoryProductAssigner from "@/components/admin/CategoryProductAssigner";

export const metadata: Metadata = {
  title: "Poveži proizvode | Admin kategorije",
  description: "Dodjela proizvoda odabranoj kategoriji",
};

export default async function AssignCategoryProductsPage({
  params,
}: {
  params: Promise<{ categoryId: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return notFound();
  }

  const { categoryId } = await params;

  const category = await db.category.findUnique({
    where: { id: categoryId },
    include: {
      parent: {
        include: {
          parent: true,
        },
      },
    },
  });

  if (!category) {
    return notFound();
  }

  const currentProducts = await db.product.findMany({
    where: { categoryId },
    select: {
      id: true,
      name: true,
      catalogNumber: true,
      imageUrl: true,
      category: { select: { imageUrl: true } },
    },
    orderBy: { name: "asc" },
  });

  const breadcrumbSegments = buildBreadcrumb(category);

  return (
    <div className="p-6 space-y-6">
      <div className="bg-gradient-to-br from-white via-gray-50/80 to-blue-50/60 backdrop-blur-sm rounded-2xl p-6 border border-amber/20 shadow-sm">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-sm rounded-xl border border-amber/30">
                <svg
                  className="w-8 h-8 text-amber"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 3a2 2 0 00-2 2v1a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2H5zM3 13a2 2 0 012-2h2a2 2 0 012 2v6H5a2 2 0 01-2-2v-4zm10-2h6a2 2 0 012 2v4a2 2 0 01-2 2h-6v-8z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-amber via-orange to-brown bg-clip-text text-transparent">
                  Poveži proizvode
                </h1>
                <div className="text-gray-600 mt-1 text-sm">
                  {breadcrumbSegments.map((segment, index) => (
                    <span key={segment.id || segment.name}>
                      {index > 0 && <span className="mx-1 text-gray-400">/</span>}
                      {segment.id ? (
                        <Link
                          href={`/admin/categories/${segment.id}/assign-products`}
                          className="text-amber-600 hover:text-amber-800"
                        >
                          {segment.name}
                        </Link>
                      ) : (
                        <span>{segment.name}</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <Link
              href="/admin/categories"
              className="inline-flex items-center justify-center rounded-xl text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2 bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm text-gray-700 hover:from-white hover:to-gray-50 hover:shadow-lg border border-amber/30 h-10 px-4"
            >
              ← Nazad na kategorije
            </Link>
          </div>
          <p className="text-sm text-gray-600">
            Dodijelite proizvode za kategoriju <span className="font-semibold text-gray-900">{category.name}</span>.
            Označeni proizvodi bit će premješteni u ovu podkategoriju.
          </p>
        </div>
      </div>

      <CategoryProductAssigner
        categoryId={category.id}
        categoryName={category.name}
        initialSelected={currentProducts}
      />
    </div>
  );
}

type BreadcrumbSegment = { id?: string; name: string };

function buildBreadcrumb(category: {
  id: string;
  name: string;
  parent: (null | { id: string; name: string; parent: (null | { id: string; name: string }) }) | null;
}): BreadcrumbSegment[] {
  const segments: BreadcrumbSegment[] = [{ id: undefined, name: "Kategorije" }];

  if (category.parent?.parent) {
    segments.push({ id: category.parent.parent.id, name: category.parent.parent.name });
  }

  if (category.parent) {
    segments.push({ id: category.parent.id, name: category.parent.name });
  }

  segments.push({ id: category.id, name: category.name });
  return segments;
}
