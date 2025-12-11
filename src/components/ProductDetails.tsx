'use client';

import { useCart } from '@/context/CartContext';
import type { Category, Product, VehicleGeneration, VehicleEngine } from '@/generated/prisma/client';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Car, Info, Settings, Tag, BookCopy, Copy, ChevronDown } from "lucide-react";
import Link from "next/link";
import { formatPrice, resolveProductImage } from "@/lib/utils";
import { useEffect, useMemo, useState } from 'react';
import { ProductCard } from '@/components/ProductCard';
import AudiIcon from '@/components/icons/audi';
import VolkswagenIcon from '@/components/icons/volkswagen';
import MercedesIcon from '@/components/icons/mercedes';
import BmwIcon from '@/components/icons/bmw';
import VolvoIcon from '@/components/icons/volvo';
import SeatIcon from '@/components/icons/seat';
import SkodaIcon from '@/components/icons/skoda';
import OpelIcon from '@/components/icons/opel';
import CitroenIcon from '@/components/icons/citroen';
import KiaIcon from '@/components/icons/kia';
import PeugeotIcon from '@/components/icons/peugeot';
import ScaniaIcon from '@/components/icons/scania';
import ManIcon from '@/components/icons/man';
import DafIcon from '@/components/icons/daf';
import IvecoIcon from '@/components/icons/iveco';
import RenaultIcon from '@/components/icons/renault';
import MiniIcon from '@/components/icons/mini';
import AlfaromeoIcon from '@/components/icons/alfaromeo';
import ChevroletIcon from '@/components/icons/chevrolet';
import DaciaIcon from '@/components/icons/dacia';
import DaewooIcon from '@/components/icons/daewoo';
import FiatIcon from '@/components/icons/fiat';
import HondaIcon from '@/components/icons/honda';
import HyundaiIcon from '@/components/icons/hyundai';
import JaguarIcon from '@/components/icons/jaguar';
import LanciaIcon from '@/components/icons/lancia';
import LandRoverIcon from '@/components/icons/landrover';
import MazdaIcon from '@/components/icons/mazda';
import MitsubishiIcon from '@/components/icons/mitsubishi';
import NissanIcon from '@/components/icons/nissan';
import PorscheIcon from '@/components/icons/porsche';
import SmartIcon from '@/components/icons/smart';
import ToyotaIcon from '@/components/icons/toyota';

const EngineIcon = ({ className = 'h-4 w-4 text-primary' }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 10h1.5v4H4a1 1 0 01-1-1v-2a1 1 0 011-1z" />
    <path d="M19 9h1a1 1 0 011 1v6a1 1 0 01-1 1h-1l-2 3h-3l-1.5-2H9.5L8 19H5a2 2 0 01-2-2v-1.5h2.5v-5H3V9a2 2 0 012-2h3l2-2h4l2 2h3a2 2 0 012 2z" />
    <path d="M12 9v6" />
    <path d="M15 11v2" />
  </svg>
);

