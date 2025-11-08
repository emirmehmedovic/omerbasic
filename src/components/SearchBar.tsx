'use client';

import { useState, FormEvent, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isLikelyVin } from '@/lib/vin/validate';

export function SearchBar({ className, variant = 'light' }: { className?: string; variant?: 'light' | 'dark' }) {
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
        "relative w-full max-w-[720px] transition-all duration-300", 
        isFocused ? "scale-[1.02]" : "",
        className
      )}
    >
      <div 
        className={cn(
          "flex items-center relative overflow-hidden transition-all duration-300 rounded-full",
          variant === 'dark' 
            ? "bg-white/10 backdrop-blur-md border border-white/20 shadow-xl hover:bg-white/15"
            : "bg-white/90 border border-slate-200 shadow-md",
          isFocused && variant === 'dark' && "ring-2 ring-white/30 bg-white/15"
        )}
      >
        <div className="pl-5">
          <Search 
            className={cn(
              "w-5 h-5 transition-colors", 
              variant === 'dark'
                ? isFocused ? "text-[#FF6B35]" : "text-white/70"
                : isFocused ? "text-orange" : "text-slate-400"
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
          className={cn(
            "w-full px-3 py-3 bg-transparent border-none focus:outline-none focus:ring-0 text-sm font-medium",
            variant === 'dark'
              ? "text-white placeholder:text-white/60"
              : "text-slate-700 placeholder:text-slate-400"
          )}
        />
        
        {query && (
          <button
            type="button"
            onClick={clearSearch}
            className={cn(
              "p-2 transition-colors",
              variant === 'dark'
                ? "text-white/60 hover:text-white"
                : "text-slate-400 hover:text-slate-600"
            )}
            aria-label="Očisti pretragu"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        
        <button
          type="submit"
          className={cn(
            "h-full px-6 py-3 transition-all rounded-r-full font-bold",
            variant === 'dark'
              ? query.trim()
                ? "bg-gradient-to-r from-[#E85A28] to-[#FF6B35] text-white shadow-lg hover:shadow-xl hover:scale-[1.02]"
                : "bg-white/5 text-white/40"
              : query.trim() 
                ? "bg-accent-gradient text-white" 
                : "bg-transparent text-slate-400",
            "hover:shadow-inner disabled:cursor-not-allowed"
          )}
          aria-label="Pretraži"
          disabled={!query.trim()}
        >
          <span className="text-sm font-bold">Traži</span>
        </button>
      </div>
      
      {/* Dekorativni elementi */}
      <div className="absolute -z-10 top-1/2 left-1/4 w-8 h-8 rounded-full bg-amber/20 blur-xl transform -translate-y-1/2"></div>
      <div className="absolute -z-10 top-1/2 right-1/4 w-6 h-6 rounded-full bg-orange/20 blur-lg transform -translate-y-1/2"></div>
    </form>
  );
}
