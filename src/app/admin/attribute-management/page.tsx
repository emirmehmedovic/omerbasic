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
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Upravljanje atributima</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="templates">Predlošci atributa</TabsTrigger>
          <TabsTrigger value="groups">Grupe atributa</TabsTrigger>
          <TabsTrigger value="attributes">Atributi kategorija</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Predlošci atributa</CardTitle>
              <CardDescription>
                Kreirajte i upravljajte predlošcima atributa koji se mogu primijeniti na kategorije.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AttributeTemplateManager />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="groups" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Grupe atributa</CardTitle>
              <CardDescription>
                Organizirajte atribute u grupe za bolju preglednost i upravljanje.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4">Učitavanje kategorija...</div>
              ) : categories.length === 0 ? (
                <div className="text-center py-4">
                  Nema dostupnih kategorija. Prvo kreirajte kategorije.
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-64">
                      <Select
                        value={selectedCategoryId}
                        onValueChange={handleCategoryChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Odaberite kategoriju" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attributes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Atributi kategorija</CardTitle>
              <CardDescription>
                Upravljajte atributima za pojedine kategorije.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4">Učitavanje kategorija...</div>
              ) : categories.length === 0 ? (
                <div className="text-center py-4">
                  Nema dostupnih kategorija. Prvo kreirajte kategorije.
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex flex-col space-y-4 md:flex-row md:items-center md:space-x-4 md:space-y-0">
                    <div className="w-full md:w-64">
                      <Select
                        value={selectedCategoryId}
                        onValueChange={handleCategoryChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Odaberite kategoriju" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
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
                          <SelectTrigger>
                            <SelectValue placeholder="Odaberite predložak" />
                          </SelectTrigger>
                          <SelectContent>
                            {templates.map((template) => (
                              <SelectItem key={template.id} value={template.id}>
                                {template.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button 
                        onClick={applyTemplateToCategory}
                        disabled={!selectedCategoryId || !selectedTemplateId || applyingTemplate}
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
