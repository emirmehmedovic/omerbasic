"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { format } from "date-fns";
import { toast } from "react-hot-toast";
import { ArrowLeft, FileText, Printer, MessageSquare, CheckCircle, AlertCircle, Building2, Calendar, User, DollarSign, Package } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { generatePurchaseOrderPdf, downloadPdf } from "@/lib/pdfUtils";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CustomAlertModal } from "@/components/modals/custom-alert-modal";

// Definicija tipova
interface PurchaseOrderDetailsProps {
  purchaseOrder: any; // Tip je kompleksan, koristimo any za sada
}

// Schema za validaciju komentara
const commentSchema = z.object({
  comment: z.string().min(1, "Komentar ne može biti prazan"),
});

// Schema za validaciju statusa
const statusSchema = z.object({
  status: z.enum(["DRAFT", "SENT", "CONFIRMED", "PARTIALLY_RECEIVED", "RECEIVED", "CANCELLED"]),
  statusNote: z.string().optional(),
});

// Schema za validaciju primljene količine
const receivedQtySchema = z.object({
  receivedQty: z.number().int().min(0, "Primljena količina ne može biti negativna"),
  notes: z.string().optional(),
});

// Pomoćna funkcija za formatiranje statusa
const formatStatus = (status: string) => {
  switch (status) {
    case "DRAFT": return { label: "Nacrt", variant: "outline" as const };
    case "SENT": return { label: "Poslano", variant: "secondary" as const };
    case "CONFIRMED": return { label: "Potvrđeno", variant: "default" as const };
    case "PARTIALLY_RECEIVED": return { label: "Djelomično primljeno", variant: "secondary" as const };
    case "RECEIVED": return { label: "Primljeno", variant: "default" as const };
    case "CANCELLED": return { label: "Otkazano", variant: "destructive" as const };
    default: return { label: status, variant: "outline" as const };
  }
};

