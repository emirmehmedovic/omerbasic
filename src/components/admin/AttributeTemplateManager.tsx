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
import { Textarea } from "@/components/ui/textarea";
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
import { AttributeTemplate } from "@/lib/types";
import { z } from "zod";

// Definicija sheme za formu predloška atributa
const attributeTemplateFormSchema = z.object({
  name: z.string().min(1, "Naziv je obavezan"),
  description: z.string().optional().nullable(),
  attributes: z.any().optional().default([])
});

type AttributeTemplateFormValues = z.infer<typeof attributeTemplateFormSchema>;

// Osiguravamo da attributes polje uvijek postoji
const defaultValues: AttributeTemplateFormValues = {
  name: "",
  description: "",
  attributes: []
};

export default function AttributeTemplateManager() {
  const [templates, setTemplates] = useState<AttributeTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<AttributeTemplate | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<AttributeTemplateFormValues>({
    resolver: zodResolver(attributeTemplateFormSchema) as any,
    defaultValues
  });

  // Dohvat predložaka atributa
  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/attribute-templates`);
      
      if (!response.ok) {
        throw new Error("Greška prilikom dohvata predložaka atributa");
      }
      
      const data = await response.json();
      setTemplates(data);
    } catch (error: any) {
      console.error("Error fetching attribute templates:", error);
      toast.error("Greška prilikom dohvata predložaka atributa");
    } finally {
      setLoading(false);
    };
  };

  // Inicijalni dohvat predložaka
  useEffect(() => {
    fetchTemplates();
  }, []);

  // Postavljanje forme za uređivanje
  const setupEditForm = (template: AttributeTemplate) => {
    setEditingTemplate(template);
    form.reset({
      name: template.name,
      description: template.description || "",
      attributes: template.attributes as any[],
    });
    setIsDialogOpen(true);
  };

  // Resetiranje forme
  const resetForm = () => {
    setEditingTemplate(null);
    form.reset({
      name: "",
      description: "",
      attributes: [],
    });
  };

  // Spremanje predloška atributa
  const handleSubmit: SubmitHandler<AttributeTemplateFormValues> = async (data) => {
    try {
      let response;
      
      if (editingTemplate) {
        // Ažuriranje postojećeg predloška
        response = await fetch(`/api/attribute-templates/${editingTemplate.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });
      } else {
        // Kreiranje novog predloška
        response = await fetch(`/api/attribute-templates`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Greška prilikom spremanja predloška atributa");
      }

      // Osvježavanje liste predložaka
      await fetchTemplates();
      
      // Zatvaranje dijaloga i resetiranje forme
      setIsDialogOpen(false);
      resetForm();
      
      toast.success(
        editingTemplate
          ? "Predložak atributa je uspješno ažuriran"
          : "Novi predložak atributa je uspješno dodan"
      );
    } catch (error: any) {
      console.error("Error saving attribute template:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Greška prilikom spremanja predloška atributa"
      );
    }
  };

  // Brisanje predloška atributa
  const deleteTemplate = async (templateId: string) => {
    if (!confirm("Jeste li sigurni da želite obrisati ovaj predložak atributa?")) {
      return;
    }

    try {
      const response = await fetch(
        `/api/attribute-templates/${templateId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Greška prilikom brisanja predloška atributa");
      }

      // Osvježavanje liste predložaka
      await fetchTemplates();
      toast.success("Predložak atributa je uspješno obrisan");
    } catch (error: any) {
      console.error("Error deleting attribute template:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Greška prilikom brisanja predloška atributa"
      );
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">
          Predlošci atributa
        </h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                resetForm();
                setIsDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> Dodaj novi predložak
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] bg-white rounded-xl shadow-xl border border-slate-200">
            <DialogHeader>
              <DialogTitle className="text-slate-800 font-bold text-xl">
                {editingTemplate ? "Uredi predložak atributa" : "Dodaj novi predložak atributa"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Naziv predloška</FormLabel>
                      <FormControl>
                        <Input placeholder="npr. Tehnički podaci za filtere" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Opis predloška</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Opis predloška i njegovih atributa" 
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
                  name="attributes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Atributi (JSON format)</FormLabel>
                      <FormControl>
                        <Textarea
                          className="font-mono text-sm h-60"
                          placeholder={`[
  {
    "name": "diameter",
    "label": "Promjer",
    "type": "number",
    "unit": "mm",
    "isRequired": true,
    "isFilterable": true,
    "group": "Dimenzije"
  },
  {
    "name": "material",
    "label": "Materijal",
    "type": "enum",
    "options": ["Papir", "Plastika", "Metal"],
    "isRequired": true,
    "isFilterable": true,
    "group": "Specifikacije"
  }
]`}
                          {...field}
                          value={
                            typeof field.value === "object" && field.value !== null
                              ? JSON.stringify(field.value, null, 2)
                              : field.value || ""
                          }
                          onChange={(e) => {
                            try {
                              const parsed = JSON.parse(e.target.value);
                              field.onChange(parsed);
                            } catch (error) {
                              // Ako nije validan JSON, spremamo kao string
                              field.onChange(e.target.value);
                            }
                          }}
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
                    {editingTemplate ? "Spremi promjene" : "Dodaj predložak"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-4">Učitavanje...</div>
      ) : templates.length === 0 ? (
        <div className="text-center py-4">
          Nema definiranih predložaka atributa.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Naziv</TableHead>
              <TableHead>Opis</TableHead>
              <TableHead>Broj atributa</TableHead>
              <TableHead className="text-right">Akcije</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map((template) => (
              <TableRow key={template.id}>
                <TableCell>{template.name}</TableCell>
                <TableCell>{template.description || "-"}</TableCell>
                <TableCell>
                  {Array.isArray(template.attributes) ? template.attributes.length : 0}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setupEditForm(template)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteTemplate(template.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
