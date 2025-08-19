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

interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  catalogNumber: string;
  stock: number;
  isArchived: boolean;
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

  // Form states
  const [customTitle, setCustomTitle] = useState("");
  const [customImageUrl, setCustomImageUrl] = useState("");
  const [displayOrder, setDisplayOrder] = useState(0);

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
  };

  const openEditDialog = (product: FeaturedProduct) => {
    setEditingProduct(product);
    setCustomTitle(product.customTitle || "");
    setCustomImageUrl(product.customImageUrl || "");
    setDisplayOrder(product.displayOrder);
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
            <DialogContent className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm border border-amber/20 shadow-lg rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold bg-gradient-to-r from-gray-900 via-amber to-orange bg-clip-text text-transparent">
                  Dodaj proizvod u featured listu
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Odaberi proizvod</label>
                  <Select onValueChange={(value) => {
                    const product = availableProducts.find(p => p.id === value);
                    setSelectedProduct(product || null);
                  }}>
                    <SelectTrigger className="bg-white border-amber/30 focus:border-amber rounded-lg transition-all duration-200 text-gray-900">
                      <SelectValue placeholder="Odaberi proizvod..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-amber/20">
                      {filteredProducts.map((product) => (
                        <SelectItem key={product.id} value={product.id} className="text-gray-900">
                          {product.name} - {product.catalogNumber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Custom naslov (opcionalno)</label>
                  <Input
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="Ostavi prazno za default naslov"
                    className="bg-white border-amber/30 focus:border-amber rounded-lg transition-all duration-200 text-gray-900 placeholder:text-gray-500"
                  />
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
                              {featuredProduct.product.catalogNumber} • {featuredProduct.product.price.toFixed(2)} KM
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant={featuredProduct.isActive ? "default" : "secondary"} className="text-xs">
                                {featuredProduct.isActive ? "Aktivan" : "Neaktivan"}
                              </Badge>
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
        <DialogContent className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm border border-amber/20 shadow-lg rounded-2xl">
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
