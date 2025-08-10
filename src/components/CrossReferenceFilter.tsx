'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { useDebouncedCallback } from 'use-debounce';

interface CrossReferenceFilterProps {
  onCrossReferenceChange: (value: string) => void;
  initialValue?: string;
}

export default function CrossReferenceFilter({ 
  onCrossReferenceChange,
  initialValue = ''
}: CrossReferenceFilterProps) {
  const [value, setValue] = useState(initialValue);

  const debouncedChange = useDebouncedCallback((newValue: string) => {
    onCrossReferenceChange(newValue);
  }, 500);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    debouncedChange(newValue);
  };

  return (
    <div className="space-y-4">
      <h3 className="font-medium text-sm">Pretraži po OEM ili aftermarket broju</h3>
      
      <div className="relative">
        <Input
          type="text"
          placeholder="Unesite broj dijela..."
          value={value}
          onChange={handleChange}
          className="pr-10"
        />
        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
      </div>
      
      <div className="text-xs text-gray-500">
        Pretražite po OEM broju, aftermarket broju ili broju zamjenskog dijela
      </div>
    </div>
  );
}
