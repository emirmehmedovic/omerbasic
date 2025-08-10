'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { DateRange } from 'react-day-picker';
import { DateRangeFilterValue } from '@/components/admin/DateRangeFilter';

interface DateRangeContextType {
  dateRangeFilter: DateRangeFilterValue;
  setDateRangeFilter: (value: DateRangeFilterValue) => void;
}

const DateRangeContext = createContext<DateRangeContextType | undefined>(undefined);

interface DateRangeProviderProps {
  children: ReactNode;
  defaultValue?: DateRangeFilterValue;
}

export function DateRangeProvider({ children, defaultValue }: DateRangeProviderProps) {
  // Inicijalizacija s defaultValue ili zadnjih 30 dana
  const getDefaultDateRange = (): DateRange => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 30);
    return { from, to };
  };

  const [dateRangeFilter, setDateRangeFilter] = useState<DateRangeFilterValue>(() => {
    // Pokušaj dohvatiti spremljene postavke iz localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('adminDateRangeFilter');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Pretvaranje string datuma natrag u Date objekte
          if (parsed.dateRange) {
            if (parsed.dateRange.from) {
              parsed.dateRange.from = new Date(parsed.dateRange.from);
            }
            if (parsed.dateRange.to) {
              parsed.dateRange.to = new Date(parsed.dateRange.to);
            }
          }
          return parsed;
        } catch (e) {
          console.error('Failed to parse saved date range filter', e);
        }
      }
    }
    
    // Ako nema spremljenih postavki, koristi defaultValue ili zadnjih 30 dana
    return defaultValue || { preset: '30d', dateRange: getDefaultDateRange() };
  });

  // Spremi postavke u localStorage kada se promijene
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('adminDateRangeFilter', JSON.stringify(dateRangeFilter));
    }
  }, [dateRangeFilter]);

  return (
    <DateRangeContext.Provider value={{ dateRangeFilter, setDateRangeFilter }}>
      {children}
    </DateRangeContext.Provider>
  );
}

export function useDateRange() {
  const context = useContext(DateRangeContext);
  if (context === undefined) {
    throw new Error('useDateRange must be used within a DateRangeProvider');
  }
  return context;
}
