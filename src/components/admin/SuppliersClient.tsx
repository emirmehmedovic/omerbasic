"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { DataTable } from "../ui/data-table";
import { ApiList } from "../ui/api-list";
import { ConfirmationModal } from "@/components/modals/alert-modal";
import { SupplierForm } from "./SupplierForm";

import { Supplier } from "@/types/supplier";

export const SuppliersClient = () => {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/suppliers");
      setSuppliers(response.data);
    } catch (error) {
      toast.error("Greška pri dohvaćanju dobavljača.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const onDelete = async (id: string) => {
    try {
      await axios.delete(`/api/suppliers/${id}`);
      toast.success("Dobavljač je uspješno obrisan.");
      fetchSuppliers();
      setIsDeleteOpen(false);
    } catch (error) {
      toast.error("Greška pri brisanju dobavljača.");
      console.error(error);
    }
  };

  const columns = [
    {
      accessorKey: "name",
      header: "Naziv",
    },
    {
      accessorKey: "companyName",
      header: "Tvrtka",
    },
    {
      accessorKey: "email",
      header: "Email",
    },
    {
      accessorKey: "phone",
      header: "Telefon",
    },
    {
      accessorKey: "city",
      header: "Grad",
    },
    {
      accessorKey: "country",
      header: "Država",
    },
    {
      accessorKey: "isActive",
      header: "Aktivan",
      cell: ({ row }: { row: any }) => (
        <div>{row.original.isActive ? "Da" : "Ne"}</div>
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
              setEditingSupplier(row.original);
              setOpen(true);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setDeleteId(row.original.id);
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
        onConfirm={() => deleteId && onDelete(deleteId)}
        loading={loading}
        title="Jeste li sigurni?"
        description="Ova akcija će trajno obrisati dobavljača i ne može se poništiti."
      />
      <SupplierForm
        isOpen={open}
        onClose={() => {
          setOpen(false);
          setEditingSupplier(null);
        }}
        initialData={editingSupplier}
        onSuccess={() => {
          setOpen(false);
          setEditingSupplier(null);
          fetchSuppliers();
        }}
      />
      <div className="flex items-center justify-between">
        <Heading
          title={`Dobavljači (${suppliers.length})`}
          description="Upravljajte dobavljačima za vaše proizvode"
        />
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Dodaj dobavljača
        </Button>
      </div>
      <Separator />
      <DataTable
        columns={columns}
        data={suppliers}
        searchKey="name"
        isLoading={loading}
      />
      <Heading title="API" description="API pozivi za dobavljače" />
      <Separator />
      <ApiList entityName="suppliers" entityIdName="supplierId" />
    </>
  );
};