export default function PurchaseOrderDetails({ purchaseOrder }: PurchaseOrderDetailsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);

  // Inicijalizacija forme za komentare
  const commentForm = useForm({
    resolver: zodResolver(commentSchema),
    defaultValues: {
      comment: "",
    },
  });

  // Inicijalizacija forme za status
  const statusForm = useForm({
    resolver: zodResolver(statusSchema),
    defaultValues: {
      status: purchaseOrder.status,
      statusNote: "",
    },
  });

  // Inicijalizacija forme za primanje proizvoda
  const receiveForm = useForm({
    resolver: zodResolver(receivedQtySchema),
    defaultValues: {
      receivedQty: 0,
      notes: "",
    },
  });

  // Dodaj komentar
  const onAddComment = async (data: { comment: string }) => {
    try {
      setLoading(true);
      await axios.post(`/api/purchase-orders/${purchaseOrder.id}/comments`, data);
      toast.success("Komentar uspješno dodan.");
      commentForm.reset();
      setIsCommentModalOpen(false);
      router.refresh();
    } catch (error) {
      toast.error("Greška pri dodavanju komentara.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Promijeni status
  const onChangeStatus = async (data: { status: string; statusNote?: string }) => {
    try {
      setLoading(true);
      await axios.patch(`/api/purchase-orders/${purchaseOrder.id}`, data);
      toast.success("Status uspješno promijenjen.");
      setIsStatusModalOpen(false);
      router.refresh();
    } catch (error) {
      toast.error("Greška pri promjeni statusa.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Primi proizvod
  const onReceiveItem = async (data: { receivedQty: number; notes?: string }) => {
    try {
      setLoading(true);
      await axios.patch(`/api/purchase-orders/${purchaseOrder.id}/items/${selectedItem.id}`, data);
      toast.success("Proizvod uspješno primljen.");
      setIsReceiveModalOpen(false);
      router.refresh();
    } catch (error) {
      toast.error("Greška pri primanju proizvoda.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Generiraj PDF
  const generatePDF = async () => {
    try {
      setLoading(true);
      
      // Generiraj PDF iz podataka narudžbenice
      const pdfBlob = generatePurchaseOrderPdf(purchaseOrder);
      
      // Preuzmi PDF
      downloadPdf(pdfBlob, `dostavnica-${purchaseOrder.orderNumber}.pdf`);
      
      toast.success("PDF uspješno generiran.");
    } catch (error) {
      toast.error("Greška pri generiranju PDF-a.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Modal za promjenu statusa */}
      <CustomAlertModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        onConfirm={statusForm.handleSubmit(onChangeStatus)}
        loading={loading}
        title="Promjena statusa"
        description="Jeste li sigurni da želite promijeniti status narudžbenice?"
      >
        <Form {...statusForm}>
          <form className="space-y-4 mt-4">
            <FormField
              control={statusForm.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700 font-medium">Status</FormLabel>
                  <Select
                    disabled={loading}
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-white border-amber/30 focus:border-amber rounded-lg transition-all duration-200 text-gray-900">
                        <SelectValue placeholder="Odaberite status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-white border border-amber/20 rounded-lg shadow-lg">
                      <SelectItem value="DRAFT">Nacrt</SelectItem>
                      <SelectItem value="SENT">Poslano</SelectItem>
                      <SelectItem value="CONFIRMED">Potvrđeno</SelectItem>
                      <SelectItem value="PARTIALLY_RECEIVED">Djelomično primljeno</SelectItem>
                      <SelectItem value="RECEIVED">Primljeno</SelectItem>
                      <SelectItem value="CANCELLED">Otkazano</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={statusForm.control}
              name="statusNote"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700 font-medium">Napomena</FormLabel>
                  <FormControl>
                    <Textarea
                      disabled={loading}
                      placeholder="Unesite napomenu o promjeni statusa..."
                      {...field}
                      value={field.value || ""}
                      className="bg-white border-amber/30 focus:border-amber rounded-lg transition-all duration-200 text-gray-900 placeholder:text-gray-500 resize-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </CustomAlertModal>

      {/* Modal za dodavanje komentara */}
      <CustomAlertModal
        isOpen={isCommentModalOpen}
        onClose={() => setIsCommentModalOpen(false)}
        onConfirm={commentForm.handleSubmit(onAddComment)}
        loading={loading}
        title="Dodaj komentar"
        description="Unesite komentar za ovu narudžbenicu."
      >
        <Form {...commentForm}>
          <form className="space-y-4 mt-4">
            <FormField
              control={commentForm.control}
              name="comment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700 font-medium">Komentar</FormLabel>
                  <FormControl>
                    <Textarea
                      disabled={loading}
                      placeholder="Unesite komentar..."
                      {...field}
                      className="bg-white border-amber/30 focus:border-amber rounded-lg transition-all duration-200 text-gray-900 placeholder:text-gray-500 resize-none min-h-[100px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </CustomAlertModal>

      {/* Modal za primanje proizvoda */}
      <CustomAlertModal
        isOpen={isReceiveModalOpen}
        onClose={() => setIsReceiveModalOpen(false)}
        onConfirm={receiveForm.handleSubmit(onReceiveItem)}
        loading={loading}
        title="Primi proizvod"
        description={selectedItem ? `Primanje proizvoda: ${selectedItem.product.name}` : ""}
      >
        {selectedItem && (
          <Form {...receiveForm}>
            <form className="space-y-4 mt-4">
              <div className="bg-gradient-to-r from-amber/5 to-orange/5 border border-amber/20 rounded-lg p-3">
                <div className="text-sm space-y-1">
                  <p className="text-gray-900"><span className="font-medium">Proizvod:</span> {selectedItem.product.name}</p>
                  <p className="text-gray-900"><span className="font-medium">Naručena količina:</span> {selectedItem.quantity}</p>
                  <p className="text-gray-900"><span className="font-medium">Trenutno primljeno:</span> {selectedItem.receivedQty}</p>
                </div>
              </div>
              <FormField
                control={receiveForm.control}
                name="receivedQty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 font-medium">Nova primljena količina</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={selectedItem.quantity}
                        disabled={loading}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        className="bg-white border-amber/30 focus:border-amber rounded-lg transition-all duration-200 text-gray-900"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={receiveForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 font-medium">Napomena</FormLabel>
                    <FormControl>
                      <Textarea
                        disabled={loading}
                        placeholder="Unesite napomenu o primanju proizvoda..."
                        {...field}
                        value={field.value || ""}
                        className="bg-white border-amber/30 focus:border-amber rounded-lg transition-all duration-200 text-gray-900 placeholder:text-gray-500 resize-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        )}
      </CustomAlertModal>

      {/* Header Section */}
      <div className="bg-gradient-to-br from-white via-gray-50/80 to-blue-50/60 backdrop-blur-sm rounded-2xl p-6 border border-amber/20 shadow-sm mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.push("/admin/purchase-orders")}
              className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm text-gray-700 hover:from-white hover:to-gray-50 border-amber/30 hover:border-amber/50 rounded-lg transition-all duration-200 shadow-sm"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-sm rounded-lg border border-amber/30">
                <FileText className="w-6 h-6 text-amber" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-amber to-orange bg-clip-text text-transparent">
                  Narudžbenica: {purchaseOrder.orderNumber}
                </h1>
                <p className="text-gray-600 mt-1">
                  Status: <Badge variant={formatStatus(purchaseOrder.status).variant} className="ml-2">
                    {formatStatus(purchaseOrder.status).label}
                  </Badge>
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setIsCommentModalOpen(true)}
              disabled={loading}
              className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm text-gray-700 hover:from-white hover:to-gray-50 border-amber/30 hover:border-amber/50 rounded-lg transition-all duration-200 shadow-sm"
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Dodaj komentar
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsStatusModalOpen(true)}
              disabled={loading}
              className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm text-gray-700 hover:from-white hover:to-gray-50 border-amber/30 hover:border-amber/50 rounded-lg transition-all duration-200 shadow-sm"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Promijeni status
            </Button>
            <Button
              variant="outline"
              onClick={generatePDF}
              disabled={loading}
              className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm text-gray-700 hover:from-white hover:to-gray-50 border-amber/30 hover:border-amber/50 rounded-lg transition-all duration-200 shadow-sm"
            >
              <Printer className="mr-2 h-4 w-4" />
              Ispiši dostavnicu
            </Button>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm border border-amber/20 rounded-xl p-1">
          <TabsTrigger value="details" className="text-gray-700 hover:text-gray-900 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber data-[state=active]:via-orange data-[state=active]:to-brown data-[state=active]:text-white rounded-lg transition-all duration-200">Detalji</TabsTrigger>
          <TabsTrigger value="items" className="text-gray-700 hover:text-gray-900 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber data-[state=active]:via-orange data-[state=active]:to-brown data-[state=active]:text-white rounded-lg transition-all duration-200">Stavke</TabsTrigger>
          <TabsTrigger value="history" className="text-gray-700 hover:text-gray-900 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber data-[state=active]:via-orange data-[state=active]:to-brown data-[state=active]:text-white rounded-lg transition-all duration-200">Historija</TabsTrigger>
          <TabsTrigger value="comments" className="text-gray-700 hover:text-gray-900 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber data-[state=active]:via-orange data-[state=active]:to-brown data-[state=active]:text-white rounded-lg transition-all duration-200">Komentari</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm border border-amber/20 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-amber/5 to-orange/5 border-b border-amber/20">
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <FileText className="w-5 h-5 text-amber" />
                  Informacije o narudžbenici
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-700">Broj narudžbe:</div>
                    <div className="text-gray-900 font-semibold">{purchaseOrder.orderNumber}</div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-700">Status:</div>
                    <div>
                      <Badge variant={formatStatus(purchaseOrder.status).variant}>
                        {formatStatus(purchaseOrder.status).label}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-700">Datum narudžbe:</div>
                    <div className="text-gray-900">{format(new Date(purchaseOrder.orderDate), "dd.MM.yyyy")}</div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-700">Očekivana isporuka:</div>
                    <div className="text-gray-900">
                      {purchaseOrder.expectedDeliveryDate
                        ? format(new Date(purchaseOrder.expectedDeliveryDate), "dd.MM.yyyy")
                        : "-"}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-700">Datum isporuke:</div>
                    <div className="text-gray-900">
                      {purchaseOrder.deliveryDate
                        ? format(new Date(purchaseOrder.deliveryDate), "dd.MM.yyyy")
                        : "-"}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-700">Kreirao:</div>
                    <div className="text-gray-900">{purchaseOrder.createdBy.name}</div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-700">Datum kreiranja:</div>
                    <div className="text-gray-900">{format(new Date(purchaseOrder.createdAt), "dd.MM.yyyy HH:mm")}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm border border-amber/20 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-amber/5 to-orange/5 border-b border-amber/20">
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <Building2 className="w-5 h-5 text-amber" />
                  Informacije o dobavljaču
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-700">Naziv:</div>
                    <div className="text-gray-900 font-semibold">{purchaseOrder.supplier.name}</div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-700">Kontakt osoba:</div>
                    <div className="text-gray-900">{purchaseOrder.supplier.contactPerson || "-"}</div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-700">Email:</div>
                    <div className="text-gray-900">{purchaseOrder.supplier.email || "-"}</div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-700">Telefon:</div>
                    <div className="text-gray-900">{purchaseOrder.supplier.phone || "-"}</div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-700">Adresa:</div>
                    <div className="text-gray-900">{purchaseOrder.supplier.address || "-"}</div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-700">Grad:</div>
                    <div className="text-gray-900">{purchaseOrder.supplier.city || "-"}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm border border-amber/20 shadow-sm">
            <CardHeader className="bg-gradient-to-r from-amber/5 to-orange/5 border-b border-amber/20">
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <FileText className="w-5 h-5 text-amber" />
                Napomena
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-gray-900">
                {purchaseOrder.notes || "Nema napomene"}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm border border-amber/20 shadow-sm">
            <CardHeader className="bg-gradient-to-r from-amber/5 to-orange/5 border-b border-amber/20">
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <DollarSign className="w-5 h-5 text-amber" />
                Financijski pregled
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-4 bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-sm border border-amber/20 rounded-xl">
                  <div className="text-sm text-gray-600 mb-1">Iznos bez PDV-a</div>
                  <div className="text-2xl font-bold text-gray-900">{purchaseOrder.subtotal.toFixed(2)} KM</div>
                </div>
                <div className="p-4 bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-sm border border-amber/20 rounded-xl">
                  <div className="text-sm text-gray-600 mb-1">PDV</div>
                  <div className="text-2xl font-bold text-gray-900">{purchaseOrder.taxAmount.toFixed(2)} KM</div>
                </div>
                <div className="p-4 bg-gradient-to-r from-amber/10 to-orange/10 border border-amber/30 rounded-xl">
                  <div className="text-sm text-gray-600 mb-1">Ukupno</div>
                  <div className="text-2xl font-bold text-gray-900">{purchaseOrder.totalAmount.toFixed(2)} KM</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="items" className="space-y-6">
          <Card className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm border border-amber/20 shadow-sm">
            <CardHeader className="bg-gradient-to-r from-amber/5 to-orange/5 border-b border-amber/20">
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <Package className="w-5 h-5 text-amber" />
                Stavke narudžbenice
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-amber/20">
                      <th className="text-left py-3 px-4 text-gray-700 font-medium">Proizvod</th>
                      <th className="text-left py-3 px-4 text-gray-700 font-medium">Šifra</th>
                      <th className="text-right py-3 px-4 text-gray-700 font-medium">Količina</th>
                      <th className="text-right py-3 px-4 text-gray-700 font-medium">Primljeno</th>
                      <th className="text-right py-3 px-4 text-gray-700 font-medium">Cijena</th>
                      <th className="text-right py-3 px-4 text-gray-700 font-medium">Ukupno</th>
                      <th className="text-center py-3 px-4 text-gray-700 font-medium">Akcije</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchaseOrder.items.map((item: any) => (
                      <tr key={item.id} className="border-b border-amber/10 hover:bg-amber/5 transition-colors">
                        <td className="py-3 px-4 text-gray-900">{item.product.name}</td>
                        <td className="py-3 px-4 text-gray-900">{item.product.catalogNumber}</td>
                        <td className="text-right py-3 px-4 text-gray-900 font-medium">{item.quantity}</td>
                        <td className="text-right py-3 px-4">
                          <Badge variant={item.receivedQty === 0 ? "outline" :
                            item.receivedQty < item.quantity ? "secondary" : "default"
                          }>
                            {item.receivedQty} / {item.quantity}
                          </Badge>
                        </td>
                        <td className="text-right py-3 px-4 text-gray-900">{item.unitPrice.toFixed(2)} KM</td>
                        <td className="text-right py-3 px-4 text-gray-900 font-medium">{item.totalPrice.toFixed(2)} KM</td>
                        <td className="text-center py-3 px-4">
                          {purchaseOrder.status !== "DRAFT" && purchaseOrder.status !== "CANCELLED" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedItem(item);
                                receiveForm.setValue("receivedQty", item.receivedQty);
                                receiveForm.setValue("notes", item.notes || "");
                                setIsReceiveModalOpen(true);
                              }}
                              className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm text-gray-700 hover:from-white hover:to-gray-50 border-amber/30 hover:border-amber/50 rounded-lg transition-all duration-200 shadow-sm"
                            >
                              Primi
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-medium border-t border-amber/20">
                      <td colSpan={5} className="text-right py-3 px-4 text-gray-700">Ukupno:</td>
                      <td className="text-right py-3 px-4 text-gray-900">{purchaseOrder.subtotal.toFixed(2)} KM</td>
                      <td></td>
                    </tr>
                    <tr className="font-medium">
                      <td colSpan={5} className="text-right py-3 px-4 text-gray-700">PDV (17%):</td>
                      <td className="text-right py-3 px-4 text-gray-900">{purchaseOrder.taxAmount.toFixed(2)} KM</td>
                      <td></td>
                    </tr>
                    <tr className="font-medium bg-gradient-to-r from-amber/5 to-orange/5">
                      <td colSpan={5} className="text-right py-3 px-4 text-gray-700">Ukupno s PDV-om:</td>
                      <td className="text-right py-3 px-4 text-gray-900 font-bold">{purchaseOrder.totalAmount.toFixed(2)} KM</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm border border-amber/20 shadow-sm">
            <CardHeader className="bg-gradient-to-r from-amber/5 to-orange/5 border-b border-amber/20">
                             <CardTitle className="flex items-center gap-2 text-gray-900">
                 <Calendar className="w-5 h-5 text-amber" />
                 Historija statusa
               </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {purchaseOrder.statusHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Nema povijesti statusa
                </div>
              ) : (
                <div className="space-y-4">
                  {purchaseOrder.statusHistory.map((history: any) => (
                    <div key={history.id} className="bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-sm border border-amber/20 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Badge variant={formatStatus(history.status).variant}>
                            {formatStatus(history.status).label}
                          </Badge>
                          <span className="text-sm text-gray-600">
                            {format(new Date(history.changedAt), "dd.MM.yyyy HH:mm")}
                          </span>
                        </div>
                        <div className="text-sm text-gray-700 font-medium">
                          {history.changedBy.name}
                        </div>
                      </div>
                      {history.notes && (
                        <div className="mt-3 text-sm text-gray-700 bg-white/50 rounded-lg p-3">
                          {history.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comments" className="space-y-6">
          <Card className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm border border-amber/20 shadow-sm">
            <CardHeader className="bg-gradient-to-r from-amber/5 to-orange/5 border-b border-amber/20 flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <MessageSquare className="w-5 h-5 text-amber" />
                Komentari
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCommentModalOpen(true)}
                className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm text-gray-700 hover:from-white hover:to-gray-50 border-amber/30 hover:border-amber/50 rounded-lg transition-all duration-200 shadow-sm"
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Dodaj komentar
              </Button>
            </CardHeader>
            <CardContent className="pt-4">
              {purchaseOrder.comments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Nema komentara
                </div>
              ) : (
                <div className="space-y-4">
                  {purchaseOrder.comments.map((comment: any) => (
                    <div key={comment.id} className="bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-sm border border-amber/20 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="font-medium text-gray-900">{comment.createdBy.name}</div>
                        <div className="text-sm text-gray-600">
                          {format(new Date(comment.createdAt), "dd.MM.yyyy HH:mm")}
                        </div>
                      </div>
                      <div className="text-sm text-gray-700 bg-white/50 rounded-lg p-3">
                        {comment.comment}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
