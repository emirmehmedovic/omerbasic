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
                <FormLabel>Vrijednost</FormLabel>
                <FormControl>
                  <Input {...field} />
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
                <FormLabel>Vrijednost {attribute.unit ? `(${attribute.unit})` : ""}</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="any"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value)}
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
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value === "true"}
                    onCheckedChange={(checked) => {
                      field.onChange(checked ? "true" : "false");
                    }}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Vrijednost</FormLabel>
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
                  <FormLabel>Vrijednost</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Odaberite vrijednost" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(attribute.options && Array.isArray(attribute.options) ? attribute.options.map((option: string) => (
                        <SelectItem key={option} value={option}>
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
                <FormLabel>Vrijednost</FormLabel>
                <FormControl>
                  <Input {...field} />
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
                <FormLabel>Vrijednost</FormLabel>
                <FormControl>
                  <Input {...field} />
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
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Atributi proizvoda</h2>
      </div>

      <div className="border rounded-md p-4">
        <h3 className="text-lg font-semibold mb-4">Dodaj novi atribut</h3>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="attributeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Atribut</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        setSelectedAttributeId(value);
                        form.setValue("value", "");
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Odaberite atribut" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {getFilteredAttributes().map((attr) => (
                          <SelectItem key={attr.id} value={attr.id}>
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
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={getFilteredAttributes().length === 0}
              >
                <Save className="mr-2 h-4 w-4" />
                Spremi
              </Button>
            </div>
          </form>
        </Form>
      </div>

      {loading ? (
        <div className="text-center py-4">Učitavanje...</div>
      ) : attributeValues.length === 0 ? (
        <div className="text-center py-4 border rounded-md">
          Nema definiranih vrijednosti atributa za ovaj proizvod
        </div>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Atribut</TableHead>
                <TableHead>Tip</TableHead>
                <TableHead>Vrijednost</TableHead>
                <TableHead className="text-right">Akcije</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attributeValues.map((attrValue) => (
                <TableRow key={attrValue.id}>
                  <TableCell>{attrValue.attribute?.label}</TableCell>
                  <TableCell>{attrValue.attribute?.type}</TableCell>
                  <TableCell>
                    {formatValue(attrValue.value, attrValue.attribute?.type || "string")}
                    {attrValue.attribute?.type === "number" && attrValue.attribute?.unit && (
                      <span className="ml-1 text-gray-500">{attrValue.attribute.unit}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteAttributeValue(attrValue.attributeId)}
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
