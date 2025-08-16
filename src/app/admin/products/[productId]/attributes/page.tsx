import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import ProductAttributeValueManager from "@/components/admin/ProductAttributeValueManager";
import ProductCrossReferenceManager from "@/components/admin/ProductCrossReferenceManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const metadata: Metadata = {
  title: "Atributi i reference proizvoda | Admin panel",
  description: "Upravljanje atributima i cross-referencama proizvoda",
};

export default async function ProductAttributesPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const session = await getServerSession(authOptions);

  // Provjera autorizacije
  if (!session || session.user.role !== "ADMIN") {
    return notFound();
  }

  const { productId } = await params;

  // Dohvat proizvoda s kategorijom
  const product = await db.product.findUnique({
    where: { id: productId },
    include: {
      category: true,
    },
  });

  if (!product) {
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
              Tehnički podaci: {product.name}
            </h1>
            <p className="text-gray-600 mt-1">
              Kataloški broj: <span className="font-medium text-gray-800">{product.catalogNumber}</span>
              {product.oemNumber && (
                <>
                  <span className="mx-2 text-gray-400">|</span>
                  OEM broj: <span className="font-medium text-gray-800">{product.oemNumber}</span>
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Section */}
      <div className="bg-gradient-to-br from-white via-gray-50/80 to-blue-50/60 backdrop-blur-sm rounded-2xl p-6 border border-amber/20 shadow-sm">
        <Tabs defaultValue="attributes" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 bg-gradient-to-r from-white/90 to-gray-50/90 backdrop-blur-sm border border-amber/20 rounded-xl p-1">
            <TabsTrigger 
              value="attributes" 
              className="text-gray-700 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber data-[state=active]:via-orange data-[state=active]:to-brown data-[state=active]:text-white rounded-lg transition-all duration-200"
            >
              Atributi proizvoda
            </TabsTrigger>
            <TabsTrigger 
              value="references"
              className="text-gray-700 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber data-[state=active]:via-orange data-[state=active]:to-brown data-[state=active]:text-white rounded-lg transition-all duration-200"
            >
              Cross-reference
            </TabsTrigger>
          </TabsList>
          <TabsContent value="attributes" className="mt-6">
            <ProductAttributeValueManager
              productId={productId}
              categoryId={product.categoryId}
            />
          </TabsContent>
          <TabsContent value="references" className="mt-6">
            <ProductCrossReferenceManager productId={productId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
