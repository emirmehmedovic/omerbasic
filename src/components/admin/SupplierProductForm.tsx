"use client";

import { useState, useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import axios from "axios";
import { toast } from "react-hot-toast";
import { X, Package, Tag, DollarSign, Clock, Hash, FileText, Star, Search, Check, Plus, Trash2 } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

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
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

const formSchema = z.object({
  productIds: z.array(z.string()).min(1, "Odaberite barem jedan proizvod"),
  supplierSku: z.string().optional(),
  priority: z.coerce.number().int().min(1, "Prioritet mora biti najmanje 1"),
  price: z.coerce.number().min(0, "Cijena mora biti pozitivan broj"),
  minOrderQty: z.coerce.number().int().min(1, "Minimalna količina mora biti najmanje 1").optional(),
  leadTime: z.coerce.number().int().min(0, "Vrijeme isporuke mora biti pozitivan broj").optional(),
  notes: z.string().optional(),
});

type SupplierProductFormValues = z.infer<typeof formSchema>;

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  category: Category | null;
}

interface SupplierProduct {
  id: string;
  supplierId: string;
  productId: string;
  supplierSku?: string;
  priority: number;
  price: number;
  minOrderQty?: number;
  leadTime?: number;
  notes?: string;
  product: Product;
}

interface SupplierProductFormProps {
  supplierId: string;
  productId?: string;
  initialData?: SupplierProduct;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const SupplierProductForm = ({
  supplierId,
  productId,
  initialData,
  isOpen,
  onClose,
  onSuccess,
}: SupplierProductFormProps) => {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Close dropdown when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.product-search-container')) {
        setShowDropdown(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showDropdown]);

  const title = initialData ? "Uredi proizvod dobavljača" : "Dodaj proizvode dobavljaču";
  const description = initialData ? "Uredite vezu dobavljača s proizvodom" : "Dodajte nove proizvode dobavljaču";
  const toastMessage = initialData ? "Proizvod dobavljača je ažuriran." : "Proizvodi su dodani dobavljaču.";
  const action = initialData ? "Spremi promjene" : "Dodaj";

  const defaultValues: SupplierProductFormValues = initialData ? {
    productIds: [initialData.productId],
    supplierSku: initialData.supplierSku || "",
    priority: initialData.priority,
    price: initialData.price,
    minOrderQty: initialData.minOrderQty,
    leadTime: initialData.leadTime,
    notes: initialData.notes || "",
  } : {
    productIds: [],
    supplierSku: "",
    priority: 1,
    price: 0,
    minOrderQty: undefined,
    leadTime: undefined,
    notes: "",
  };

