"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-hot-toast";
import { Trash2, Plus, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { z } from "zod";

interface ProductOENumberManagerProps {
  productId: string;
}

type ArticleOENumber = {
  id: string;
  oemNumber: string;
  manufacturer: string | null;
  referenceType: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

const oemNumberSchema = z.object({
  oemNumber: z.string().min(1, "OEM broj je obavezan"),
  manufacturer: z.string().optional().nullable(),
  referenceType: z.enum(["Original", "Equivalent", "Compatible"]).optional().nullable(),
  notes: z.string().optional().nullable(),
});

type OEMNumberFormValues = z.infer<typeof oemNumberSchema>;

const referenceTypes = ["Original", "Equivalent", "Compatible"];

export default function ProductOENumberManager({
  productId,
}: ProductOENumberManagerProps) {
  const [oemNumbers, setOemNumbers] = useState<ArticleOENumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingOEM, setEditingOEM] = useState<ArticleOENumber | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<OEMNumberFormValues>({
    resolver: zodResolver(oemNumberSchema),
    defaultValues: {
      oemNumber: "",
      manufacturer: "",
      referenceType: "Original",
      notes: "",
    },
  });

  // Dohvat OEM brojeva za proizvod
  const fetchOEMNumbers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/products/${productId}/oem-numbers`);

      if (!response.ok) {
        throw new Error("Greška prilikom dohvata OEM brojeva");
      }

      const data = await response.json();
      setOemNumbers(data);
    } catch (error) {
      console.error("Error fetching OEM numbers:", error);
      toast.error("Greška prilikom dohvata OEM brojeva");
    } finally {
      setLoading(false);
    }
  };

  // Inicijalni dohvat OEM brojeva
  useEffect(() => {
    if (productId) {
      fetchOEMNumbers();
    }
  }, [productId]);

  // Postavljanje forme za uređivanje
  const setupEditForm = (oem: ArticleOENumber) => {
    setEditingOEM(oem);
    form.reset({
      oemNumber: oem.oemNumber,
      manufacturer: oem.manufacturer || "",
      referenceType: (oem.referenceType as "Original" | "Equivalent" | "Compatible") || "Original",
      notes: oem.notes || "",
    });
    setIsDialogOpen(true);
  };

  // Resetiranje forme
  const resetForm = () => {
    setEditingOEM(null);
    form.reset({
      oemNumber: "",
      manufacturer: "",
      referenceType: "Original",
      notes: "",
    });
  };

  // Kreiranje novog OEM broja
  const createOEMNumber = async (data: OEMNumberFormValues) => {
    try {
      const response = await fetch(`/api/products/${productId}/oem-numbers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Greška prilikom kreiranja OEM broja");
      }

      toast.success("OEM broj je uspješno kreiran");
      resetForm();
      setIsDialogOpen(false);
      fetchOEMNumbers();
    } catch (error: any) {
      console.error("Error creating OEM number:", error);
      toast.error(error.message || "Greška prilikom kreiranja OEM broja");
    }
  };

  // Ažuriranje OEM broja
  const updateOEMNumber = async (data: OEMNumberFormValues) => {
    if (!editingOEM) return;

    try {
      const response = await fetch(`/api/products/${productId}/oem-numbers`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingOEM.id,
          ...data,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Greška prilikom ažuriranja OEM broja");
      }

      toast.success("OEM broj je uspješno ažuriran");
      resetForm();
      setIsDialogOpen(false);
      fetchOEMNumbers();
    } catch (error: any) {
      console.error("Error updating OEM number:", error);
      toast.error(error.message || "Greška prilikom ažuriranja OEM broja");
    }
  };

  // Brisanje OEM broja
  const deleteOEMNumber = async (id: string) => {
    if (!confirm("Jeste li sigurni da želite obrisati ovaj OEM broj?")) {
      return;
    }

    try {
      const response = await fetch(`/api/products/${productId}/oem-numbers?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Greška prilikom brisanja OEM broja");
      }

      toast.success("OEM broj je uspješno obrisan");
      fetchOEMNumbers();
    } catch (error) {
      console.error("Error deleting OEM number:", error);
      toast.error("Greška prilikom brisanja OEM broja");
    }
  };

  // Submit handler
  const onSubmit = (data: OEMNumberFormValues) => {
    if (editingOEM) {
      updateOEMNumber(data);
    } else {
      createOEMNumber(data);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-500">Učitavanje...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header s gumbom za dodavanje */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">OEM brojevi</h3>
          <p className="text-sm text-gray-500 mt-1">
            Upravljajte OEM brojevima za ovaj proizvod
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button
              onClick={resetForm}
              className="bg-gradient-to-r from-amber via-orange to-brown text-white hover:from-amber/90 hover:via-orange/90 hover:to-brown/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Dodaj OEM broj
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingOEM ? "Uredi OEM broj" : "Dodaj novi OEM broj"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="oemNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>OEM broj *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Npr. 04E115561C"
                          {...field}
                          className="bg-white border-amber/30 focus:border-amber"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="manufacturer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Proizvođač</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Npr. Audi, VW"
                            {...field}
                            value={field.value || ""}
                            className="bg-white border-amber/30 focus:border-amber"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="referenceType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tip reference</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || "Original"}
                        >
                          <FormControl>
                            <SelectTrigger className="bg-white border-amber/30 focus:border-amber">
                              <SelectValue placeholder="Odaberi tip" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {referenceTypes.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Napomene</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Dodatne napomene..."
                          {...field}
                          value={field.value || ""}
                          className="bg-white border-amber/30 focus:border-amber"
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      resetForm();
                    }}
                  >
                    Odustani
                  </Button>
                  <Button
                    type="submit"
                    className="bg-gradient-to-r from-amber via-orange to-brown text-white hover:from-amber/90 hover:via-orange/90 hover:to-brown/90"
                  >
                    {editingOEM ? "Ažuriraj" : "Dodaj"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabela OEM brojeva */}
      {oemNumbers.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-500">Nema OEM brojeva za ovaj proizvod</p>
          <p className="text-sm text-gray-400 mt-1">
            Kliknite na "Dodaj OEM broj" da dodate prvi
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>OEM broj</TableHead>
                <TableHead>Proizvođač</TableHead>
                <TableHead>Tip reference</TableHead>
                <TableHead>Napomene</TableHead>
                <TableHead className="text-right">Akcije</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {oemNumbers.map((oem) => (
                <TableRow key={oem.id}>
                  <TableCell className="font-mono font-semibold">{oem.oemNumber}</TableCell>
                  <TableCell>{oem.manufacturer || "-"}</TableCell>
                  <TableCell>{oem.referenceType || "Original"}</TableCell>
                  <TableCell className="max-w-xs truncate">{oem.notes || "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        title="Uredi"
                        className="bg-white text-gray-800 border-amber/30 hover:bg-amber/10 hover:text-gray-900"
                        onClick={() => setupEditForm(oem)}
                      >
                        <Edit className="h-4 w-4 text-gray-800" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteOEMNumber(oem.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}



