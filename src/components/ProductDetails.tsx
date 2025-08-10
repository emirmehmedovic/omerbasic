'use client';

import { useCart } from '@/context/CartContext';
import type { Category, Product, VehicleGeneration, VehicleEngine } from '@/generated/prisma/client';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Car, Info, Settings, Tag } from "lucide-react";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";

// Tip za fitment vozila
type VehicleFitment = {
  id: string;
  fitmentNotes: string | null;
  position: string | null;
  bodyStyles: string[];
  yearFrom: number | null;
  yearTo: number | null;
  isUniversal: boolean;
  generation: VehicleGeneration & {
    model: {
      id: string;
      name: string;
      brand: {
        id: string;
        name: string;
      };
    };
  };
  engine: (VehicleEngine | null);
};

// Tip za atribut proizvoda
type ProductAttributeWithValue = {
  id: string;
  value: string;
  attribute: {
    id: string;
    name: string;
    label: string;
    unit: string | null;
    categoryId: string;
  };
};

// Tip za cross-reference proizvoda
type ProductReference = {
  id: string;
  productId: string;
  referenceType: string;
  referenceNumber: string;
  manufacturer: string | null;
  notes: string | null;
  replacementId: string | null;
};

interface ProductDetailsProps {
  product: Product & { 
    category: Category | null; 
    originalPrice?: number;
    vehicleFitments?: VehicleFitment[];
    attributeValues?: ProductAttributeWithValue[];
    originalReferences?: ProductReference[];
    replacementFor?: ProductReference[];
  };
}

// Koristimo formatPrice iz utils.ts