  const form = useForm<SupplierProductFormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues
  });

  const searchProducts = async (query: string = "") => {
    try {
      setLoadingProducts(true);
      const endpoint = query 
        ? `/api/products/search/simple?query=${encodeURIComponent(query)}` 
        : `/api/products?limit=50`;
      
      const response = await axios.get(endpoint);
      setProducts(response.data);
    } catch (error) {
      toast.error("Greška pri pretraživanju proizvoda.");
      console.error(error);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (debouncedSearchQuery) {
        searchProducts(debouncedSearchQuery);
      } else {
        searchProducts();
      }
    }
  }, [debouncedSearchQuery, isOpen]);

  // Ako je u edit modu, dohvati detalje proizvoda
  useEffect(() => {
    if (isOpen && initialData?.productId) {
      const fetchProduct = async () => {
        try {
          const response = await axios.get(`/api/products/${initialData.productId}`);
          const product = response.data;
          setProducts([product]);
          setSelectedProducts([product]);
        } catch (error) {
          console.error("Greška pri dohvaćanju detalja proizvoda:", error);
        }
      };
      
      fetchProduct();
    }
  }, [isOpen, initialData]);

  const handleProductSelect = (product: Product) => {
    const isSelected = selectedProducts.some(p => p.id === product.id);
    
    if (isSelected) {
      setSelectedProducts(selectedProducts.filter(p => p.id !== product.id));
    } else {
      setSelectedProducts([...selectedProducts, product]);
    }
    
    // Update form value
    const productIds = isSelected 
      ? selectedProducts.filter(p => p.id !== product.id).map(p => p.id)
      : [...selectedProducts, product].map(p => p.id);
    
    form.setValue('productIds', productIds);
    
    // Close dropdown after selection
    setShowDropdown(false);
  };

  const removeSelectedProduct = (productId: string) => {
    const updatedProducts = selectedProducts.filter(p => p.id !== productId);
    setSelectedProducts(updatedProducts);
    form.setValue('productIds', updatedProducts.map(p => p.id));
    
    // Clear search query when removing products
    setSearchQuery("");
  };

  const filteredProducts = products.filter(product => 
    !selectedProducts.some(selected => selected.id === product.id)
  );

  const onSubmit: SubmitHandler<SupplierProductFormValues> = async (values) => {
    try {
      setLoading(true);
      
      if (initialData) {
        // Edit mode - update single product
        await axios.patch(`/api/suppliers/${supplierId}/products/${values.productIds[0]}`, {
          supplierSku: values.supplierSku,
          priority: values.priority,
          price: values.price,
          minOrderQty: values.minOrderQty,
          leadTime: values.leadTime,
          notes: values.notes,
        });
      } else {
        // Add mode - add multiple products
        const promises = values.productIds.map(productId => 
          axios.post(`/api/suppliers/${supplierId}/products`, {
            productId,
            supplierSku: values.supplierSku,
            priority: values.priority,
            price: values.price,
            minOrderQty: values.minOrderQty,
            leadTime: values.leadTime,
            notes: values.notes,
          })
        );
        
        await Promise.all(promises);
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
      } else if (error.response?.status === 400 && error.response?.data === "This product is already linked to the supplier") {
        toast.error("Ovaj proizvod je već povezan s dobavljačem.");
      } else {
        toast.error("Nešto je pošlo po krivu.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedProducts([]);
      setSearchQuery("");
      setShowDropdown(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-white via-gray-50/80 to-blue-50/60 backdrop-blur-sm border border-amber/20 shadow-xl rounded-2xl p-6">
        {/* Hidden DialogTitle for accessibility */}
        <DialogTitle className="sr-only">{title}</DialogTitle>
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-sm rounded-lg border border-amber/30">
              <Package className="w-5 h-5 text-amber" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
              <p className="text-gray-600 text-sm">{description}</p>
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
          <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-4">
            {/* Product Selection */}
            <div className="bg-gradient-to-r from-amber/5 to-orange/5 border border-amber/20 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-3">
                <Package className="w-4 h-4 text-amber" />
                <h3 className="font-medium text-gray-900">Odabir proizvoda</h3>
              </div>
              
              {/* Selected Products */}
              {selectedProducts.length > 0 && (
                <div className="mb-3">
                  <FormLabel className="text-gray-700 font-medium mb-2 block">Odabrani proizvodi</FormLabel>
                  <div className="flex flex-wrap gap-2">
                    {selectedProducts.map((product) => (
                      <Badge
                        key={product.id}
                        variant="secondary"
                        className="bg-gradient-to-r from-amber/10 to-orange/10 text-sunfire-800 border border-amber/20 px-3 py-1 rounded-lg flex items-center gap-2"
                      >
                        <span className="text-sm">{product.name}</span>
                        <span className="text-xs text-gray-500">({product.category?.name || 'Bez kategorije'})</span>
                                                 {!initialData && (
                           <button
                             type="button"
                             onMouseDown={(e) => {
                               e.preventDefault();
                               e.stopPropagation();
                               removeSelectedProduct(product.id);
                             }}
                             className="ml-1 hover:text-red-500 transition-colors"
                           >
                             <X className="w-3 h-3" />
                           </button>
                         )}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Search and Selection */}
              {!initialData && (
                <div className="relative product-search-container">
                  <FormLabel className="text-gray-700 font-medium mb-2 block">Pretražite i odaberite proizvode</FormLabel>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Pretražite proizvode po nazivu ili kategoriji..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowDropdown(true);
                      }}
                      onFocus={() => setShowDropdown(true)}
                      onBlur={() => {
                        // Small delay to allow clicking on dropdown items
                        setTimeout(() => setShowDropdown(false), 30000000000);
                      }}
                      disabled={loading}
                      className="pl-10 pr-4 bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500"
                    />
                  </div>

                                     {/* Dropdown */}
                   {showDropdown && (
                     <div 
                       className="absolute z-50 w-full mt-1 bg-white border border-amber/30 rounded-xl shadow-xl max-h-64 overflow-hidden"
                       onMouseDown={(e) => e.preventDefault()}
                     >
                                             <div 
                         className="max-h-48 overflow-y-auto"
                         onMouseDown={(e) => e.preventDefault()}
                       >
                        {loadingProducts ? (
                          <div className="px-4 py-3 text-sm text-gray-500">Učitavanje...</div>
                        ) : filteredProducts.length === 0 ? (
                          <div className="px-4 py-3 text-sm text-gray-500">
                            {searchQuery ? 'Nema pronađenih proizvoda' : 'Upišite naziv proizvoda za pretragu'}
                          </div>
                        ) : (
                          filteredProducts.map((product) => (
                                                         <button
                               key={product.id}
                               type="button"
                               onMouseDown={(e) => {
                                 e.preventDefault();
                                 e.stopPropagation();
                                 handleProductSelect(product);
                               }}
                               className="w-full px-4 py-3 text-left hover:bg-amber/10 transition-colors duration-200 flex items-center justify-between border-b border-gray-100 last:border-b-0"
                             >
                              <div className="flex flex-col">
                                <span className="font-medium text-gray-900">{product.name}</span>
                                <span className="text-sm text-gray-500">{product.category?.name || 'Bez kategorije'}</span>
                              </div>
                              <Plus className="w-4 h-4 text-amber" />
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Edit mode - show selected product */}
              {initialData && (
                <div>
                  <FormLabel className="text-gray-700 font-medium mb-2 block">Proizvod</FormLabel>
                  <Input
                    value={selectedProducts[0]?.name || initialData.productId}
                    disabled={true}
                    className="bg-white border-amber/30 rounded-xl text-gray-900"
                  />
                </div>
              )}

              <FormField
                control={form.control}
                name="productIds"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <input type="hidden" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Basic Information */}
            <div className="bg-gradient-to-r from-amber/5 to-orange/5 border border-amber/20 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-3">
                <Hash className="w-4 h-4 text-amber" />
                <h3 className="font-medium text-gray-900">Osnovni podaci</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="supplierSku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 font-medium">Šifra dobavljača</FormLabel>
                      <FormControl>
                        <Input
                          disabled={loading}
                          placeholder="Šifra proizvoda kod dobavljača"
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
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 font-medium">Prioritet</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          disabled={loading}
                          placeholder="Prioritet dobavljača za ovaj proizvod"
                          {...field}
                          className="bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Pricing and Logistics */}
            <div className="bg-gradient-to-r from-amber/5 to-orange/5 border border-amber/20 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="w-4 h-4 text-amber" />
                <h3 className="font-medium text-gray-900">Cijena i logistika</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 font-medium">Nabavna cijena</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          disabled={loading}
                          placeholder="Nabavna cijena"
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
                  name="minOrderQty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 font-medium">Min. količina</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          disabled={loading}
                          placeholder="Minimalna količina za narudžbu"
                          {...field}
                          value={field.value === undefined ? "" : field.value}
                          onChange={(e) => {
                            const value = e.target.value === "" ? undefined : parseInt(e.target.value);
                            field.onChange(value);
                          }}
                          className="bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="leadTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 font-medium">Vrijeme isporuke (dani)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          disabled={loading}
                          placeholder="Vrijeme isporuke u danima"
                          {...field}
                          value={field.value === undefined ? "" : field.value}
                          onChange={(e) => {
                            const value = e.target.value === "" ? undefined : parseInt(e.target.value);
                            field.onChange(value);
                          }}
                          className="bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="bg-gradient-to-r from-amber/5 to-orange/5 border border-amber/20 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-amber" />
                <h3 className="font-medium text-gray-900">Napomene</h3>
              </div>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 font-medium">Dodatne napomene</FormLabel>
                    <FormControl>
                      <Textarea
                        disabled={loading}
                        placeholder="Dodatne napomene o vezi dobavljača s proizvodom"
                        {...field}
                        value={field.value || ""}
                        className="bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500 min-h-[80px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={onClose} 
                disabled={loading}
                className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm text-gray-700 hover:from-white hover:to-gray-50 border-amber/30 hover:border-amber/50 rounded-xl transition-all duration-200 shadow-sm px-6 py-2"
              >
                Odustani
              </Button>
              <Button 
                type="submit" 
                disabled={loading}
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
