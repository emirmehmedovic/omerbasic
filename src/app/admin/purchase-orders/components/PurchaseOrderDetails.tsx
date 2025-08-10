"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { format } from "date-fns";
import { toast } from "react-hot-toast";
import { ArrowLeft, FileText, Printer, MessageSquare, CheckCircle, AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { generatePurchaseOrderPdf, downloadPdf } from "@/lib/pdfUtils";

import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
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
                  <FormLabel>Status</FormLabel>
                  <Select
                    disabled={loading}
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Odaberite status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
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
                  <FormLabel>Napomena</FormLabel>
                  <FormControl>
                    <Textarea
                      disabled={loading}
                      placeholder="Unesite napomenu o promjeni statusa..."
                      {...field}
                      value={field.value || ""}
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
                  <FormLabel>Komentar</FormLabel>
                  <FormControl>
                    <Textarea
                      disabled={loading}
                      placeholder="Unesite komentar..."
                      {...field}
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
              <div className="text-sm">
                <p><strong>Proizvod:</strong> {selectedItem.product.name}</p>
                <p><strong>Naručena količina:</strong> {selectedItem.quantity}</p>
                <p><strong>Trenutno primljeno:</strong> {selectedItem.receivedQty}</p>
              </div>
              <FormField
                control={receiveForm.control}
                name="receivedQty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nova primljena količina</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={selectedItem.quantity}
                        disabled={loading}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
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
                    <FormLabel>Napomena</FormLabel>
                    <FormControl>
                      <Textarea
                        disabled={loading}
                        placeholder="Unesite napomenu o primanju proizvoda..."
                        {...field}
                        value={field.value || ""}
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

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push("/admin/purchase-orders")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Heading
            title={`Narudžbenica: ${purchaseOrder.orderNumber}`}
            description={`Status: ${formatStatus(purchaseOrder.status).label}`}
          />
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setIsCommentModalOpen(true)}
            disabled={loading}
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            Dodaj komentar
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsStatusModalOpen(true)}
            disabled={loading}
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Promijeni status
          </Button>
          <Button
            variant="outline"
            onClick={generatePDF}
            disabled={loading}
          >
            <Printer className="mr-2 h-4 w-4" />
            Ispiši dostavnicu
          </Button>
        </div>
      </div>
      <Separator />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="details">Detalji</TabsTrigger>
          <TabsTrigger value="items">Stavke</TabsTrigger>
          <TabsTrigger value="history">Povijest</TabsTrigger>
          <TabsTrigger value="comments">Komentari</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Informacije o narudžbenici</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-sm font-medium">Broj narudžbe:</div>
                  <div>{purchaseOrder.orderNumber}</div>
                  
                  <div className="text-sm font-medium">Status:</div>
                  <div>
                    <Badge variant={formatStatus(purchaseOrder.status).variant}>
                      {formatStatus(purchaseOrder.status).label}
                    </Badge>
                  </div>
                  
                  <div className="text-sm font-medium">Datum narudžbe:</div>
                  <div>{format(new Date(purchaseOrder.orderDate), "dd.MM.yyyy")}</div>
                  
                  <div className="text-sm font-medium">Očekivana isporuka:</div>
                  <div>
                    {purchaseOrder.expectedDeliveryDate
                      ? format(new Date(purchaseOrder.expectedDeliveryDate), "dd.MM.yyyy")
                      : "-"}
                  </div>
                  
                  <div className="text-sm font-medium">Datum isporuke:</div>
                  <div>
                    {purchaseOrder.deliveryDate
                      ? format(new Date(purchaseOrder.deliveryDate), "dd.MM.yyyy")
                      : "-"}
                  </div>
                  
                  <div className="text-sm font-medium">Kreirao:</div>
                  <div>{purchaseOrder.createdBy.name}</div>
                  
                  <div className="text-sm font-medium">Datum kreiranja:</div>
                  <div>{format(new Date(purchaseOrder.createdAt), "dd.MM.yyyy HH:mm")}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Informacije o dobavljaču</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-sm font-medium">Naziv:</div>
                  <div>{purchaseOrder.supplier.name}</div>
                  
                  <div className="text-sm font-medium">Kontakt osoba:</div>
                  <div>{purchaseOrder.supplier.contactPerson || "-"}</div>
                  
                  <div className="text-sm font-medium">Email:</div>
                  <div>{purchaseOrder.supplier.email || "-"}</div>
                  
                  <div className="text-sm font-medium">Telefon:</div>
                  <div>{purchaseOrder.supplier.phone || "-"}</div>
                  
                  <div className="text-sm font-medium">Adresa:</div>
                  <div>{purchaseOrder.supplier.address || "-"}</div>
                  
                  <div className="text-sm font-medium">Grad:</div>
                  <div>{purchaseOrder.supplier.city || "-"}</div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Napomena</CardTitle>
            </CardHeader>
            <CardContent>
              {purchaseOrder.notes || "Nema napomene"}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Financijski pregled</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-md">
                  <div className="text-sm text-muted-foreground">Iznos bez PDV-a</div>
                  <div className="text-2xl font-bold">{purchaseOrder.subtotal.toFixed(2)} KM</div>
                </div>
                <div className="p-4 border rounded-md">
                  <div className="text-sm text-muted-foreground">PDV</div>
                  <div className="text-2xl font-bold">{purchaseOrder.taxAmount.toFixed(2)} KM</div>
                </div>
                <div className="p-4 border rounded-md bg-primary/10">
                  <div className="text-sm text-muted-foreground">Ukupno</div>
                  <div className="text-2xl font-bold">{purchaseOrder.totalAmount.toFixed(2)} KM</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="items" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Stavke narudžbenice</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-4">Proizvod</th>
                      <th className="text-left py-2 px-4">Šifra</th>
                      <th className="text-right py-2 px-4">Količina</th>
                      <th className="text-right py-2 px-4">Primljeno</th>
                      <th className="text-right py-2 px-4">Cijena</th>
                      <th className="text-right py-2 px-4">Ukupno</th>
                      <th className="text-center py-2 px-4">Akcije</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchaseOrder.items.map((item: any) => (
                      <tr key={item.id} className="border-b hover:bg-muted/50">
                        <td className="py-2 px-4">{item.product.name}</td>
                        <td className="py-2 px-4">{item.product.catalogNumber}</td>
                        <td className="text-right py-2 px-4">{item.quantity}</td>
                        <td className="text-right py-2 px-4">
                          <Badge variant={item.receivedQty === 0 ? "outline" :
                            item.receivedQty < item.quantity ? "secondary" : "default"
                          }>
                            {item.receivedQty} / {item.quantity}
                          </Badge>
                        </td>
                        <td className="text-right py-2 px-4">{item.unitPrice.toFixed(2)} KM</td>
                        <td className="text-right py-2 px-4">{item.totalPrice.toFixed(2)} KM</td>
                        <td className="text-center py-2 px-4">
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
                            >
                              Primi
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-medium">
                      <td colSpan={5} className="text-right py-2 px-4">Ukupno:</td>
                      <td className="text-right py-2 px-4">{purchaseOrder.subtotal.toFixed(2)} KM</td>
                      <td></td>
                    </tr>
                    <tr className="font-medium">
                      <td colSpan={5} className="text-right py-2 px-4">PDV (17%):</td>
                      <td className="text-right py-2 px-4">{purchaseOrder.taxAmount.toFixed(2)} KM</td>
                      <td></td>
                    </tr>
                    <tr className="font-medium">
                      <td colSpan={5} className="text-right py-2 px-4">Ukupno s PDV-om:</td>
                      <td className="text-right py-2 px-4">{purchaseOrder.totalAmount.toFixed(2)} KM</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Povijest statusa</CardTitle>
            </CardHeader>
            <CardContent>
              {purchaseOrder.statusHistory.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  Nema povijesti statusa
                </div>
              ) : (
                <div className="space-y-4">
                  {purchaseOrder.statusHistory.map((history: any) => (
                    <div key={history.id} className="border rounded-md p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Badge variant={formatStatus(history.status).variant}>
                            {formatStatus(history.status).label}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(history.changedAt), "dd.MM.yyyy HH:mm")}
                          </span>
                        </div>
                        <div className="text-sm">
                          {history.changedBy.name}
                        </div>
                      </div>
                      {history.notes && (
                        <div className="mt-2 text-sm">
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

        <TabsContent value="comments" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Komentari</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCommentModalOpen(true)}
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Dodaj komentar
              </Button>
            </CardHeader>
            <CardContent>
              {purchaseOrder.comments.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  Nema komentara
                </div>
              ) : (
                <div className="space-y-4">
                  {purchaseOrder.comments.map((comment: any) => (
                    <div key={comment.id} className="border rounded-md p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium">{comment.createdBy.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(comment.createdAt), "dd.MM.yyyy HH:mm")}
                        </div>
                      </div>
                      <div className="text-sm">
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
