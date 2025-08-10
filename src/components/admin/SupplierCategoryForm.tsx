"use client";

import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const formSchema = z.object({
  categoryId: z.string().min(1, "Kategorija je obavezna"),
  priority: z.coerce.number().int().min(1, "Prioritet mora biti najmanje 1"),
  notes: z.string().optional(),
});

type SupplierCategoryFormValues = z.infer<typeof formSchema>;

interface Category {
  id: string;
  name: string;
  parentId: string | null;
  level: number;
}

interface SupplierCategory {
  id: string;
  supplierId: string;
  categoryId: string;
  priority: number;
  notes?: string;
  category: Category;
}

interface SupplierCategoryFormProps {
  supplierId: string;
  categoryId?: string;
  initialData?: SupplierCategory;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const SupplierCategoryForm = ({
  supplierId,
  categoryId,
  initialData,
  isOpen,
  onClose,
  onSuccess,
}: SupplierCategoryFormProps) => {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  const title = initialData ? "Uredi kategoriju dobavljača" : "Dodaj kategoriju dobavljaču";
  const description = initialData ? "Uredite vezu dobavljača s kategorijom" : "Dodajte novu kategoriju dobavljaču";
  const toastMessage = initialData ? "Kategorija dobavljača je ažurirana." : "Kategorija je dodana dobavljaču.";
  const action = initialData ? "Spremi promjene" : "Dodaj";

  const form = useForm<SupplierCategoryFormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: initialData ? {
      categoryId: initialData.categoryId,
      priority: initialData.priority,
      notes: initialData.notes || "",
    } : {
      categoryId: "",
      priority: 1,
      notes: "",
    },
  });

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const response = await axios.get("/api/categories");
      setCategories(response.data);
    } catch (error) {
      toast.error("Greška pri dohvaćanju kategorija.");
      console.error(error);
    } finally {
      setLoadingCategories(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  const onSubmit = async (data: SupplierCategoryFormValues) => {
    try {
      setLoading(true);
      
      if (initialData) {
        await axios.patch(`/api/suppliers/${supplierId}/categories/${data.categoryId}`, {
          priority: data.priority,
          notes: data.notes,
        });
      } else {
        await axios.post(`/api/suppliers/${supplierId}/categories`, data);
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
      } else if (error.response?.status === 400 && error.response?.data === "This category is already linked to the supplier") {
        toast.error("Ova kategorija je već povezana s dobavljačem.");
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
      <DialogContent className="sm:max-w-[500px]">
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kategorija</FormLabel>
                  <Select
                    disabled={loading || loadingCategories || !!initialData}
                    onValueChange={field.onChange}
                    value={field.value}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Odaberite kategoriju" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
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
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prioritet</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      disabled={loading}
                      placeholder="Prioritet dobavljača za ovu kategoriju"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Napomene</FormLabel>
                  <FormControl>
                    <Textarea
                      disabled={loading}
                      placeholder="Dodatne napomene o vezi dobavljača s kategorijom"
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
