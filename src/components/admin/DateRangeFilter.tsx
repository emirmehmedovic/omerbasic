'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { bs } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type DateRangeFilterValue = {
  preset?: string;
  dateRange?: DateRange;
};

interface DateRangeFilterProps {
  onChange: (value: DateRangeFilterValue) => void;
  defaultValue?: DateRangeFilterValue;
  className?: string;
}

export function DateRangeFilter({ onChange, defaultValue, className }: DateRangeFilterProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>(defaultValue?.preset || '30d');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(defaultValue?.dateRange);

  // Predefinirani vremenski rasponi
  const presets = {
    '7d': { label: 'Zadnjih 7 dana', days: 7 },
    '30d': { label: 'Zadnjih 30 dana', days: 30 },
    '90d': { label: 'Zadnjih 90 dana', days: 90 },
    '1y': { label: 'Zadnjih godinu dana', days: 365 },
    'custom': { label: 'Prilagođeni raspon', days: 0 }
  };

  // Funkcija za postavljanje predefiniranog raspona
  const handlePresetChange = (value: string) => {
    setSelectedPreset(value);
    
    if (value === 'custom') {
      // Ako je odabran prilagođeni raspon, otvaramo kalendar
      setIsCalendarOpen(true);
      return;
    }
    
    // Inače postavljamo raspon prema predefiniranom broju dana
    const days = presets[value as keyof typeof presets]?.days || 30;
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    
    const newRange = { from, to };
    setDateRange(newRange);
    setIsCalendarOpen(false);
    
    onChange({ preset: value, dateRange: newRange });
  };

  // Funkcija za postavljanje prilagođenog raspona
  const handleDateRangeChange = (range: DateRange | undefined) => {
    if (!range) return;
    
    setDateRange(range);
    onChange({ preset: 'custom', dateRange: range });
  };

  // Formatiranje prikaza datumskog raspona
  const formatDateRange = () => {
    if (!dateRange?.from) return 'Odaberite raspon';
    
    if (dateRange.to) {
      return `${format(dateRange.from, 'dd.MM.yyyy')} - ${format(dateRange.to, 'dd.MM.yyyy')}`;
    }
    
    return format(dateRange.from, 'dd.MM.yyyy');
  };

  return (
    <div className={cn("flex flex-col sm:flex-row gap-2", className)}>
      <Select value={selectedPreset} onValueChange={handlePresetChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Odaberite period" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(presets).map(([key, { label }]) => (
            <SelectItem key={key} value={key}>{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full sm:w-auto justify-start text-left font-normal",
              !dateRange && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatDateRange()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={handleDateRangeChange}
            numberOfMonths={2}
            locale={bs}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
