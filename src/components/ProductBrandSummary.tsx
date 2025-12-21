"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
import { Car } from 'lucide-react';

type VehicleGeneration = {
  id: string;
  name: string;
  model: {
    id: string;
    name: string;
    brand: {
      id: string;
      name: string;
    };
  };
};

type VehicleFitment = {
  id: string;
  isUniversal: boolean;
  generation: VehicleGeneration;
};

type ProductWithFitments = {
  id: string;
  vehicleFitments?: VehicleFitment[];
};

const brandIconEntries = [
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
];

const iconForBrand = (name: string) => {
  const normalized = name.toLowerCase();
  const entry = brandIconEntries.find(({ match }) => match(normalized));
  return entry?.Icon ?? null;
};

type BrandGroup = {
  brandKey: string;
  brandName: string;
  Icon: any;
  generations: Array<{
    id: string;
    name: string;
    modelName: string;
  }>;
};

function groupByBrand(fitments: VehicleFitment[]): BrandGroup[] {
  const map = new Map<string, BrandGroup>();
  
  for (const fitment of fitments) {
    if (fitment.isUniversal) continue; // Preskoči univerzalne
    
    const brandName = fitment.generation.model.brand.name;
    const brandKey = (fitment.generation.model.brand.id ?? brandName).toLowerCase();
    const Icon = iconForBrand(brandName);
    
    const entry = map.get(brandKey);
    const generationKey = fitment.generation.id;
    
    if (entry) {
      // Provjeri da li generacija već postoji
      const genExists = entry.generations.some(g => g.id === generationKey);
      if (!genExists) {
        entry.generations.push({
          id: fitment.generation.id,
          name: fitment.generation.name,
          modelName: fitment.generation.model.name,
        });
      }
    } else {
      map.set(brandKey, {
        brandKey,
        brandName,
        Icon,
        generations: [{
          id: fitment.generation.id,
          name: fitment.generation.name,
          modelName: fitment.generation.model.name,
        }],
      });
    }
  }
  
  return Array.from(map.values()).sort((a, b) => a.brandName.localeCompare(b.brandName));
}

export default function ProductBrandSummary({ productId, maxInline = 5 }: { productId: string; maxInline?: number }) {
  const [brands, setBrands] = useState<BrandGroup[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hoveredBrand, setHoveredBrand] = useState<string | null>(null);
  const [hoverCoords, setHoverCoords] = useState<{ top: number; left: number; width: number } | null>(null);
  const brandRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const enterTimer = useRef<any>(null);
  const leaveTimer = useRef<any>(null);

  useEffect(() => {
    let alive = true;
    setBrands(null);
    setError(null);
    fetch(`/api/products/${productId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      })
      .then((p: ProductWithFitments) => {
        if (!alive) return;
        const grouped = groupByBrand(p.vehicleFitments || []);
        setBrands(grouped);
      })
      .catch((e) => {
        if (!alive) return;
        setError(typeof e?.message === 'string' ? e.message : 'Greška pri učitavanju marki');
      });
    return () => { alive = false; };
  }, [productId]);

  const inline = useMemo(() => {
    if (!brands || brands.length === 0) return [] as BrandGroup[];
    return brands.slice(0, maxInline);
  }, [brands, maxInline]);

  if (error) return null;

  const handleBrandEnter = (brandKey: string) => {
    if (leaveTimer.current) {
      clearTimeout(leaveTimer.current);
      leaveTimer.current = null;
    }
    if (enterTimer.current) clearTimeout(enterTimer.current);
    enterTimer.current = setTimeout(() => {
      const ref = brandRefs.current.get(brandKey);
      if (!ref) return;
      const r = ref.getBoundingClientRect();
      setHoverCoords({ 
        top: r.bottom + window.scrollY + 8, 
        left: r.left + window.scrollX, 
        width: Math.max(r.width, 200) 
      });
      setHoveredBrand(brandKey);
    }, 150);
  };

  const handleBrandLeave = () => {
    if (enterTimer.current) {
      clearTimeout(enterTimer.current);
      enterTimer.current = null;
    }
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    leaveTimer.current = setTimeout(() => {
      setHoveredBrand(null);
      setHoverCoords(null);
    }, 150);
  };

  useEffect(() => () => {
    if (enterTimer.current) clearTimeout(enterTimer.current);
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
  }, []);

  const hoveredBrandData = hoveredBrand ? brands?.find(b => b.brandKey === hoveredBrand) : null;
  const HoveredIcon = hoveredBrandData?.Icon;

  return (
    <div className="relative mt-1">
      {!brands ? (
        <div className="flex gap-2 mt-1">
          <span className="h-6 w-6 bg-slate-200 rounded animate-pulse" />
          <span className="h-6 w-6 bg-slate-200 rounded animate-pulse" />
          <span className="h-6 w-6 bg-slate-200 rounded animate-pulse hidden sm:inline-block" />
        </div>
      ) : brands.length === 0 ? null : (
        <div className="text-[11px] flex items-center gap-2 flex-wrap">
          <span className="mr-1 text-primary font-bold text-[10px] uppercase tracking-wider">Marke:</span>
          {inline.map((brand) => {
            const Icon = brand.Icon;
            return (
              <div
                key={brand.brandKey}
                ref={(el) => {
                  if (el) brandRefs.current.set(brand.brandKey, el);
                  else brandRefs.current.delete(brand.brandKey);
                }}
                onMouseEnter={() => handleBrandEnter(brand.brandKey)}
                onMouseLeave={handleBrandLeave}
                className="relative inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md hover:scale-110 transition-all duration-300 cursor-pointer"
                title={brand.brandName}
              >
                {Icon ? (
                  <Icon size={20} color="#0f172a" />
                ) : (
                  <Car className="w-4 h-4 text-slate-600" />
                )}
              </div>
            );
          })}
          {brands.length > inline.length && (
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-primary/30 bg-gradient-to-r from-primary/10 to-primary-dark/10 text-primary font-bold shadow-sm text-[10px]">
              +{brands.length - inline.length}
            </span>
          )}
          {hoveredBrand && hoveredBrandData && hoverCoords && typeof window !== 'undefined' && createPortal(
            <div style={{ position: 'absolute', top: 0, left: 0, zIndex: 1000 }}>
              <div 
                style={{ 
                  position: 'absolute', 
                  top: hoverCoords.top, 
                  left: hoverCoords.left, 
                  width: Math.min(hoverCoords.width + 200, window.innerWidth - hoverCoords.left - 16) 
                }} 
                className="pointer-events-none rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-sm shadow-2xl p-4"
              >
                <div className="mb-2 pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    {HoveredIcon && <HoveredIcon size={20} color="#0f172a" />}
                    <span className="text-xs font-bold text-slate-900">{hoveredBrandData.brandName}</span>
                  </div>
                </div>
                <div className="max-h-60 overflow-auto pr-1">
                  <div className="space-y-2">
                    {hoveredBrandData.generations.map((gen) => (
                      <div key={gen.id} className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                        <div className="font-semibold">{gen.modelName}</div>
                        <div className="text-slate-500">{gen.name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>, document.body)
          }
        </div>
      )}
    </div>
  );
}

