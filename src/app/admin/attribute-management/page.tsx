"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import AttributeTemplateManager from "@/components/admin/AttributeTemplateManager";
import AttributeGroupManager from "@/components/admin/AttributeGroupManager";
import CategoryAttributeManager from "@/components/admin/CategoryAttributeManager";
import { Category } from "@/lib/types";

export default function AttributeManagementPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("templates");
  const [loading, setLoading] = useState(true);
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  // Dohvat kategorija
  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/categories");
      
      if (!response.ok) {
        throw new Error("Greška prilikom dohvata kategorija");
      }
      
      const data = await response.json();
      setCategories(data);
      
      // Postavljanje prve kategorije kao odabrane ako postoji
      if (data.length > 0 && !selectedCategoryId) {
        setSelectedCategoryId(data[0].id);
        setSelectedCategoryName(data[0].name);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast.error("Greška prilikom dohvata kategorija");
    } finally {
      setLoading(false);
    }
  };

  // Dohvat predložaka
  const fetchTemplates = async () => {
    try {
      const response = await fetch("/api/attribute-templates");
      
      if (!response.ok) {
        throw new Error("Greška prilikom dohvata predložaka");
      }
      
      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast.error("Greška prilikom dohvata predložaka");
    }
  };

  // Inicijalni dohvat podataka
  useEffect(() => {
    fetchCategories();
    fetchTemplates();
  }, []);

  // Promjena odabrane kategorije
  const handleCategoryChange = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    setSelectedCategoryId(categoryId);
    setSelectedCategoryName(category?.name || "");
  };

  // Primjena predloška na kategoriju
  const applyTemplateToCategory = async () => {
    if (!selectedCategoryId || !selectedTemplateId) {
      toast.error("Odaberite kategoriju i predložak");
      return;
    }

    try {
      setApplyingTemplate(true);
      const response = await fetch(`/api/categories/${selectedCategoryId}/apply-template`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ templateId: selectedTemplateId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Greška prilikom primjene predloška");
      }

      const result = await response.json();
      toast.success(`Predložak uspješno primijenjen. Dodano ${result.createdAttributes.length} atributa.`);
      
      // Resetiranje odabranog predloška
      setSelectedTemplateId("");
      
      // Prebacivanje na tab atributa
      setActiveTab("attributes");
    } catch (error) {
      console.error("Error applying template:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Greška prilikom primjene predloška"
      );
    } finally {
      setApplyingTemplate(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-br from-white via-gray-50/80 to-blue-50/60 backdrop-blur-sm rounded-2xl p-6 border border-amber/20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-sm rounded-xl border border-amber/30">
            <svg className="w-8 h-8 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-amber via-orange to-brown bg-clip-text text-transparent">
              Upravljanje atributima
            </h1>
            <p className="text-gray-600 mt-1">
              Kreirajte i upravljajte predlošcima, grupama i atributima kategorija
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm rounded-2xl border border-amber/20 shadow-sm overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="bg-gradient-to-r from-white/90 to-gray-50/90 border-b border-amber/20 px-6 py-4">
            <TabsList className="grid w-full grid-cols-3 bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-sm border border-amber/30 rounded-xl">
              <TabsTrigger 
                value="templates" 
                className="text-gray-700 hover:text-gray-900 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber data-[state=active]:via-orange data-[state=active]:to-brown data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg transition-all duration-200"
              >
                Predlošci atributa
              </TabsTrigger>
              <TabsTrigger 
                value="groups"
                className="text-gray-700 hover:text-gray-900 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber data-[state=active]:via-orange data-[state=active]:to-brown data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg transition-all duration-200"
              >
                Grupe atributa
              </TabsTrigger>
              <TabsTrigger 
                value="attributes"
                className="text-gray-700 hover:text-gray-900 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber data-[state=active]:via-orange data-[state=active]:to-brown data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg transition-all duration-200"
              >
                Atributi kategorija
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="templates" className="p-6">
            <div className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm rounded-2xl border border-amber/20 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-white/90 to-gray-50/90 border-b border-amber/20 px-6 py-4">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  Predlošci atributa
                </h2>
                <p className="text-gray-600 mt-1">
                  Kreirajte i upravljajte predlošcima atributa koji se mogu primijeniti na kategorije.
                </p>
              </div>
              <div className="p-6">
                <AttributeTemplateManager />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="groups" className="p-6">
            <div className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm rounded-2xl border border-amber/20 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-white/90 to-gray-50/90 border-b border-amber/20 px-6 py-4">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Grupe atributa
                </h2>
                <p className="text-gray-600 mt-1">
                  Organizirajte atribute u grupe za bolju preglednost i upravljanje.
                </p>
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
                      <p className="text-gray-600 font-medium">Učitavanje kategorija...</p>
                    </div>
                  </div>
                ) : categories.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-3 bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-sm rounded-xl border border-amber/30">
                        <svg className="w-8 h-8 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      </div>
                      <p className="text-gray-600 font-medium">Nema dostupnih kategorija</p>
                      <p className="text-gray-500 text-sm">Prvo kreirajte kategorije</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center space-x-4">
                      <div className="w-64">
                        <Select
                          value={selectedCategoryId}
                          onValueChange={handleCategoryChange}
                        >
                          <SelectTrigger className="bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900">
                            <SelectValue placeholder="Odaberite kategoriju" />
                          </SelectTrigger>
                          <SelectContent className="bg-white/95 backdrop-blur-sm border-gray-200 rounded-xl shadow-xl">
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.id} className="text-gray-700 hover:bg-gray-100">
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {selectedCategoryId && (
                      <AttributeGroupManager
                        categoryId={selectedCategoryId}
                        categoryName={selectedCategoryName}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="attributes" className="p-6">
            <div className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm rounded-2xl border border-amber/20 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-white/90 to-gray-50/90 border-b border-amber/20 px-6 py-4">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Atributi kategorija
                </h2>
                <p className="text-gray-600 mt-1">
                  Upravljajte atributima za pojedine kategorije.
                </p>
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
                      <p className="text-gray-600 font-medium">Učitavanje kategorija...</p>
                    </div>
                  </div>
                ) : categories.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-3 bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-sm rounded-xl border border-amber/30">
                        <svg className="w-8 h-8 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      </div>
                      <p className="text-gray-600 font-medium">Nema dostupnih kategorija</p>
                      <p className="text-gray-500 text-sm">Prvo kreirajte kategorije</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex flex-col space-y-4 md:flex-row md:items-center md:space-x-4 md:space-y-0">
                      <div className="w-full md:w-64">
                        <Select
                          value={selectedCategoryId}
                          onValueChange={handleCategoryChange}
                        >
                          <SelectTrigger className="bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900">
                            <SelectValue placeholder="Odaberite kategoriju" />
                          </SelectTrigger>
                          <SelectContent className="bg-white/95 backdrop-blur-sm border-gray-200 rounded-xl shadow-xl">
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.id} className="text-gray-700 hover:bg-gray-100">
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center space-x-2">
                        <div className="w-full md:w-64">
                          <Select
                            value={selectedTemplateId}
                            onValueChange={setSelectedTemplateId}
                            disabled={!selectedCategoryId || templates.length === 0}
                          >
                            <SelectTrigger className="bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900">
                              <SelectValue placeholder="Odaberite predložak" />
                            </SelectTrigger>
                            <SelectContent className="bg-white/95 backdrop-blur-sm border-gray-200 rounded-xl shadow-xl">
                              {templates.map((template) => (
                                <SelectItem key={template.id} value={template.id} className="text-gray-700 hover:bg-gray-100">
                                  {template.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button 
                          onClick={applyTemplateToCategory}
                          disabled={!selectedCategoryId || !selectedTemplateId || applyingTemplate}
                          className="bg-gradient-to-r from-amber via-orange to-brown text-white hover:from-amber/90 hover:via-orange/90 hover:to-brown/90 shadow-lg hover:scale-105 transition-all duration-200 rounded-xl"
                        >
                          {applyingTemplate ? "Primjenjujem..." : "Primijeni predložak"}
                        </Button>
                      </div>
                    </div>

                    {selectedCategoryId && (
                      <CategoryAttributeManager
                        categoryId={selectedCategoryId}
                        categoryName={selectedCategoryName}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
