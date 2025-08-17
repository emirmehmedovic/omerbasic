"use client";

import { useState, useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-hot-toast";
import { Trash2, Plus, Edit, Save } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { categoryAttributeSchema } from "@/lib/validations/category-attribute";
import { CategoryAttribute, CategoryAttributeFormValues, AttributeType } from "@/lib/types/category-attributes";

interface CategoryAttributeManagerProps {
  categoryId: string;
  categoryName: string;
}

export default function CategoryAttributeManager({
  categoryId,
  categoryName,
}: CategoryAttributeManagerProps) {
  const [attributes, setAttributes] = useState<CategoryAttribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAttribute, setEditingAttribute] = useState<CategoryAttribute | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<CategoryAttributeFormValues>({
    resolver: zodResolver(categoryAttributeSchema) as any,
    defaultValues: {
      name: "",
      label: "",
      type: "string",
      unit: "",
      options: null,
      isRequired: false,
      isFilterable: false,
      sortOrder: 0,
      categoryId: categoryId,
    },
  });

  // Dohvat atributa za kategoriju
  const fetchAttributes = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/categories/${categoryId}/attributes`);
      
      if (!response.ok) {
        throw new Error("Greška prilikom dohvata atributa");
      }
      
      const data = await response.json();
      setAttributes(data);
    } catch (error) {
      console.error("Error fetching attributes:", error);
      toast.error("Greška prilikom dohvata atributa");
    } finally {
      setLoading(false);
    }
  };

  // Inicijalni dohvat atributa
  useEffect(() => {
    fetchAttributes();
  }, [categoryId]);

  // Postavljanje forme za uređivanje
  const setupEditForm = (attribute: CategoryAttribute) => {
    setEditingAttribute(attribute);
    form.reset({
      name: attribute.name,
      label: attribute.label,
      type: attribute.type,
      unit: attribute.unit || "",
      options: attribute.options,
      isRequired: attribute.isRequired,
      isFilterable: attribute.isFilterable,
      sortOrder: attribute.sortOrder,
    });
    setIsDialogOpen(true);
  };

  // Resetiranje forme
  const resetForm = () => {
    setEditingAttribute(null);
    form.reset({
      name: "",
      label: "",
      type: "string",
      unit: "",
      options: null,
      isRequired: false,
      isFilterable: false,
      sortOrder: 0,
    });
  };

  // Spremanje atributa
  const onSubmit: SubmitHandler<CategoryAttributeFormValues> = async (values) => {
    try {
      // Priprema podataka za slanje
      const attributeData = {
        ...values,
        // Pretvaranje options iz stringa u JSON ako je tip enum
        options: values.type === "enum" && typeof values.options === "string" 
          ? JSON.parse(values.options) 
          : values.options,
      };

      let response;
      
      if (editingAttribute) {
        // Ažuriranje postojećeg atributa
        response = await fetch(`/api/categories/${categoryId}/attributes/${editingAttribute.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(attributeData),
        });
      } else {
        // Kreiranje novog atributa
        response = await fetch(`/api/categories/${categoryId}/attributes`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(attributeData),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Greška prilikom spremanja atributa");
      }

      // Osvježavanje liste atributa
      await fetchAttributes();
      
      // Zatvaranje dijaloga i resetiranje forme
      setIsDialogOpen(false);
      resetForm();
      
      toast.success(
        editingAttribute
          ? "Atribut je uspješno ažuriran"
          : "Novi atribut je uspješno dodan"
      );
    } catch (error) {
      console.error("Error saving attribute:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Greška prilikom spremanja atributa"
      );
    }
  };

  // Brisanje atributa
  const deleteAttribute = async (attributeId: string) => {
    if (!confirm("Jeste li sigurni da želite obrisati ovaj atribut?")) {
      return;
    }

    try {
      const response = await fetch(
        `/api/categories/${categoryId}/attributes/${attributeId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Greška prilikom brisanja atributa");
      }

      // Osvježavanje liste atributa
      await fetchAttributes();
      toast.success("Atribut je uspješno obrisan");
    } catch (error) {
      console.error("Error deleting attribute:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Greška prilikom brisanja atributa"
      );
    }
  };

  // Renderiranje opcija za enum tip
  const renderOptionsField = () => {
    const watchType = form.watch("type");
    
    if (watchType === "enum") {
      return (
        <FormField
          control={form.control}
          name="options"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-700 font-medium">Opcije (JSON format)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder='["opcija1", "opcija2", "opcija3"]'
                  {...field}
                  value={
                    typeof field.value === "object" && field.value !== null
                      ? JSON.stringify(field.value)
                      : field.value || ""
                  }
                  className="bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      );
    }
    
    return null;
  };

  // Renderiranje polja za jedinicu mjere
  const renderUnitField = () => {
    const watchType = form.watch("type");
    
    if (watchType === "number") {
      return (
        <FormField
          control={form.control}
          name="unit"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-700 font-medium">Jedinica mjere</FormLabel>
              <FormControl>
                <Input 
                  placeholder="npr. mm, kg, l" 
                  {...field} 
                  value={field.value || ""} 
                  className="bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      );
    }
    
    return null;
  };

  return (
    <div className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm rounded-2xl border border-amber/20 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-white/90 to-gray-50/90 border-b border-amber/20 px-6 py-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <svg className="w-5 h-5 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Atributi ({attributes.length})
          </h2>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  resetForm();
                  setIsDialogOpen(true);
                }}
                className="bg-gradient-to-r from-amber via-orange to-brown text-white hover:from-amber/90 hover:via-orange/90 hover:to-brown/90 shadow-lg hover:scale-105 transition-all duration-200 rounded-xl px-4 py-2 text-sm font-medium"
              >
                <Plus className="mr-2 h-4 w-4" /> Dodaj novi atribut
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] bg-gradient-to-br from-white via-gray-50/80 to-blue-50/60 backdrop-blur-sm border border-amber/20 shadow-xl">
              <DialogHeader>
                <DialogTitle className="text-gray-900 font-semibold flex items-center gap-2">
                  <svg className="w-5 h-5 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {editingAttribute ? "Uredi atribut" : "Dodaj novi atribut"}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4 pt-4"
                >
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 font-medium">Naziv atributa (interni)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="npr. viscosity, diameter"
                            {...field}
                            className="bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="label"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 font-medium">Oznaka atributa (za prikaz)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="npr. Viskozitet, Promjer"
                            {...field}
                            className="bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 font-medium">Tip podatka</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900">
                              <SelectValue placeholder="Odaberite tip podatka" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-white/95 backdrop-blur-sm border-gray-200 rounded-xl shadow-xl">
                            <SelectItem value="string" className="text-gray-700 hover:bg-gray-100">Tekst</SelectItem>
                            <SelectItem value="number" className="text-gray-700 hover:bg-gray-100">Broj</SelectItem>
                            <SelectItem value="boolean" className="text-gray-700 hover:bg-gray-100">Da/Ne</SelectItem>
                            <SelectItem value="enum" className="text-gray-700 hover:bg-gray-100">Lista opcija</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {renderUnitField()}
                  {renderOptionsField()}
                  <FormField
                    control={form.control}
                    name="isRequired"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-xl border border-amber/20 p-4 bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="text-amber"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-gray-700 font-medium">Obavezno polje</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="isFilterable"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-xl border border-amber/20 p-4 bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="text-amber"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-gray-700 font-medium">Omogući filtriranje</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="sortOrder"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 font-medium">Redoslijed prikaza</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseInt(e.target.value) || 0)
                            }
                            className="bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end space-x-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsDialogOpen(false);
                        resetForm();
                      }}
                      className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm text-gray-700 hover:from-white hover:to-gray-50 border-amber/30 hover:border-amber/50 rounded-xl transition-all duration-200 shadow-sm"
                    >
                      Odustani
                    </Button>
                    <Button 
                      type="submit"
                      className="bg-gradient-to-r from-amber via-orange to-brown text-white hover:from-amber/90 hover:via-orange/90 hover:to-brown/90 shadow-lg hover:scale-105 transition-all duration-200 rounded-xl"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      Spremi
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="p-3 bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-sm rounded-xl border border-amber/30">
                <svg className="w-8 h-8 text-amber animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <p className="text-gray-600 font-medium">Učitavanje atributa...</p>
            </div>
          </div>
        ) : attributes.length === 0 ? (
          <div className="text-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="p-3 bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-sm rounded-xl border border-amber/30">
                <svg className="w-8 h-8 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-gray-600 font-medium">Nema definiranih atributa</p>
              <p className="text-gray-500 text-sm">Dodajte prvi atribut za ovu kategoriju</p>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm rounded-2xl border border-amber/20 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-white/90 to-gray-50/90 border-b border-amber/20">
                  <TableHead className="text-gray-700 font-semibold">Naziv</TableHead>
                  <TableHead className="text-gray-700 font-semibold">Oznaka</TableHead>
                  <TableHead className="text-gray-700 font-semibold">Tip</TableHead>
                  <TableHead className="text-gray-700 font-semibold">Jedinica</TableHead>
                  <TableHead className="text-gray-700 font-semibold">Obavezno</TableHead>
                  <TableHead className="text-gray-700 font-semibold">Filtriranje</TableHead>
                  <TableHead className="text-gray-700 font-semibold">Redoslijed</TableHead>
                  <TableHead className="text-right text-gray-700 font-semibold">Akcije</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attributes.map((attribute) => (
                  <TableRow 
                    key={attribute.id}
                    className="hover:bg-gradient-to-r hover:from-amber/10 hover:to-orange/10 transition-all duration-200 border-b border-amber/10"
                  >
                    <TableCell className="text-gray-900 font-medium">{attribute.name}</TableCell>
                    <TableCell className="text-gray-700">{attribute.label}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                        {attribute.type}
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-600">{attribute.unit || "-"}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        attribute.isRequired 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {attribute.isRequired ? "Da" : "Ne"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        attribute.isFilterable 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {attribute.isFilterable ? "Da" : "Ne"}
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-700">{attribute.sortOrder}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setupEditForm(attribute)}
                          className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm text-gray-700 hover:from-white hover:to-gray-50 border-amber/30 hover:border-amber/50 rounded-xl transition-all duration-200 shadow-sm"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteAttribute(attribute.id)}
                          className="bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 shadow-lg hover:scale-105 transition-all duration-200 rounded-xl"
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
    </div>
  );
}
