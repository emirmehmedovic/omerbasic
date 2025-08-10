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
      categoryId: categoryId, // Add categoryId from props
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
              <FormLabel>Opcije (JSON format)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder='["opcija1", "opcija2", "opcija3"]'
                  {...field}
                  value={
                    typeof field.value === "object" && field.value !== null
                      ? JSON.stringify(field.value)
                      : field.value || ""
                  }
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
              <FormLabel>Jedinica mjere</FormLabel>
              <FormControl>
                <Input placeholder="npr. mm, kg, l" {...field} value={field.value || ""} />
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">
          Atributi za kategoriju: {categoryName}
        </h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                resetForm();
                setIsDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> Dodaj novi atribut
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
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
                      <FormLabel>Naziv atributa (interni)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="npr. viscosity, diameter"
                          {...field}
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
                      <FormLabel>Oznaka atributa (za prikaz)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="npr. Viskozitet, Promjer"
                          {...field}
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
                      <FormLabel>Tip podatka</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Odaberite tip podatka" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="string">Tekst</SelectItem>
                          <SelectItem value="number">Broj</SelectItem>
                          <SelectItem value="boolean">Da/Ne</SelectItem>
                          <SelectItem value="enum">Lista opcija</SelectItem>
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
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Obavezno polje</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isFilterable"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Omogući filtriranje</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sortOrder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Redoslijed prikaza</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value) || 0)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2 pt-4">
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
                  <Button type="submit">
                    <Save className="mr-2 h-4 w-4" />
                    Spremi
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-4">Učitavanje...</div>
      ) : attributes.length === 0 ? (
        <div className="text-center py-4 border rounded-md">
          Nema definiranih atributa za ovu kategoriju
        </div>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Naziv</TableHead>
                <TableHead>Oznaka</TableHead>
                <TableHead>Tip</TableHead>
                <TableHead>Jedinica</TableHead>
                <TableHead>Obavezno</TableHead>
                <TableHead>Filtriranje</TableHead>
                <TableHead>Redoslijed</TableHead>
                <TableHead className="text-right">Akcije</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attributes.map((attribute) => (
                <TableRow key={attribute.id}>
                  <TableCell>{attribute.name}</TableCell>
                  <TableCell>{attribute.label}</TableCell>
                  <TableCell>{attribute.type}</TableCell>
                  <TableCell>{attribute.unit || "-"}</TableCell>
                  <TableCell>
                    {attribute.isRequired ? "Da" : "Ne"}
                  </TableCell>
                  <TableCell>
                    {attribute.isFilterable ? "Da" : "Ne"}
                  </TableCell>
                  <TableCell>{attribute.sortOrder}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setupEditForm(attribute)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteAttribute(attribute.id)}
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
