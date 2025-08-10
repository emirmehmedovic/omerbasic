"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { toast } from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { DataTable } from "@/components/ui/data-table";
import { CustomAlertModal } from "@/components/modals/custom-alert-modal";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { useDate } from "@/hooks/use-date-range";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Definicija tipova
interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplierId: string;
  status: string;
  orderDate: string;
  expectedDeliveryDate: string | null;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  supplier: {
    id: string;
    name: string;
  };
  items: {
    id: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    receivedQty: number;
    product: {
      name: string;
    };
  }[];
}

// Pomoćna funkcija za formatiranje statusa
const formatStatus = (status: string) => {
  switch (status) {
    case "DRAFT": return { label: "Nacrt", variant: "outline" as const };
    case "SENT": return { label: "Poslano", variant: "secondary" as const };
    case "CONFIRMED": return { label: "Potvrđeno", variant: "default" as const };
    case "PARTIALLY_RECEIVED": return { label: "Djelomično primljeno", variant: "warning" as const };
    case "RECEIVED": return { label: "Primljeno", variant: "success" as const };
    case "CANCELLED": return { label: "Otkazano", variant: "destructive" as const };
    default: return { label: status, variant: "outline" as const };
  }
};

export default function PurchaseOrdersClient() {
  const router = useRouter();
  const { startDate, endDate } = useDate();
  
  const [loading, setLoading] = useState(false);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [open, setOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [supplierFilter, setSupplierFilter] = useState<string>("");
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);

  // Dohvati narudžbenice
  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true);
      
      let url = "/api/purchase-orders?";
      
      if (startDate && endDate) {
        url += `fromDate=${startDate.toISOString()}&toDate=${endDate.toISOString()}&`;
      }
      
      if (statusFilter) {
        url += `status=${statusFilter}&`;
      }
      
      if (supplierFilter) {
        url += `supplierId=${supplierFilter}&`;
      }
      
      const response = await axios.get(url);
      setPurchaseOrders(response.data);
    } catch (error) {
      toast.error("Greška pri dohvaćanju narudžbenica.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Dohvati dobavljače za filter
  const fetchSuppliers = async () => {
    try {
      const response = await axios.get("/api/suppliers");
      setSuppliers(response.data);
    } catch (error) {
      console.error("Greška pri dohvaćanju dobavljača:", error);
    }
  };

  useEffect(() => {
    fetchPurchaseOrders();
    fetchSuppliers();
  }, [startDate, endDate, statusFilter, supplierFilter]);

  // Obriši narudžbenicu
  const onDelete = async () => {
    try {
      setLoading(true);
      
      if (deletingId) {
        await axios.delete(`/api/purchase-orders/${deletingId}`);
        toast.success("Narudžbenica uspješno obrisana.");
        fetchPurchaseOrders();
      }
    } catch (error) {
      toast.error("Greška pri brisanju narudžbenice. Samo narudžbenice u statusu 'Nacrt' mogu biti obrisane.");
    } finally {
      setLoading(false);
      setOpen(false);
      setDeletingId(null);
    }
  };

  // Definicija kolona za tablicu
  const columns = [
    {
      accessorKey: "orderNumber",
      header: "Broj narudžbe",
      cell: ({ row }: any) => (
        <div className="font-medium">
          {row.original.orderNumber}
        </div>
      ),
    },
    {
      accessorKey: "supplier.name",
      header: "Dobavljač",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: any) => {
        const status = formatStatus(row.original.status);
        return <Badge variant={status.variant}>{status.label}</Badge>;
      },
    },
    {
      accessorKey: "orderDate",
      header: "Datum narudžbe",
      cell: ({ row }: any) => format(new Date(row.original.orderDate), "dd.MM.yyyy"),
    },
    {
      accessorKey: "expectedDeliveryDate",
      header: "Očekivana isporuka",
      cell: ({ row }: any) => row.original.expectedDeliveryDate 
        ? format(new Date(row.original.expectedDeliveryDate), "dd.MM.yyyy")
        : "-",
    },
    {
      accessorKey: "totalAmount",
      header: "Ukupno (KM)",
      cell: ({ row }: any) => `${row.original.totalAmount.toFixed(2)} KM`,
    },
    {
      id: "actions",
      cell: ({ row }: any) => {
        const purchaseOrder = row.original;
        
        return (
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => router.push(`/admin/purchase-orders/${purchaseOrder.id}`)}
            >
              Detalji
            </Button>
            {purchaseOrder.status === "DRAFT" && (
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => {
                  setDeletingId(purchaseOrder.id);
                  setOpen(true);
                }}
              >
                Obriši
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <>
      <CustomAlertModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={onDelete}
        loading={loading}
        title="Brisanje narudžbenice"
        description="Jeste li sigurni da želite obrisati ovu narudžbenicu? Ova akcija se ne može poništiti."
      />
      <div className="flex items-center justify-between">
        <Heading
          title={`Narudžbenice (${purchaseOrders.length})`}
          description="Upravljanje narudžbenicama"
        />
        <Button onClick={() => router.push("/admin/purchase-orders/new")}>
          <Plus className="mr-2 h-4 w-4" />
          Nova narudžbenica
        </Button>
      </div>
      <Separator />
      
      <div className="flex flex-wrap gap-4 mb-4">
        <div className="flex-1 min-w-[200px]">
          <label className="text-sm font-medium mb-1 block">Vremenski period</label>
          <DateRangePicker />
        </div>
        
        <div className="min-w-[200px]">
          <label className="text-sm font-medium mb-1 block">Status</label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Svi statusi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Svi statusi</SelectItem>
              <SelectItem value="DRAFT">Nacrt</SelectItem>
              <SelectItem value="SENT">Poslano</SelectItem>
              <SelectItem value="CONFIRMED">Potvrđeno</SelectItem>
              <SelectItem value="PARTIALLY_RECEIVED">Djelomično primljeno</SelectItem>
              <SelectItem value="RECEIVED">Primljeno</SelectItem>
              <SelectItem value="CANCELLED">Otkazano</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="min-w-[200px]">
          <label className="text-sm font-medium mb-1 block">Dobavljač</label>
          <Select value={supplierFilter} onValueChange={setSupplierFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Svi dobavljači" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Svi dobavljači</SelectItem>
              {suppliers.map((supplier) => (
                <SelectItem key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <DataTable
        columns={columns}
        data={purchaseOrders}
        searchKey="orderNumber"
        searchPlaceholder="Pretraži po broju narudžbe..."
        isLoading={loading}
      />
    </>
  );
}
