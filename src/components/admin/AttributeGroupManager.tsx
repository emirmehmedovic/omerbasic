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
    <div className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm rounded-2xl border border-amber/20 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-white/90 to-gray-50/90 border-b border-amber/20 px-6 py-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <svg className="w-5 h-5 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Grupe atributa ({groups.length})
          </h2>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  resetForm();
                  setIsDialogOpen(true);
                }}
                className="accent-bg text-white hover:opacity-90 shadow-lg hover:scale-105 transition-all duration-200 rounded-xl px-4 py-2 text-sm font-medium"
              >
                <Plus className="mr-2 h-4 w-4" /> Dodaj novu grupu
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] bg-white rounded-xl shadow-xl border border-slate-200">
              <DialogHeader>
                <DialogTitle className="text-slate-800 font-bold flex items-center gap-2 text-xl">
                  <svg className="w-6 h-6 text-sunfire-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {editingGroup ? "Uredi grupu atributa" : "Dodaj novu grupu atributa"}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-4 pt-4">
                  <FormField
                    control={form.control as any}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 font-medium">Naziv grupe</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="npr. Tehničke specifikacije" 
                            {...field} 
                            className="bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500"
                          />
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
                        <FormLabel className="text-gray-700 font-medium">Oznaka za prikaz</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="npr. Tehničke specifikacije" 
                            {...field} 
                            className="bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500"
                          />
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
                        <FormLabel className="text-gray-700 font-medium">Redoslijed prikaza</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
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
                      {editingGroup ? "Spremi promjene" : "Dodaj grupu"}
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
              <p className="text-gray-600 font-medium">Učitavanje grupa...</p>
            </div>
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="p-3 bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-sm rounded-xl border border-amber/30">
                <svg className="w-8 h-8 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="text-gray-600 font-medium">Nema definiranih grupa</p>
              <p className="text-gray-500 text-sm">Dodajte prvu grupu atributa</p>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm rounded-2xl border border-amber/20 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-white/90 to-gray-50/90 border-b border-amber/20">
                  <TableHead className="text-gray-700 font-semibold">Naziv</TableHead>
                  <TableHead className="text-gray-700 font-semibold">Oznaka za prikaz</TableHead>
                  <TableHead className="text-gray-700 font-semibold">Redoslijed</TableHead>
                  <TableHead className="text-gray-700 font-semibold">Broj atributa</TableHead>
                  <TableHead className="text-right text-gray-700 font-semibold">Akcije</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((group) => (
                  <TableRow 
                    key={group.id}
                    className="hover:bg-gradient-to-r hover:from-amber/10 hover:to-orange/10 transition-all duration-200 border-b border-amber/10"
                  >
                    <TableCell className="text-gray-900 font-medium">{group.name}</TableCell>
                    <TableCell className="text-gray-700">{group.label}</TableCell>
                    <TableCell className="text-gray-700">{group.sortOrder}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {group.attributes?.length || 0}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setupEditForm(group)}
                          className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm text-gray-700 hover:from-white hover:to-gray-50 border-amber/30 hover:border-amber/50 rounded-xl transition-all duration-200 shadow-sm"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteGroup(group.id)}
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
