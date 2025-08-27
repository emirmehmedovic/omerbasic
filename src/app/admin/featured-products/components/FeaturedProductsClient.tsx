"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { 
  Star, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  ArrowUp, 
  ArrowDown,
  Search,
  Filter,
  Image as ImageIcon
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  catalogNumber: string;
  stock: number;
  isArchived: boolean;
  // Optional fields set by API when a featured discount is applied
  originalPrice?: number;
  pricingSource?: 'FEATURED' | 'B2B' | 'BASE';
}

interface FeaturedProduct {
  id: string;
  productId: string;
  product: Product;
  displayOrder: number;
  isActive: boolean;
  customTitle?: string;
  customImageUrl?: string;
  createdAt: string;
  updatedAt: string;
  // Discount fields
  isDiscountActive?: boolean | null;
  discountType?: 'PERCENTAGE' | 'FIXED' | null;
  discountValue?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
}

export default function FeaturedProductsClient() {
  const [featuredProducts, setFeaturedProducts] = useState<FeaturedProduct[]>([]);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<FeaturedProduct | null>(null);

  // Modal search states (for Add dialog)
  const [modalSearchQuery, setModalSearchQuery] = useState("");
  const [modalIsSearching, setModalIsSearching] = useState(false);
  const [modalSearchResults, setModalSearchResults] = useState<Product[]>([]);
  const [modalCategoryOptions, setModalCategoryOptions] = useState<{ id: string; label: string }[]>([]);
  const [modalSelectedCategoryId, setModalSelectedCategoryId] = useState<string>("all");

  // Form states
  const [customTitle, setCustomTitle] = useState("");
  const [customImageUrl, setCustomImageUrl] = useState("");
  const [displayOrder, setDisplayOrder] = useState(0);

  // Discount states
  const [isDiscountActive, setIsDiscountActive] = useState(false);
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED' | ''>('');
  const [discountValue, setDiscountValue] = useState<string>('');
  const [startsAt, setStartsAt] = useState<string>('');
  const [endsAt, setEndsAt] = useState<string>('');

  // Dohvati podatke
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Dohvati featured products
        const featuredResponse = await fetch("/api/featured-products");
        if (featuredResponse.ok) {
          const featuredData = await featuredResponse.json();
          setFeaturedProducts(featuredData);
        }

        // Dohvati sve proizvode
        const productsResponse = await fetch("/api/products");
        if (productsResponse.ok) {
          const productsData = await productsResponse.json();
          setAvailableProducts(productsData);
        }
      } catch (error) {
        console.error("Greška pri dohvaćanju podataka:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Helpers: search and fetch by category for modal
  const modalSearchProducts = async (q: string) => {
    if (!q || q.length < 3) {
      setModalSearchResults([]);
      return;
    }
    try {
      setModalIsSearching(true);
      const params = new URLSearchParams({ q, mode: 'basic' });
      if (modalSelectedCategoryId && modalSelectedCategoryId !== 'all') params.set('categoryId', modalSelectedCategoryId);
      const resp = await fetch(`/api/products/search?${params.toString()}`);
      if (!resp.ok) throw new Error('Greška prilikom pretraživanja proizvoda');
      const data = await resp.json();
      // Exclude already featured
      const featuredIds = new Set(featuredProducts.map(fp => fp.productId));
      setModalSearchResults(data.filter((p: any) => !featuredIds.has(p.id)));
    } catch (e) {
      console.error('Modal search error', e);
      setModalSearchResults([]);
    } finally {
      setModalIsSearching(false);
    }
  };

  const modalFetchProductsByCategory = async (categoryId: string) => {
    if (!categoryId || categoryId === 'all') return;
    try {
      setModalIsSearching(true);
      const params = new URLSearchParams({ page: '1', limit: '20', categoryId });
      const resp = await fetch(`/api/products?${params.toString()}`);
      if (!resp.ok) throw new Error('Greška pri dohvatu proizvoda po kategoriji');
      const items = await resp.json();
      const featuredIds = new Set(featuredProducts.map(fp => fp.productId));
      setModalSearchResults((Array.isArray(items) ? items : []).filter((p: any) => !featuredIds.has(p.id)));
    } catch (e) {
      console.error('Modal category fetch error', e);
      setModalSearchResults([]);
    } finally {
      setModalIsSearching(false);
    }
  };

  // Load categories once when Add dialog opens
  useEffect(() => {
    const loadCats = async () => {
      try {
        const res = await fetch('/api/categories/hierarchy');
        if (!res.ok) throw new Error('Greška pri dohvaćanju kategorija');
        const data = await res.json();
        const flat: { id: string; label: string }[] = [];
        const walk = (nodes: any[], depth: number) => {
          for (const n of nodes) {
            const prefix = depth > 0 ? '— '.repeat(depth) : '';
            flat.push({ id: n.id, label: `${prefix}${n.name}` });
            if (n.children && n.children.length) walk(n.children, depth + 1);
          }
        };
        walk(Array.isArray(data) ? data : [], 0);
        setModalCategoryOptions(flat);
      } catch (e) {
        console.error('Categories load error', e);
      }
    };
    if (isAddDialogOpen && modalCategoryOptions.length === 0) loadCats();
  }, [isAddDialogOpen, modalCategoryOptions.length]);

  // Debounce search in modal
  useEffect(() => {
    if (!isAddDialogOpen) return;
    const t = setTimeout(() => {
      if (modalSearchQuery && modalSearchQuery.length >= 3) {
        modalSearchProducts(modalSearchQuery);
      } else if (!modalSearchQuery && modalSelectedCategoryId !== 'all') {
        modalFetchProductsByCategory(modalSelectedCategoryId);
      } else {
        setModalSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [isAddDialogOpen, modalSearchQuery, modalSelectedCategoryId]);

  const handleAddProduct = async () => {
    if (!selectedProduct) return;

    try {
      const response = await fetch("/api/featured-products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: selectedProduct.id,
          customTitle: customTitle || undefined,
          customImageUrl: customImageUrl || undefined,
          displayOrder: displayOrder,
          isDiscountActive,
          discountType: isDiscountActive ? (discountType || undefined) : undefined,
          discountValue: isDiscountActive && discountValue ? Number(discountValue) : undefined,
          startsAt: isDiscountActive && startsAt ? new Date(startsAt).toISOString() : undefined,
          endsAt: isDiscountActive && endsAt ? new Date(endsAt).toISOString() : undefined,
        }),
      });

      if (response.ok) {
        const newFeaturedProduct = await response.json();
        setFeaturedProducts(prev => [...prev, newFeaturedProduct]);
        setIsAddDialogOpen(false);
        resetForm();
      }
    } catch (error) {
      console.error("Greška pri dodavanju proizvoda:", error);
    }
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct) return;

    try {
      const response = await fetch(`/api/featured-products/${editingProduct.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customTitle: customTitle || undefined,
          customImageUrl: customImageUrl || undefined,
          displayOrder: displayOrder,
          isDiscountActive,
          discountType: isDiscountActive ? (discountType || undefined) : undefined,
          discountValue: isDiscountActive && discountValue ? Number(discountValue) : undefined,
          startsAt: isDiscountActive && startsAt ? new Date(startsAt).toISOString() : undefined,
          endsAt: isDiscountActive && endsAt ? new Date(endsAt).toISOString() : undefined,
        }),
      });

      if (response.ok) {
        const updatedProduct = await response.json();
        setFeaturedProducts(prev => 
          prev.map(p => p.id === editingProduct.id ? updatedProduct : p)
        );
        setIsEditDialogOpen(false);
        resetForm();
      }
    } catch (error) {
      console.error("Greška pri ažuriranju proizvoda:", error);
    }
  };

  const handleToggleActive = async (id: string) => {
    try {
      const product = featuredProducts.find(p => p.id === id);
      if (!product) return;

      const response = await fetch(`/api/featured-products/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isActive: !product.isActive,
        }),
      });

      if (response.ok) {
        const updatedProduct = await response.json();
        setFeaturedProducts(prev => 
          prev.map(p => p.id === id ? updatedProduct : p)
        );
      }
    } catch (error) {
      console.error("Greška pri ažuriranju statusa:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Jeste li sigurni da želite obrisati ovaj proizvod iz featured liste?")) return;

    try {
      const response = await fetch(`/api/featured-products/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setFeaturedProducts(prev => prev.filter(p => p.id !== id));
      }
    } catch (error) {
      console.error("Greška pri brisanju proizvoda:", error);
    }
  };

  const handleMoveUp = async (id: string) => {
    const product = featuredProducts.find(p => p.id === id);
    if (!product || product.displayOrder === 0) return;

    try {
      const response = await fetch(`/api/featured-products/${id}/move`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          direction: "up",
        }),
      });

      if (response.ok) {
        const updatedProducts = await response.json();
        setFeaturedProducts(updatedProducts);
      }
    } catch (error) {
      console.error("Greška pri premještanju proizvoda:", error);
    }
  };

  const handleMoveDown = async (id: string) => {
    const product = featuredProducts.find(p => p.id === id);
    if (!product || product.displayOrder === featuredProducts.length - 1) return;

    try {
      const response = await fetch(`/api/featured-products/${id}/move`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          direction: "down",
        }),
      });

      if (response.ok) {
        const updatedProducts = await response.json();
        setFeaturedProducts(updatedProducts);
      }
    } catch (error) {
      console.error("Greška pri premještanju proizvoda:", error);
    }
  };

  const resetForm = () => {
    setSelectedProduct(null);
    setCustomTitle("");
    setCustomImageUrl("");
    setDisplayOrder(0);
    setEditingProduct(null);
    setIsDiscountActive(false);
    setDiscountType('');
    setDiscountValue('');
    setStartsAt('');
    setEndsAt('');
  };

  const openEditDialog = (product: FeaturedProduct) => {
    setEditingProduct(product);
    setCustomTitle(product.customTitle || "");
    setCustomImageUrl(product.customImageUrl || "");
    setDisplayOrder(product.displayOrder);
    setIsDiscountActive(!!product.isDiscountActive);
    setDiscountType((product.discountType as any) || '');
    setDiscountValue(
      product.discountValue !== null && product.discountValue !== undefined
        ? String(product.discountValue)
        : ''
    );
    setStartsAt(product.startsAt ? String(product.startsAt).slice(0, 16) : '');
    setEndsAt(product.endsAt ? String(product.endsAt).slice(0, 16) : '');
    setIsEditDialogOpen(true);
  };

  const filteredProducts = availableProducts.filter(product =>
    !featuredProducts.some(fp => fp.productId === product.id) &&
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm rounded-2xl border border-amber/20 shadow-sm overflow-hidden">
        <div className="p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-amber/10 to-orange/10 rounded-full flex items-center justify-center mb-4 animate-pulse">
            <Star className="w-8 h-8 text-amber" />
          </div>
          <p className="text-gray-600">Učitavanje featured proizvoda...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header Section */}
      <div className="bg-gradient-to-br from-white via-gray-50/80 to-blue-50/60 backdrop-blur-sm rounded-2xl p-6 border border-amber/20 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-sm rounded-lg border border-amber/30">
              <Star className="w-6 h-6 text-amber" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-amber to-orange bg-clip-text text-transparent">
                Upravljanje Featured Proizvodima
              </h1>
              <p className="text-gray-600 mt-1">Upravljajte proizvodima koji se prikazuju u carousel-u na products stranici</p>
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <Input
              type="text"
              placeholder="Pretražite proizvode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-80 bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500"
            />
          </div>
        </div>
        
        {/* Add Product Button */}
        <div className="mt-6 flex justify-end">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="bg-gradient-to-r from-amber via-orange to-brown text-white hover:from-amber/90 hover:via-orange/90 hover:to-brown/90 shadow-lg hover:scale-105 transition-all duration-200 rounded-xl px-6 py-2 font-semibold"
              >
                <Plus className="mr-2 h-4 w-4" />
                Dodaj proizvod
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm border border-amber/20 shadow-lg rounded-2xl sm:max-w-[1000px] max-h-[85vh] overflow-auto">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold bg-gradient-to-r from-gray-900 via-amber to-orange bg-clip-text text-transparent">
                  Dodaj proizvod u featured listu
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                {/* Search and category filter */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                  <div className="md:col-span-2">
                    <Input
                      placeholder="Pretraži po nazivu, katalogu ili OEM broju..."
                      value={modalSearchQuery}
                      onChange={(e) => setModalSearchQuery(e.target.value)}
                      className="bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500"
                    />
                  </div>
                  <div>
                    <Select value={modalSelectedCategoryId} onValueChange={(v) => {
                      setModalSelectedCategoryId(v);
                      if (v !== 'all') {
                        if (modalSearchQuery && modalSearchQuery.length >= 3) {
                          modalSearchProducts(modalSearchQuery);
                        } else {
                          modalFetchProductsByCategory(v);
                        }
                      } else {
                        if (!modalSearchQuery || modalSearchQuery.length < 3) setModalSearchResults([]);
                      }
                    }}>
                      <SelectTrigger className="bg-white border-amber/30 focus:border-amber rounded-xl text-gray-900">
                        <SelectValue placeholder="Sve kategorije" />
                      </SelectTrigger>
                      <SelectContent className="bg-white max-h-80 overflow-auto">
                        <SelectItem value="all" className="text-gray-700">Sve kategorije</SelectItem>
                        {modalCategoryOptions.map(opt => (
                          <SelectItem key={opt.id} value={opt.id} className="text-gray-700">
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Results table */}
                <div className="border rounded-md max-h-[60vh] overflow-y-auto">
                  {modalIsSearching ? (
                    <div className="text-center py-4">Pretraživanje...</div>
                  ) : modalSearchResults.length === 0 ? (
                    <div className="text-center py-4">
                      {modalSelectedCategoryId !== 'all' && !modalSearchQuery
                        ? 'Nema proizvoda u odabranoj kategoriji'
                        : modalSearchQuery.length >= 3
                          ? 'Nema rezultata'
                          : 'Unesite najmanje 3 znaka za pretragu ili odaberite kategoriju'}
                    </div>
                  ) : (
                    <Table className="text-gray-900">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-gray-700">Naziv</TableHead>
                          <TableHead className="text-gray-700">Kataloški broj</TableHead>
                          <TableHead className="text-gray-700">OEM broj</TableHead>
                          <TableHead className="text-gray-700"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {modalSearchResults.map((product: any) => (
                          <TableRow key={product.id}>
                            <TableCell className="text-gray-900">{product.name}</TableCell>
                            <TableCell className="text-gray-900">{product.catalogNumber}</TableCell>
                            <TableCell className="text-gray-900">{product.oemNumber || '-'}</TableCell>
                            <TableCell className="text-gray-900">
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => setSelectedProduct(product)}
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

                {/* Selected product summary */}
                {selectedProduct && (
                  <div className="p-3 rounded-md border border-amber/20 bg-white text-sm text-gray-800">
                    Odabrano: <strong>{selectedProduct.name}</strong> • {selectedProduct.catalogNumber}
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Custom naslov (opcionalno)</label>
                  <Input
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="Ostavi prazno za default naslov"
                    className="bg-white border-amber/30 focus:border-amber rounded-lg transition-all duration-200 text-gray-900 placeholder:text-gray-500"
                  />
                </div>

                {/* Discount controls */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      id="discount-active"
                      type="checkbox"
                      className="h-4 w-4"
                      checked={isDiscountActive}
                      onChange={(e) => setIsDiscountActive(e.target.checked)}
                    />
                    <label htmlFor="discount-active" className="text-sm font-medium text-gray-800">Aktiviraj sniženje za sve kupce</label>
                  </div>
                  {isDiscountActive && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div>
                        <label className="text-sm text-gray-700">Tip popusta</label>
                        <Select value={discountType} onValueChange={(v: any) => setDiscountType(v)}>
                          <SelectTrigger className="bg-white border-amber/30 focus:border-amber rounded-xl text-gray-900">
                            <SelectValue placeholder="Odaberi tip" />
                          </SelectTrigger>
                          <SelectContent className="bg-white">
                            <SelectItem value="PERCENTAGE" className="text-gray-800">Postotak (%)</SelectItem>
                            <SelectItem value="FIXED" className="text-gray-800">Fiksni iznos</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm text-gray-700">Vrijednost</label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={discountValue}
                          onChange={(e) => setDiscountValue(e.target.value)}
                          placeholder={discountType === 'PERCENTAGE' ? 'npr. 15' : 'npr. 10.00'}
                          className="bg-white border-amber/30 focus:border-amber rounded-xl text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-700">Početak (opcionalno)</label>
                        <Input
                          type="datetime-local"
                          value={startsAt}
                          onChange={(e) => setStartsAt(e.target.value)}
                          className="bg-white border-amber/30 focus:border-amber rounded-xl text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-700">Kraj (opcionalno)</label>
                        <Input
                          type="datetime-local"
                          value={endsAt}
                          onChange={(e) => setEndsAt(e.target.value)}
                          className="bg-white border-amber/30 focus:border-amber rounded-xl text-gray-900"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Custom slika URL (opcionalno)</label>
                  <Input
                    value={customImageUrl}
                    onChange={(e) => setCustomImageUrl(e.target.value)}
                    placeholder="Ostavi prazno za default sliku"
                    className="bg-white border-amber/30 focus:border-amber rounded-lg transition-all duration-200 text-gray-900 placeholder:text-gray-500"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Redoslijed prikaza</label>
                  <Input
                    type="number"
                    value={displayOrder}
                    onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
                    className="bg-white border-amber/30 focus:border-amber rounded-lg transition-all duration-200 text-gray-900"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button 
                    onClick={handleAddProduct}
                    disabled={!selectedProduct}
                    className="bg-gradient-to-r from-amber via-orange to-brown text-white hover:from-amber/90 hover:via-orange/90 hover:to-brown/90 shadow-lg hover:scale-105 transition-all duration-200 rounded-lg font-semibold flex-1"
                  >
                    Dodaj proizvod
                  </Button>
                  <Button 
                    onClick={() => setIsAddDialogOpen(false)}
                    variant="outline"
                    className="border-amber/30 text-gray-700 hover:bg-amber/10 hover:border-amber/50 flex-1"
                  >
                    Odustani
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Empty State */}
      {featuredProducts.length === 0 ? (
        <div className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm rounded-2xl border border-amber/20 shadow-sm overflow-hidden">
          <div className="p-8 text-center">
            <div className="mx-auto w-16 h-16 bg-gradient-to-r from-amber/10 to-orange/10 rounded-full flex items-center justify-center mb-4">
              <Star className="w-8 h-8 text-amber" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nema featured proizvoda
            </h3>
            <p className="text-gray-600">
              Dodajte proizvode u featured listu da se prikazuju u carousel-u na products stranici
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Featured Products List */}
          <div className="space-y-3">
            {featuredProducts
              .sort((a, b) => a.displayOrder - b.displayOrder)
              .map((featuredProduct) => (
                <div 
                  key={featuredProduct.id} 
                  className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm rounded-xl border border-amber/20 shadow-sm overflow-hidden hover:shadow-md transition-all duration-200"
                >
                  <div className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-amber/20">
                          <img
                            src={featuredProduct.customImageUrl || featuredProduct.product.imageUrl || "/placeholders/part1.jpg"}
                            alt={featuredProduct.product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex items-center gap-3">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {featuredProduct.customTitle || featuredProduct.product.name}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {featuredProduct.product.catalogNumber} • {featuredProduct.product.originalPrice ? (
                                <>
                                  <span className="line-through text-gray-400 mr-2">
                                    {featuredProduct.product.originalPrice.toFixed(2)} KM
                                  </span>
                                  <span className="font-semibold text-gray-900">
                                    {featuredProduct.product.price.toFixed(2)} KM
                                  </span>
                                </>
                              ) : (
                                <>{featuredProduct.product.price.toFixed(2)} KM</>
                              )}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant={featuredProduct.isActive ? "default" : "secondary"} className="text-xs">
                                {featuredProduct.isActive ? "Aktivan" : "Neaktivan"}
                              </Badge>
                              {featuredProduct.product.originalPrice && (
                                <Badge className="text-xs bg-amber text-white">Akcija</Badge>
                              )}
                              <span className="text-xs text-gray-500">
                                Redoslijed: {featuredProduct.displayOrder}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMoveUp(featuredProduct.id)}
                          disabled={featuredProduct.displayOrder === 0}
                          className="border-amber/30 text-gray-700 hover:bg-amber/10 hover:border-amber/50"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMoveDown(featuredProduct.id)}
                          disabled={featuredProduct.displayOrder === featuredProducts.length - 1}
                          className="border-amber/30 text-gray-700 hover:bg-amber/10 hover:border-amber/50"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleActive(featuredProduct.id)}
                          className="border-amber/30 text-gray-700 hover:bg-amber/10 hover:border-amber/50"
                        >
                          {featuredProduct.isActive ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(featuredProduct)}
                          className="border-amber/30 text-gray-700 hover:bg-amber/10 hover:border-amber/50"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(featuredProduct.id)}
                          className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm border border-amber/20 shadow-lg rounded-2xl sm:max-w-[1100px] w-[95vw] max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-gray-900 via-amber to-orange bg-clip-text text-transparent">
              Uredi featured proizvod
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Proizvod</label>
              <p className="text-gray-600 bg-gray-50 p-3 rounded-lg border border-amber/20">
                {editingProduct?.product.name} - {editingProduct?.product.catalogNumber}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Custom naslov</label>
              <Input
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Ostavi prazno za default naslov"
                className="bg-white border-amber/30 focus:border-amber rounded-lg transition-all duration-200 text-gray-900 placeholder:text-gray-500"
              />
            </div>

            {/* Discount controls (Edit) */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  id="edit-discount-active"
                  type="checkbox"
                  className="h-4 w-4"
                  checked={isDiscountActive}
                  onChange={(e) => setIsDiscountActive(e.target.checked)}
                />
                <label htmlFor="edit-discount-active" className="text-sm font-medium text-gray-800">Aktiviraj sniženje za sve kupce</label>
              </div>
              {isDiscountActive && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-sm text-gray-700">Tip popusta</label>
                    <Select value={discountType} onValueChange={(v: any) => setDiscountType(v)}>
                      <SelectTrigger className="bg-white border-amber/30 focus:border-amber rounded-xl text-gray-900">
                        <SelectValue placeholder="Odaberi tip" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="PERCENTAGE" className="text-gray-800">Postotak (%)</SelectItem>
                        <SelectItem value="FIXED" className="text-gray-800">Fiksni iznos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm text-gray-700">Vrijednost</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      placeholder={discountType === 'PERCENTAGE' ? 'npr. 15' : 'npr. 10.00'}
                      className="bg-white border-amber/30 focus:border-amber rounded-xl text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-700">Početak (opcionalno)</label>
                    <Input
                      type="datetime-local"
                      value={startsAt}
                      onChange={(e) => setStartsAt(e.target.value)}
                      className="bg-white border-amber/30 focus:border-amber rounded-xl text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-700">Kraj (opcionalno)</label>
                    <Input
                      type="datetime-local"
                      value={endsAt}
                      onChange={(e) => setEndsAt(e.target.value)}
                      className="bg-white border-amber/30 focus:border-amber rounded-xl text-gray-900"
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Custom slika URL</label>
              <Input
                value={customImageUrl}
                onChange={(e) => setCustomImageUrl(e.target.value)}
                placeholder="Ostavi prazno za default sliku"
                className="bg-white border-amber/30 focus:border-amber rounded-lg transition-all duration-200 text-gray-900 placeholder:text-gray-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Redoslijed prikaza</label>
              <Input
                type="number"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
                className="bg-white border-amber/30 focus:border-amber rounded-lg transition-all duration-200 text-gray-900"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                onClick={handleUpdateProduct}
                className="bg-gradient-to-r from-amber via-orange to-brown text-white hover:from-amber/90 hover:via-orange/90 hover:to-brown/90 shadow-lg hover:scale-105 transition-all duration-200 rounded-lg font-semibold flex-1"
              >
                Spremi promjene
              </Button>
              <Button 
                onClick={() => setIsEditDialogOpen(false)}
                variant="outline"
                className="border-amber/30 text-gray-700 hover:bg-amber/10 hover:border-amber/50 flex-1"
              >
                Odustani
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
