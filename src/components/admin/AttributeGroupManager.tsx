"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
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
import { attributeGroupSchema } from "@/lib/validations/category-attribute";
import { AttributeGroup } from "@/lib/types";

interface AttributeGroupManagerProps {
  categoryId: string;
  categoryName: string;
}

// Tip za formu grupe atributa
type AttributeGroupFormValues = {
  name: string;
  label: string;
  sortOrder: number;
  categoryId: string;
};

export default function AttributeGroupManager({
  categoryId,
  categoryName,
}: AttributeGroupManagerProps) {
  const [groups, setGroups] = useState<AttributeGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingGroup, setEditingGroup] = useState<AttributeGroup | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<AttributeGroupFormValues>({
    resolver: zodResolver(attributeGroupSchema) as any,
    defaultValues: {
      name: "",
      label: "",
      sortOrder: 0,
      categoryId: categoryId,
    },
  });

  // Dohvat grupa atributa za kategoriju
  const fetchGroups = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/categories/${categoryId}/attribute-groups`);
      
      if (!response.ok) {
        throw new Error("Greška prilikom dohvata grupa atributa");
      }
      
      const data = await response.json();
      setGroups(data);
    } catch (error) {
      console.error("Error fetching attribute groups:", error);
      toast.error("Greška prilikom dohvata grupa atributa");
    } finally {
      setLoading(false);
    }
  };

  // Inicijalni dohvat grupa
  useEffect(() => {
    fetchGroups();
  }, [categoryId]);

  // Postavljanje forme za uređivanje
  const setupEditForm = (group: AttributeGroup) => {
    setEditingGroup(group);
    form.reset({
      name: group.name,
      label: group.label,
      sortOrder: group.sortOrder,
      categoryId: categoryId,
    });
    setIsDialogOpen(true);
  };

  // Resetiranje forme
  const resetForm = () => {
    setEditingGroup(null);
    form.reset({
      name: "",
      label: "",
      sortOrder: 0,
      categoryId: categoryId,
    });
  };

  // Spremanje grupe atributa
  const onSubmit = async (values: AttributeGroupFormValues) => {
    try {
      let response;
      
      if (editingGroup) {
        // Ažuriranje postojeće grupe
        response = await fetch(`/api/categories/${categoryId}/attribute-groups/${editingGroup.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(values),
        });
      } else {
        // Kreiranje nove grupe
        response = await fetch(`/api/categories/${categoryId}/attribute-groups`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(values),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Greška prilikom spremanja grupe atributa");
      }

      // Osvježavanje liste grupa
      await fetchGroups();
      
      // Zatvaranje dijaloga i resetiranje forme
      setIsDialogOpen(false);
      resetForm();
      
      toast.success(
        editingGroup
          ? "Grupa atributa je uspješno ažurirana"
          : "Nova grupa atributa je uspješno dodana"
      );
    } catch (error) {
      console.error("Error saving attribute group:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Greška prilikom spremanja grupe atributa"
      );
    }
  };

  // Brisanje grupe atributa
  const deleteGroup = async (groupId: string) => {
    if (!confirm("Jeste li sigurni da želite obrisati ovu grupu atributa? Ovo neće obrisati atribute u grupi, ali će ih odvojiti od grupe.")) {
      return;
    }

    try {
      const response = await fetch(
        `/api/categories/${categoryId}/attribute-groups/${groupId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Greška prilikom brisanja grupe atributa");
      }

      // Osvježavanje liste grupa
      await fetchGroups();
      toast.success("Grupa atributa je uspješno obrisana");
    } catch (error) {
      console.error("Error deleting attribute group:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Greška prilikom brisanja grupe atributa"
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">
          Grupe atributa za kategoriju: {categoryName}
        </h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                resetForm();
                setIsDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> Dodaj novu grupu
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingGroup ? "Uredi grupu atributa" : "Dodaj novu grupu atributa"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-4">
                <FormField
                  control={form.control as any}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Naziv grupe</FormLabel>
                      <FormControl>
                        <Input placeholder="npr. Tehničke specifikacije" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control as any}
                  name="label"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Oznaka za prikaz</FormLabel>
                      <FormControl>
                        <Input placeholder="npr. Tehničke specifikacije" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control as any}
                  name="sortOrder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Redoslijed prikaza</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
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
                    {editingGroup ? "Spremi promjene" : "Dodaj grupu"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-4">Učitavanje...</div>
      ) : groups.length === 0 ? (
        <div className="text-center py-4">
          Nema definiranih grupa atributa za ovu kategoriju.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Naziv</TableHead>
              <TableHead>Oznaka za prikaz</TableHead>
              <TableHead>Redoslijed</TableHead>
              <TableHead>Broj atributa</TableHead>
              <TableHead className="text-right">Akcije</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map((group) => (
              <TableRow key={group.id}>
                <TableCell>{group.name}</TableCell>
                <TableCell>{group.label}</TableCell>
                <TableCell>{group.sortOrder}</TableCell>
                <TableCell>{group.attributes?.length || 0}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setupEditForm(group)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteGroup(group.id)}
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
