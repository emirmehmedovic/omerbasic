"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import axios from "axios";
import { toast } from "react-hot-toast";
import { X } from "lucide-react";

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
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Supplier } from "@/types/supplier";

const formSchema = z.object({
  name: z.string().min(1, "Naziv je obavezan"),
  companyName: z.string().min(1, "Naziv tvrtke je obavezan"),
  address: z.string().min(1, "Adresa je obavezna"),
  city: z.string().min(1, "Grad je obavezan"),
  postalCode: z.string().min(1, "Poštanski broj je obavezan"),
  country: z.string().min(1, "Država je obavezna"),
  email: z.string().email("Unesite ispravnu email adresu"),
  phone: z.string().min(1, "Telefon je obavezan"),
  contactPerson: z.string().optional(),
  taxId: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type SupplierFormValues = z.infer<typeof formSchema>;

interface SupplierFormProps {
  initialData: Supplier | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const SupplierForm: React.FC<SupplierFormProps> = ({
  initialData,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  
  const title = initialData ? "Uredi dobavljača" : "Dodaj dobavljača";
  const toastMessage = initialData ? "Dobavljač je ažuriran." : "Dobavljač je dodan.";
  const action = initialData ? "Spremi promjene" : "Dodaj";

  const defaultValues: SupplierFormValues = initialData ? {
    name: initialData.name,
    companyName: initialData.companyName,
    address: initialData.address,
    city: initialData.city,
    postalCode: initialData.postalCode,
    country: initialData.country,
    email: initialData.email,
    phone: initialData.phone,
    contactPerson: initialData.contactPerson || "",
    taxId: initialData.taxId || "",
    notes: initialData.notes || "",
    isActive: initialData.isActive,
  } : {
    name: "",
    companyName: "",
    address: "",
    city: "",
    postalCode: "",
    country: "",
    email: "",
    phone: "",
    contactPerson: "",
    taxId: "",
    notes: "",
    isActive: true,
  };

  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues
  });

  const onSubmit = async (data: SupplierFormValues) => {
    try {
      setLoading(true);
      
      if (initialData) {
        await axios.patch(`/api/suppliers/${initialData.id}`, data);
      } else {
        await axios.post("/api/suppliers", data);
      }
      
      toast.success(toastMessage);
      onSuccess();
    } catch (error: any) {
      if (error.response?.data?.errors) {
        const errors = error.response.data.errors;
        Object.keys(errors).forEach((key) => {
          if (key !== "_errors" && errors[key]?._errors?.length) {
            form.setError(key as keyof SupplierFormValues, {
              type: "manual",
              message: errors[key]._errors[0],
            });
          }
        });
        toast.error("Provjerite unesene podatke.");
      } else {
        toast.error("Nešto je pošlo po krivu.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <Button
            onClick={onClose}
            variant="ghost"
            className="absolute right-2 top-2 h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Naziv</FormLabel>
                    <FormControl>
                      <Input
                        disabled={loading}
                        placeholder="Naziv dobavljača"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Naziv tvrtke</FormLabel>
                    <FormControl>
                      <Input
                        disabled={loading}
                        placeholder="Naziv tvrtke"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adresa</FormLabel>
                  <FormControl>
                    <Input
                      disabled={loading}
                      placeholder="Adresa"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Grad</FormLabel>
                    <FormControl>
                      <Input
                        disabled={loading}
                        placeholder="Grad"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="postalCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Poštanski broj</FormLabel>
                    <FormControl>
                      <Input
                        disabled={loading}
                        placeholder="Poštanski broj"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Država</FormLabel>
                    <FormControl>
                      <Input
                        disabled={loading}
                        placeholder="Država"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        disabled={loading}
                        placeholder="Email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefon</FormLabel>
                    <FormControl>
                      <Input
                        disabled={loading}
                        placeholder="Telefon"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="contactPerson"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kontakt osoba</FormLabel>
                    <FormControl>
                      <Input
                        disabled={loading}
                        placeholder="Kontakt osoba"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="taxId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Porezni broj</FormLabel>
                    <FormControl>
                      <Input
                        disabled={loading}
                        placeholder="Porezni broj"
                        {...field}
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
                      placeholder="Napomene"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Aktivan
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />
            <div className="pt-6 space-x-2 flex items-center justify-end w-full">
              <Button
                disabled={loading}
                variant="outline"
                onClick={onClose}
                type="button"
              >
                Odustani
              </Button>
              <Button disabled={loading} type="submit">
                {action}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
