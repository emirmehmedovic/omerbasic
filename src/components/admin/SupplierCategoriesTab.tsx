"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { Plus, Edit, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { DataTable } from "@/components/ui/data-table";
import { ConfirmationModal } from "@/components/modals/alert-modal";
import { SupplierCategoryForm } from "@/components/admin/SupplierCategoryForm";

interface Category {
  id: string;
  name: string;
  level: number;
  parentId: string | null;
}

interface SupplierCategory {
  id: string;
  supplierId: string;
  categoryId: string;
  priority: number;
  notes?: string;
  category: Category;
}

interface SupplierCategoriesTabProps {
  supplierId: string;
}

export const SupplierCategoriesTab = ({ supplierId }: SupplierCategoriesTabProps) => {
  const [categories, setCategories] = useState<SupplierCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<SupplierCategory | null>(null);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/suppliers/${supplierId}/categories`);
      setCategories(response.data);
    } catch (error) {
      toast.error("Greška pri dohvaćanju kategorija dobavljača.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [supplierId]);

  const handleDelete = async () => {
    if (!currentCategory) return;

    try {
      await axios.delete(`/api/suppliers/${supplierId}/categories/${currentCategory.categoryId}`);
      toast.success("Kategorija je uspješno uklonjena od dobavljača.");
      fetchCategories();
      setIsDeleteOpen(false);
    } catch (error) {
      toast.error("Greška pri uklanjanju kategorije.");
      console.error(error);
    }
  };

  const columns = [
    {
      accessorKey: "category.name",
      header: "Naziv kategorije",
    },
    {
      accessorKey: "priority",
      header: "Prioritet",
    },
    {
      accessorKey: "notes",
      header: "Napomene",
      cell: ({ row }: { row: any }) => (
        <div>{row.original.notes || "-"}</div>
      ),
    },
    {
      id: "actions",
      cell: ({ row }: { row: any }) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setCurrentCategory(row.original);
              setIsEditOpen(true);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setCurrentCategory(row.original);
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
        description="Ova akcija će ukloniti vezu između dobavljača i kategorije."
      />
      <SupplierCategoryForm
        supplierId={supplierId}
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSuccess={() => {
          setIsAddOpen(false);
          fetchCategories();
        }}
      />
      {currentCategory && (
        <SupplierCategoryForm
          supplierId={supplierId}
          categoryId={currentCategory.categoryId}
          initialData={currentCategory}
          isOpen={isEditOpen}
          onClose={() => {
            setIsEditOpen(false);
            setCurrentCategory(null);
          }}
          onSuccess={() => {
            setIsEditOpen(false);
            setCurrentCategory(null);
            fetchCategories();
          }}
        />
      )}
      <div className="flex items-center justify-between">
        <Heading
          title={`Kategorije (${categories.length})`}
          description="Upravljajte kategorijama za ovog dobavljača"
        />
        <Button onClick={() => setIsAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Dodaj kategoriju
        </Button>
      </div>
      <Separator />
      <DataTable
        columns={columns}
        data={categories}
        searchKey="category.name"
        isLoading={loading}
      />
    </>
  );
};
