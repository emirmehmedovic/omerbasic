"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type ArticleOENumber = {
  id: string;
  oemNumber: string;
  manufacturer: string | null;
  referenceType: string | null;
};

type ProductWithOEM = {
  id: string;
  oemNumber?: string | null; // Backward compatibility
  articleOENumbers?: ArticleOENumber[] | null;
};

export default function ProductOEMSummary({ 
  productId, 
  productOemNumber, 
  articleOENumbers 
}: { 
  productId: string;
  productOemNumber?: string | null;
  articleOENumbers?: ArticleOENumber[] | null;
}) {
  const [oemNumbers, setOemNumbers] = useState<ArticleOENumber[]>([]);
  const [hovered, setHovered] = useState(false);
  const [hoverCoords, setHoverCoords] = useState<{ top: number; left: number; width: number } | null>(null);
  const oemRef = useRef<HTMLDivElement>(null);
  const enterTimer = useRef<any>(null);
  const leaveTimer = useRef<any>(null);

  useEffect(() => {
    // Kombiniraj backward compatibility (Product.oemNumber) i novi pristup (ArticleOENumber)
    const allOEMs: ArticleOENumber[] = [];
    
    // Dodaj Product.oemNumber ako postoji i nije već u articleOENumbers
    if (productOemNumber && productOemNumber.trim()) {
      const normalizedMain = productOemNumber.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      const existsInArticleOENumbers = articleOENumbers?.some(aoe => 
        aoe.oemNumber.replace(/[^A-Za-z0-9]/g, '').toUpperCase() === normalizedMain
      );
      
      if (!existsInArticleOENumbers) {
        allOEMs.push({
          id: `legacy-${productId}`,
          oemNumber: productOemNumber,
          manufacturer: null,
          referenceType: 'Original',
        });
      }
    }
    
    // Dodaj sve ArticleOENumber zapise
    if (articleOENumbers && articleOENumbers.length > 0) {
      allOEMs.push(...articleOENumbers);
    }
    
    setOemNumbers(allOEMs);
  }, [productId, productOemNumber, articleOENumbers]);

  const firstOEM = useMemo(() => oemNumbers[0] || null, [oemNumbers]);
  const remainingOEMs = useMemo(() => oemNumbers.slice(1), [oemNumbers]);

  const handleOEMEnter = () => {
    if (leaveTimer.current) {
      clearTimeout(leaveTimer.current);
      leaveTimer.current = null;
    }
    if (enterTimer.current) clearTimeout(enterTimer.current);
    enterTimer.current = setTimeout(() => {
      if (!oemRef.current) return;
      const r = oemRef.current.getBoundingClientRect();
      setHoverCoords({ 
        top: r.bottom + window.scrollY + 8, 
        left: r.left + window.scrollX, 
        width: Math.max(r.width, 250) 
      });
      setHovered(true);
    }, 150);
  };

  const handleOEMLeave = () => {
    if (enterTimer.current) {
      clearTimeout(enterTimer.current);
      enterTimer.current = null;
    }
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    leaveTimer.current = setTimeout(() => {
      setHovered(false);
      setHoverCoords(null);
    }, 150);
  };

  useEffect(() => () => {
    if (enterTimer.current) clearTimeout(enterTimer.current);
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
  }, []);

  if (!firstOEM) return null;

  return (
    <div className="relative mb-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div
          ref={oemRef}
          onMouseEnter={handleOEMEnter}
          onMouseLeave={handleOEMLeave}
          className="inline-flex items-center gap-1.5 text-xs font-bold bg-slate-50 backdrop-blur-sm border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer"
        >
          <span className="text-slate-500 text-[10px] uppercase tracking-wider">OEM</span>
          <span className="font-mono tracking-tight text-slate-700">{firstOEM.oemNumber}</span>
          {remainingOEMs.length > 0 && (
            <span className="ml-1 text-slate-400 text-[10px]">+{remainingOEMs.length}</span>
          )}
        </div>
      </div>
      
      {hovered && remainingOEMs.length > 0 && hoverCoords && typeof window !== 'undefined' && createPortal(
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
              <span className="text-xs font-bold text-slate-900">Ostali OEM brojevi</span>
            </div>
            <div className="max-h-60 overflow-auto pr-1">
              <div className="space-y-2">
                {remainingOEMs.map((oem) => (
                  <div key={oem.id} className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                    <div className="font-semibold font-mono">{oem.oemNumber}</div>
                    {oem.manufacturer && (
                      <div className="text-slate-500 text-[10px] mt-0.5">{oem.manufacturer}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>, document.body)
      }
    </div>
  );
}