const EngineListToggle = ({ entries, variant = 'table' }: { entries: string[]; variant?: 'table' | 'card' }) => {
  const [expanded, setExpanded] = useState(false);

  if (!entries.length) {
    return <span className="text-slate-500 text-xs">Podaci nisu dostupni</span>;
  }

  const isTable = variant === 'table';
  const buttonBase = 'inline-flex items-center gap-2 rounded-lg font-semibold transition-all border border-primary/15 bg-white/90 shadow-sm hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary/40';
  const buttonSize = isTable ? 'text-xs px-3 py-1.5' : 'text-xs px-3 py-1.5 w-full justify-between';
  const entryText = isTable ? 'text-sm' : 'text-xs';
  const wrapperClass = isTable ? 'inline-flex items-center gap-2 flex-wrap' : 'space-y-1.5';
  const listWrapperClass = isTable ? 'inline-flex flex-wrap items-center gap-2' : 'space-y-1.5';

  const renderEntry = (entry: string) => {
    const highlight = entry.includes('Univerzalni') || entry.includes('Svi motori');
    if (highlight) {
      return (
        <Badge
          variant="secondary"
          className={`bg-gradient-to-r from-[#E85A28] to-[#FF6B35] text-white border-0 ${variant === 'table' ? 'text-[11px]' : 'text-[10px]'} px-2.5`}
        >
          {entry}
        </Badge>
      );
    }
    return <span>{entry}</span>;
  };

  return (
    <div className={wrapperClass}>
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className={`${buttonBase} ${buttonSize} bg-primary/5 text-primary hover:bg-primary/10`}
        aria-expanded={expanded}
      >
        <EngineIcon className="h-3.5 w-3.5 text-primary" />
        <span>{expanded ? 'Sakrij motore' : `Prikaži motore (${entries.length})`}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && (
        <div className={listWrapperClass}>
          {entries.map((entry) => (
            <div key={entry} className={`flex items-center gap-2 font-medium text-slate-900 ${entryText}`}>
              {renderEntry(entry)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

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
    manufacturer?: { id: string; name: string } | null;
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
  const [quantity, setQuantity] = useState(1);

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      addToCart(product);
    }
    toast.success(`${quantity}x ${product.name} dodano u korpu!`);
  };

  const incrementQuantity = () => setQuantity(prev => prev + 1);
  const decrementQuantity = () => setQuantity(prev => Math.max(1, prev - 1));

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
    } else if (fitment.generation?.period) {
      // Fallback: prikaži period iz generation ako yearFrom/yearTo nisu dostupni
      return fitment.generation.period;
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

  const bodyStylesText = (bs?: string[]) => (bs && bs.length ? bs.join(', ') : 'Sve karoserije');
  const positionText = (pos?: string | null) => {
    const parts = splitPosition(pos);
    return parts.length ? parts.map(normalizePositionToken).join(', ') : 'Nije specificirano';
  };

  const brandIconEntries = useMemo(
    () => [
      { match: (name: string) => name.includes('volkswagen') || name.includes('vw'), Icon: VolkswagenIcon },
      { match: (name: string) => name.includes('audi'), Icon: AudiIcon },
      { match: (name: string) => name.includes('bmw'), Icon: BmwIcon },
      { match: (name: string) => name.includes('mercedes'), Icon: MercedesIcon },
      { match: (name: string) => name.includes('opel'), Icon: OpelIcon },
      { match: (name: string) => name.includes('peugeot'), Icon: PeugeotIcon },
      { match: (name: string) => name.includes('seat'), Icon: SeatIcon },
      { match: (name: string) => name.includes('skoda'), Icon: SkodaIcon },
      { match: (name: string) => name.includes('citroen'), Icon: CitroenIcon },
      { match: (name: string) => name.includes('volvo'), Icon: VolvoIcon },
      { match: (name: string) => name.includes('kia'), Icon: KiaIcon },
      { match: (name: string) => name.includes('scania'), Icon: ScaniaIcon },
      { match: (name: string) => name.includes('daf'), Icon: DafIcon },
      { match: (name: string) => name.includes('iveco'), Icon: IvecoIcon },
      { match: (name: string) => name.includes('renault'), Icon: RenaultIcon },
      { match: (name: string) => name.includes('man'), Icon: ManIcon },
      { match: (name: string) => name.includes('mini'), Icon: MiniIcon },
      { match: (name: string) => name.includes('alfa') || name.includes('romeo'), Icon: AlfaromeoIcon },
      { match: (name: string) => name.includes('chevrolet'), Icon: ChevroletIcon },
      { match: (name: string) => name.includes('dacia'), Icon: DaciaIcon },
      { match: (name: string) => name.includes('daewoo'), Icon: DaewooIcon },
      { match: (name: string) => name.includes('fiat'), Icon: FiatIcon },
      { match: (name: string) => name.includes('honda'), Icon: HondaIcon },
      { match: (name: string) => name.includes('hyundai'), Icon: HyundaiIcon },
      { match: (name: string) => name.includes('jaguar'), Icon: JaguarIcon },
      { match: (name: string) => name.includes('lancia'), Icon: LanciaIcon },
      { match: (name: string) => name.includes('land') || name.includes('rover'), Icon: LandRoverIcon },
      { match: (name: string) => name.includes('mazda'), Icon: MazdaIcon },
      { match: (name: string) => name.includes('mitsubishi'), Icon: MitsubishiIcon },
      { match: (name: string) => name.includes('nissan'), Icon: NissanIcon },
      { match: (name: string) => name.includes('porsche'), Icon: PorscheIcon },
      { match: (name: string) => name.includes('smart'), Icon: SmartIcon },
      { match: (name: string) => name.includes('toyota'), Icon: ToyotaIcon },
    ],
    []
  );

  const iconForBrand = (name: string) => {
    const normalized = name.toLowerCase();
    const entry = brandIconEntries.find(({ match }) => match(normalized));
    return entry?.Icon ?? null;
  };

  const summarizeBodyStyles = (fitments: VehicleFitment[]) => {
    const styles = new Set<string>();
    fitments.forEach((fitment) => {
      styles.add(bodyStylesText(fitment.bodyStyles));
    });
    return Array.from(styles).join(' • ');
  };

  const summarizePositions = (fitments: VehicleFitment[]) => {
    const positions = new Set<string>();
    fitments.forEach((fitment) => {
      positions.add(positionText(fitment.position));
    });
    return Array.from(positions).join(' • ');
  };

  const summarizeNotes = (fitments: VehicleFitment[]) => {
    const notes = Array.from(
      new Set(
        fitments
          .map((fitment) => fitment.fitmentNotes?.trim())
          .filter((note): note is string => !!note)
      )
    );
    return notes;
  };

  const buildEngineEntries = (fitments: VehicleFitment[]) => {
    const seen = new Set<string>();
    const entries: string[] = [];
    fitments.forEach((fitment) => {
      let label = 'Svi motori';
      if (fitment.isUniversal) {
        label = 'Univerzalni';
      } else if (fitment.engine) {
        label = formatEngineDescription(fitment.engine);
      }
      if (!seen.has(label)) {
        seen.add(label);
        entries.push(label);
      }
    });
    return entries;
  };

  const groupedFitments = useMemo(() => {
    if (!product.vehicleFitments) return [] as Array<{ brandKey: string; brandName: string; models: VehicleFitment[] }>;
    const map = new Map<string, { brandKey: string; brandName: string; models: VehicleFitment[] }>();
    for (const fitment of product.vehicleFitments) {
      const brandName = fitment.generation.model.brand.name;
      const brandKey = (fitment.generation.model.brand.id ?? brandName).toLowerCase();
      const entry = map.get(brandKey);
      if (entry) {
        entry.models.push(fitment);
      } else {
        map.set(brandKey, {
          brandKey,
          brandName,
          models: [fitment],
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.brandName.localeCompare(b.brandName));
  }, [product.vehicleFitments]);

  const [expandedBrands, setExpandedBrands] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!groupedFitments.length) return;
    setExpandedBrands((prev) => {
      const next: Record<string, boolean> = {};
      groupedFitments.forEach((group) => {
        next[group.brandKey] = prev[group.brandKey] ?? false;
      });
      return next;
    });
  }, [groupedFitments]);

  const toggleBrand = (brandKey: string) => {
    setExpandedBrands((prev) => ({
      ...prev,
      [brandKey]: !prev[brandKey],
    }));
  };

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
    <div className="space-y-8">
      {/* Modern hero section with gradient background */}
      <div className="relative overflow-hidden rounded-3xl p-8 lg:p-12 bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 shadow-xl">
        {/* Subtle pattern overlay with texture */}
        <div
          className="pointer-events-none absolute inset-0 z-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 2px 2px, rgba(27,58,95,0.2) 1px, transparent 0), radial-gradient(circle at 50% 50%, rgba(255,107,53,0.08) 0%, transparent 70%)',
            backgroundSize: '32px 32px, 100% 100%',
          }}
        />
        
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Product Image with floating info cards */}
          <div className="relative">
            {/* Main product image */}
            <div className="relative h-96 lg:h-[500px] w-full overflow-hidden rounded-2xl bg-white/80 backdrop-blur-sm border border-white/60 shadow-2xl transform hover:scale-[1.02] transition-transform duration-500">
              <Image
                src={resolveProductImage(product.imageUrl, product.category?.imageUrl)}
                alt={product.name}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-contain p-8"
              />
            </div>
            
            {/* Floating info cards - glassmorphism style */}
            {product.oemNumber && (
              <div className="absolute top-4 left-4 bg-gradient-to-br from-[#E85A28] to-[#FF6B35] rounded-2xl p-4 shadow-xl transform hover:-translate-y-1 transition-all duration-300">
                <div className="text-xs text-white font-medium mb-1">OEM Broj</div>
                <div className="font-mono text-lg font-bold text-white">{product.oemNumber}</div>
              </div>
            )}
            
            {typeof product.stock === 'number' && (
              <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-md border border-white/60 rounded-2xl p-4 shadow-xl transform hover:-translate-y-1 transition-all duration-300">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center">
                    <span className="text-2xl font-bold text-success">{product.stock}</span>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 font-medium">Dostupnost</div>
                    <div className="text-sm font-bold text-success">Na stanju</div>
                  </div>
                </div>
              </div>
            )}
            
            {product.catalogNumber && (
              <div className="absolute top-4 right-4 bg-gradient-to-br from-[#E85A28] to-[#FF6B35] rounded-2xl p-3 shadow-xl">
                <div className="text-xs text-white font-medium">Kataloški</div>
                <div className="font-mono text-sm font-bold text-white">{product.catalogNumber}</div>
              </div>
            )}
          </div>
          
          {/* Product Info */}
          <div className="space-y-5">
            {/* Category & Manufacturer Badges */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Category Badge - brand orange */}
              <div className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-[#E85A28] to-[#FF6B35] text-white rounded-full text-xs font-bold shadow-lg">
                {product.category?.name || 'Nekategorizirano'}
              </div>
              
              {/* Manufacturer Badge - blue gradient */}
              {product.manufacturer && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full text-xs font-bold shadow-lg">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  {product.manufacturer.name}
                </div>
              )}
            </div>
            
            {/* Product Title - smanjeno */}
            <h1 className="text-2xl lg:text-3xl font-bold text-primary leading-tight">
              {product.name}
            </h1>
            
            {/* Description - smanjeno */}
            {product.description && (
              <p className="text-slate-600 text-sm leading-relaxed line-clamp-3">
                {product.description}
              </p>
            )}
            
            {/* Price Section with modern styling */}
            <div className="bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl p-5 shadow-lg">
              {product.originalPrice ? (
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold text-sunfire-600">
                      {formatPrice(product.price)}
                    </p>
                    <span className="text-white text-xs font-bold px-2 py-1 rounded-full bg-gradient-to-r from-[#E85A28] to-[#FF6B35] shadow-md">
                      {product.pricingSource === 'FEATURED' ? '🔥 Akcija' : '💼 B2B'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-base text-slate-400 line-through">
                      {formatPrice(product.originalPrice)}
                    </p>
                    <div className="flex items-center gap-1 text-success font-semibold text-sm">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>-{formatPrice(product.originalPrice - product.price)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-3xl font-bold text-sunfire-600">
                  {formatPrice(product.price)}
                </p>
              )}
            </div>
            
            {/* Quantity Counter + Add to Cart */}
            <div className="flex items-center gap-3">
              {/* Quantity Counter */}
              <div className="flex items-center bg-white/80 backdrop-blur-sm border border-white/60 rounded-xl shadow-lg">
                <button
                  onClick={decrementQuantity}
                  className="p-3 hover:bg-slate-100 rounded-l-xl transition-colors"
                  aria-label="Smanji količinu"
                >
                  <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                </button>
                <div className="px-6 py-3 font-bold text-lg text-primary min-w-[60px] text-center">
                  {quantity}
                </div>
                <button
                  onClick={incrementQuantity}
                  className="p-3 hover:bg-slate-100 rounded-r-xl transition-colors"
                  aria-label="Povećaj količinu"
                >
                  <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
              
              {/* Add to Cart Button */}
              <button
                onClick={handleAddToCart}
                className="group flex-1 bg-gradient-to-r from-[#081229] via-[#0f2443] to-[#143560] text-white font-bold py-3.5 px-6 rounded-xl shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 flex items-center justify-center space-x-2"
              >
                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 6M7 13l1.5-6M17 21a2 2 0 100-4 2 2 0 000 4zM9 21a2 2 0 100-4 2 2 0 000 4z" />
                </svg>
                <span>Dodaj u korpu</span>
              </button>
            </div>
            
            {/* Additional Info Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/60 backdrop-blur-sm border border-white/60 rounded-xl p-3 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-4 h-4 text-success" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs font-bold text-slate-700">Kvalitet</span>
                </div>
                <p className="text-xs text-slate-600">Originalni dijelovi</p>
              </div>
              
              <div className="bg-white/60 backdrop-blur-sm border border-white/60 rounded-xl p-3 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs font-bold text-slate-700">Sigurnost</span>
                </div>
                <p className="text-xs text-slate-600">Sigurna kupovina</p>
              </div>
              
              <div className="bg-white/60 backdrop-blur-sm border border-white/60 rounded-xl p-3 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-4 h-4 text-sunfire-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                    <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
                  </svg>
                  <span className="text-xs font-bold text-slate-700">Dostava</span>
                </div>
                <p className="text-xs text-slate-600">Brza isporuka</p>
              </div>
              
              <div className="bg-white/60 backdrop-blur-sm border border-white/60 rounded-xl p-3 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs font-bold text-slate-700">Podrška</span>
                </div>
                <p className="text-xs text-slate-600">24/7 pomoć</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Modern tabs with glassmorphism */}
      <div>
        <Tabs defaultValue="compatibility" className="w-full">
          {/* Modern tab navigation - increased height */}
          <TabsList className="grid w-full grid-cols-3 rounded-2xl p-3 bg-white/80 backdrop-blur-sm border border-white/60 shadow-lg h-auto">
            <TabsTrigger 
              value="compatibility"
              className="flex items-center justify-center space-x-2 py-5 px-6 rounded-xl font-bold text-slate-700 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#081229] data-[state=active]:via-[#0f2443] data-[state=active]:to-[#143560] data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300"
            >
              <Car className="h-5 w-5" />
              <span className="hidden sm:inline">Kompatibilnost</span>
            </TabsTrigger>
            <TabsTrigger 
              value="specifications"
              className="flex items-center justify-center space-x-2 py-5 px-6 rounded-xl font-bold text-slate-700 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#081229] data-[state=active]:via-[#0f2443] data-[state=active]:to-[#143560] data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300"
            >
              <Settings className="h-5 w-5" />
              <span className="hidden sm:inline">Specifikacije</span>
            </TabsTrigger>
            <TabsTrigger 
              value="references"
              className="flex items-center justify-center space-x-2 py-5 px-6 rounded-xl font-bold text-slate-700 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#081229] data-[state=active]:via-[#0f2443] data-[state=active]:to-[#143560] data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300"
            >
              <Tag className="h-5 w-5" />
              <span className="hidden sm:inline">Reference</span>
            </TabsTrigger>
          </TabsList>
          
          {/* Modern compatibility tab */}
          <TabsContent value="compatibility" className="relative rounded-3xl p-8 mt-6 bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 border border-white/60 shadow-xl overflow-hidden">
            {/* Texture overlay */}
            <div
              className="pointer-events-none absolute inset-0 z-0 opacity-[0.04]"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 2px 2px, rgba(27,58,95,0.2) 1px, transparent 0), radial-gradient(circle at 50% 50%, rgba(255,107,53,0.08) 0%, transparent 70%)',
                backgroundSize: '32px 32px, 100% 100%',
              }}
            />
            {product.vehicleFitments && product.vehicleFitments.length > 0 ? (
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center space-x-4">
                    <div className="bg-gradient-to-br from-[#E85A28] to-[#FF6B35] p-4 rounded-2xl shadow-lg">
                      <Car className="h-7 w-7 text-white" />
                    </div>
                    <h3 className="text-3xl font-bold text-primary">Kompatibilna vozila</h3>
                  </div>
                  <div className="text-white px-5 py-3 rounded-2xl font-bold shadow-lg bg-gradient-to-r from-[#E85A28] to-[#FF6B35]">
                    {product.vehicleFitments.length} {product.vehicleFitments.length === 1 ? 'vozilo' : 'vozila'}
                  </div>
                </div>

                <div className="space-y-4">
                  {groupedFitments.map((group) => {
                    const isExpanded = expandedBrands[group.brandKey];
                    const BrandIcon = iconForBrand(group.brandName);
                    const sortedModels = [...group.models].sort((a, b) => {
                      const am = a.generation.model.name.localeCompare(b.generation.model.name);
                      if (am !== 0) return am;
                      const ag = a.generation.name.localeCompare(b.generation.name);
                      if (ag !== 0) return ag;
                      return (a.engine?.engineCode || '').localeCompare(b.engine?.engineCode || '');
                    });

                    const generationSummaries = (() => {
                      const map = new Map<string, { key: string; modelId: string; modelName: string; generationName: string; fitments: VehicleFitment[] }>();
                      for (const fitment of sortedModels) {
                        const modelId = fitment.generation.model.id;
                        const key = `${modelId}-${fitment.generation.id}`;
                        const entry = map.get(key);
                        if (entry) {
                          entry.fitments.push(fitment);
                        } else {
                          map.set(key, {
                            key,
                            modelId,
                            modelName: fitment.generation.model.name,
                            generationName: fitment.generation.name,
                            fitments: [fitment],
                          });
                        }
                      }
                      return Array.from(map.values()).map((group) => {
                        const first = group.fitments[0];
                        return {
                          key: group.key,
                          modelId: group.modelId,
                          modelName: group.modelName,
                          generationName: group.generationName,
                          period: formatCompatibilityPeriod(first),
                          engines: buildEngineEntries(group.fitments),
                          bodySummary: summarizeBodyStyles(group.fitments),
                          positionSummary: summarizePositions(group.fitments),
                          notes: summarizeNotes(group.fitments),
                        };
                      });
                    })();

                    const modelGroups = (() => {
                      const map = new Map<string, { key: string; modelName: string; generations: typeof generationSummaries }>();
                      generationSummaries.forEach((summary) => {
                        const entry = map.get(summary.modelId);
                        if (entry) {
                          entry.generations.push(summary);
                        } else {
                          map.set(summary.modelId, {
                            key: summary.modelId,
                            modelName: summary.modelName,
                            generations: [summary],
                          });
                        }
                      });
                      return Array.from(map.values()).sort((a, b) => a.modelName.localeCompare(b.modelName));
                    })();

                    return (
                      <div key={group.brandKey} className="rounded-2xl border border-white/50 bg-white/70 backdrop-blur-sm shadow-lg">
                        <button
                          type="button"
                          onClick={() => toggleBrand(group.brandKey)}
                          className="w-full flex items-center justify-between px-5 py-4 text-left rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary/60"
                        >
                          <div className="flex items-center gap-4">
                            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-primary/10 to-primary-dark/10 flex items-center justify-center shadow-inner">
                              {BrandIcon ? (
                                <BrandIcon size="28" color="#0f172a" />
                              ) : (
                                <Car className="w-5 h-5 text-primary" />
                              )}
                            </div>
                            <div>
                              <div className="text-lg font-bold text-primary">{group.brandName}</div>
                              <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                                {group.models.length} {group.models.length === 1 ? 'vozilo' : 'vozila'}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-500">{isExpanded ? 'Sakrij' : 'Prikaži'}</span>
                            <svg
                              className={`w-5 h-5 text-primary transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="border-t border-white/40">
                            <div className="hidden lg:flex flex-col gap-4 p-4">
                              {modelGroups.map((model) => (
                                <div
                                  key={model.key}
                                  className="rounded-2xl border border-slate-200/70 bg-white/95 backdrop-blur-sm shadow-xl overflow-hidden"
                                >
                                  <div className="px-6 py-4 bg-gradient-to-r from-[#081229] via-[#0f2443] to-[#143560] text-white flex items-center justify-between">
                                    <div className="text-lg font-semibold tracking-wide uppercase">
                                      {model.modelName}
                                    </div>
                                    <span className="text-xs font-medium bg-white/15 px-3 py-1 rounded-full">
                                      {model.generations.length} {model.generations.length === 1 ? 'generacija' : 'generacije'}
                                    </span>
                                  </div>
                                  <div className="overflow-x-auto">
                                    <table className="min-w-full text-sm">
                                      <thead className="bg-slate-50 text-slate-700">
                                        <tr>
                                          <th className="text-left px-6 py-3 font-semibold w-[34%]">Generacija</th>
                                          <th className="text-left px-6 py-3 font-semibold w-[22%]">Period</th>
                                          <th className="text-left px-6 py-3 font-semibold">Motori</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-200/60">
                                        {model.generations.map((generation) => (
                                          <tr key={generation.key} className="hover:bg-white/70 transition-colors">
                                            <td className="px-6 py-4 align-top">
                                              <div className="text-slate-900 font-semibold">{generation.generationName}</div>
                                            </td>
                                            <td className="px-6 py-4 align-top">
                                              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-primary/10 text-primary font-semibold text-xs">
                                                {generation.period}
                                              </span>
                                            </td>
                                            <td className="px-6 py-4">
                                              <EngineListToggle entries={generation.engines} variant="table" />
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div className="lg:hidden space-y-4 p-4">
                              {modelGroups.map((model) => (
                                <div
                                  key={model.key}
                                  className="rounded-2xl border border-white/50 bg-gradient-to-br from-white/95 via-white to-white/80 shadow-xl"
                                >
                                  <div className="px-4 py-3 bg-gradient-to-r from-[#081229] via-[#0f2443] to-[#143560] text-white rounded-t-2xl flex items-center justify-between">
                                    <h4 className="text-sm font-bold uppercase tracking-wide">{model.modelName}</h4>
                                    <span className="text-[10px] font-medium bg-white/20 px-2 py-0.5 rounded-full">
                                      {model.generations.length} {model.generations.length === 1 ? 'generacija' : 'generacije'}
                                    </span>
                                  </div>
                                  <div className="p-4 space-y-3">
                                    {model.generations.map((generation) => (
                                      <div key={generation.key} className="bg-white/90 border border-slate-100 rounded-xl p-3 shadow-sm">
                                        <div className="flex items-start justify-between">
                                          <div>
                                            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{generation.generationName}</p>
                                          </div>
                                          <span className="inline-flex items-center px-2 py-1 rounded-full bg-primary/10 text-primary font-bold text-[11px]">
                                            {generation.period}
                                          </span>
                                        </div>
                                        <div className="mt-3 space-y-2 text-xs">
                                          <div>
                                            <span className="text-slate-500 block mb-2 font-semibold">Motori:</span>
                                            <EngineListToggle entries={generation.engines} variant="card" />
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-slate-500">Karoserija:</span>
                                            <span className="text-slate-900 font-semibold text-right">{generation.bodySummary}</span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-slate-500">Pozicija:</span>
                                            <span className="text-slate-900 font-semibold text-right">{generation.positionSummary}</span>
                                          </div>
                                          {generation.notes.length > 0 && (
                                            <div className="mt-2 pt-2 border-t border-slate-200 text-xs text-slate-500 italic space-y-1">
                                              {generation.notes.map((note) => (
                                                <div key={note}>{note}</div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

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
          
          <TabsContent value="specifications" className="mt-6">
            <div className="space-y-6">
              {/* Atributi kategorije */}
              {product.attributeValues && product.attributeValues.length > 0 && (
                <div className="relative rounded-3xl p-8 bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 border border-white/60 shadow-xl overflow-hidden">
                  {/* Texture overlay */}
                  <div
                    className="pointer-events-none absolute inset-0 z-0 opacity-[0.04]"
                    style={{
                      backgroundImage:
                        'radial-gradient(circle at 2px 2px, rgba(27,58,95,0.2) 1px, transparent 0), radial-gradient(circle at 50% 50%, rgba(255,107,53,0.08) 0%, transparent 70%)',
                      backgroundSize: '32px 32px, 100% 100%',
                    }}
                  />
                  <div className="relative z-10">
                    <div className="flex items-center space-x-4 mb-6">
                      <div className="bg-gradient-to-br from-[#E85A28] to-[#FF6B35] p-4 rounded-2xl shadow-lg">
                        <Settings className="h-7 w-7 text-white" />
                      </div>
                      <h3 className="text-3xl font-bold text-primary">Glavne karakteristike</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {product.attributeValues.map((attributeValue) => (
                        <div key={attributeValue.id} className="bg-white/70 backdrop-blur-sm border border-white/60 rounded-xl p-4 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
                          <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                            {attributeValue.attribute.label}
                          </dt>
                          <dd className="text-lg text-slate-900 font-bold flex items-center gap-2">
                            {attributeValue.value}
                            {attributeValue.attribute.unit && (
                              <span className="text-xs text-white bg-gradient-to-r from-[#E85A28] to-[#FF6B35] px-2.5 py-1 rounded-full font-mono shadow-md">{attributeValue.attribute.unit}</span>
                            )}
                          </dd>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tehničke specifikacije i Dimenzije - 2-column layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Tehničke specifikacije */}
                {product.technicalSpecs && Object.keys(product.technicalSpecs as Record<string, any>).length > 0 && (
                  <div className="rounded-3xl p-6 bg-white/80 backdrop-blur-sm border border-white/60 shadow-xl">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="bg-gradient-to-br from-primary to-primary-dark p-2 rounded-lg">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold text-primary">Tehnički podaci</h3>
                    </div>
                    <div className="space-y-2">
                      {Object.entries(product.technicalSpecs as Record<string, any>)
                        .filter(([, value]) => value !== null && value !== undefined && value !== '')
                        .map(([key, value]) => (
                          <div key={key} className="flex justify-between items-center bg-white/60 rounded-lg px-4 py-3 hover:bg-white/80 transition-colors">
                            <dt className="text-sm text-slate-600 font-medium">{localizeTechKey(key)}</dt>
                            <dd className="text-sm text-slate-900 font-bold">{localizeTechValue(key, value)}</dd>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Dimenzije */}
                {product.dimensions && Object.keys(product.dimensions as Record<string, any>).length > 0 && (
                  <div className="rounded-3xl p-6 bg-white/80 backdrop-blur-sm border border-white/60 shadow-xl">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="bg-gradient-to-br from-primary to-primary-dark p-2 rounded-lg">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold text-primary">Dimenzije</h3>
                    </div>
                    <div className="space-y-2">
                      {Object.entries(product.dimensions as Record<string, any>)
                        .filter(([, value]) => value !== null && value !== undefined && value !== '')
                        .map(([key, value]) => {
                          const formattedKey = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
                          const unit = key.includes('weight') ? 'kg' : 'mm';
                          return (
                            <div key={key} className="flex justify-between items-center bg-white/60 rounded-lg px-4 py-3 hover:bg-white/80 transition-colors">
                              <dt className="text-sm text-slate-600 font-medium">{formattedKey}</dt>
                              <dd className="text-sm text-slate-900 font-bold">
                                {value} <span className="text-xs text-slate-500">{unit}</span>
                              </dd>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>

              {/* Fallback ako nema podataka */}
              {(!product.attributeValues || product.attributeValues.length === 0) &&
               (!product.technicalSpecs || Object.keys(product.technicalSpecs as Record<string, any>).length === 0) &&
               (!product.dimensions || Object.keys(product.dimensions as Record<string, any>).length === 0) && (
                <div className="rounded-3xl p-8 mt-6 text-center py-16 text-slate-500 bg-white/80 backdrop-blur-sm border border-white/60 shadow-xl">
                  <Settings className="h-16 w-16 mx-auto text-slate-400" />
                  <p className="mt-4 text-lg">Nema dostupnih tehničkih specifikacija</p>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="references" className="mt-6">
            <div className="space-y-6">
              <div className="relative rounded-3xl p-8 bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 border border-white/60 shadow-xl overflow-hidden">
                {/* Texture overlay */}
                <div
                  className="pointer-events-none absolute inset-0 z-0 opacity-[0.04]"
                  style={{
                    backgroundImage:
                      'radial-gradient(circle at 2px 2px, rgba(27,58,95,0.2) 1px, transparent 0), radial-gradient(circle at 50% 50%, rgba(255,107,53,0.08) 0%, transparent 70%)',
                    backgroundSize: '32px 32px, 100% 100%',
                  }}
                />
                <div className="relative z-10">
                  <div className="flex items-center space-x-4 mb-6">
                    <div className="bg-gradient-to-br from-[#E85A28] to-[#FF6B35] p-4 rounded-2xl shadow-lg">
                      <BookCopy className="h-7 w-7 text-white" />
                    </div>
                    <h3 className="text-3xl font-bold text-primary">Reference i zamjenski proizvodi</h3>
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
                          <div key={manufacturer} className="bg-white/70 backdrop-blur-sm border border-white/60 rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all duration-300">
                            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200">
                              <div className="bg-gradient-to-br from-[#E85A28] to-[#FF6B35] p-1.5 rounded-lg">
                                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                                </svg>
                              </div>
                              <h4 className="font-bold text-primary text-lg">{manufacturer}</h4>
                            </div>
                            <ul className="space-y-2">
                              {(refs as ProductReference[]).map((ref: ProductReference) => (
                                <li key={ref.id} className="bg-white/80 px-3 py-2.5 rounded-xl border border-white/60 shadow-sm hover:shadow-md transition-all">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-mono text-sm text-slate-900 font-bold">{ref.referenceNumber}</span>
                                    <button 
                                      onClick={() => copyToClipboard(ref.referenceNumber)}
                                      className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                                      aria-label="Kopiraj"
                                    >
                                      <Copy className="h-4 w-4 text-slate-500 hover:text-[#E85A28]" />
                                    </button>
                                  </div>
                                  {ref.replacementId && (
                                    <div className="mt-3 pt-3 border-t border-slate-200">
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
              </div>

              {/* Ako je ovaj proizvod zamjena za OEM broj(eve), prikaži i te veze */}
              {product.replacementFor && product.replacementFor.length > 0 && (
                <div className="relative rounded-3xl p-8 bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 border border-white/60 shadow-xl overflow-hidden">
                  {/* Texture overlay */}
                  <div
                    className="pointer-events-none absolute inset-0 z-0 opacity-[0.04]"
                    style={{
                      backgroundImage:
                        'radial-gradient(circle at 2px 2px, rgba(27,58,95,0.2) 1px, transparent 0), radial-gradient(circle at 50% 50%, rgba(255,107,53,0.08) 0%, transparent 70%)',
                      backgroundSize: '32px 32px, 100% 100%',
                    }}
                  />
                  <div className="relative z-10">
                    <div className="flex items-center space-x-4 mb-6">
                      <div className="bg-gradient-to-br from-[#E85A28] to-[#FF6B35] p-4 rounded-2xl shadow-lg">
                        <Tag className="h-7 w-7 text-white" />
                      </div>
                      <h3 className="text-3xl font-bold text-primary">Ovaj proizvod je zamjena za OEM</h3>
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
                          <div key={manufacturer} className="bg-white/70 backdrop-blur-sm border border-white/60 rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all duration-300">
                            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200">
                              <div className="bg-gradient-to-br from-primary to-primary-dark p-1.5 rounded-lg">
                                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                                </svg>
                              </div>
                              <h4 className="font-bold text-primary text-lg">{manufacturer}</h4>
                            </div>
                            <ul className="space-y-2">
                              {(refs as ProductReference[]).map((ref: ProductReference) => (
                                <li key={ref.id} className="bg-white/80 px-3 py-2.5 rounded-xl border border-white/60 shadow-sm hover:shadow-md transition-all">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-mono text-sm text-slate-900 font-bold">{ref.referenceNumber}</span>
                                    <button 
                                      onClick={() => { navigator.clipboard.writeText(ref.referenceNumber); toast.success(`Kopirano: ${ref.referenceNumber}`); }}
                                      className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                                      aria-label="Kopiraj"
                                    >
                                      <Copy className="h-4 w-4 text-slate-500 hover:text-primary" />
                                    </button>
                                  </div>
                                  {/* Prikaži karticu OEM proizvoda (productId) na koji je vezan ovaj ref */}
                                  {ref.productId && (
                                    <div className="mt-3 pt-3 border-t border-slate-200">
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
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Related Products Section */}
      <RelatedProductsSection categoryId={product.category?.id} currentProductId={product.id} />
    </div>
  );
};

// Related Products Component
const RelatedProductsSection = ({ categoryId, currentProductId }: { categoryId?: string; currentProductId: string }) => {
  const [relatedProducts, setRelatedProducts] = useState<Array<Product & { category: Category | null }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!categoryId) {
      setLoading(false);
      return;
    }

    fetch(`/api/products/related?categoryId=${categoryId}&currentProductId=${currentProductId}`)
      .then(res => res.json())
      .then(data => {
        setRelatedProducts(data.slice(0, 4)); // Prikaži max 4 proizvoda
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [categoryId, currentProductId]);

  if (loading) {
    return (
      <div className="rounded-3xl p-8 bg-white/80 backdrop-blur-sm border border-white/60 shadow-xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-64 bg-slate-200 rounded-2xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (relatedProducts.length === 0) return null;

  return (
    <div className="relative rounded-3xl p-8 bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 border border-white/60 shadow-xl overflow-hidden">
      {/* Subtle texture overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 2px 2px, rgba(27,58,95,0.2) 1px, transparent 0), radial-gradient(circle at 50% 50%, rgba(255,107,53,0.08) 0%, transparent 70%)',
          backgroundSize: '32px 32px, 100% 100%',
        }}
      />
      <div className="relative z-10 flex items-center space-x-4 mb-8">
        <div className="bg-gradient-to-br from-[#E85A28] to-[#FF6B35] p-4 rounded-2xl shadow-lg">
          <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <h3 className="text-3xl font-bold text-primary">Slični proizvodi</h3>
      </div>
      
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {relatedProducts.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
};
