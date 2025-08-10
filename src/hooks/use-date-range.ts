"use client";

import { create } from "zustand";
import { addDays, subDays } from "date-fns";

interface DateRangeStore {
  startDate: Date;
  endDate: Date;
  setStartDate: (date: Date) => void;
  setEndDate: (date: Date) => void;
  setDateRange: (startDate: Date, endDate: Date) => void;
  resetDateRange: () => void;
}

export const useDateRange = create<DateRangeStore>((set) => ({
  startDate: subDays(new Date(), 30),
  endDate: new Date(),
  setStartDate: (startDate: Date) => set({ startDate }),
  setEndDate: (endDate: Date) => set({ endDate }),
  setDateRange: (startDate: Date, endDate: Date) => set({ startDate, endDate }),
  resetDateRange: () => set({ 
    startDate: subDays(new Date(), 30),
    endDate: new Date()
  }),
}));

// Alias for backward compatibility
export const useDate = useDateRange;
