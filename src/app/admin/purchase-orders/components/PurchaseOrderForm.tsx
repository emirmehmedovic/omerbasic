"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarIcon, Trash2, Plus, Save } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

// Definicija tipova
interface Supplier {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  catalogNumber: string;
  category: {
    name: string;
  } | null;
}

// Schema za validaciju
const formSchema = z.object({
  supplierId: z.string().min(1, "Dobavljač je obavezan"),
  expectedDeliveryDate: z.date().optional().nullable(),
  notes: z.string().optional(),
  items: z.array(z.object({
    productId: z.string().min(1, "Proizvod je obavezan"),
    quantity: z.number().int().min(1, "Količina mora biti najmanje 1"),
    unitPrice: z.number().min(0, "Cijena ne može biti negativna"),
  })).min(1, "Narudžba mora sadržavati barem jednu stavku"),
});

type FormValues = z.infer<typeof formSchema>;

export default function PurchaseOrderForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [supplierProducts, setSupplierProducts] = useState<Product[]>([]);

  // Inicijalizacija forme
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      supplierId: "",
      expectedDeliveryDate: null,
      notes: "",
      items: [{ productId: "", quantity: 1, unitPrice: 0 }],
    },
  });

  // Dohvati field array za stavke
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Dohvati dobavljače
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const response = await axios.get("/api/suppliers");
        setSuppliers(response.data);
      } catch (error) {
        toast.error("Greška pri dohvaćanju dobavljača.");
        console.error(error);
      }
    };

    fetchSuppliers();
  }, []);

  // Dohvati proizvode kad se promijeni dobavljač
  useEffect(() => {
    const fetchSupplierProducts = async () => {
      if (!selectedSupplier) return;
      
      try {
        setLoading(true);
        const response = await axios.get(`/api/suppliers/${selectedSupplier}/products`);
        setSupplierProducts(response.data);
      } catch (error) {
        console.error("Greška pri dohvaćanju proizvoda dobavljača:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSupplierProducts();
  }, [selectedSupplier]);

  // Pretraži proizvode
  useEffect(() => {
    const searchProducts = async () => {
      if (!searchQuery || searchQuery.length < 2) return;
      
      try {
        const response = await axios.get(`/api/products/search/simple?query=${encodeURIComponent(searchQuery)}`);
        setProducts(response.data);
      } catch (error) {
        console.error("Greška pri pretraživanju proizvoda:", error);
      }
    };

    const timer = setTimeout(() => {
      searchProducts();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Promjena dobavljača
  const handleSupplierChange = (supplierId: string) => {
    form.setValue("supplierId", supplierId);
    setSelectedSupplier(supplierId);
    
    // Resetiraj stavke
    form.setValue("items", [{ productId: "", quantity: 1, unitPrice: 0 }]);
  };

  // Promjena proizvoda
  const handleProductChange = (index: number, productId: string) => {
    const product = [...products, ...supplierProducts].find(p => p.id === productId);
    
    if (product) {
      form.setValue(`items.${index}.productId`, productId);
      form.setValue(`items.${index}.unitPrice`, product.price);
    }
  };

  // Podnošenje forme
  const onSubmit = async (data: FormValues) => {
    try {
      setLoading(true);
      
      // Pripremi podatke za slanje
      const payload = {
        ...data,
        expectedDeliveryDate: data.expectedDeliveryDate ? format(data.expectedDeliveryDate, "yyyy-MM-dd") : null,
      };
      
      await axios.post("/api/purchase-orders", payload);
      toast.success("Narudžbenica uspješno kreirana.");
      router.push("/admin/purchase-orders");
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
      } else {
        toast.error("Greška pri kreiranju narudžbenice.");
      }
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <Heading
          title="Nova narudžbenica"
          description="Kreirajte novu narudžbenicu za dobavljača"
        />
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => router.push("/admin/purchase-orders")}
            disabled={loading}
            className="px-4"
          >
            Odustani
          </Button>
          <Button
            onClick={form.handleSubmit(onSubmit)}
            disabled={loading}
            className="px-4"
          >
            <Save className="mr-2 h-4 w-4" />
            Spremi narudžbenicu
          </Button>
        </div>
      </div>
      <Separator className="mb-8" />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="supplierId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dobavljač</FormLabel>
                        <Select
                          disabled={loading}
                          value={field.value}
                          onValueChange={(value) => handleSupplierChange(value)}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Odaberite dobavljača" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {suppliers.map((supplier) => (
                              <SelectItem key={supplier.id} value={supplier.id}>
                                {supplier.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="expectedDeliveryDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Očekivani datum isporuke</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "dd.MM.yyyy")
                                ) : (
                                  <span>Odaberite datum</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value || undefined}
                              onSelect={field.onChange}
                              disabled={(date) => date < new Date()}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Napomena</FormLabel>
                        <FormControl>
                          <Textarea
                            disabled={loading}
                            placeholder="Unesite napomenu ili dodatne informacije..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardContent className="pt-6">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold">Stavke narudžbenice</h3>
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      onClick={() => append({ productId: "", quantity: 1, unitPrice: 0 })}
                      disabled={loading || !selectedSupplier}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Plus className="mr-1 h-4 w-4" />
                      Dodaj stavku
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {fields.map((field, index) => (
                      <div key={field.id} className="p-4 border rounded-md bg-white shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="font-medium text-lg">Stavka {index + 1}</h4>
                          {fields.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => remove(index)}
                              disabled={loading}
                              className="text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="ml-1">Ukloni</span>
                            </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                          {/* Proizvod - zauzima 6 kolona na velikim ekranima */}
                          <div className="lg:col-span-6">
                            <FormField
                              control={form.control}
                              name={`items.${index}.productId`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-base font-medium">Proizvod</FormLabel>
                                  <div className="flex flex-col space-y-2">
                                    <Input
                                      placeholder="Pretražite proizvode..."
                                      value={searchQuery}
                                      onChange={(e) => setSearchQuery(e.target.value)}
                                      disabled={loading || !selectedSupplier}
                                      className="border-gray-300 focus:ring-primary focus:border-primary"
                                    />
                                    <Select
                                      disabled={loading || !selectedSupplier}
                                      value={field.value}
                                      onValueChange={(value) => handleProductChange(index, value)}
                                    >
                                      <FormControl>
                                        <SelectTrigger className="border-gray-300 focus:ring-primary focus:border-primary">
                                          <SelectValue placeholder="Odaberite proizvod" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {[...products, ...supplierProducts]
                                          .filter((product, idx, self) => 
                                            self.findIndex(p => p.id === product.id) === idx
                                          )
                                          .map((product) => (
                                            <SelectItem key={product.id} value={product.id}>
                                              {product.name} ({product.catalogNumber})
                                            </SelectItem>
                                          ))
                                        }
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          {/* Količina - zauzima 3 kolone na velikim ekranima */}
                          <div className="lg:col-span-3">
                            <FormField
                              control={form.control}
                              name={`items.${index}.quantity`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-base font-medium">Količina</FormLabel>
                                  <div className="flex items-center">
                                    <Button 
                                      type="button"
                                      variant="outline" 
                                      size="icon"
                                      className="h-10 w-10"
                                      onClick={() => {
                                        const currentValue = typeof field.value === 'string' ? parseInt(field.value) : (field.value as number) || 1;
                                        if (currentValue > 1) {
                                          field.onChange(currentValue - 1);
                                        }
                                      }}
                                      disabled={loading || !form.getValues(`items.${index}.productId`) || (typeof field.value === 'string' ? parseInt(field.value) : (field.value as number) || 0) <= 1}
                                    >
                                      -
                                    </Button>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        min={1}
                                        disabled={loading || !form.getValues(`items.${index}.productId`)}
                                        value={field.value}
                                        onChange={(e) => {
                                          const value = parseInt(e.target.value) || 1;
                                          field.onChange(value);
                                        }}
                                        className="mx-2 text-center border-gray-300 focus:ring-primary focus:border-primary"
                                      />
                                    </FormControl>
                                    <Button 
                                      type="button"
                                      variant="outline" 
                                      size="icon"
                                      className="h-10 w-10"
                                      onClick={() => {
                                        const currentValue = typeof field.value === 'string' ? parseInt(field.value) : (field.value as number) || 1;
                                        field.onChange(currentValue + 1);
                                      }}
                                      disabled={loading || !form.getValues(`items.${index}.productId`)}
                                    >
                                      +
                                    </Button>
                                  </div>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          {/* Cijena - zauzima 3 kolone na velikim ekranima */}
                          <div className="lg:col-span-3">
                            <FormField
                              control={form.control}
                              name={`items.${index}.unitPrice`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-base font-medium">Cijena (KM)</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min={0}
                                      disabled={loading || !form.getValues(`items.${index}.productId`)}
                                      {...field}
                                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                      className="border-gray-300 focus:ring-primary focus:border-primary"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        <div className="text-right font-medium mt-4 text-lg">
                          Ukupno: {(
                            (form.getValues(`items.${index}.quantity`) || 0) * 
                            (form.getValues(`items.${index}.unitPrice`) || 0)
                          ).toFixed(2)} KM
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="text-right font-medium text-lg border-t pt-4">
                    Ukupno: {form.getValues("items").reduce((sum, item) => {
                      return sum + (item.quantity || 0) * (item.unitPrice || 0);
                    }, 0).toFixed(2)} KM
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </form>
      </Form>
    </>
  );
}
