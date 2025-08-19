"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { Plus, Edit, Trash2, Search, Building2, Mail, Phone, MapPin, Globe } from "lucide-react";
import { toast } from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmationModal } from "@/components/modals/alert-modal";
import { SupplierForm } from "./SupplierForm";

import { Supplier } from "@/types/supplier";

export const SuppliersClient = () => {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/suppliers");
      setSuppliers(response.data);
    } catch (error) {
      toast.error("Greška pri dohvaćanju dobavljača.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const onDelete = async (id: string) => {
    try {
      await axios.delete(`/api/suppliers/${id}`);
      toast.success("Dobavljač je uspješno obrisan.");
      fetchSuppliers();
      setIsDeleteOpen(false);
    } catch (error) {
      toast.error("Greška pri brisanju dobavljača.");
      console.error(error);
    }
  };

  // Filtriranje dobavljača po pretrazi
  const filteredSuppliers = suppliers.filter(supplier =>
    searchTerm === "" || 
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Paginacija za filtrirane rezultate
  const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage);
  
  const paginatedSuppliers = filteredSuppliers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset paginacije kada se promijeni pretraga
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <>
      <ConfirmationModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={() => deleteId && onDelete(deleteId)}
        loading={loading}
        title="Jeste li sigurni?"
        description="Ova akcija će trajno obrisati dobavljača i ne može se poništiti."
      />
      <SupplierForm
        isOpen={open}
        onClose={() => {
          setOpen(false);
          setEditingSupplier(null);
        }}
        initialData={editingSupplier}
        onSuccess={() => {
          setOpen(false);
          setEditingSupplier(null);
          fetchSuppliers();
        }}
      />
      
      {/* Header Section */}
      <div className="bg-gradient-to-br from-white via-gray-50/80 to-blue-50/60 backdrop-blur-sm rounded-2xl p-6 border border-amber/20 shadow-sm">
      <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-sm rounded-lg border border-amber/30">
              <Building2 className="w-6 h-6 text-amber" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-amber to-orange bg-clip-text text-transparent">
                Upravljanje dobavljačima
              </h1>
              <p className="text-gray-600 mt-1">Upravljajte dobavljačima za vaše proizvode</p>
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <Input
              type="text"
              placeholder="Pretražite dobavljače..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-80 bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500"
            />
          </div>
        </div>
        
        {/* Add Supplier Button */}
        <div className="mt-6 flex justify-end">
          <Button 
            onClick={() => setOpen(true)}
            className="bg-gradient-to-r from-amber via-orange to-brown text-white hover:from-amber/90 hover:via-orange/90 hover:to-brown/90 shadow-lg hover:scale-105 transition-all duration-200 rounded-xl px-6 py-2 font-semibold"
          >
          <Plus className="mr-2 h-4 w-4" />
          Dodaj dobavljača
        </Button>
      </div>
      </div>

      {/* Search Results Info */}
      {searchTerm && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-blue-800 text-sm">
            {filteredSuppliers.length === 0 
              ? `Nema pronađenih dobavljača za "${searchTerm}"`
              : `Pronađeno ${filteredSuppliers.length} dobavljač${filteredSuppliers.length === 1 ? 'a' : 'a'} za "${searchTerm}" (prikazano ${paginatedSuppliers.length} na stranici ${currentPage} od ${totalPages})`
            }
          </p>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm rounded-2xl border border-amber/20 shadow-sm overflow-hidden">
          <div className="p-8 text-center">
            <div className="mx-auto w-16 h-16 bg-gradient-to-r from-amber/10 to-orange/10 rounded-full flex items-center justify-center mb-4 animate-pulse">
              <Building2 className="w-8 h-8 text-amber" />
            </div>
            <p className="text-gray-600">Učitavanje dobavljača...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Empty State */}
          {filteredSuppliers.length === 0 ? (
            <div className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm rounded-2xl border border-amber/20 shadow-sm overflow-hidden">
              <div className="p-8 text-center">
                <div className="mx-auto w-16 h-16 bg-gradient-to-r from-amber/10 to-orange/10 rounded-full flex items-center justify-center mb-4">
                  <Building2 className="w-8 h-8 text-amber" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {searchTerm ? 'Nema pronađenih dobavljača' : 'Nema dodanih dobavljača'}
                </h3>
                <p className="text-gray-600">
                  {searchTerm ? 'Pokušajte s drugim pojmom za pretragu' : 'Dodajte prvog dobavljača da počnete'}
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Suppliers List */}
              <div className="space-y-3">
                {paginatedSuppliers.map((supplier) => (
                  <div key={supplier.id} className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm rounded-xl border border-amber/20 shadow-sm overflow-hidden hover:shadow-md transition-all duration-200">
                    <div className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-sm rounded-lg border border-amber/30">
                            <Building2 className="w-5 h-5 text-amber" />
                          </div>
                          <div className="flex items-center gap-3">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">{supplier.name}</h3>
                              <p className="text-sm text-gray-600">{supplier.companyName}</p>
                            </div>
                            <span className={`text-sm px-3 py-1 rounded-full border ${
                              supplier.isActive 
                                ? 'bg-green-100 text-green-800 border-green-200' 
                                : 'bg-red-100 text-red-800 border-red-200'
                            }`}>
                              {supplier.isActive ? 'Aktivan' : 'Neaktivan'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          {/* Contact Info */}
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Mail className="w-4 h-4" />
                              <span>{supplier.email}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Phone className="w-4 h-4" />
                              <span>{supplier.phone}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              <span>{supplier.city}, {supplier.country}</span>
                            </div>
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingSupplier(supplier);
                                setOpen(true);
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
                                setDeleteId(supplier.id);
                                setIsDeleteOpen(true);
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
                ))}
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
