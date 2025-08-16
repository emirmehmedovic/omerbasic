"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-hot-toast";
import { Trash2, Plus, Save } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { productAttributeValueSchema, batchAttributeValuesSchema } from "@/lib/validations/category-attribute";
import { CategoryAttribute, ProductAttributeValue, ProductAttributeValueFormValues } from "@/lib/types/category-attributes";

interface ProductAttributeValueManagerProps {
  productId: string;
  categoryId: string;
}

export default function ProductAttributeValueManager({
  productId,
  categoryId,
}: ProductAttributeValueManagerProps) {
  const [attributeValues, setAttributeValues] = useState<ProductAttributeValue[]>([]);
  const [availableAttributes, setAvailableAttributes] = useState<CategoryAttribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAttributeId, setSelectedAttributeId] = useState<string>("");

  const form = useForm<ProductAttributeValueFormValues>({
    resolver: zodResolver(productAttributeValueSchema),
    defaultValues: {
      attributeId: "",
      value: "",
    },
  });

  // Dohvat vrijednosti atributa za proizvod
  const fetchAttributeValues = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/products/${productId}/attributes`);
      
      if (!response.ok) {
        throw new Error("Greška prilikom dohvata vrijednosti atributa");
      }
      
      const data = await response.json();
      setAttributeValues(data);
    } catch (error) {
      console.error("Error fetching attribute values:", error);
      toast.error("Greška prilikom dohvata vrijednosti atributa");
    } finally {
      setLoading(false);
    }
  };

  // Dohvat dostupnih atributa za kategoriju
  const fetchAvailableAttributes = async () => {
    try {
      const response = await fetch(`/api/categories/${categoryId}/attributes`);
      
      if (!response.ok) {
        throw new Error("Greška prilikom dohvata atributa kategorije");
      }
      
      const data = await response.json();
      setAvailableAttributes(data);
    } catch (error) {
      console.error("Error fetching category attributes:", error);
      toast.error("Greška prilikom dohvata atributa kategorije");
    }
  };

  // Inicijalni dohvat podataka
  useEffect(() => {
    if (productId && categoryId) {
      fetchAttributeValues();
      fetchAvailableAttributes();
    }
  }, [productId, categoryId]);

  // Resetiranje forme
  const resetForm = () => {
    form.reset({
      attributeId: "",
      value: "",
    });
    setSelectedAttributeId("");
  };

  // Filtriranje dostupnih atributa koji još nisu dodani proizvodu
  const getFilteredAttributes = () => {
    const usedAttributeIds = new Set(attributeValues.map(av => av.attributeId));
    return availableAttributes.filter(attr => !usedAttributeIds.has(attr.id));
  };

  // Dohvat atributa prema ID-u
  const getAttributeById = (attributeId: string) => {
    return availableAttributes.find(attr => attr.id === attributeId);
  };

  // Renderiranje polja za vrijednost atributa ovisno o tipu
  const renderValueField = () => {
    if (!selectedAttributeId) return null;
    
    const attribute = getAttributeById(selectedAttributeId);
    if (!attribute) return null;
    
    switch (attribute.type) {
      case "string":
        return (
          <FormField
            control={form.control}
            name="value"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700 font-medium">Vrijednost</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    className="bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      
      case "number":
        return (
          <FormField
            control={form.control}
            name="value"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700 font-medium">
                  Vrijednost {attribute.unit ? `(${attribute.unit})` : ""}
                </FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="any"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value)}
                    className="bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      
      case "boolean":
        return (
          <FormField
            control={form.control}
            name="value"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-xl border border-amber/20 p-4 bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm">
                <FormControl>
                  <Checkbox
                    checked={field.value === "true"}
                    onCheckedChange={(checked) => {
                      field.onChange(checked ? "true" : "false");
                    }}
                    className="text-amber"
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="text-gray-700 font-medium">Vrijednost</FormLabel>
                </div>
              </FormItem>
            )}
          />
        );
      
      case "enum":
        if (attribute.options && Array.isArray(attribute.options)) {
          return (
            <FormField
              control={form.control}
              name="value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700 font-medium">Vrijednost</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900">
                        <SelectValue placeholder="Odaberite vrijednost" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-white/95 backdrop-blur-sm border-gray-200 rounded-xl shadow-xl">
                      {(attribute.options && Array.isArray(attribute.options) ? attribute.options.map((option: string) => (
                        <SelectItem key={option} value={option} className="text-gray-700 hover:bg-gray-100">
                          {option}
                        </SelectItem>
                      )) : [])}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          );
        }
        return (
          <FormField
            control={form.control}
            name="value"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700 font-medium">Vrijednost</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    className="bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      
      default:
        return (
          <FormField
            control={form.control}
            name="value"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700 font-medium">Vrijednost</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    className="bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
    }
  };

  // Spremanje vrijednosti atributa
  const onSubmit = async (values: ProductAttributeValueFormValues) => {
    try {
      const response = await fetch(`/api/products/${productId}/attributes/${values.attributeId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ value: values.value }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Greška prilikom spremanja vrijednosti atributa");
      }

      // Osvježavanje liste vrijednosti atributa
      await fetchAttributeValues();
      
      // Resetiranje forme
      resetForm();
      
      toast.success("Vrijednost atributa je uspješno spremljena");
    } catch (error) {
      console.error("Error saving attribute value:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Greška prilikom spremanja vrijednosti atributa"
      );
    }
  };

  // Brisanje vrijednosti atributa
  const deleteAttributeValue = async (attributeId: string) => {
    if (!confirm("Jeste li sigurni da želite obrisati ovu vrijednost atributa?")) {
      return;
    }

    try {
      const response = await fetch(
        `/api/products/${productId}/attributes/${attributeId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Greška prilikom brisanja vrijednosti atributa");
      }

      // Osvježavanje liste vrijednosti atributa
      await fetchAttributeValues();
      toast.success("Vrijednost atributa je uspješno obrisana");
    } catch (error) {
      console.error("Error deleting attribute value:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Greška prilikom brisanja vrijednosti atributa"
      );
    }
  };

  // Formatiranje vrijednosti za prikaz
  const formatValue = (value: string, type: string) => {
    if (type === "boolean") {
      return value === "true" ? "Da" : "Ne";
    }
    return value;
  };

  return (
    <div className="space-y-6">
      {/* Add New Attribute Section */}
      <div className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm rounded-2xl p-6 border border-amber/20 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-sm rounded-lg border border-amber/30">
            <Plus className="w-5 h-5 text-amber" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900">Dodaj novi atribut</h3>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="attributeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 font-medium">Atribut</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        setSelectedAttributeId(value);
                        form.setValue("value", "");
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900">
                          <SelectValue placeholder="Odaberite atribut" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-white/95 backdrop-blur-sm border-gray-200 rounded-xl shadow-xl">
                        {getFilteredAttributes().map((attr) => (
                          <SelectItem key={attr.id} value={attr.id} className="text-gray-700 hover:bg-gray-100">
                            {attr.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {renderValueField()}
            </div>
            <div className="flex justify-end pt-4">
              <Button
                type="submit"
                disabled={getFilteredAttributes().length === 0}
                className="bg-gradient-to-r from-amber via-orange to-brown text-white hover:from-amber/90 hover:via-orange/90 hover:to-brown/90 shadow-lg hover:scale-105 transition-all duration-200"
              >
                <Save className="mr-2 h-4 w-4" />
                Spremi atribut
              </Button>
            </div>
          </form>
        </Form>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-flex items-center gap-2 text-gray-600">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber"></div>
            Učitavanje...
          </div>
        </div>
      ) : attributeValues.length === 0 ? (
        <div className="text-center py-12 bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm rounded-2xl border border-amber/20">
          <div className="flex flex-col items-center gap-3">
            <div className="p-3 bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-sm rounded-xl border border-amber/30">
              <svg className="w-8 h-8 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-gray-600 font-medium">Nema definiranih vrijednosti atributa</p>
            <p className="text-gray-500 text-sm">Dodajte prvi atribut koristeći formu iznad</p>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm rounded-2xl border border-amber/20 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-white/90 to-gray-50/90 border-b border-amber/20 px-6 py-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              Definisani atributi ({attributeValues.length})
            </h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-white/80 to-gray-50/80 border-b border-amber/20">
                <TableHead className="text-gray-700 font-medium">Atribut</TableHead>
                <TableHead className="text-gray-700 font-medium">Tip</TableHead>
                <TableHead className="text-gray-700 font-medium">Vrijednost</TableHead>
                <TableHead className="text-right text-gray-700 font-medium">Akcije</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attributeValues.map((attrValue, index) => (
                <TableRow 
                  key={attrValue.id}
                  className="hover:bg-gradient-to-r hover:from-amber/5 hover:to-orange/5 border-b border-amber/10"
                >
                  <TableCell className="font-medium text-gray-900">{attrValue.attribute?.label}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber/10 text-amber-800">
                      {attrValue.attribute?.type}
                    </span>
                  </TableCell>
                  <TableCell className="text-gray-700">
                    {formatValue(attrValue.value, attrValue.attribute?.type || "string")}
                    {attrValue.attribute?.type === "number" && attrValue.attribute?.unit && (
                      <span className="ml-1 text-gray-500 text-sm">{attrValue.attribute.unit}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteAttributeValue(attrValue.attributeId)}
                      className="bg-white border-red-300 hover:border-red-500 hover:bg-red-50 text-red-600 hover:text-red-700 rounded-lg transition-all duration-200"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
