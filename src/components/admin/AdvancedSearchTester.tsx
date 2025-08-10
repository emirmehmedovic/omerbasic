"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchParams } from "@/lib/types/search";

export default function AdvancedSearchTester() {
  const [searchParams, setSearchParams] = useState<Partial<SearchParams>>({
    query: "",
    fuzzy: false,
    page: 1,
    limit: 10
  });
  const [activeTab, setActiveTab] = useState("basic");
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleInputChange = (field: string, value: any) => {
    setSearchParams(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      // Kreiranje URL-a s parametrima pretrage
      const url = new URL("/api/products/search", window.location.origin);
      url.searchParams.append("mode", "advanced");
      
      if (searchParams.query) {
        url.searchParams.append("q", searchParams.query);
      }
      
      if (searchParams.fuzzy) {
        url.searchParams.append("fuzzy", "true");
      }
      
      if (searchParams.categoryId) {
        url.searchParams.append("categoryId", searchParams.categoryId);
      }
      
      if (searchParams.attributes && searchParams.attributes.length > 0) {
        const attributesParam = searchParams.attributes
          .map(attr => `${attr.name}:${attr.operator}:${attr.value}`)
          .join(",");
        url.searchParams.append("attributes", attributesParam);
      }
      
      if (searchParams.reference) {
        url.searchParams.append("reference", searchParams.reference);
        if (searchParams.referenceType) {
          url.searchParams.append("referenceType", searchParams.referenceType);
        }
      }
      
      url.searchParams.append("page", String(searchParams.page || 1));
      url.searchParams.append("limit", String(searchParams.limit || 10));
      
      // Izvršavanje API poziva
      const response = await fetch(url.toString());
      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error("Error performing advanced search:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Tester napredne pretrage</CardTitle>
          <CardDescription>
            Testirajte funkcionalnost napredne pretrage proizvoda
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="basic">Osnovna pretraga</TabsTrigger>
              <TabsTrigger value="attributes">Atributi</TabsTrigger>
              <TabsTrigger value="references">Reference</TabsTrigger>
              <TabsTrigger value="advanced">Napredno</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="query">Upit za pretragu</Label>
                    <Input
                      id="query"
                      value={searchParams.query || ""}
                      onChange={(e) => handleInputChange("query", e.target.value)}
                      placeholder="Unesite tekst za pretragu..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="categoryId">Kategorija</Label>
                    <Input
                      id="categoryId"
                      value={searchParams.categoryId || ""}
                      onChange={(e) => handleInputChange("categoryId", e.target.value)}
                      placeholder="ID kategorije..."
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="fuzzy"
                    checked={searchParams.fuzzy || false}
                    onCheckedChange={(checked) => handleInputChange("fuzzy", checked)}
                  />
                  <Label htmlFor="fuzzy">Fuzzy pretraga</Label>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="attributes">
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Naziv atributa</Label>
                    <Input
                      placeholder="npr. diameter"
                      onChange={(e) => handleInputChange("attributeName", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Operator</Label>
                    <Select onValueChange={(value) => handleInputChange("attributeOperator", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Odaberite operator" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="eq">Jednako (=)</SelectItem>
                        <SelectItem value="gt">Veće od (&gt;)</SelectItem>
                        <SelectItem value="lt">Manje od (&lt;)</SelectItem>
                        <SelectItem value="gte">Veće ili jednako (&gt;=)</SelectItem>
                        <SelectItem value="lte">Manje ili jednako (&lt;=)</SelectItem>
                        <SelectItem value="contains">Sadrži</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Vrijednost</Label>
                    <Input
                      placeholder="Vrijednost"
                      onChange={(e) => handleInputChange("attributeValue", e.target.value)}
                    />
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    const name = (searchParams as any).attributeName;
                    const operator = (searchParams as any).attributeOperator;
                    const value = (searchParams as any).attributeValue;
                    
                    if (name && operator && value) {
                      const attributes = searchParams.attributes || [];
                      setSearchParams(prev => ({
                        ...prev,
                        attributes: [...attributes, { name, operator, value }]
                      }));
                    }
                  }}
                >
                  Dodaj atribut
                </Button>
                
                {searchParams.attributes && searchParams.attributes.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">Dodani atributi:</h4>
                    <ul className="space-y-1">
                      {searchParams.attributes.map((attr, index) => (
                        <li key={index} className="flex items-center justify-between text-sm">
                          <span>
                            {attr.name} {attr.operator} {attr.value}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const attributes = [...(searchParams.attributes || [])];
                              attributes.splice(index, 1);
                              setSearchParams(prev => ({
                                ...prev,
                                attributes
                              }));
                            }}
                          >
                            Ukloni
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="references">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="reference">Broj reference</Label>
                    <Input
                      id="reference"
                      value={searchParams.reference || ""}
                      onChange={(e) => handleInputChange("reference", e.target.value)}
                      placeholder="Unesite broj reference..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="referenceType">Tip reference</Label>
                    <Select
                      value={searchParams.referenceType}
                      onValueChange={(value) => handleInputChange("referenceType", value)}
                    >
                      <SelectTrigger id="referenceType">
                        <SelectValue placeholder="Odaberite tip reference" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Sve reference</SelectItem>
                        <SelectItem value="oem">OEM broj</SelectItem>
                        <SelectItem value="original">Originalni</SelectItem>
                        <SelectItem value="replacement">Zamjenski</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="advanced">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="page">Stranica</Label>
                    <Input
                      id="page"
                      type="number"
                      min="1"
                      value={searchParams.page || 1}
                      onChange={(e) => handleInputChange("page", parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="limit">Broj rezultata po stranici</Label>
                    <Input
                      id="limit"
                      type="number"
                      min="1"
                      max="100"
                      value={searchParams.limit || 10}
                      onChange={(e) => handleInputChange("limit", parseInt(e.target.value))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sort">Sortiranje</Label>
                  <Input
                    id="sort"
                    placeholder="npr. price:desc"
                    value={(searchParams.sort?.field && searchParams.sort?.direction) 
                      ? `${searchParams.sort.field}:${searchParams.sort.direction}` 
                      : ""}
                    onChange={(e) => {
                      const [field, direction] = e.target.value.split(":");
                      if (field && (direction === "asc" || direction === "desc")) {
                        handleInputChange("sort", { field, direction });
                      } else {
                        handleInputChange("sort", undefined);
                      }
                    }}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSearch} disabled={loading}>
            {loading ? "Pretraživanje..." : "Pretraži"}
          </Button>
        </CardFooter>
      </Card>

      {results && (
        <Card>
          <CardHeader>
            <CardTitle>Rezultati pretrage</CardTitle>
            <CardDescription>
              Pronađeno {results.total} proizvoda (stranica {results.page} od {results.totalPages})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {results.items && results.items.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">ID</th>
                        <th className="text-left p-2">Naziv</th>
                        <th className="text-left p-2">Kataloški broj</th>
                        <th className="text-left p-2">OEM broj</th>
                        <th className="text-right p-2">Cijena</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.items.map((item: any) => (
                        <tr key={item.id} className="border-b">
                          <td className="p-2">{item.id}</td>
                          <td className="p-2">{item.name}</td>
                          <td className="p-2">{item.catalogNumber}</td>
                          <td className="p-2">{item.oemNumber}</td>
                          <td className="text-right p-2">{item.price.toFixed(2)} KM</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-4">Nema rezultata za zadane kriterije pretrage.</div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
