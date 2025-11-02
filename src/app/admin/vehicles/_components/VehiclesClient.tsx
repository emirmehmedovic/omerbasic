"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VehicleBrand } from "@/types/vehicle";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PlusCircle, Trash2, Edit, ChevronRight, Settings, Search } from "lucide-react";
import { EngineManager } from "./EngineManager";
import { EngineButton } from "./EngineButton";
interface VehiclesClientProps {
  initialVehicleBrands: VehicleBrand[];
}

export const VehiclesClient = ({ initialVehicleBrands }: VehiclesClientProps) => {
  const router = useRouter();
  const [vehicleBrands, setVehicleBrands] = useState<VehicleBrand[]>(initialVehicleBrands);
  const [isAddingBrand, setIsAddingBrand] = useState(false);
  const [isAddingModel, setIsAddingModel] = useState(false);
  const [isAddingGeneration, setIsAddingGeneration] = useState(false);
  const [isManagingEngines, setIsManagingEngines] = useState(false);
  const [selectedGenerationId, setSelectedGenerationId] = useState<string | null>(null);
  const [selectedGenerationName, setSelectedGenerationName] = useState<string>("");
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [newBrandName, setNewBrandName] = useState("");
  const [newBrandType, setNewBrandType] = useState<"PASSENGER" | "COMMERCIAL">("PASSENGER");
  const [newModelName, setNewModelName] = useState("");
  const [newGenerationName, setNewGenerationName] = useState("");
  const [newGenerationPeriod, setNewGenerationPeriod] = useState("");
  // Stanje za motore je uklonjeno jer se sada upravlja kroz VehicleEngine model
  const [activeTab, setActiveTab] = useState("passenger");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedBrands, setExpandedBrands] = useState<Set<string>>(new Set());
  const [expandedModels, setExpandedModels] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [selectedGenByModel, setSelectedGenByModel] = useState<Record<string, string>>({});

  // Filtriranje marki po tipu vozila i pretrazi
  const filteredPassengerBrands = vehicleBrands.filter(brand => 
    brand.type === "PASSENGER" && 
    brand.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredCommercialBrands = vehicleBrands.filter(brand => 
    brand.type === "COMMERCIAL" && 
    brand.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Paginacija za filtrirane rezultate
  const totalPassengerPages = Math.ceil(filteredPassengerBrands.length / itemsPerPage);
  const totalCommercialPages = Math.ceil(filteredCommercialBrands.length / itemsPerPage);
  
  const paginatedPassengerBrands = filteredPassengerBrands.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  const paginatedCommercialBrands = filteredCommercialBrands.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset paginacije kada se promijeni pretraga
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Reset paginacije kada se promijeni tab
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  const handleAddBrand = async () => {
    if (!newBrandName.trim()) {
      toast.error("Naziv marke je obavezan");
      return;
    }

    try {
      const response = await fetch("/api/vehicle-brands", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newBrandName,
          type: newBrandType,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Greška prilikom dodavanja marke vozila");
      }

      const newBrand = await response.json();
      setVehicleBrands([...vehicleBrands, { ...newBrand, models: [] }]);
      setNewBrandName("");
      setIsAddingBrand(false);
      toast.success("Marka vozila uspješno dodana");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Greška prilikom dodavanja marke vozila");
    }
  };

  const handleDeleteBrand = async (brandId: string) => {
    if (!confirm("Jeste li sigurni da želite obrisati ovu marku i sve povezane modele i motore?")) {
      return;
    }

    try {
      const response = await fetch(`/api/vehicle-brands/${brandId}`, { method: "DELETE" });
      if (!response.ok && response.status !== 204) {
        const error = await response.json().catch(() => ({} as any));
        throw new Error((error as any).error || "Greška prilikom brisanja marke vozila");
      }

      setVehicleBrands(prev => prev.filter(b => b.id !== brandId));
      toast.success("Marka vozila uspješno obrisana");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Greška prilikom brisanja marke vozila");
    }
  };

  const handleAddModel = async () => {
    if (!selectedBrandId) {
      toast.error("Marka vozila nije odabrana");
      return;
    }

    if (!newModelName.trim()) {
      toast.error("Naziv modela je obavezan");
      return;
    }

    try {
      const response = await fetch(`/api/vehicle-brands/${selectedBrandId}/models`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newModelName,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Greška prilikom dodavanja modela vozila");
      }

      const newModel = await response.json();
      
      // Ažuriranje stanja
      const updatedBrands = vehicleBrands.map(brand => {
        if (brand.id === selectedBrandId) {
          return {
            ...brand,
            models: [...brand.models, { ...newModel, generations: [] }]
          };
        }
        return brand;
      });
      
      setVehicleBrands(updatedBrands);
      setNewModelName("");
      setIsAddingModel(false);
      toast.success("Model vozila uspješno dodan");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Greška prilikom dodavanja modela vozila");
    }
  };

  const handleAddGeneration = async () => {
    if (!selectedBrandId || !selectedModelId) {
      toast.error("Marka i model vozila nisu odabrani");
      return;
    }

    if (!newGenerationName.trim()) {
      toast.error("Naziv generacije je obavezan");
      return;
    }

    try {
      const response = await fetch(`/api/vehicle-brands/${selectedBrandId}/models/${selectedModelId}/generations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newGenerationName,
          period: newGenerationPeriod || null,
          // Podaci o motoru se sada dodaju kroz VehicleEngine model
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Greška prilikom dodavanja generacije vozila");
      }

      const newGeneration = await response.json();
      
      // Ažuriranje stanja
      const updatedBrands = vehicleBrands.map(brand => {
        if (brand.id === selectedBrandId) {
          return {
            ...brand,
            models: brand.models.map(model => {
              if (model.id === selectedModelId) {
                return {
                  ...model,
                  generations: [...model.generations, newGeneration]
                };
              }
              return model;
            })
          };
        }
        return brand;
      });
      
      setVehicleBrands(updatedBrands);
      setNewGenerationName("");
      setNewGenerationPeriod("");
      // Resetiranje state varijabli za motore je uklonjeno jer se sada upravlja kroz VehicleEngine model
      setIsAddingGeneration(false);
      toast.success("Generacija vozila uspješno dodana");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Greška prilikom dodavanja generacije vozila");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-br from-white via-gray-50/80 to-blue-50/60 backdrop-blur-sm rounded-2xl p-6 border border-amber/20 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-sm rounded-lg border border-amber/30">
              <svg className="w-6 h-6 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-amber to-orange bg-clip-text text-transparent">
                Upravljanje vozilima
              </h1>
              <p className="text-gray-600 mt-1">Upravljajte markama, modelima i generacijama vozila</p>
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <Input
              type="text"
              placeholder="Pretražite marke vozila..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-80 bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500"
            />
          </div>
        </div>
      </div>

      <Tabs defaultValue="passenger" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4 bg-gradient-to-r from-amber/10 to-orange/10 border border-amber/20">
          <TabsTrigger value="passenger" className="text-gray-700 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber data-[state=active]:to-orange data-[state=active]:text-white">Putnička vozila</TabsTrigger>
          <TabsTrigger value="commercial" className="text-gray-700 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber data-[state=active]:to-orange data-[state=active]:text-white">Teretna vozila</TabsTrigger>
          <TabsTrigger value="add" className="text-gray-700 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber data-[state=active]:to-orange data-[state=active]:text-white">Dodaj marku</TabsTrigger>
        </TabsList>
        
        <TabsContent value="passenger" className="space-y-6">
                  {/* Search Results Info */}
        {searchTerm && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-blue-800 text-sm">
              {filteredPassengerBrands.length === 0 
                ? `Nema pronađenih marki putničkih vozila za "${searchTerm}"`
                : `Pronađeno ${filteredPassengerBrands.length} mark${filteredPassengerBrands.length === 1 ? 'a' : 'i'} putničkih vozila za "${searchTerm}" (prikazano ${paginatedPassengerBrands.length} na stranici ${currentPage} od ${totalPassengerPages})`
              }
            </p>
          </div>
        )}
          
          {filteredPassengerBrands.length === 0 ? (
            <div className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm rounded-2xl border border-amber/20 shadow-sm overflow-hidden">
              <div className="p-8 text-center">
                <div className="mx-auto w-16 h-16 bg-gradient-to-r from-amber/10 to-orange/10 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Nema dodanih marki putničkih vozila</h3>
                <p className="text-gray-600">Dodajte prvu marku vozila da počnete</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {paginatedPassengerBrands.map((brand) => (
                <div key={brand.id} className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm rounded-xl border border-amber/20 shadow-sm overflow-hidden hover:shadow-md transition-all duration-200">
                  {/* Brand Header */}
                  <div className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-sm rounded-lg border border-amber/30">
                          <svg className="w-5 h-5 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-gray-900">{brand.name}</h3>
                          <span className="text-sm text-gray-600 bg-white/80 px-3 py-1 rounded-full border border-amber/20">
                            {brand.models.length} model{brand.models.length !== 1 ? 'a' : ''}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newExpanded = new Set(expandedBrands);
                            if (newExpanded.has(brand.id)) {
                              newExpanded.delete(brand.id);
                            } else {
                              newExpanded.add(brand.id);
                            }
                            setExpandedBrands(newExpanded);
                          }}
                          className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm text-gray-700 hover:from-white hover:to-gray-50 border-amber/30 hover:border-amber/50 rounded-lg transition-all duration-200 shadow-sm"
                        >
                          <svg 
                            className={`w-4 h-4 transition-transform duration-200 ${expandedBrands.has(brand.id) ? 'rotate-180' : ''}`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedBrandId(brand.id);
                            setIsAddingModel(true);
                          }}
                          className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm text-gray-700 hover:from-white hover:to-gray-50 border-amber/30 hover:border-amber/50 rounded-lg transition-all duration-200 shadow-sm"
                        >
                          <PlusCircle className="h-4 w-4 mr-2" />
                          Dodaj model
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteBrand(brand.id)}
                          className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm text-red-600 hover:text-red-700 border-red-200 hover:border-red-300 rounded-lg transition-all duration-200 shadow-sm"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Obriši marku
                        </Button>
                      </div>
                    </div>
                      </div>
                      
                  {/* Models List - Collapsible */}
                  {expandedBrands.has(brand.id) && (
                    <div className="border-t border-amber/20 bg-gradient-to-r from-amber/5 to-orange/5">
                      <div className="p-6">
                      {brand.models.length === 0 ? (
                          <div className="text-center py-4">
                            <p className="text-gray-500 text-sm">Nema dodanih modela</p>
                          </div>
                      ) : (
                          <div className="space-y-4">
                          {brand.models.map((model) => (
                              <div key={model.id} className="bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-sm border border-amber/20 rounded-xl hover:border-amber/40 transition-all duration-200">
                                {/* Model Header */}
                                <div className="bg-gradient-to-r from-amber/5 to-orange/5 border-b border-amber/20 px-4 py-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          const next = new Set(expandedModels);
                                          if (next.has(model.id)) next.delete(model.id); else next.add(model.id);
                                          setExpandedModels(next);
                                        }}
                                        className="bg-white/70 border-amber/30 hover:border-amber/50 rounded-md p-1"
                                      >
                                        <svg
                                          className={`w-4 h-4 transition-transform duration-200 ${expandedModels.has(model.id) ? 'rotate-180' : ''}`}
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                      </Button>
                                      <h4 className="font-medium text-gray-900">{model.name}</h4>
                                    </div>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedBrandId(brand.id);
                                        setSelectedModelId(model.id);
                                        setIsAddingGeneration(true);
                                      }}
                                      className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm text-gray-700 hover:from-white hover:to-gray-50 border-amber/30 hover:border-amber/50 rounded-lg transition-all duration-200 shadow-sm text-xs"
                                    >
                                      <PlusCircle className="h-3 w-3 mr-1" />
                                      Dodaj generaciju
                                    </Button>
                                    {model.generations.length > 0 && (
                                      <div className="flex items-center gap-2">
                                        <Select
                                          value={selectedGenByModel[model.id] || model.generations[0]?.id}
                                          onValueChange={(val) => setSelectedGenByModel(prev => ({ ...prev, [model.id]: val }))}
                                        >
                                          <SelectTrigger className="h-8 w-48">
                                            <SelectValue placeholder="Odaberite generaciju" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {model.generations.map((g) => (
                                              <SelectItem key={g.id} value={g.id}>{g.name}{g.period ? ` (${g.period})` : ''}</SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => {
                                            const targetId = selectedGenByModel[model.id] || model.generations[0]?.id;
                                            if (targetId) router.push(`/admin/vehicles/link?generationId=${targetId}`);
                                          }}
                                          className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm text-gray-700 hover:from-white hover:to-gray-50 border-amber/30 hover:border-amber/50 rounded-lg transition-all duration-200 shadow-sm text-xs"
                                        >
                                          Poveži proizvode
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                  </div>
                                  
                                {/* Generations List */}
                                {expandedModels.has(model.id) && (
                                  <div className="p-4">
                                    {model.generations.length === 0 ? (
                                      <p className="text-gray-500 text-sm text-center py-2">Nema dodanih generacija</p>
                                    ) : (
                                      <div className="space-y-2">
                                        {model.generations.map((generation) => (
                                          <div key={generation.id} className="flex items-center justify-between p-3 bg-gradient-to-r from-white/60 to-gray-50/60 backdrop-blur-sm border border-amber/10 rounded-lg hover:border-amber/30 transition-all duration-200">
                                            <div className="flex items-center gap-2">
                                              <ChevronRight className="h-4 w-4 text-amber/70" />
                                              <span className="text-sm font-medium text-gray-900">{generation.name}</span>
                                              {generation.period && (
                                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                                  {generation.period}
                                                </span>
                                              )}
                                    </div>
                                    <EngineButton generationId={generation.id} />
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                              </div>
                          ))}
                          </div>
                      )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Paginacija */}
          {totalPassengerPages > 1 && (
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
                {Array.from({ length: totalPassengerPages }, (_, i) => i + 1).map((page) => (
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
                onClick={() => setCurrentPage(Math.min(totalPassengerPages, currentPage + 1))}
                disabled={currentPage === totalPassengerPages}
                className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm text-gray-700 hover:from-white hover:to-gray-50 border-amber/30 hover:border-amber/50 rounded-lg transition-all duration-200 shadow-sm"
              >
                Sljedeća
              </Button>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="commercial" className="space-y-6">
                  {/* Search Results Info */}
        {searchTerm && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-blue-800 text-sm">
              {filteredCommercialBrands.length === 0 
                ? `Nema pronađenih marki teretnih vozila za "${searchTerm}"`
                : `Pronađeno ${filteredCommercialBrands.length} mark${filteredCommercialBrands.length === 1 ? 'a' : 'i'} teretnih vozila za "${searchTerm}" (prikazano ${paginatedCommercialBrands.length} na stranici ${currentPage} od ${totalCommercialPages})`
              }
            </p>
          </div>
        )}
          
          {filteredCommercialBrands.length === 0 ? (
            <div className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm rounded-2xl border border-amber/20 shadow-sm overflow-hidden">
              <div className="p-8 text-center">
                <div className="mx-auto w-16 h-16 bg-gradient-to-r from-amber/10 to-orange/10 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Nema dodanih marki teretnih vozila</h3>
                <p className="text-gray-600">Dodajte prvu marku teretnog vozila da počnete</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {paginatedCommercialBrands.map((brand) => (
                <div key={brand.id} className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm rounded-xl border border-amber/20 shadow-sm overflow-hidden hover:shadow-md transition-all duration-200">
                  {/* Brand Header */}
                  <div className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-sm rounded-lg border border-amber/30">
                          <svg className="w-5 h-5 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-gray-900">{brand.name}</h3>
                          <span className="text-sm text-gray-600 bg-white/80 px-3 py-1 rounded-full border border-amber/20">
                            {brand.models.length} model{brand.models.length !== 1 ? 'a' : ''}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newExpanded = new Set(expandedBrands);
                            if (newExpanded.has(brand.id)) {
                              newExpanded.delete(brand.id);
                            } else {
                              newExpanded.add(brand.id);
                            }
                            setExpandedBrands(newExpanded);
                          }}
                          className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm text-gray-700 hover:from-white hover:to-gray-50 border-amber/30 hover:border-amber/50 rounded-lg transition-all duration-200 shadow-sm"
                        >
                          <svg 
                            className={`w-4 h-4 transition-transform duration-200 ${expandedBrands.has(brand.id) ? 'rotate-180' : ''}`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedBrandId(brand.id);
                            setIsAddingModel(true);
                          }}
                          className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm text-gray-700 hover:from-white hover:to-gray-50 border-amber/30 hover:border-amber/50 rounded-lg transition-all duration-200 shadow-sm"
                        >
                          <PlusCircle className="h-4 w-4 mr-2" />
                          Dodaj model
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteBrand(brand.id)}
                          className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm text-red-600 hover:text-red-700 border-red-200 hover:border-red-300 rounded-lg transition-all duration-200 shadow-sm"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Obriši marku
                        </Button>
                      </div>
                    </div>
                      </div>
                      
                  {/* Models List - Collapsible */}
                  {expandedBrands.has(brand.id) && (
                    <div className="border-t border-amber/20 bg-gradient-to-r from-amber/5 to-orange/5">
                      <div className="p-6">
                      {brand.models.length === 0 ? (
                          <div className="text-center py-4">
                            <p className="text-gray-500 text-sm">Nema dodanih modela</p>
                          </div>
                      ) : (
                          <div className="space-y-4">
                          {brand.models.map((model) => (
                              <div key={model.id} className="bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-sm border border-amber/20 rounded-xl hover:border-amber/40 transition-all duration-200">
                                {/* Model Header */}
                                <div className="bg-gradient-to-r from-amber/5 to-orange/5 border-b border-amber/20 px-4 py-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          const next = new Set(expandedModels);
                                          if (next.has(model.id)) next.delete(model.id); else next.add(model.id);
                                          setExpandedModels(next);
                                        }}
                                        className="bg-white/70 border-amber/30 hover:border-amber/50 rounded-md p-1"
                                      >
                                        <svg
                                          className={`w-4 h-4 transition-transform duration-200 ${expandedModels.has(model.id) ? 'rotate-180' : ''}`}
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                      </Button>
                                      <h4 className="font-medium text-gray-900">{model.name}</h4>
                                    </div>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedBrandId(brand.id);
                                        setSelectedModelId(model.id);
                                        setIsAddingGeneration(true);
                                      }}
                                      className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm text-gray-700 hover:from-white hover:to-gray-50 border-amber/30 hover:border-amber/50 rounded-lg transition-all duration-200 shadow-sm text-xs"
                                    >
                                      <PlusCircle className="h-3 w-3 mr-1" />
                                      Dodaj generaciju
                                    </Button>
                                  </div>
                                  </div>
                                  
                                {/* Generations List */}
                                {expandedModels.has(model.id) && (
                                  <div className="p-4">
                                    {model.generations.length === 0 ? (
                                      <p className="text-gray-500 text-sm text-center py-2">Nema dodanih generacija</p>
                                    ) : (
                                      <div className="space-y-2">
                                        {model.generations.map((generation) => (
                                          <div key={generation.id} className="flex items-center justify-between p-3 bg-gradient-to-r from-white/60 to-gray-50/60 backdrop-blur-sm border border-amber/10 rounded-lg hover:border-amber/30 transition-all duration-200">
                                              <div className="flex items-center gap-2">
                                                <ChevronRight className="h-4 w-4 text-amber/70" />
                                                <span className="text-sm font-medium text-gray-900">{generation.name}</span>
                                                {generation.period && (
                                                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                                    {generation.period}
                                                  </span>
                                                )}
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <Button
                                                  variant="outline"
                                                  size="sm"
                                                  className="bg-white/70 border-amber/30 hover:border-amber/50 rounded-md"
                                                  onClick={() => router.push(`/admin/vehicles/link?generationId=${generation.id}`)}
                                                >
                                                  Poveži proizvode
                                                </Button>
                                                <EngineButton generationId={generation.id} />
                                              </div>
                                            </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                          ))}
                          </div>
                      )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Paginacija */}
          {totalCommercialPages > 1 && (
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
                {Array.from({ length: totalCommercialPages }, (_, i) => i + 1).map((page) => (
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
                onClick={() => setCurrentPage(Math.min(totalCommercialPages, currentPage + 1))}
                disabled={currentPage === totalCommercialPages}
                className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm text-gray-700 hover:from-white hover:to-gray-50 border-amber/30 hover:border-amber/50 rounded-lg transition-all duration-200 shadow-sm"
              >
                Sljedeća
              </Button>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="add">
          <div className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm rounded-2xl border border-amber/20 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-white/90 to-gray-50/90 border-b border-amber/20 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-sm rounded-lg border border-amber/30">
                  <svg className="w-5 h-5 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Dodaj novu marku vozila</h2>
                  <p className="text-gray-600 mt-1">Kreirajte novu marku vozila s osnovnim podacima</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-gray-700 font-medium">Naziv marke</label>
                  <Input
                    placeholder="Unesite naziv marke"
                    value={newBrandName}
                    onChange={(e) => setNewBrandName(e.target.value)}
                    className="bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500 px-4 py-2"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-gray-700 font-medium">Tip vozila</label>
                  <Select
                    value={newBrandType}
                    onValueChange={(value: "PASSENGER" | "COMMERCIAL") => setNewBrandType(value)}
                  >
                    <SelectTrigger className="bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900">
                      <SelectValue placeholder="Odaberite tip vozila" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PASSENGER">Putničko vozilo</SelectItem>
                      <SelectItem value="COMMERCIAL">Teretno vozilo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end pt-4">
                  <Button 
                    onClick={handleAddBrand}
                    className="bg-gradient-to-r from-amber via-orange to-brown text-white hover:from-amber/90 hover:via-orange/90 hover:to-brown/90 shadow-lg hover:scale-105 transition-all duration-200 rounded-xl px-4 py-2 font-semibold"
                  >
                    Dodaj marku
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal za upravljanje motorima */}
      {isManagingEngines && selectedGenerationId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="w-full max-w-4xl bg-gradient-to-br from-white via-gray-50/80 to-blue-50/60 backdrop-blur-sm border border-amber/20 shadow-xl rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-sm rounded-lg border border-amber/30">
                  <svg className="w-5 h-5 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Upravljanje motorima</h2>
                  <p className="text-gray-600 text-sm">Upravljajte motorima za {selectedGenerationName}</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                onClick={() => setIsManagingEngines(false)}
                className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg p-2"
              >
                ×
              </Button>
            </div>
            <EngineManager 
              brandId={selectedBrandId!}
              modelId={selectedModelId!}
              generationId={selectedGenerationId}
              generationName={selectedGenerationName}
            />
          </div>
        </div>
      )}

      {/* Modal za dodavanje modela */}
      {isAddingModel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="w-full max-w-md bg-gradient-to-br from-white via-gray-50/80 to-blue-50/60 backdrop-blur-sm border border-amber/20 shadow-xl rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-sm rounded-lg border border-amber/30">
                <svg className="w-5 h-5 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Dodaj novi model</h2>
                <p className="text-gray-600 text-sm">Kreirajte novi model za odabranu marku</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-gray-700 font-medium">Naziv modela</label>
                <Input
                  placeholder="Unesite naziv modela"
                  value={newModelName}
                  onChange={(e) => setNewModelName(e.target.value)}
                  className="bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500 px-4 py-2"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setIsAddingModel(false)}
                  className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm text-gray-700 hover:from-white hover:to-gray-50 border-amber/30 hover:border-amber/50 rounded-xl transition-all duration-200 shadow-sm px-4 py-2 font-semibold"
                >
                  Odustani
                </Button>
                <Button 
                  onClick={handleAddModel}
                  className="bg-gradient-to-r from-amber via-orange to-brown text-white hover:from-amber/90 hover:via-orange/90 hover:to-brown/90 shadow-lg hover:scale-105 transition-all duration-200 rounded-xl px-4 py-2 font-semibold"
                >
                  Dodaj model
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal za dodavanje generacije */}
      {isAddingGeneration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="w-full max-w-md bg-gradient-to-br from-white via-gray-50/80 to-blue-50/60 backdrop-blur-sm border border-amber/20 shadow-xl rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-sm rounded-lg border border-amber/30">
                <svg className="w-5 h-5 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Dodaj novu generaciju</h2>
                <p className="text-gray-600 text-sm">Kreirajte novu generaciju za odabrani model</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-gray-700 font-medium">Naziv generacije</label>
                <Input
                  placeholder="Unesite naziv generacije"
                  value={newGenerationName}
                  onChange={(e) => setNewGenerationName(e.target.value)}
                  className="bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500 px-4 py-2"
                />
              </div>
              <div className="space-y-2">
                <label className="text-gray-700 font-medium">Period (opciono)</label>
                <Input
                  placeholder="npr. 2015-2020"
                  value={newGenerationPeriod}
                  onChange={(e) => setNewGenerationPeriod(e.target.value)}
                  className="bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500 px-4 py-2"
                />
              </div>
              
              <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                <p className="text-sm text-blue-700">Podatke o motorima možete dodati nakon što kreirate generaciju vozila.</p>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setIsAddingGeneration(false)}
                  className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm text-gray-700 hover:from-white hover:to-gray-50 border-amber/30 hover:border-amber/50 rounded-xl transition-all duration-200 shadow-sm px-4 py-2 font-semibold"
                >
                  Odustani
                </Button>
                <Button 
                  onClick={handleAddGeneration}
                  className="bg-gradient-to-r from-amber via-orange to-brown text-white hover:from-amber/90 hover:via-orange/90 hover:to-brown/90 shadow-lg hover:scale-105 transition-all duration-200 rounded-xl px-4 py-2 font-semibold"
                >
                  Dodaj generaciju
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
