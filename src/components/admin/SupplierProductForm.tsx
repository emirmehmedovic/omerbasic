"use client";

import { useState, useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import axios from "axios";
import { toast } from "react-hot-toast";
import { X } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Combobox } from "../ui/combobox";

const formSchema = z.object({
  productId: z.string().min(1, "Proizvod je obavezan"),
  supplierSku: z.string().optional(),
  priority: z.coerce.number().int().min(1, "Prioritet mora biti najmanje 1"),
  price: z.coerce.number().min(0, "Cijena mora biti pozitivan broj"),
  minOrderQty: z.coerce.number().int().min(1, "Minimalna količina mora biti najmanje 1").optional(),
  leadTime: z.coerce.number().int().min(0, "Vrijeme isporuke mora biti pozitivan broj").optional(),
  notes: z.string().optional(),
});

type SupplierProductFormValues = z.infer<typeof formSchema>;

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

interface SupplierProductFormProps {
  supplierId: string;
  productId?: string;
  initialData?: SupplierProduct;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const SupplierProductForm = ({
  supplierId,
  productId,
  initialData,
  isOpen,
  onClose,
  onSuccess,
}: SupplierProductFormProps) => {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const title = initialData ? "Uredi proizvod dobavljača" : "Dodaj proizvod dobavljaču";
  const description = initialData ? "Uredite vezu dobavljača s proizvodom" : "Dodajte novi proizvod dobavljaču";
  const toastMessage = initialData ? "Proizvod dobavljača je ažuriran." : "Proizvod je dodan dobavljaču.";
  const action = initialData ? "Spremi promjene" : "Dodaj";

  const defaultValues: SupplierProductFormValues = initialData ? {
    productId: initialData.productId,
    supplierSku: initialData.supplierSku || "",
    priority: initialData.priority,
    price: initialData.price,
    minOrderQty: initialData.minOrderQty,
    leadTime: initialData.leadTime,
    notes: initialData.notes || "",
  } : {
    productId: "",
    supplierSku: "",
    priority: 1,
    price: 0,
    minOrderQty: undefined,
    leadTime: undefined,
    notes: "",
  };

  const form = useForm<SupplierProductFormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues
  });

  const searchProducts = async (query: string = "") => {
    try {
      setLoadingProducts(true);
      // If query is empty, fetch all products (limited to a reasonable number)
      const endpoint = query 
        ? `/api/products/search/simple?query=${encodeURIComponent(query)}` 
        : `/api/products?limit=50`;
      
      const response = await axios.get(endpoint);
      setProducts(response.data);
    } catch (error) {
      toast.error("Greška pri pretraživanju proizvoda.");
      console.error(error);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Load products when form opens (empty query loads all products)
      if (debouncedSearchQuery) {
        searchProducts(debouncedSearchQuery);
      } else {
        searchProducts();
      }
    }
  }, [debouncedSearchQuery, isOpen]);

  // Ako je u edit modu, dohvati detalje proizvoda
  useEffect(() => {
    if (isOpen && initialData?.productId) {
      const fetchProduct = async () => {
        try {
          const response = await axios.get(`/api/products/${initialData.productId}`);
          setProducts([response.data]);
        } catch (error) {
          console.error("Greška pri dohvaćanju detalja proizvoda:", error);
        }
      };
      
      fetchProduct();
    }
  }, [isOpen, initialData]);

  const onSubmit: SubmitHandler<SupplierProductFormValues> = async (values) => {
    try {
      setLoading(true);
      
      if (initialData) {
        await axios.patch(`/api/suppliers/${supplierId}/products/${values.productId}`, {
          supplierSku: values.supplierSku,
          priority: values.priority,
          price: values.price,
          minOrderQty: values.minOrderQty,
          leadTime: values.leadTime,
          notes: values.notes,
        });
      } else {
        await axios.post(`/api/suppliers/${supplierId}/products`, values);
      }
      
      toast.success(toastMessage);
      onSuccess();
    } catch (error: any) {
      if (error.response?.data?.errors) {
        const errors = error.response.data.errors;
        Object.keys(errors).forEach((key) => {
          if (key !== "_errors" && errors[key]?._errors?.length) {
            form.setError(key as any, {
              type: "manual",
              message: errors[key]._errors[0],
            });
          }
        });
        toast.error("Provjerite unesene podatke.");
      } else if (error.response?.status === 400 && error.response?.data === "This product is already linked to the supplier") {
        toast.error("Ovaj proizvod je već povezan s dobavljačem.");
      } else {
        toast.error("Nešto je pošlo po krivu.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <Button
            variant="ghost"
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-4">
            <FormField
              control={form.control}
              name="productId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Proizvod</FormLabel>
                  <FormControl>
                    {!initialData ? (
                      <div className="flex flex-col space-y-2">
                        <Input
                          placeholder="Pretražite proizvode..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          disabled={loading}
                        />
                        <Combobox
                          options={products.map(product => ({
                            label: `${product.name} (${product.category?.name || 'Bez kategorije'})`,
                            value: product.id
                          }))}
                          value={field.value}
                          onChange={field.onChange}
                          disabled={loading || loadingProducts}
                          placeholder="Odaberite proizvod"
                          emptyMessage={loadingProducts ? "Učitavanje..." : "Nema rezultata"}
                        />
                      </div>
                    ) : (
                      <Input
                        value={products[0]?.name || initialData.productId}
                        disabled={true}
                      />
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="supplierSku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Šifra dobavljača</FormLabel>
                    <FormControl>
                      <Input
                        disabled={loading}
                        placeholder="Šifra proizvoda kod dobavljača"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioritet</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        disabled={loading}
                        placeholder="Prioritet dobavljača za ovaj proizvod"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nabavna cijena</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        disabled={loading}
                        placeholder="Nabavna cijena"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="minOrderQty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Min. količina</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        disabled={loading}
                        placeholder="Minimalna količina za narudžbu"
                        {...field}
                        value={field.value === undefined ? "" : field.value}
                        onChange={(e) => {
                          const value = e.target.value === "" ? undefined : parseInt(e.target.value);
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="leadTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vrijeme isporuke (dani)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        disabled={loading}
                        placeholder="Vrijeme isporuke u danima"
                        {...field}
                        value={field.value === undefined ? "" : field.value}
                        onChange={(e) => {
                          const value = e.target.value === "" ? undefined : parseInt(e.target.value);
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
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
                      disabled={loading}
                      placeholder="Dodatne napomene o vezi dobavljača s proizvodom"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={onClose} disabled={loading}>
                Odustani
              </Button>
              <Button type="submit" disabled={loading}>
                {action}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
