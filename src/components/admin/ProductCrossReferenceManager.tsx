"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-hot-toast";
import { Trash2, Plus, Save, Search, Edit } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { productCrossReferenceSchema } from "@/lib/validations/category-attribute";
import { ProductCrossReference, ProductCrossReferenceFormValues } from "@/lib/types/category-attributes";

interface ProductCrossReferenceManagerProps {
  productId: string;
}

// Tipovi referenci
const referenceTypes = [
  "OEM",
  "AFTERMARKET",
  "CROSS",
  "REPLACEMENT",
  "ALTERNATIVE",
  "SUPERSEDED",
  "CUSTOM",
];

export default function ProductCrossReferenceManager({
  productId,
}: ProductCrossReferenceManagerProps) {
  const [crossReferences, setCrossReferences] = useState<ProductCrossReference[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingReference, setEditingReference] = useState<ProductCrossReference | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isProductSearchOpen, setIsProductSearchOpen] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState<{ id: string; label: string }[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");

  const form = useForm<ProductCrossReferenceFormValues>({
    resolver: zodResolver(productCrossReferenceSchema),
    defaultValues: {
      referenceType: "OEM",
      referenceNumber: "",
      manufacturer: "",
      notes: "",
      replacementId: null,
    },
  });

  // Dohvat cross-referenci za proizvod
  const fetchCrossReferences = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/products/${productId}/cross-references`);
      
      if (!response.ok) {
        throw new Error("Greška prilikom dohvata cross-referenci");
      }
      
      const data = await response.json();
      setCrossReferences(data);
    } catch (error) {
      console.error("Error fetching cross references:", error);
      toast.error("Greška prilikom dohvata cross-referenci");
    } finally {
      setLoading(false);
    }
  };

  // Inicijalni dohvat cross-referenci
  useEffect(() => {
    if (productId) {
      fetchCrossReferences();
    }
  }, [productId]);

  // Postavljanje forme za uređivanje
  const setupEditForm = (reference: ProductCrossReference) => {
    setEditingReference(reference);
    form.reset({
      referenceType: reference.referenceType,
      referenceNumber: reference.referenceNumber,
      manufacturer: reference.manufacturer || "",
      notes: reference.notes || "",
      replacementId: reference.replacementId || null,
    });
    setIsDialogOpen(true);
  };

  // Resetiranje forme
  const resetForm = () => {
    setEditingReference(null);
    form.reset({
      referenceType: "OEM",
      referenceNumber: "",
      manufacturer: "",
      notes: "",
      replacementId: null,
    });
  };

  // Pretraživanje proizvoda
  const searchProducts = async (query: string) => {
    if (!query || query.length < 3) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      const params = new URLSearchParams({ q: query, mode: 'basic' });
      if (selectedCategoryId && selectedCategoryId !== 'all') params.set('categoryId', selectedCategoryId);
      const response = await fetch(`/api/products/search?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error("Greška prilikom pretraživanja proizvoda");
      }
      
      const data = await response.json();
      setSearchResults(data.filter((product: any) => product.id !== productId));
    } catch (error) {
      console.error("Error searching products:", error);
      toast.error("Greška prilikom pretraživanja proizvoda");
    } finally {
      setIsSearching(false);
    }
  };

  // Debounce funkcija za pretraživanje
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchProducts(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategoryId]);

  // Fetch category hierarchy and flatten for Select when modal opens first time
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch('/api/categories/hierarchy');
        if (!res.ok) throw new Error('Greška pri dohvaćanju kategorija');
        const data = await res.json();
        // Flatten hierarchy with indentation
        const flat: { id: string; label: string }[] = [];
        const walk = (nodes: any[], depth: number) => {
          for (const n of nodes) {
            const prefix = depth > 0 ? '— '.repeat(depth) : '';
            flat.push({ id: n.id, label: `${prefix}${n.name}` });
            if (n.children && n.children.length) walk(n.children, depth + 1);
          }
        };
        walk(Array.isArray(data) ? data : [], 0);
        setCategoryOptions(flat);
      } catch (e) {
        console.error('Category fetch error', e);
      }
    };
    if (isProductSearchOpen && categoryOptions.length === 0) {
      fetchCategories();
    }
  }, [isProductSearchOpen, categoryOptions.length]);

  // Odabir zamjenskog proizvoda
  const selectReplacementProduct = (product: any) => {
    form.setValue("replacementId", product.id);
    setIsProductSearchOpen(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  // Spremanje cross-reference
  const onSubmit = async (values: ProductCrossReferenceFormValues) => {
    try {
      let response;
      
      if (editingReference) {
        // Ažuriranje postojeće cross-reference
        response = await fetch(`/api/products/${productId}/cross-references/${editingReference.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(values),
        });
      } else {
        // Kreiranje nove cross-reference
        response = await fetch(`/api/products/${productId}/cross-references`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(values),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Greška prilikom spremanja cross-reference");
      }

      // Osvježavanje liste cross-referenci
      await fetchCrossReferences();
      
      // Zatvaranje dijaloga i resetiranje forme
      setIsDialogOpen(false);
      resetForm();
      
      toast.success(
        editingReference
          ? "Cross-reference je uspješno ažurirana"
          : "Nova cross-reference je uspješno dodana"
      );
    } catch (error) {
      console.error("Error saving cross reference:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Greška prilikom spremanja cross-reference"
      );
    }
  };

  // Brisanje cross-reference
  const deleteCrossReference = async (referenceId: string) => {
    if (!confirm("Jeste li sigurni da želite obrisati ovu cross-referencu?")) {
      return;
    }

    try {
      const response = await fetch(
        `/api/products/${productId}/cross-references/${referenceId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Greška prilikom brisanja cross-reference");
      }

      // Osvježavanje liste cross-referenci
      await fetchCrossReferences();
      toast.success("Cross-reference je uspješno obrisana");
    } catch (error) {
      console.error("Error deleting cross reference:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Greška prilikom brisanja cross-reference"
      );
    }
  };

  return (
    <div className="space-y-6 text-gray-900">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Cross-reference proizvoda</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                resetForm();
                setIsDialogOpen(true);
              }}
              className="bg-gradient-to-r from-amber via-orange to-brown text-white hover:from-amber/90 hover:via-orange/90 hover:to-brown/90 shadow-lg hover:scale-105 transition-all duration-200"
            >
              <Plus className="mr-2 h-4 w-4" /> Dodaj novu referencu
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] bg-gradient-to-br from-white via-gray-50/80 to-blue-50/60 backdrop-blur-sm border border-amber/20 shadow-xl">
            <DialogHeader>
              <DialogTitle className="text-gray-900 font-semibold">
                {editingReference ? "Uredi referencu" : "Dodaj novu referencu"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4 pt-4"
              >
                <FormField
                  control={form.control}
                  name="referenceType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 font-medium">Tip reference</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900">
                            <SelectValue placeholder="Odaberite tip reference" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-white/95 backdrop-blur-sm border-gray-200 rounded-xl shadow-xl">
                          {referenceTypes.map((type) => (
                            <SelectItem key={type} value={type} className="text-gray-700 hover:bg-gray-100">
                              {type}
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
                  name="referenceNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 font-medium">Broj reference</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="npr. 1234567890" 
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
                  name="manufacturer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 font-medium">Proizvođač</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="npr. Bosch, Febi" 
                          {...field} 
                          value={field.value || ""} 
                          className="bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500"
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
                      <FormLabel className="text-gray-700 font-medium">Napomena</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Dodatne informacije..." 
                          {...field} 
                          value={field.value || ""} 
                          className="bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500 resize-none"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="replacementId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 font-medium">Zamjenski proizvod</FormLabel>
                      <div className="flex space-x-2">
                        <FormControl>
                          <Input 
                            placeholder="ID zamjenskog proizvoda" 
                            {...field} 
                            value={field.value || ""} 
                            readOnly 
                            className="bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500"
                          />
                        </FormControl>
                        <Dialog open={isProductSearchOpen} onOpenChange={setIsProductSearchOpen}>
                          <DialogTrigger asChild>
                            <Button 
                              type="button" 
                              variant="outline"
                              onClick={() => setIsProductSearchOpen(true)}
                            >
                              <Search className="mr-2 h-4 w-4" />
                              Pretraži
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[700px] bg-white text-gray-900 border border-amber/20 shadow-xl">
                            <DialogHeader>
                              <DialogTitle>Pretraži proizvode</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                                <div className="md:col-span-2">
                                  <Input
                                    placeholder="Pretraži po nazivu, katalogu ili OEM broju..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500"
                                  />
                                </div>
                                <div>
                                  <Select value={selectedCategoryId} onValueChange={(v) => {
                                    setSelectedCategoryId(v);
                                    if (searchQuery && searchQuery.length >= 3) {
                                      searchProducts(searchQuery);
                                    }
                                  }}>
                                    <SelectTrigger className="bg-white border-amber/30 focus:border-amber rounded-xl text-gray-900">
                                      <SelectValue placeholder="Sve kategorije" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white max-h-80 overflow-auto">
                                      <SelectItem value="all" className="text-gray-700">Sve kategorije</SelectItem>
                                      {categoryOptions.map(opt => (
                                        <SelectItem key={opt.id} value={opt.id} className="text-gray-700">
                                          {opt.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <div className="border rounded-md max-h-[300px] overflow-y-auto">
                                {isSearching ? (
                                  <div className="text-center py-4">Pretraživanje...</div>
                                ) : searchResults.length === 0 ? (
                                  <div className="text-center py-4">
                                    {searchQuery.length >= 3
                                      ? "Nema rezultata"
                                      : "Unesite najmanje 3 znaka za pretragu"}
                                  </div>
                                ) : (
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Naziv</TableHead>
                                        <TableHead>Kataloški broj</TableHead>
                                        <TableHead>OEM broj</TableHead>
                                        <TableHead></TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {searchResults.map((product) => (
                                        <TableRow key={product.id}>
                                          <TableCell>{product.name}</TableCell>
                                          <TableCell>{product.catalogNumber}</TableCell>
                                          <TableCell>{product.oemNumber || "-"}</TableCell>
                                          <TableCell>
                                            <Button
                                              type="button"
                                              size="sm"
                                              onClick={() => selectReplacementProduct(product)}
                                            >
                                              Odaberi
                                            </Button>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                )}
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                        {field.value && (
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            onClick={() => form.setValue("replacementId", null)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
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
                    className="bg-white border-amber/30 hover:border-amber/50 text-gray-700 hover:text-gray-900 rounded-xl transition-all duration-200"
                  >
                    Odustani
                  </Button>
                  <Button 
                    type="submit"
                    className="bg-gradient-to-r from-amber via-orange to-brown text-white hover:from-amber/90 hover:via-orange/90 hover:to-brown/90 shadow-lg hover:scale-105 transition-all duration-200"
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

      {loading ? (
        <div className="text-center py-4 text-gray-900">Učitavanje...</div>
      ) : crossReferences.length === 0 ? (
        <div className="text-center py-4 border rounded-md bg-white text-gray-900">
          Nema definiranih cross-referenci za ovaj proizvod
        </div>
      ) : (
        <div className="border rounded-md bg-white text-gray-900">
          <Table className="text-gray-900">
            <TableHeader>
              <TableRow>
                <TableHead className="text-gray-700">Tip</TableHead>
                <TableHead className="text-gray-700">Broj reference</TableHead>
                <TableHead className="text-gray-700">Proizvođač</TableHead>
                <TableHead className="text-gray-700">Zamjenski proizvod</TableHead>
                <TableHead className="text-gray-700">Napomena</TableHead>
                <TableHead className="text-right text-gray-700">Akcije</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {crossReferences.map((reference) => (
                <TableRow key={reference.id}>
                  <TableCell>{reference.referenceType}</TableCell>
                  <TableCell>{reference.referenceNumber}</TableCell>
                  <TableCell>{reference.manufacturer || "-"}</TableCell>
                  <TableCell>
                    {reference.replacement ? (
                      <div className="text-sm">
                        <div>{reference.replacement.name}</div>
                        <div className="text-gray-500">
                          {reference.replacement.catalogNumber}
                          {reference.replacement.oemNumber && (
                            <span className="ml-2">({reference.replacement.oemNumber})</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>{reference.notes || "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        title="Uredi"
                        className="bg-white text-gray-800 border-amber/30 hover:bg-amber/10 hover:text-gray-900"
                        onClick={() => setupEditForm(reference)}
                      >
                        <Edit className="h-4 w-4 text-gray-800" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteCrossReference(reference.id)}
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
