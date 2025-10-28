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
import { useEffect, useState } from 'react';
import { ProductCard } from '@/components/ProductCard';

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
    pricingSource?: 'FEATURED' | 'B2B' | 'BASE';
    vehicleFitments?: VehicleFitment[];
    attributeValues?: ProductAttributeWithValue[];
    originalReferences?: ProductReference[];
    replacementFor?: ProductReference[];
  };
}

// Koristimo formatPrice iz utils.ts

// Prikaz kartice zamjenskog proizvoda za dati replacementId
const ReplacementProductPreview: React.FC<{ id: string }> = ({ id }) => {
  const [data, setData] = useState<(Product & { category: Category | null; originalPrice?: number; pricingSource?: 'FEATURED' | 'B2B' | 'BASE' }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch(`/api/products/${id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      })
      .then((json) => {
        if (!alive) return;
        setData(json);
      })
      .catch((e) => {
        if (!alive) return;
        setError(typeof e?.message === 'string' ? e.message : 'Greška pri učitavanju proizvoda');
      })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [id]);

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="h-40 w-full rounded-lg bg-slate-100 animate-pulse mb-3" />
        <div className="h-4 w-2/3 rounded bg-slate-100 animate-pulse mb-2" />
        <div className="h-4 w-1/3 rounded bg-slate-100 animate-pulse" />
      </div>
    );
  }
  if (error || !data) {
    return <div className="text-xs text-red-400">Nije moguće učitati zamjenski proizvod.</div>;
  }
  return <ProductCard product={data} />;
};

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

  // Normalizacija i parsiranje vrijednosti pozicije (npr. "front,left" -> ["Prednja", "Lijeva"]).
  const normalizePositionToken = (token: string) => {
    const t = token.trim().toLowerCase();
    const map: Record<string, string> = {
      front: "Prednja",
      rear: "Zadnja",
      left: "Lijeva",
      right: "Desna",
      inner: "Unutarnja",
      outer: "Vanjska",
      driver: "Vozačeva",
      passenger: "Suvozačeva",
      axle1: "Osovina 1",
      axle2: "Osovina 2",
    };
    return map[t] || token.trim();
  };

  const splitPosition = (pos?: string | null) =>
    pos ? pos.split(/[;,/|]/).map((p) => p.trim()).filter(Boolean) : [];

  // Lokalizacija ključeva i vrijednosti za Tehničke podatke
  const localizeTechKey = (key: string) => {
    const k = key.trim();
    const map: Record<string, string> = {
      engineType: "Tip motora",
      vehicleBrand: "Marka vozila",
      vehicleModel: "Model vozila",
      vehicleGeneration: "Generacija vozila",
      engineCode: "Šifra motora",
      enginePowerKW: "Snaga (kW)",
      enginePowerHP: "Snaga (KS)",
      engineCapacity: "Zapremina (ccm)",
    };
    return map[k] || k.charAt(0).toUpperCase() + k.slice(1).replace(/([A-Z])/g, ' $1');
  };

  const localizeTechValue = (key: string, value: any) => {
    if (value === null || value === undefined) return "";
    const k = key.trim().toLowerCase();
    // Mapiranje za tip motora
    if (k === 'enginetype') {
      const vt = String(value).toLowerCase();
      const engineMap: Record<string, string> = {
        petrol: 'Benzin',
        gasoline: 'Benzin',
        diesel: 'Dizel',
        hybrid: 'Hibrid',
        electric: 'Električni',
      };
      return engineMap[vt] || String(value);
    }
    // Bool vrijednosti
    if (typeof value === 'boolean') return value ? 'Da' : 'Ne';
    return String(value);
  };

  return (
    <div className="space-y-6">
      {/* Clean hero section */}
      <div className="relative overflow-hidden rounded-2xl p-8 bg-white border border-slate-200 shadow-sm">
        {/* Light grid overlay */}
        <div
          className="pointer-events-none absolute inset-0 z-0 opacity-65"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(100,116,139,0.14) 1px, transparent 1px), linear-gradient(to bottom, rgba(100,116,139,0.14) 1px, transparent 1px)',
            backgroundSize: '2px 2px',
            maskImage: 'radial-gradient(ellipse at center, black 92%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse at center, black 92%, transparent 100%)',
          }}
        />
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Product Image */}
          <div className="relative h-80 lg:h-96 w-full overflow-hidden rounded-xl border border-slate-200 shadow-sm">
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
            <div className="inline-flex items-center px-3 py-1 bg-sunfire-100 text-sunfire-700 rounded-lg mb-4 text-sm font-medium">
              {product.category?.name || 'Nekategorizirano'}
            </div>
            
            {/* Product Title */}
            <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-6 leading-tight">
              {product.name}
            </h1>

            {/* Meta chips: OEM, Kataloški, Lager */}
            <div className="flex flex-wrap items-center gap-2 mb-6">
              {product.oemNumber && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-md px-2 py-1">
                  <span className="text-slate-500">OEM</span>
                  <span className="font-mono tracking-tight text-slate-900">{product.oemNumber}</span>
                </span>
              )}
              {product.catalogNumber && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-md px-2 py-1">
                  <span className="text-slate-500">Kataloški</span>
                  <span className="font-mono tracking-tight text-slate-900">{product.catalogNumber}</span>
                </span>
              )}
              {typeof product.stock === 'number' && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-2 py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Na stanju: {product.stock}
                </span>
              )}
            </div>
            
            {/* Price Section */}
            <div className="mb-6">
              {product.originalPrice ? (
                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <p className="text-3xl font-bold text-sunfire-600">
                      {formatPrice(product.price)}
                    </p>
                    <span className="text-white text-sm font-medium px-2 py-1 rounded bg-sunfire-600">
                      {product.pricingSource === 'FEATURED' ? 'Akcija' : 'B2B cijena'}
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
                <p className="text-3xl font-bold text-sunfire-600">
                  {formatPrice(product.price)}
                </p>
              )}
            </div>
            
            {/* Description */}
            <p className="text-slate-700 text-lg leading-relaxed mb-8">
              {product.description}
            </p>
            
            {/* Clean Add to Cart Button */}
            <button
              onClick={handleAddToCart}
              className="w-full bg-sunfire-600 text-white font-bold py-4 px-8 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center space-x-3"
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
          <TabsList className="grid w-full grid-cols-3 rounded-xl p-1 bg-white border border-slate-200">
            <TabsTrigger 
              value="compatibility"
              className="flex items-center space-x-2 py-3 px-4 rounded-lg font-medium text-slate-700 data-[state=active]:bg-sunfire-600 data-[state=active]:text-white transition-all duration-200"
            >
              <Car className="h-4 w-4" />
              <span>Kompatibilnost</span>
            </TabsTrigger>
            <TabsTrigger 
              value="specifications"
              className="flex items-center space-x-2 py-3 px-4 rounded-lg font-medium text-slate-700 data-[state=active]:bg-sunfire-600 data-[state=active]:text-white transition-all duration-200"
            >
              <Settings className="h-4 w-4" />
              <span>Specifikacije</span>
            </TabsTrigger>
            <TabsTrigger 
              value="references"
              className="flex items-center space-x-2 py-3 px-4 rounded-lg font-medium text-slate-700 data-[state=active]:bg-sunfire-600 data-[state=active]:text-white transition-all duration-200"
            >
              <Tag className="h-4 w-4" />
              <span>Reference i zamjenski proizvodi</span>
            </TabsTrigger>
          </TabsList>
          
          {/* Clean compatibility tab */}
          <TabsContent value="compatibility" className="rounded-2xl p-6 mt-4 bg-white border border-slate-200 shadow-sm">
            {product.vehicleFitments && product.vehicleFitments.length > 0 ? (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="bg-sunfire-100 p-3 rounded-xl shadow-sm">
                      <Car className="h-6 w-6 text-sunfire-700" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900">Kompatibilna vozila</h3>
                  </div>
                  <div className="text-slate-900 px-4 py-2 rounded-xl font-bold shadow-sm bg-slate-100">
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
                    <div key={brandModelName} className="mb-6 border border-slate-200 rounded-2xl overflow-hidden bg-white">
                      <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                        <h4 className="font-bold text-slate-900 text-lg">{brandModelName}</h4>
                      </div>
                      
                      <div className="p-4 space-y-4">
                        {fitments.map((fitment) => (
                          <div key={fitment.id} className="bg-white rounded-lg p-4 border border-slate-200 transition-all duration-200 hover:shadow-sm">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-bold text-slate-900">{fitment.generation.name}</p>
                                <p className="text-sm text-slate-600">{formatCompatibilityPeriod(fitment)}</p>
                              </div>
                              {fitment.isUniversal && <Badge variant="secondary" className="bg-slate-100 text-slate-700 border border-slate-200">Univerzalni dio</Badge>}
                            </div>
                            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                              <div>
                                <p className="font-semibold text-slate-700">Motor</p>
                                {fitment.engine ? (
                                  <p className="text-slate-600">{formatEngineDescription(fitment.engine)}</p>
                                ) : (
                                  <p className="text-slate-500 italic">Svi motori</p>
                                )}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-700">Karoserija</p>
                                {fitment.bodyStyles && fitment.bodyStyles.length > 0 ? (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {fitment.bodyStyles.map((style, index) => (
                                      <Badge key={index} variant="outline" className="text-xs border-slate-200 text-slate-700">{style}</Badge>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-slate-500 italic">Sve karoserije</p>
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-slate-700">Pozicija ugradnje</p>
                                  <span title="Mjesto ugradnje dijela (npr. Prednja/Zadnja, Lijeva/Desna, Unutarnja/Vanjska).">
                                    <Info className="h-4 w-4 text-slate-500" />
                                  </span>
                                </div>
                                {splitPosition(fitment.position).length > 0 ? (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {splitPosition(fitment.position).map((p, idx) => (
                                      <Badge key={idx} variant="outline" className="text-xs border-slate-200 text-slate-700">
                                        {normalizePositionToken(p)}
                                      </Badge>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-slate-500 italic">Sve pozicije (nije specificirano)</p>
                                )}
                              </div>
                              {fitment.fitmentNotes && (
                                <div>
                                  <p className="font-semibold text-slate-700">Napomene</p>
                                  <p className="text-slate-600">{fitment.fitmentNotes}</p>
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
                    className="inline-flex items-center text-sm font-medium text-sunfire-700 hover:text-sunfire-800"
                  >
                    <Car className="h-4 w-4 mr-1" />
                    Pretraži proizvode po vozilu
                  </Link>
                  
                  <div className="text-xs text-slate-500">
                    <Info className="h-3 w-3 inline-block mr-1" />
                    Provjerite kompatibilnost prije kupovine
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Car className="h-12 w-12 mx-auto text-slate-400" />
                <p className="mt-2">Nema dostupnih informacija o kompatibilnosti s vozilima</p>
                <Link 
                  href="/products/vehicle-compatibility" 
                  className="inline-flex items-center mt-4 text-sm font-medium text-sunfire-700 hover:text-sunfire-800"
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
                <div className="rounded-2xl p-6 bg-white border border-slate-200 shadow-sm">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="bg-sunfire-100 p-3 rounded-xl shadow-sm">
                      <Settings className="h-6 w-6 text-sunfire-700" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">Glavne karakteristike</h3>
                  </div>
                  <dl className="space-y-4">
                    {product.attributeValues.map((attributeValue) => (
                      <div key={attributeValue.id} className="flex justify-between items-center bg-slate-50 px-4 py-3 rounded-lg border border-slate-200">
                        <dt className="text-sm font-semibold text-slate-700">
                          {attributeValue.attribute.label}
                        </dt>
                        <dd className="text-sm text-slate-900 font-bold flex items-center">
                          {attributeValue.value}
                          {attributeValue.attribute.unit && (
                            <span className="ml-2 text-xs text-sunfire-700 bg-sunfire-100 px-2 py-1 rounded-full font-mono">{attributeValue.attribute.unit}</span>
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
                  <div className="rounded-2xl p-6 bg-white border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-semibold mb-4 text-slate-900">Tehnički podaci</h3>
                    <dl className="space-y-3">
                      {Object.entries(product.technicalSpecs as Record<string, any>)
                        .filter(([, value]) => value !== null && value !== undefined && value !== '')
                        .map(([key, value]) => (
                          <div key={key} className="flex justify-between text-sm border-b border-slate-200 pb-2">
                            <dt className="text-slate-600">{localizeTechKey(key)}</dt>
                            <dd className="text-slate-900 font-medium">{localizeTechValue(key, value)}</dd>
                          </div>
                        ))}
                    </dl>
                  </div>
                )}

                {/* Dimenzije */}
                {product.dimensions && Object.keys(product.dimensions as Record<string, any>).length > 0 && (
                  <div className="rounded-2xl p-6 bg-white border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-semibold mb-4 text-slate-900">Dimenzije</h3>
                    <dl className="space-y-3">
                      {Object.entries(product.dimensions as Record<string, any>)
                        .filter(([, value]) => value !== null && value !== undefined && value !== '')
                        .map(([key, value]) => {
                          const formattedKey = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
                          const unit = key.includes('weight') ? 'kg' : 'mm';
                          return (
                            <div key={key} className="flex justify-between text-sm border-b border-slate-200 pb-2">
                              <dt className="text-slate-600">{formattedKey}</dt>
                              <dd className="text-slate-900 font-medium">
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
                <div className="rounded-2xl p-6 mt-4 text-center py-12 text-slate-500 bg-white border border-slate-200 shadow-sm">
                  <Settings className="h-12 w-12 mx-auto text-slate-500" />
                  <p className="mt-4">Nema dostupnih tehničkih specifikacija</p>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="references" className="mt-4">
            <div className="space-y-6">
              <div className="rounded-2xl p-6 bg-white border border-slate-200 shadow-sm">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="bg-sunfire-100 p-3 rounded-xl shadow-sm">
                    <BookCopy className="h-6 w-6 text-sunfire-700" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Reference i zamjenski proizvodi</h3>
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
                          <div key={manufacturer} className="bg-white rounded-lg p-4 border border-slate-200">
                            <h4 className="font-bold text-slate-900 mb-3 border-b border-slate-200 pb-2">{manufacturer}</h4>
                            <ul className="space-y-2">
                              {refs.map(ref => (
                                <li key={ref.id} className="text-sm text-slate-700 bg-slate-50 px-3 py-2 rounded-md border border-slate-200">
                                  <div className="flex items-center justify-between">
                                    <span className="font-mono text-slate-900">{ref.referenceNumber}</span>
                                    <Copy className="h-4 w-4 text-slate-500 hover:text-slate-700 cursor-pointer transition" onClick={() => copyToClipboard(ref.referenceNumber)} />
                                  </div>
                                  {ref.replacementId && (
                                    <div className="mt-3">
                                      <ReplacementProductPreview id={ref.replacementId} />
                                    </div>
                                  )}
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
                    <BookCopy className="h-12 w-12 mx-auto text-slate-500" />
                    <p className="mt-4">Nema dostupnih referentnih brojeva</p>
                  </div>
                )}
              </div>

              {/* Ako je ovaj proizvod zamjena za OEM broj(eve), prikaži i te veze */}
              {product.replacementFor && product.replacementFor.length > 0 && (
                <div className="rounded-2xl p-6 bg-white border border-slate-200 shadow-sm">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="bg-sunfire-100 p-3 rounded-xl shadow-sm">
                      <Tag className="h-6 w-6 text-sunfire-700" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">Ovaj proizvod je zamjena za OEM</h3>
                  </div>
                  {(() => {
                    const grouped = (product.replacementFor || []).reduce((acc, reference) => {
                      const manufacturer = reference.manufacturer || 'Nepoznato';
                      if (!acc[manufacturer]) acc[manufacturer] = [];
                      acc[manufacturer].push(reference);
                      return acc;
                    }, {} as Record<string, typeof product.replacementFor>);

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(grouped).map(([manufacturer, refs]) => (
                          <div key={manufacturer} className="bg-white rounded-lg p-4 border border-slate-200">
                            <h4 className="font-bold text-slate-900 mb-3 border-b border-slate-200 pb-2">{manufacturer}</h4>
                            <ul className="space-y-2">
                              {refs.map(ref => (
                                <li key={ref.id} className="text-sm text-slate-700 bg-slate-50 px-3 py-2 rounded-md border border-slate-200">
                                  <div className="flex items-center justify-between">
                                    <span className="font-mono text-slate-900">{ref.referenceNumber}</span>
                                    <Copy className="h-4 w-4 text-slate-500 hover:text-slate-700 cursor-pointer transition" onClick={() => { navigator.clipboard.writeText(ref.referenceNumber); toast.success(`Kopirano: ${ref.referenceNumber}`); }} />
                                  </div>
                                  {/* Prikaži karticu OEM proizvoda (productId) na koji je vezan ovaj ref */}
                                  {ref.productId && (
                                    <div className="mt-3">
                                      <ReplacementProductPreview id={ref.productId} />
                                    </div>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
