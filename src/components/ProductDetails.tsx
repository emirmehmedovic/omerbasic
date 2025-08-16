'use client';

import { useCart } from '@/context/CartContext';
import type { Category, Product, VehicleGeneration, VehicleEngine } from '@/generated/prisma/client';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Car, Info, Settings, Tag, BookCopy, Copy } from "lucide-react";
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
    <div className="space-y-6">
      {/* Clean hero section */}
      <div className="glass-card rounded-xl p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Product Image */}
          <div className="relative h-80 lg:h-96 w-full overflow-hidden rounded-lg">
            <Image
              src={product.imageUrl || 'https://placehold.co/600x400.png?text=Slika+nije+dostupna'}
              alt={product.name}
              fill
              className="object-cover"
            />
          </div>
          
          {/* Product Info */}
          <div>
            {/* Category Badge */}
            <div className="inline-flex items-center px-3 py-1 bg-sunfire-a5 text-sunfire-a11 rounded-lg mb-4 text-sm font-medium">
              {product.category?.name || 'Nekategorizirano'}
            </div>
            
            {/* Product Title */}
            <h1 className="text-3xl lg:text-4xl font-bold text-slate-200 mb-6 leading-tight">
              {product.name}
            </h1>
            
            {/* Price Section */}
            <div className="mb-6">
              {product.originalPrice ? (
                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <p className="text-3xl font-bold accent-text">
                      {formatPrice(product.price)}
                    </p>
                    <span className="text-white text-sm font-medium px-2 py-1 rounded accent-bg">
                      B2B cijena
                    </span>
                  </div>
                  <p className="text-lg text-slate-500 line-through">
                    {formatPrice(product.originalPrice)}
                  </p>
                  <p className="text-sm font-semibold text-green-600">
                    Ušteda: {formatPrice(product.originalPrice - product.price)}
                  </p>
                </div>
              ) : (
                <p className="text-3xl font-bold accent-text">
                  {formatPrice(product.price)}
                </p>
              )}
            </div>
            
            {/* Description */}
            <p className="text-slate-600 text-lg leading-relaxed mb-8">
              {product.description}
            </p>
            
            {/* Clean Add to Cart Button */}
            <button
              onClick={handleAddToCart}
              className="w-full accent-bg text-white font-bold py-4 px-8 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center space-x-3"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 6M7 13l1.5-6M17 21a2 2 0 100-4 2 2 0 000 4zM9 21a2 2 0 100-4 2 2 0 000 4z" />
              </svg>
              <span>Dodaj u korpu</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Clean tabs */}
      <div>
        <Tabs defaultValue="compatibility" className="w-full">
          {/* Clean tab navigation */}
          <TabsList className="grid w-full grid-cols-3 glass-card rounded-xl p-1">
            <TabsTrigger 
              value="compatibility"
              className="flex items-center space-x-2 py-3 px-4 rounded-lg font-medium text-slate-300 data-[state=active]:accent-bg data-[state=active]:text-white transition-all duration-200"
            >
              <Car className="h-4 w-4" />
              <span>Kompatibilnost</span>
            </TabsTrigger>
            <TabsTrigger 
              value="specifications"
              className="flex items-center space-x-2 py-3 px-4 rounded-lg font-medium text-slate-300 data-[state=active]:accent-bg data-[state=active]:text-white transition-all duration-200"
            >
              <Settings className="h-4 w-4" />
              <span>Specifikacije</span>
            </TabsTrigger>
            <TabsTrigger 
              value="references"
              className="flex items-center space-x-2 py-3 px-4 rounded-lg font-medium text-slate-300 data-[state=active]:accent-bg data-[state=active]:text-white transition-all duration-200"
            >
              <Tag className="h-4 w-4" />
              <span>Reference</span>
            </TabsTrigger>
          </TabsList>
          
          {/* Clean compatibility tab */}
          <TabsContent value="compatibility" className="glass-card rounded-xl p-6 mt-4">
            {product.vehicleFitments && product.vehicleFitments.length > 0 ? (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="accent-bg p-3 rounded-xl shadow-lg">
                      <Car className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-200">Kompatibilna vozila</h3>
                  </div>
                  <div className="text-white px-4 py-2 rounded-xl font-bold shadow-lg accent-bg">
                    {product.vehicleFitments.length} {product.vehicleFitments.length === 1 ? 'vozilo' : 'vozila'}
                  </div>
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
                    <div key={brandModelName} className="mb-6 border rounded-2xl overflow-hidden">
                      <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4">
                        <h4 className="font-bold text-white text-lg">{brandModelName}</h4>
                      </div>
                      
                      <div className="p-4 space-y-4">
                        {fitments.map((fitment) => (
                          <div key={fitment.id} className="bg-slate-800/50 rounded-lg p-4 transition-all duration-200 hover:bg-slate-800/80 hover:shadow-lg">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-bold text-white">{fitment.generation.name}</p>
                                <p className="text-sm text-slate-400">{formatCompatibilityPeriod(fitment)}</p>
                              </div>
                              {fitment.isUniversal && <Badge variant="secondary">Univerzalni dio</Badge>}
                            </div>
                            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                              <div>
                                <p className="font-semibold text-slate-300">Motor</p>
                                {fitment.engine ? (
                                  <p className="text-slate-400">{formatEngineDescription(fitment.engine)}</p>
                                ) : (
                                  <p className="text-slate-500 italic">Svi motori</p>
                                )}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-300">Karoserija</p>
                                {fitment.bodyStyles && fitment.bodyStyles.length > 0 ? (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {fitment.bodyStyles.map((style, index) => (
                                      <Badge key={index} variant="outline" className="text-xs">{style}</Badge>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-slate-500 italic">Sve karoserije</p>
                                )}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-300">Pozicija</p>
                                <p className="text-slate-400">{fitment.position || <span className="italic text-slate-500">Nije specificirano</span>}</p>
                              </div>
                              {fitment.fitmentNotes && (
                                <div>
                                  <p className="font-semibold text-slate-300">Napomene</p>
                                  <p className="text-slate-400">{fitment.fitmentNotes}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
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
          
          <TabsContent value="specifications" className="mt-4">
            <div className="space-y-6">
              {/* Atributi kategorije */}
              {product.attributeValues && product.attributeValues.length > 0 && (
                <div className="glass-card rounded-xl p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="accent-bg p-3 rounded-xl shadow-lg">
                      <Settings className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-200">Glavne karakteristike</h3>
                  </div>
                  <dl className="space-y-4">
                    {product.attributeValues.map((attributeValue) => (
                      <div key={attributeValue.id} className="flex justify-between items-center bg-slate-800/50 px-4 py-3 rounded-lg">
                        <dt className="text-sm font-semibold text-slate-300">
                          {attributeValue.attribute.label}
                        </dt>
                        <dd className="text-sm text-white font-bold flex items-center">
                          {attributeValue.value}
                          {attributeValue.attribute.unit && (
                            <span className="ml-2 text-xs text-sunfire-a40 bg-sunfire-a10/30 px-2 py-1 rounded-full font-mono">{attributeValue.attribute.unit}</span>
                          )}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              {/* Tehničke specifikacije i Dimenzije - 2-column layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Tehničke specifikacije */}
                {product.technicalSpecs && Object.keys(product.technicalSpecs as Record<string, any>).length > 0 && (
                  <div className="glass-card rounded-xl p-6">
                    <h3 className="text-lg font-semibold mb-4 text-slate-200">Tehnički podaci</h3>
                    <dl className="space-y-3">
                      {Object.entries(product.technicalSpecs as Record<string, any>)
                        .filter(([, value]) => value !== null && value !== undefined && value !== '')
                        .map(([key, value]) => (
                          <div key={key} className="flex justify-between text-sm border-b border-slate-700/50 pb-2">
                            <dt className="text-slate-400">{key}</dt>
                            <dd className="text-slate-200 font-medium">{value?.toString()}</dd>
                          </div>
                        ))}
                    </dl>
                  </div>
                )}

                {/* Dimenzije */}
                {product.dimensions && Object.keys(product.dimensions as Record<string, any>).length > 0 && (
                  <div className="glass-card rounded-xl p-6">
                    <h3 className="text-lg font-semibold mb-4 text-slate-200">Dimenzije</h3>
                    <dl className="space-y-3">
                      {Object.entries(product.dimensions as Record<string, any>)
                        .filter(([, value]) => value !== null && value !== undefined && value !== '')
                        .map(([key, value]) => {
                          const formattedKey = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
                          const unit = key.includes('weight') ? 'kg' : 'mm';
                          return (
                            <div key={key} className="flex justify-between text-sm border-b border-slate-700/50 pb-2">
                              <dt className="text-slate-400">{formattedKey}</dt>
                              <dd className="text-slate-200 font-medium">
                                {value} {unit}
                              </dd>
                            </div>
                          );
                        })}
                    </dl>
                  </div>
                )}
              </div>

              {/* Fallback ako nema podataka */}
              {(!product.attributeValues || product.attributeValues.length === 0) &&
               (!product.technicalSpecs || Object.keys(product.technicalSpecs as Record<string, any>).length === 0) &&
               (!product.dimensions || Object.keys(product.dimensions as Record<string, any>).length === 0) && (
                <div className="glass-card rounded-xl p-6 mt-4 text-center py-12 text-slate-500">
                  <Settings className="h-12 w-12 mx-auto text-slate-600" />
                  <p className="mt-4">Nema dostupnih tehničkih specifikacija</p>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="references" className="mt-4">
            <div className="space-y-6">
              <div className="glass-card rounded-xl p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="accent-bg p-3 rounded-xl shadow-lg">
                    <BookCopy className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-200">Referentni brojevi</h3>
                </div>
                {(product.originalReferences && product.originalReferences.length > 0) ? (
                  (() => {
                    const groupedReferences = product.originalReferences.reduce((acc, reference) => {
                      const manufacturer = reference.manufacturer || 'Nepoznato';
                      if (!acc[manufacturer]) {
                        acc[manufacturer] = [];
                      }
                      acc[manufacturer].push(reference);
                      return acc;
                    }, {} as Record<string, typeof product.originalReferences>);

                    const copyToClipboard = (text: string) => {
                      navigator.clipboard.writeText(text);
                      toast.success(`Kopirano: ${text}`);
                    };

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(groupedReferences).map(([manufacturer, refs]) => (
                          <div key={manufacturer} className="bg-slate-800/50 rounded-lg p-4">
                            <h4 className="font-bold text-sunfire-a40 mb-3 border-b border-slate-700 pb-2">{manufacturer}</h4>
                            <ul className="space-y-2">
                              {refs.map(ref => (
                                <li key={ref.id} className="text-sm text-slate-300 font-mono bg-slate-900/50 px-3 py-2 rounded-md flex items-center justify-between">
                                  <span>{ref.referenceNumber}</span>
                                  <Copy className="h-4 w-4 text-slate-500 hover:text-white cursor-pointer transition" onClick={() => copyToClipboard(ref.referenceNumber)} />
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    );
                  })()
                ) : (
                  <div className="text-center py-12 text-slate-500">
                    <BookCopy className="h-12 w-12 mx-auto text-slate-600" />
                    <p className="mt-4">Nema dostupnih referentnih brojeva</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
