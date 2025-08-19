"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import axios from "axios";
import { toast } from "react-hot-toast";
import { X, Building2, User, Mail, Phone, MapPin, FileText, CheckCircle } from "lucide-react";

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
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
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
      <DialogContent className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-white via-gray-50/80 to-blue-50/60 backdrop-blur-sm border border-amber/20 shadow-xl rounded-2xl p-6">
        {/* Hidden DialogTitle for accessibility */}
        <DialogTitle className="sr-only">{title}</DialogTitle>
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-sm rounded-lg border border-amber/30">
              <Building2 className="w-5 h-5 text-amber" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
              <p className="text-gray-600 text-sm">
                {initialData ? 'Uredite podatke o dobavljaču' : 'Unesite podatke o novom dobavljaču'}
              </p>
            </div>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg p-2"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Basic Information */}
            <div className="bg-gradient-to-r from-amber/5 to-orange/5 border border-amber/20 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="w-4 h-4 text-amber" />
                <h3 className="font-medium text-gray-900">Osnovni podaci</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 font-medium">Naziv</FormLabel>
                      <FormControl>
                        <Input
                          disabled={loading}
                          placeholder="Naziv dobavljača"
                          className="bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500"
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
                      <FormLabel className="text-gray-700 font-medium">Naziv tvrtke</FormLabel>
                      <FormControl>
                        <Input
                          disabled={loading}
                          placeholder="Naziv tvrtke"
                          className="bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            {/* Address Information */}
            <div className="bg-gradient-to-r from-amber/5 to-orange/5 border border-amber/20 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-4 h-4 text-amber" />
                <h3 className="font-medium text-gray-900">Adresni podaci</h3>
              </div>
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 font-medium">Adresa</FormLabel>
                    <FormControl>
                      <Input
                        disabled={loading}
                        placeholder="Adresa"
                        className="bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-3 gap-4 mt-3">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 font-medium">Grad</FormLabel>
                      <FormControl>
                        <Input
                          disabled={loading}
                          placeholder="Grad"
                          className="bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500"
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
                      <FormLabel className="text-gray-700 font-medium">Poštanski broj</FormLabel>
                      <FormControl>
                        <Input
                          disabled={loading}
                          placeholder="Poštanski broj"
                          className="bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500"
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
                      <FormLabel className="text-gray-700 font-medium">Država</FormLabel>
                      <FormControl>
                        <Input
                          disabled={loading}
                          placeholder="Država"
                          className="bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            {/* Contact Information */}
            <div className="bg-gradient-to-r from-amber/5 to-orange/5 border border-amber/20 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-3">
                <Mail className="w-4 h-4 text-amber" />
                <h3 className="font-medium text-gray-900">Kontakt podaci</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 font-medium">Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          disabled={loading}
                          placeholder="Email"
                          className="bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500"
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
                      <FormLabel className="text-gray-700 font-medium">Telefon</FormLabel>
                      <FormControl>
                        <Input
                          disabled={loading}
                          placeholder="Telefon"
                          className="bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            {/* Additional Information */}
            <div className="bg-gradient-to-r from-amber/5 to-orange/5 border border-amber/20 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-amber" />
                <h3 className="font-medium text-gray-900">Dodatni podaci</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="contactPerson"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 font-medium">Kontakt osoba</FormLabel>
                      <FormControl>
                        <Input
                          disabled={loading}
                          placeholder="Kontakt osoba"
                          className="bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500"
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
                      <FormLabel className="text-gray-700 font-medium">Porezni broj</FormLabel>
                      <FormControl>
                        <Input
                          disabled={loading}
                          placeholder="Porezni broj"
                          className="bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            {/* Notes and Status */}
            <div className="bg-gradient-to-r from-amber/5 to-orange/5 border border-amber/20 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-amber" />
                <h3 className="font-medium text-gray-900">Napomene i status</h3>
              </div>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 font-medium">Napomene</FormLabel>
                    <FormControl>
                      <Textarea
                        disabled={loading}
                        placeholder="Napomene"
                        className="bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500 min-h-[80px]"
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
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border border-amber/20 p-3 bg-white/50 mt-3">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="text-amber"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-gray-700 font-medium">
                        Aktivan
                      </FormLabel>
                      <p className="text-sm text-gray-500">Dobavljač je aktivan i može se koristiti</p>
                    </div>
                  </FormItem>
                )}
              />
            </div>
            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                disabled={loading}
                variant="outline"
                onClick={onClose}
                type="button"
                className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm text-gray-700 hover:from-white hover:to-gray-50 border-amber/30 hover:border-amber/50 rounded-xl transition-all duration-200 shadow-sm px-6 py-2"
              >
                Odustani
              </Button>
              <Button 
                disabled={loading} 
                type="submit"
                className="bg-gradient-to-r from-amber via-orange to-brown text-white hover:from-amber/90 hover:via-orange/90 hover:to-brown/90 shadow-lg hover:scale-105 transition-all duration-200 rounded-xl px-6 py-2 font-semibold"
              >
                {action}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