export const ProductDetails = ({ product }: ProductDetailsProps) => {
  const { addToCart } = useCart();

  const handleAddToCart = () => {
    addToCart(product);
    toast.success(`${product.name} je dodan u korpu!`);
  };

  // Funkcija za formatiranje opisa motora
  const formatEngineDescription = (engine: VehicleEngine) => {
    const parts = [];
    
    if (engine.engineType) {
      parts.push(engine.engineType);
    }
    
    if (engine.engineCapacity) {
      parts.push(`${(engine.engineCapacity / 1000).toFixed(1)}L`);
    }
    
    if (engine.enginePowerKW) {
      parts.push(`${engine.enginePowerKW}kW`);
    }
    
    if (engine.enginePowerHP) {
      parts.push(`(${engine.enginePowerHP}KS)`);
    }
    
    if (engine.engineCode) {
      parts.push(engine.engineCode);
    }
    
    return parts.join(" ");
  };
  
  // Funkcija za formatiranje razdoblja kompatibilnosti
  const formatCompatibilityPeriod = (fitment: VehicleFitment) => {
    if (fitment.yearFrom && fitment.yearTo) {
      return `${fitment.yearFrom} - ${fitment.yearTo}`;
    } else if (fitment.yearFrom) {
      return `Od ${fitment.yearFrom}`;
    } else if (fitment.yearTo) {
      return `Do ${fitment.yearTo}`;
    } else if (fitment.isUniversal) {
      return "Univerzalni dio";
    }
    return "";
  };

  return (
    <div className="grid grid-cols-1 gap-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="relative h-96 w-full overflow-hidden rounded-lg">
          <Image
            src={product.imageUrl || 'https://placehold.co/600x400.png?text=Slika+nije+dostupna'}
            alt={product.name}
            fill
            className="object-cover"
          />
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-gray-500">
            {product.category?.name || 'Nekategorizirano'}
          </p>
          <h1 className="text-3xl font-bold mt-2 text-gray-900">{product.name}</h1>
          {product.originalPrice ? (
            <div className="mt-4">
              <p className="text-2xl font-bold text-indigo-600">
                {formatPrice(product.price)}
              </p>
              <p className="text-lg text-gray-500 line-through">
                {formatPrice(product.originalPrice)}
              </p>
              <p className="text-sm font-semibold text-green-600">
                Ušteda: {formatPrice(product.originalPrice - product.price)}
              </p>
            </div>
          ) : (
            <p className="text-2xl font-bold mt-4 text-indigo-600">
              {formatPrice(product.price)}
            </p>
          )}
          <p className="mt-4 text-gray-700">{product.description}</p>
          <div className="mt-6">
            <button
              onClick={handleAddToCart}
              className="w-full rounded-md bg-indigo-600 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all"
            >
              Dodaj u korpu
            </button>
          </div>
        </div>
      </div>
      
      {/* Tabovi za dodatne informacije */}
      <div className="mt-8">
        <Tabs defaultValue="compatibility">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="compatibility">
              <Car className="h-4 w-4 mr-2" />
              Kompatibilnost
            </TabsTrigger>
            <TabsTrigger value="specifications">
              <Settings className="h-4 w-4 mr-2" />
              Specifikacije
            </TabsTrigger>
            <TabsTrigger value="references">
              <Tag className="h-4 w-4 mr-2" />
              Reference
            </TabsTrigger>
          </TabsList>
          
          {/* Tab za kompatibilnost s vozilima */}
          <TabsContent value="compatibility" className="p-4 border rounded-md mt-2">
            {product.vehicleFitments && product.vehicleFitments.length > 0 ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Kompatibilna vozila</h3>
                  <Badge variant="outline" className="text-xs font-medium">
                    {product.vehicleFitments.length} {product.vehicleFitments.length === 1 ? 'kompatibilno vozilo' : 'kompatibilnih vozila'}
                  </Badge>
                </div>
                
                {/* Grupiranje po marki i modelu za bolji pregled */}
                {(() => {
                  // Grupiranje vozila po marki i modelu
                  const groupedFitments: Record<string, typeof product.vehicleFitments> = {};
                  
                  product.vehicleFitments.forEach(fitment => {
                    const brandModelKey = `${fitment.generation.model.brand.name} ${fitment.generation.model.name}`;
                    if (!groupedFitments[brandModelKey]) {
                      groupedFitments[brandModelKey] = [];
                    }
                    groupedFitments[brandModelKey].push(fitment);
                  });
                  
                  return Object.entries(groupedFitments).map(([brandModelName, fitments]) => (
                    <div key={brandModelName} className="mb-6 border rounded-md overflow-hidden">
                      <div className="bg-gray-50 px-4 py-3 border-b">
                        <h4 className="font-medium text-gray-900">{brandModelName}</h4>
                      </div>
                      
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Generacija</th>
                              <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Motor</th>
                              <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Godine</th>
                              <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Karoserija</th>
                              <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pozicija</th>
                              <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Napomene</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {fitments.map((fitment) => (
                              <tr key={fitment.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3">
                                  <div className="text-sm font-medium text-gray-900">
                                    {fitment.generation.name}
                                  </div>
                                  {fitment.isUniversal && (
                                    <Badge variant="secondary" className="mt-1 text-xs">
                                      Univerzalni dio
                                    </Badge>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  {fitment.engine ? (
                                    <div>
                                      <div className="text-sm font-medium text-gray-900">
                                        {formatEngineDescription(fitment.engine)}
                                      </div>
                                      {fitment.engine.engineCode && (
                                        <div className="text-xs text-gray-500 mt-1">
                                          Kod: <Badge variant="outline" className="ml-1">{fitment.engine.engineCode}</Badge>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="text-sm text-gray-500 italic">Svi motori</div>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="text-sm text-gray-900">
                                    {formatCompatibilityPeriod(fitment)}
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  {fitment.bodyStyles && fitment.bodyStyles.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {fitment.bodyStyles.map((style, index) => (
                                        <Badge key={index} variant="outline" className="text-xs">
                                          {style}
                                        </Badge>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="text-sm text-gray-500 italic">Sve karoserije</div>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  {fitment.position ? (
                                    <div className="text-sm text-gray-900">{fitment.position}</div>
                                  ) : (
                                    <div className="text-sm text-gray-500 italic">-</div>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  {fitment.fitmentNotes ? (
                                    <div className="text-sm text-gray-900">{fitment.fitmentNotes}</div>
                                  ) : (
                                    <div className="text-sm text-gray-500 italic">-</div>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ));
                })()}
                
                <div className="mt-6 flex items-center justify-between">
                  <Link 
                    href="/products/vehicle-compatibility" 
                    className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    <Car className="h-4 w-4 mr-1" />
                    Pretraži proizvode po vozilu
                  </Link>
                  
                  <div className="text-xs text-gray-500">
                    <Info className="h-3 w-3 inline-block mr-1" />
                    Provjerite kompatibilnost prije kupovine
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Car className="h-12 w-12 mx-auto text-gray-400" />
                <p className="mt-2">Nema dostupnih informacija o kompatibilnosti s vozilima</p>
                <Link 
                  href="/products/vehicle-compatibility" 
                  className="inline-flex items-center mt-4 text-sm font-medium text-indigo-600 hover:text-indigo-500"
                >
                  Pretraži proizvode po vozilu
                </Link>
              </div>
            )}
          </TabsContent>
          
          {/* Tab za tehničke specifikacije */}
          <TabsContent value="specifications" className="p-4 border rounded-md mt-2">
            <div>
              {/* Atributi kategorije */}
              {product.attributeValues && product.attributeValues.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4">Atributi kategorije</h3>
                  <div className="bg-white rounded-md border overflow-hidden">
                    <dl className="divide-y divide-gray-200">
                      {product.attributeValues.map((attributeValue) => (
                        <div key={attributeValue.id} className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 hover:bg-gray-50">
                          <dt className="text-sm font-medium text-gray-500">
                            {attributeValue.attribute.label}
                          </dt>
                          <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0 flex items-center">
                            {attributeValue.value}
                            {attributeValue.attribute.unit && (
                              <span className="ml-1 text-xs text-gray-500">{attributeValue.attribute.unit}</span>
                            )}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </div>
              )}
              
              {/* Tehničke specifikacije */}
              {product.technicalSpecs && Object.keys(product.technicalSpecs as Record<string, any>).length > 0 ? (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Tehničke specifikacije</h3>
                  <div className="bg-white rounded-md border overflow-hidden">
                    <dl className="divide-y divide-gray-200">
                      {Object.entries(product.technicalSpecs as Record<string, any>)
                        .filter(([key, value]) => value !== null && value !== undefined && value !== '')
                        .map(([key, value]) => (
                          <div key={key} className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 hover:bg-gray-50">
                            <dt className="text-sm font-medium text-gray-500">{key}</dt>
                            <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">{value?.toString()}</dd>
                          </div>
                        ))}
                    </dl>
                  </div>
                </div>
              ) : null}
              
              {/* Dimenzije */}
              {product.dimensions && Object.keys(product.dimensions as Record<string, any>).length > 0 ? (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-4">Dimenzije</h3>
                  <div className="bg-white rounded-md border overflow-hidden">
                    <dl className="divide-y divide-gray-200">
                      {Object.entries(product.dimensions as Record<string, any>)
                        .filter(([key, value]) => value !== null && value !== undefined && value !== '')
                        .map(([key, value]) => {
                          // Formatiranje naziva dimenzije
                          const formattedKey = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
                          // Dodavanje mjerne jedinice
                          const unit = key.includes('weight') ? 'kg' : 'mm';
                          
                          return (
                            <div key={key} className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 hover:bg-gray-50">
                              <dt className="text-sm font-medium text-gray-500">{formattedKey}</dt>
                              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                                {value} {unit}
                              </dd>
                            </div>
                          );
                        })}
                    </dl>
                  </div>
                </div>
              ) : null}
              
              {/* Prikaz ako nema podataka */}
              {(!product.attributeValues || product.attributeValues.length === 0) && 
               (!product.technicalSpecs || Object.keys(product.technicalSpecs as Record<string, any>).length === 0) && 
               (!product.dimensions || Object.keys(product.dimensions as Record<string, any>).length === 0) && (
                <div className="text-center py-8 text-gray-500">
                  <Settings className="h-12 w-12 mx-auto text-gray-400" />
                  <p className="mt-2">Nema dostupnih tehničkih specifikacija</p>
                </div>
              )}
            </div>
          </TabsContent>
          
          {/* Tab za reference i cross-reference */}
          <TabsContent value="references" className="p-4 border rounded-md mt-2">
            <div>
              <h3 className="text-lg font-semibold mb-4">Referentni brojevi</h3>
              
              {/* OEM broj */}
              <div className="mb-6">
                <h4 className="text-md font-medium mb-2">OEM broj</h4>
                {product.oemNumber ? (
                  <p className="text-sm font-medium bg-gray-50 p-2 rounded border">{product.oemNumber}</p>
                ) : (
                  <p className="text-sm text-gray-500">Nema dostupnog OEM broja</p>
                )}
              </div>
              
              {/* Kataloški broj */}
              <div className="mb-6">
                <h4 className="text-md font-medium mb-2">Kataloški broj</h4>
                <p className="text-sm font-medium bg-gray-50 p-2 rounded border">{product.catalogNumber}</p>
              </div>
              
              {/* Originalne reference */}
              {product.originalReferences && product.originalReferences.length > 0 ? (
                <div className="mb-6">
                  <h4 className="text-md font-medium mb-2">Originalne reference</h4>
                  <div className="bg-white rounded-md border overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Referentni broj</th>
                          <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proizvođač</th>
                          <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tip</th>
                          <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Napomene</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {product.originalReferences.map((reference) => (
                          <tr key={reference.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{reference.referenceNumber}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{reference.manufacturer || '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{reference.referenceType}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{reference.notes || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
              
              {/* Zamjena za */}
              {product.replacementFor && product.replacementFor.length > 0 ? (
                <div className="mb-6">
                  <h4 className="text-md font-medium mb-2">Zamjena za</h4>
                  <div className="bg-white rounded-md border overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Referentni broj</th>
                          <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proizvođač</th>
                          <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tip</th>
                          <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Napomene</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {product.replacementFor.map((reference) => (
                          <tr key={reference.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{reference.referenceNumber}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{reference.manufacturer || '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{reference.referenceType}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{reference.notes || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
              
              {/* Prikaz ako nema cross-reference podataka */}
              {(!product.originalReferences || product.originalReferences.length === 0) && 
               (!product.replacementFor || product.replacementFor.length === 0) && (
                <div className="text-center py-4 text-gray-500">
                  <Info className="h-8 w-8 mx-auto text-gray-400" />
                  <p className="mt-2">Dodatne cross-reference informacije nisu dostupne</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
