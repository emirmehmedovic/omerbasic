"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VehicleBrand } from "@/types/vehicle";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PlusCircle, Trash2, Edit, ChevronRight, Settings } from "lucide-react";
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

  // Filtriranje marki po tipu vozila
  const passengerBrands = vehicleBrands.filter(brand => brand.type === "PASSENGER");
  const commercialBrands = vehicleBrands.filter(brand => brand.type === "COMMERCIAL");

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
      <Tabs defaultValue="passenger" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="passenger">Putnička vozila</TabsTrigger>
          <TabsTrigger value="commercial">Teretna vozila</TabsTrigger>
          <TabsTrigger value="add">Dodaj marku</TabsTrigger>
        </TabsList>
        
        <TabsContent value="passenger" className="space-y-4">
          <h2 className="text-xl font-semibold">Putnička vozila</h2>
          {passengerBrands.length === 0 ? (
            <p className="text-gray-500">Nema dodanih marki putničkih vozila</p>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {passengerBrands.map((brand) => (
                <AccordionItem key={brand.id} value={brand.id}>
                  <AccordionTrigger className="text-lg font-medium">
                    {brand.name}
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pl-4 space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-md font-medium">Modeli</h3>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedBrandId(brand.id);
                            setIsAddingModel(true);
                          }}
                        >
                          <PlusCircle className="h-4 w-4 mr-2" />
                          Dodaj model
                        </Button>
                      </div>
                      
                      {brand.models.length === 0 ? (
                        <p className="text-gray-500">Nema dodanih modela</p>
                      ) : (
                        <Accordion type="single" collapsible className="w-full">
                          {brand.models.map((model) => (
                            <AccordionItem key={model.id} value={model.id}>
                              <AccordionTrigger className="text-md">
                                {model.name}
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className="pl-4 space-y-4">
                                  <div className="flex justify-between items-center">
                                    <h4 className="text-sm font-medium">Generacije</h4>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedBrandId(brand.id);
                                        setSelectedModelId(model.id);
                                        setIsAddingGeneration(true);
                                      }}
                                    >
                                      <PlusCircle className="h-4 w-4 mr-2" />
                                      Dodaj generaciju
                                    </Button>
                                  </div>
                                  
                                  {model.generations.length === 0 ? (
                                    <p className="text-gray-500">Nema dodanih generacija</p>
                                  ) : (
                                    <ul className="space-y-2">
                                      {model.generations.map((generation) => (
                                    <li key={generation.id} className="flex items-center justify-between p-2 border rounded-md">
                                    <div className="flex items-center">
                                      <ChevronRight className="h-4 w-4 mr-2 text-gray-400" />
                                      <span>{generation.name}</span>
                                      {generation.period && <span className="ml-2 text-gray-500">({generation.period})</span>}
                                    </div>
                                    <EngineButton generationId={generation.id} />
                                  </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </TabsContent>
        
        <TabsContent value="commercial" className="space-y-4">
          <h2 className="text-xl font-semibold">Teretna vozila</h2>
          {commercialBrands.length === 0 ? (
            <p className="text-gray-500">Nema dodanih marki teretnih vozila</p>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {commercialBrands.map((brand) => (
                <AccordionItem key={brand.id} value={brand.id}>
                  <AccordionTrigger className="text-lg font-medium">
                    {brand.name}
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pl-4 space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-md font-medium">Modeli</h3>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedBrandId(brand.id);
                            setIsAddingModel(true);
                          }}
                        >
                          <PlusCircle className="h-4 w-4 mr-2" />
                          Dodaj model
                        </Button>
                      </div>
                      
                      {brand.models.length === 0 ? (
                        <p className="text-gray-500">Nema dodanih modela</p>
                      ) : (
                        <Accordion type="single" collapsible className="w-full">
                          {brand.models.map((model) => (
                            <AccordionItem key={model.id} value={model.id}>
                              <AccordionTrigger className="text-md">
                                {model.name}
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className="pl-4 space-y-4">
                                  <div className="flex justify-between items-center">
                                    <h4 className="text-sm font-medium">Generacije</h4>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedBrandId(brand.id);
                                        setSelectedModelId(model.id);
                                        setIsAddingGeneration(true);
                                      }}
                                    >
                                      <PlusCircle className="h-4 w-4 mr-2" />
                                      Dodaj generaciju
                                    </Button>
                                  </div>
                                  
                                  {model.generations.length === 0 ? (
                                    <p className="text-gray-500">Nema dodanih generacija</p>
                                  ) : (
                                    <ul className="space-y-2">
                                      {model.generations.map((generation) => (
                                      <li key={generation.id} className="flex items-center justify-between p-2 border rounded-md">
                                      <div className="flex items-center">
                                        <ChevronRight className="h-4 w-4 mr-2 text-gray-400" />
                                        <span>{generation.name}</span>
                                        {generation.period && <span className="ml-2 text-gray-500">({generation.period})</span>}
                                      </div>
                                      <EngineButton generationId={generation.id} />
                                    </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </TabsContent>
        
        <TabsContent value="add">
          <Card>
            <CardHeader>
              <CardTitle>Dodaj novu marku vozila</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Naziv marke</label>
                  <Input
                    placeholder="Unesite naziv marke"
                    value={newBrandName}
                    onChange={(e) => setNewBrandName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tip vozila</label>
                  <Select
                    value={newBrandType}
                    onValueChange={(value: "PASSENGER" | "COMMERCIAL") => setNewBrandType(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Odaberite tip vozila" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PASSENGER">Putničko vozilo</SelectItem>
                      <SelectItem value="COMMERCIAL">Teretno vozilo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAddBrand}>Dodaj marku</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal za upravljanje motorima */}
      {isManagingEngines && selectedGenerationId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Upravljanje motorima</h2>
              <Button variant="ghost" onClick={() => setIsManagingEngines(false)}>×</Button>
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
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Dodaj novi model</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Naziv modela</label>
                <Input
                  placeholder="Unesite naziv modela"
                  value={newModelName}
                  onChange={(e) => setNewModelName(e.target.value)}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsAddingModel(false)}>
                  Odustani
                </Button>
                <Button onClick={handleAddModel}>Dodaj model</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal za dodavanje generacije */}
      {isAddingGeneration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Dodaj novu generaciju</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Naziv generacije</label>
                <Input
                  placeholder="Unesite naziv generacije"
                  value={newGenerationName}
                  onChange={(e) => setNewGenerationName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Period (opciono)</label>
                <Input
                  placeholder="npr. 2015-2020"
                  value={newGenerationPeriod}
                  onChange={(e) => setNewGenerationPeriod(e.target.value)}
                />
              </div>
              
              <div className="mt-4 p-3 bg-blue-50 rounded-md">
                <p className="text-sm text-blue-600">Podatke o motorima možete dodati nakon što kreirate generaciju vozila.</p>
              </div>
              
              <div className="flex justify-end space-x-2 pt-2">
                <Button variant="outline" onClick={() => setIsAddingGeneration(false)}>
                  Odustani
                </Button>
                <Button onClick={handleAddGeneration}>Dodaj generaciju</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
