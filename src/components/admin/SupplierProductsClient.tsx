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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

interface Supplier {
  id: string;
  name: string;
  companyName: string;
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
  supplier: Supplier;
}

export const SupplierProductsClient = () => {
  const [loading, setLoading] = useState(true);
  const [supplierProducts, setSupplierProducts] = useState<SupplierProduct[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [editingProduct, setEditingProduct] = useState<SupplierProduct | null>(null);

  // Dohvati sve dobavljače
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const response = await axios.get("/api/suppliers");
        setSuppliers(response.data);
        if (response.data.length > 0) {
          setSelectedSupplierId(response.data[0].id);
        }
      } catch (error) {
        toast.error("Greška pri dohvaćanju dobavljača.");
        console.error(error);
      }
    };
    
    fetchSuppliers();
  }, []);

  // Dohvati proizvode za odabranog dobavljača
  useEffect(() => {
    if (!selectedSupplierId) {
      setSupplierProducts([]);
      setLoading(false);
      return;
    }

    const fetchSupplierProducts = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/suppliers/${selectedSupplierId}/products`);
        setSupplierProducts(response.data);
      } catch (error) {
        toast.error("Greška pri dohvaćanju proizvoda dobavljača.");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchSupplierProducts();
  }, [selectedSupplierId]);

  const onDelete = async (id: string) => {
    try {
      setLoading(true);
      await axios.delete(`/api/suppliers/${selectedSupplierId}/products/${id}`);
      
      // Osvježi listu proizvoda
      const response = await axios.get(`/api/suppliers/${selectedSupplierId}/products`);
      setSupplierProducts(response.data);
      
      toast.success("Proizvod je uklonjen od dobavljača.");
    } catch (error) {
      toast.error("Greška pri uklanjanju proizvoda od dobavljača.");
      console.error(error);
    } finally {
      setLoading(false);
      setIsDeleteModalOpen(false);
      setDeletingId("");
    }
  };

  const onAddSuccess = async () => {
    try {
      setLoading(true);
      // Osvježi listu proizvoda
      const response = await axios.get(`/api/suppliers/${selectedSupplierId}/products`);
      setSupplierProducts(response.data);
      setIsFormOpen(false);
      setEditingProduct(null);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      accessorFn: (row: SupplierProduct) => row.product?.name,
      id: "productName",
      header: "Naziv proizvoda",
      cell: ({ row }: any) => row.original.product?.name || "-",
    },
    {
      accessorFn: (row: SupplierProduct) => row.product?.category?.name,
      id: "categoryName",
      header: "Kategorija",
      cell: ({ row }: any) => row.original.product?.category?.name || "Bez kategorije",
    },
    {
      accessorKey: "supplierSku",
      header: "Šifra dobavljača",
      cell: ({ row }: any) => row.original.supplierSku || "-",
    },
    {
      accessorKey: "priority",
      header: "Prioritet",
    },
    {
      accessorKey: "price",
      header: "Nabavna cijena",
      cell: ({ row }: any) => formatPrice(row.original.price),
    },
    {
      accessorKey: "minOrderQty",
      header: "Min. količina",
      cell: ({ row }: any) => row.original.minOrderQty || "-",
    },
    {
      accessorKey: "leadTime",
      header: "Vrijeme isporuke (dani)",
      cell: ({ row }: any) => row.original.leadTime || "-",
    },
    {
      id: "actions",
      cell: ({ row }: any) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setEditingProduct(row.original);
              setIsFormOpen(true);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setDeletingId(row.original.id);
              setIsDeleteModalOpen(true);
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
      <div className="flex items-center justify-between">
        <Heading
          title="Proizvodi dobavljača"
          description="Upravljajte proizvodima koje nabavljate od dobavljača"
        />
        <div className="flex items-center gap-4">
          <div className="w-[250px]">
            <Select
              value={selectedSupplierId}
              onValueChange={setSelectedSupplierId}
              disabled={loading || suppliers.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Odaberite dobavljača" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => {
              setEditingProduct(null);
              setIsFormOpen(true);
            }}
            disabled={loading || !selectedSupplierId}
          >
            <Plus className="mr-2 h-4 w-4" />
            Dodaj proizvod
          </Button>
        </div>
      </div>
      <Separator />
      <DataTable
        columns={columns}
        data={supplierProducts}
        searchKey="productName"
        isLoading={loading}
        emptyMessage={
          !selectedSupplierId
            ? "Odaberite dobavljača"
            : "Nema proizvoda povezanih s ovim dobavljačem"
        }
      />
      <SupplierProductForm
        supplierId={selectedSupplierId}
        initialData={editingProduct || undefined}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingProduct(null);
        }}
        onSuccess={onAddSuccess}
      />
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => onDelete(deletingId)}
        loading={loading}
      />
    </>
  );
};
