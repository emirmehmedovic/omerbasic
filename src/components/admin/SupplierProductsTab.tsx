"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { Plus, Edit, Trash2 } from "lucide-react";
import { formatPrice } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { DataTable } from "../ui/data-table";
import { ConfirmationModal } from "@/components/modals/alert-modal";
import { SupplierProductForm } from "@/components/admin/SupplierProductForm";

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  category: Category | null;
}

interface SupplierProduct {
  id: string;
  supplierId: string;
  productId: string;
  supplierSku?: string;
  priority: number;
  price: number;
  minOrderQty?: number;
  leadTime?: number;
  notes?: string;
  product: Product;
}

interface SupplierProductsTabProps {
  supplierId: string;
}

export const SupplierProductsTab = ({ supplierId }: SupplierProductsTabProps) => {
  const [products, setProducts] = useState<SupplierProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<SupplierProduct | null>(null);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/suppliers/${supplierId}/products`);
      setProducts(response.data);
    } catch (error) {
      toast.error("Greška pri dohvaćanju proizvoda dobavljača.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [supplierId]);

  const handleDelete = async () => {
    if (!currentProduct) return;

    try {
      await axios.delete(`/api/suppliers/${supplierId}/products/${currentProduct.productId}`);
      toast.success("Proizvod je uspješno uklonjen od dobavljača.");
      fetchProducts();
      setIsDeleteOpen(false);
    } catch (error) {
      toast.error("Greška pri uklanjanju proizvoda.");
      console.error(error);
    }
  };

  const columns = [
    {
      accessorFn: (row: SupplierProduct) => row.product?.name,
      id: "productName",
      header: "Naziv proizvoda",
      cell: ({ row }: { row: any }) => (
        <div>{row.original.product?.name || "-"}</div>
      ),
    },
    {
      accessorFn: (row: SupplierProduct) => row.product?.category?.name,
      id: "categoryName",
      header: "Kategorija",
      cell: ({ row }: { row: any }) => (
        <div>{row.original.product?.category?.name || "-"}</div>
      ),
    },
    {
      accessorKey: "supplierSku",
      header: "Šifra dobavljača",
      cell: ({ row }: { row: any }) => (
        <div>{row.original.supplierSku || "-"}</div>
      ),
    },
    {
      accessorKey: "price",
      header: "Nabavna cijena",
      cell: ({ row }: { row: any }) => (
        <div>{formatPrice(row.original.price)}</div>
      ),
    },
    {
      accessorKey: "minOrderQty",
      header: "Min. količina",
      cell: ({ row }: { row: any }) => (
        <div>{row.original.minOrderQty || "-"}</div>
      ),
    },
    {
      accessorKey: "leadTime",
      header: "Vrijeme isporuke (dani)",
      cell: ({ row }: { row: any }) => (
        <div>{row.original.leadTime !== undefined ? `${row.original.leadTime} dana` : "-"}</div>
      ),
    },
    {
      accessorKey: "priority",
      header: "Prioritet",
    },
    {
      id: "actions",
      cell: ({ row }: { row: any }) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setCurrentProduct(row.original);
              setIsEditOpen(true);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setCurrentProduct(row.original);
              setIsDeleteOpen(true);
            }}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <ConfirmationModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        loading={loading}
        title="Jeste li sigurni?"
        description="Ova akcija će ukloniti vezu između dobavljača i proizvoda."
      />
      <SupplierProductForm
        supplierId={supplierId}
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSuccess={() => {
          setIsAddOpen(false);
          fetchProducts();
        }}
      />
      {currentProduct && (
        <SupplierProductForm
          supplierId={supplierId}
          productId={currentProduct.productId}
          initialData={currentProduct}
          isOpen={isEditOpen}
          onClose={() => {
            setIsEditOpen(false);
            setCurrentProduct(null);
          }}
          onSuccess={() => {
            setIsEditOpen(false);
            setCurrentProduct(null);
            fetchProducts();
          }}
        />
      )}
      <div className="flex items-center justify-between">
        <Heading
          title={`Proizvodi (${products.length})`}
          description="Upravljajte proizvodima za ovog dobavljača"
        />
        <Button onClick={() => setIsAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Dodaj proizvod
        </Button>
      </div>
      <Separator />
      <DataTable
        columns={columns}
        data={products}
        searchKey="productName"
        isLoading={loading}
      />
    </>
  );
};
