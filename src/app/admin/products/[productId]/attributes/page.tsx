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
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">
        Tehnički podaci: {product.name}
      </h1>
      <p className="text-gray-500 mb-6">
        Kataloški broj: {product.catalogNumber}
        {product.oemNumber && ` | OEM broj: ${product.oemNumber}`}
      </p>

      <Tabs defaultValue="attributes" className="space-y-6">
        <TabsList>
          <TabsTrigger value="attributes">Atributi proizvoda</TabsTrigger>
          <TabsTrigger value="references">Cross-reference</TabsTrigger>
        </TabsList>
        <TabsContent value="attributes">
          <ProductAttributeValueManager
            productId={productId}
            categoryId={product.categoryId}
          />
        </TabsContent>
        <TabsContent value="references">
          <ProductCrossReferenceManager productId={productId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
