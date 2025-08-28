'use client';

import { useState, FormEvent, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isLikelyVin } from '@/lib/vin/validate';

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    const q = query.trim();
    // If input looks like a VIN, redirect to VIN flow
    if (isLikelyVin(q)) {
      const params = new URLSearchParams();
      params.set('code', q.toUpperCase());
      router.push(`/vin?${params.toString()}`);
      return;
    }
    const params = new URLSearchParams();
    params.set('q', q);
    router.push(`/search?${params.toString()}`);
  };

  const clearSearch = () => {
    setQuery('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Efekt za praćenje klika izvan search bara
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <form 
      onSubmit={handleSearch} 
      className={cn(
        "relative w-full max-w-md mx-auto transition-all duration-300",
        isFocused ? "scale-105" : ""
      )}
    >
      <div 
        className={cn(
          "flex items-center relative overflow-hidden transition-all duration-300",
          isFocused 
            ? "bg-white/90 shadow-lg border border-white/50" 
            : "bg-white/50 shadow border border-white/30",
          "backdrop-blur-md rounded-full"
        )}
      >
        <div className="pl-4">
          <Search 
            className={cn(
              "w-5 h-5 transition-colors", 
              isFocused 
                ? "text-orange" 
                : "text-slate-400"
            )} 
          />
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          placeholder="Pretraži po nazivu, kataloškom broju ili VIN (17)..."
          className="w-full px-3 py-2.5 text-slate-700 bg-transparent border-none focus:outline-none focus:ring-0 placeholder:text-slate-400 text-sm"
        />
        
        {query && (
          <button
            type="button"
            onClick={clearSearch}
            className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Očisti pretragu"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        
        <button
          type="submit"
          className={cn(
            "h-full px-4 py-2.5 transition-all",
            query.trim() 
              ? "bg-accent-gradient text-white" 
              : "bg-transparent text-slate-400",
            "hover:shadow-inner"
          )}
          aria-label="Pretraži"
          disabled={!query.trim()}
        >
          <span className="text-sm font-medium">Traži</span>
        </button>
      </div>
      
      {/* Dekorativni elementi */}
      <div className="absolute -z-10 top-1/2 left-1/4 w-8 h-8 rounded-full bg-amber/20 blur-xl transform -translate-y-1/2"></div>
      <div className="absolute -z-10 top-1/2 right-1/4 w-6 h-6 rounded-full bg-orange/20 blur-lg transform -translate-y-1/2"></div>
    </form>
  );
}
