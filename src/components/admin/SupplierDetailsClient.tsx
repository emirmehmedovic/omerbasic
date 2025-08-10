"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "react-hot-toast";
import { ArrowLeft, Edit } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SupplierForm } from "@/components/admin/SupplierForm";
import { SupplierCategoriesTab } from "@/components/admin/SupplierCategoriesTab";
import { SupplierProductsTab } from "@/components/admin/SupplierProductsTab";
import { Supplier } from "@/types/supplier";

interface SupplierDetailsClientProps {
  supplier: Supplier;
}

export const SupplierDetailsClient = ({ supplier }: SupplierDetailsClientProps) => {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentSupplier, setCurrentSupplier] = useState<Supplier>(supplier);

  const handleEditSuccess = () => {
    setIsEditing(false);
    fetchSupplier();
  };

  const fetchSupplier = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/suppliers/${supplier.id}`);
      setCurrentSupplier(response.data);
    } catch (error) {
      toast.error("Greška pri dohvaćanju podataka o dobavljaču.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SupplierForm
        initialData={currentSupplier}
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        onSuccess={handleEditSuccess}
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push("/admin/suppliers")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Heading
            title={currentSupplier.name}
            description={`${currentSupplier.companyName} - ${currentSupplier.city}, ${currentSupplier.country}`}
          />
        </div>
        <Button onClick={() => setIsEditing(true)}>
          <Edit className="mr-2 h-4 w-4" />
          Uredi dobavljača
        </Button>
      </div>
      <Separator />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
        <div className="bg-white p-4 rounded-md shadow">
          <h3 className="text-lg font-medium mb-2">Kontakt informacije</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">Email:</span>
              <span>{currentSupplier.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Telefon:</span>
              <span>{currentSupplier.phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Kontakt osoba:</span>
              <span>{currentSupplier.contactPerson || "-"}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-md shadow">
          <h3 className="text-lg font-medium mb-2">Adresa</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">Adresa:</span>
              <span>{currentSupplier.address}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Grad:</span>
              <span>{currentSupplier.city}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Poštanski broj:</span>
              <span>{currentSupplier.postalCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Država:</span>
              <span>{currentSupplier.country}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-4 rounded-md shadow mt-4">
        <h3 className="text-lg font-medium mb-2">Dodatne informacije</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-500">OIB/Porezni broj:</span>
            <span>{currentSupplier.taxId || "-"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Status:</span>
            <span className={`font-medium ${currentSupplier.isActive ? "text-green-600" : "text-red-600"}`}>
              {currentSupplier.isActive ? "Aktivan" : "Neaktivan"}
            </span>
          </div>
          {currentSupplier.notes && (
            <div className="mt-2">
              <span className="text-gray-500 block mb-1">Napomene:</span>
              <p className="text-sm bg-gray-50 p-2 rounded">{currentSupplier.notes}</p>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-6">
        <Tabs defaultValue="categories">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="categories">Kategorije</TabsTrigger>
            <TabsTrigger value="products">Proizvodi</TabsTrigger>
          </TabsList>
          <TabsContent value="categories" className="mt-4">
            <SupplierCategoriesTab supplierId={supplier.id} />
          </TabsContent>
          <TabsContent value="products" className="mt-4">
            <SupplierProductsTab supplierId={supplier.id} />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};
