"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { toast } from "react-hot-toast";
import { Plus, Edit, Trash2, Search, Package, Building2, Tag, Clock, DollarSign, Hash } from "lucide-react";
import { formatPrice } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmationModal } from "@/components/modals/alert-modal";
import { SupplierProductForm } from "@/components/admin/SupplierProductForm";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

interface Supplier {
  id: string;
  name: string;
  companyName: string;
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
  supplier: Supplier;
}

export const SupplierProductsClient = () => {
  const [loading, setLoading] = useState(true);
  const [supplierProducts, setSupplierProducts] = useState<SupplierProduct[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [supplierSearchTerm, setSupplierSearchTerm] = useState("");
  const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false);
  const supplierDropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [editingProduct, setEditingProduct] = useState<SupplierProduct | null>(null);

  // Dohvati sve dobavljače
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const response = await axios.get("/api/suppliers");
        setSuppliers(response.data);
        if (response.data.length > 0 && response.data[0]?.id) {
          setSelectedSupplierId(response.data[0].id);
        }
      } catch (error) {
        toast.error("Greška pri dohvaćanju dobavljača.");
        console.error(error);
      }
    };
    
    fetchSuppliers();
  }, []);

  // Dohvati proizvode za odabranog dobavljača
  useEffect(() => {
    if (!selectedSupplierId) {
      setSupplierProducts([]);
      setLoading(false);
      return;
    }

    const fetchSupplierProducts = async () => {
            try {
        setLoading(true);
        const response = await axios.get(`/api/suppliers/${selectedSupplierId}/products`);
        
        // Provjeri strukturu podataka
        if (Array.isArray(response.data)) {
          // Provjeri da li su podaci u očekivanom formatu
          const firstProduct = response.data[0];
          if (firstProduct && firstProduct.product) {
            // Podaci su u očekivanom SupplierProduct formatu
            setSupplierProducts(response.data);
          } else {
            // Podaci su direktno proizvodi, trebamo ih transformirati
            const transformedProducts = response.data.map((product: any) => ({
              id: product.id,
              supplierId: selectedSupplierId,
              productId: product.id,
              supplierSku: product.supplierSku || '',
              priority: product.priority || 1,
              price: product.price || 0,
              minOrderQty: product.minOrderQty,
              leadTime: product.leadTime,
              notes: '',
              product: product,
              supplier: suppliers.find(s => s.id === selectedSupplierId) || {
                id: selectedSupplierId,
                name: 'Unknown',
                companyName: 'Unknown'
              }
            }));
            setSupplierProducts(transformedProducts);
          }
        } else {
          setSupplierProducts([]);
        }
      } catch (error) {
        toast.error("Greška pri dohvaćanju proizvoda dobavljača.");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchSupplierProducts();
  }, [selectedSupplierId]);

  const onDelete = async (id: string) => {
    try {
      setLoading(true);
      await axios.delete(`/api/suppliers/${selectedSupplierId}/products/${id}`);
      
      // Osvježi listu proizvoda
      const response = await axios.get(`/api/suppliers/${selectedSupplierId}/products`);
      setSupplierProducts(response.data);
      
      toast.success("Proizvod je uklonjen od dobavljača.");
    } catch (error) {
      toast.error("Greška pri uklanjanju proizvoda od dobavljača.");
      console.error(error);
    } finally {
      setLoading(false);
      setIsDeleteModalOpen(false);
      setDeletingId("");
    }
  };

  const onAddSuccess = async () => {
    try {
      setLoading(true);
      // Osvježi listu proizvoda
      const response = await axios.get(`/api/suppliers/${selectedSupplierId}/products`);
      setSupplierProducts(response.data);
      setIsFormOpen(false);
      setEditingProduct(null);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Filtriranje proizvoda po pretrazi
  const filteredProducts = supplierProducts.filter(product => {
    return product && product.product && (
      searchTerm === "" || 
      product.product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.product.category?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.supplierSku?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Paginacija za filtrirane rezultate
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Filtriranje dobavljača po pretrazi
  const filteredSuppliers = suppliers.filter(supplier =>
    supplier && (
      supplierSearchTerm === "" || 
      supplier.name?.toLowerCase().includes(supplierSearchTerm.toLowerCase()) ||
      supplier.companyName?.toLowerCase().includes(supplierSearchTerm.toLowerCase())
    )
  );

  // Reset paginacije kada se promijeni pretraga ili dobavljač
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedSupplierId]);

  // Funkcija za izračunavanje pozicije dropdown-a
  const getDropdownPosition = () => {
    if (supplierDropdownRef.current) {
      const rect = supplierDropdownRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const dropdownHeight = 300; // Maksimalna visina dropdown-a
      
      let top = rect.bottom + window.scrollY;
      let left = rect.left + window.scrollX;
      let width = rect.width;
      
      // Provjeri da li dropdown staje na dnu
      if (rect.bottom + dropdownHeight > viewportHeight) {
        top = rect.top + window.scrollY - dropdownHeight;
      }
      
      // Provjeri da li dropdown staje s lijeve strane
      if (left + width > window.innerWidth) {
        left = window.innerWidth - width - 10;
      }
      
      return { top, left, width };
    }
    return { top: 0, left: 0, width: 0 };
  };

  // Zatvori dropdown kada se klikne izvan njega ili pritisne Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      
      // Provjeri da li je klik na dropdown trigger button
      const isDropdownTrigger = target.closest('.dropdown-trigger');
      if (isDropdownTrigger) {
        return;
      }
      
      // Provjeri da li je klik unutar dropdown-a (ali ne na trigger button)
      const isInsideDropdown = target.closest('.supplier-dropdown');
      
      // Ako je klik unutar dropdown-a, ne zatvaraj ga
      if (isInsideDropdown && !isDropdownTrigger) {
        return;
      }
      
      // Ako je klik izvan dropdown-a, zatvori ga
      setIsSupplierDropdownOpen(false);
      setSupplierSearchTerm("");
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsSupplierDropdownOpen(false);
        setSupplierSearchTerm("");
      }
    };

    const handleResize = () => {
      if (isSupplierDropdownOpen) {
        setDropdownPosition(getDropdownPosition());
      }
    };

    if (isSupplierDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      window.addEventListener('resize', handleResize);
      setDropdownPosition(getDropdownPosition());
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, [isSupplierDropdownOpen]);

  const columns = [
    {
      accessorFn: (row: SupplierProduct) => row.product?.name,
      id: "productName",
      header: "Naziv proizvoda",
      cell: ({ row }: any) => row.original.product?.name || "-",
    },
    {
      accessorFn: (row: SupplierProduct) => row.product?.category?.name,
      id: "categoryName",
      header: "Kategorija",
      cell: ({ row }: any) => row.original.product?.category?.name || "Bez kategorije",
    },
    {
      accessorKey: "supplierSku",
      header: "Šifra dobavljača",
      cell: ({ row }: any) => row.original.supplierSku || "-",
    },
    {
      accessorKey: "priority",
      header: "Prioritet",
    },
    {
      accessorKey: "price",
      header: "Nabavna cijena",
      cell: ({ row }: any) => formatPrice(row.original.price),
    },
    {
      accessorKey: "minOrderQty",
      header: "Min. količina",
      cell: ({ row }: any) => row.original.minOrderQty || "-",
    },
    {
      accessorKey: "leadTime",
      header: "Vrijeme isporuke (dani)",
      cell: ({ row }: any) => row.original.leadTime || "-",
    },
    {
      id: "actions",
      cell: ({ row }: any) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setEditingProduct(row.original);
              setIsFormOpen(true);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setDeletingId(row.original.id);
              setIsDeleteModalOpen(true);
            }}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <SupplierProductForm
        supplierId={selectedSupplierId}
        initialData={editingProduct || undefined}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingProduct(null);
        }}
        onSuccess={onAddSuccess}
      />
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => onDelete(deletingId)}
        loading={loading}
        title="Jeste li sigurni?"
        description="Ova akcija će trajno ukloniti proizvod od dobavljača i ne može se poništiti."
      />
      
      {/* Header Section */}
      <div className="bg-gradient-to-br from-white via-gray-50/80 to-blue-50/60 backdrop-blur-sm rounded-2xl p-6 border border-amber/20 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-sm rounded-lg border border-amber/30">
              <Package className="w-6 h-6 text-amber" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-amber to-orange bg-clip-text text-transparent">
                Proizvodi dobavljača
              </h1>
              <p className="text-gray-600 mt-1">Upravljajte proizvodima koje nabavljate od dobavljača</p>
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
        
        {/* Supplier Selection and Add Button */}
        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-[300px] relative" ref={supplierDropdownRef}>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsSupplierDropdownOpen(!isSupplierDropdownOpen);
                }}
                disabled={loading || suppliers.length === 0}
                className="w-full bg-white border border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 px-4 py-2 text-left flex items-center justify-between hover:border-amber/50 disabled:opacity-50 disabled:cursor-not-allowed dropdown-trigger supplier-dropdown"
              >
                <span className="text-gray-500">
                  {selectedSupplierId 
                    ? suppliers.find(s => s?.id === selectedSupplierId)?.name || 'Odaberite dobavljača'
                    : 'Odaberite dobavljača'
                  }
                </span>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${isSupplierDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </button>
            </div>
            
            {/* Dropdown Portal */}
            {isSupplierDropdownOpen && typeof window !== 'undefined' && createPortal(
              <div 
                className="fixed z-[9999] bg-white border border-amber/30 rounded-xl shadow-xl max-h-64 overflow-hidden supplier-dropdown"
                style={{
                  top: `${dropdownPosition.top}px`,
                  left: `${dropdownPosition.left}px`,
                  width: `${dropdownPosition.width}px`
                }}
              >
                <div className="p-3 border-b border-amber/20">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Pretražite dobavljače..."
                      value={supplierSearchTerm}
                      onChange={(e) => setSupplierSearchTerm(e.target.value)}
                      className="pl-8 pr-2 h-8 text-sm border-amber/30 focus:border-amber bg-white text-gray-900 placeholder:text-gray-500"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {filteredSuppliers.length === 0 ? (
                    <div className="px-4 py-2 text-sm text-gray-500">Nema pronađenih dobavljača</div>
                  ) : (
                    filteredSuppliers.map((supplier) => {
                      return supplier && (
                        <button
                          key={supplier.id}
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedSupplierId(supplier.id);
                            setIsSupplierDropdownOpen(false);
                            setSupplierSearchTerm("");
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-amber/10 transition-colors duration-200 flex items-center gap-2"
                        >
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900">{supplier.name || 'Nepoznato'}</span>
                            <span className="text-xs text-gray-500">{supplier.companyName || 'Nepoznata tvrtka'}</span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>,
              document.body
            )}
            {selectedSupplierId && (
              <span className="text-sm text-gray-600 bg-white/80 px-3 py-1 rounded-full border border-amber/20">
                {supplierProducts.length} proizvod{supplierProducts.length !== 1 ? 'a' : ''}
              </span>
            )}
          </div>
          
          <Button
            onClick={() => {
              setEditingProduct(null);
              setIsFormOpen(true);
            }}
            disabled={loading || !selectedSupplierId}
            className="bg-gradient-to-r from-amber via-orange to-brown text-white hover:from-amber/90 hover:via-orange/90 hover:to-brown/90 shadow-lg hover:scale-105 transition-all duration-200 rounded-xl px-6 py-2 font-semibold"
          >
            <Plus className="mr-2 h-4 w-4" />
            Dodaj proizvod
          </Button>
        </div>
      </div>

      {/* Search Results Info */}
      {searchTerm && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-blue-800 text-sm">
            {filteredProducts.length === 0 
              ? `Nema pronađenih proizvoda za "${searchTerm}"`
              : `Pronađeno ${filteredProducts.length} proizvod${filteredProducts.length === 1 ? 'a' : 'a'} za "${searchTerm}" (prikazano ${paginatedProducts.length} na stranici ${currentPage} od ${totalPages})`
            }
          </p>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm rounded-2xl border border-amber/20 shadow-sm overflow-hidden">
          <div className="p-8 text-center">
            <div className="mx-auto w-16 h-16 bg-gradient-to-r from-amber/10 to-orange/10 rounded-full flex items-center justify-center mb-4 animate-pulse">
              <Package className="w-8 h-8 text-amber" />
            </div>
            <p className="text-gray-600">Učitavanje proizvoda...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Empty State */}
          {!selectedSupplierId ? (
            <div className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm rounded-2xl border border-amber/20 shadow-sm overflow-hidden">
              <div className="p-8 text-center">
                <div className="mx-auto w-16 h-16 bg-gradient-to-r from-amber/10 to-orange/10 rounded-full flex items-center justify-center mb-4">
                  <Building2 className="w-8 h-8 text-amber" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Odaberite dobavljača</h3>
                <p className="text-gray-600">Odaberite dobavljača iz padajuće liste da vidite njegove proizvode</p>
              </div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm rounded-2xl border border-amber/20 shadow-sm overflow-hidden">
              <div className="p-8 text-center">
                <div className="mx-auto w-16 h-16 bg-gradient-to-r from-amber/10 to-orange/10 rounded-full flex items-center justify-center mb-4">
                  <Package className="w-8 h-8 text-amber" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {searchTerm ? 'Nema pronađenih proizvoda' : 'Nema proizvoda'}
                </h3>
                <p className="text-gray-600">
                  {searchTerm ? 'Pokušajte s drugim pojmom za pretragu' : 'Dodajte prvi proizvod ovom dobavljaču da počnete'}
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Products List */}
              <div className="space-y-3">
                {paginatedProducts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>Nema proizvoda za prikaz</p>
                  </div>
                ) : (
                  paginatedProducts.map((product) => {
                    return product && (
                      <div key={product.id} className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm rounded-xl border border-amber/20 shadow-sm overflow-hidden hover:shadow-md transition-all duration-200">
                        <div className="px-6 py-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="p-2 bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-sm rounded-lg border border-amber/30">
                                <Package className="w-5 h-5 text-amber" />
                              </div>
                              <div className="flex items-center gap-4">
                                <div>
                                  <h3 className="text-lg font-semibold text-gray-900">{product.product?.name || 'Nepoznato'}</h3>
                                  <p className="text-sm text-gray-600">{product.product?.category?.name || 'Bez kategorije'}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-sm text-gray-600 bg-white/80 px-3 py-1 rounded-full border border-amber/20">
                                    Prioritet: {product.priority}
                                  </span>
                                  <span className="text-sm text-green-600 bg-green-100 px-3 py-1 rounded-full border border-green-200">
                                    {formatPrice(product.price)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-4">
                              {/* Product Details */}
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                {product.supplierSku && (
                                  <div className="flex items-center gap-1">
                                    <Hash className="w-4 h-4" />
                                    <span>{product.supplierSku}</span>
                                  </div>
                                )}
                                {product.minOrderQty && (
                                  <div className="flex items-center gap-1">
                                    <Tag className="w-4 h-4" />
                                    <span>Min: {product.minOrderQty}</span>
                                  </div>
                                )}
                                {product.leadTime && (
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    <span>{product.leadTime} dana</span>
                                  </div>
                                )}
                              </div>
                              
                              {/* Action Buttons */}
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditingProduct(product);
                                    setIsFormOpen(true);
                                  }}
                                  className="btn-edit"
                                >
                                  <Edit className="h-4 w-4 mr-1" />
                                  Uredi
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setDeletingId(product.id);
                                    setIsDeleteModalOpen(true);
                                  }}
                                  className="btn-delete"
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Obriši
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Paginacija */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm text-gray-700 hover:from-white hover:to-gray-50 border-amber/30 hover:border-amber/50 rounded-lg transition-all duration-200 shadow-sm"
                  >
                    Prethodna
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className={
                          currentPage === page
                            ? "bg-gradient-to-r from-amber via-orange to-brown text-white"
                            : "bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm text-gray-700 hover:from-white hover:to-gray-50 border-amber/30 hover:border-amber/50 rounded-lg transition-all duration-200 shadow-sm"
                        }
                      >
                        {page}
                      </Button>
                    ))}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm text-gray-700 hover:from-white hover:to-gray-50 border-amber/30 hover:border-amber/50 rounded-lg transition-all duration-200 shadow-sm"
                  >
                    Sljedeća
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </>
  );
};
