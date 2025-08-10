'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface CategoryAttributesFilterProps {
  categoryId: string;
  onAttributesChange: (attributes: Record<string, string | number>) => void;
  selectedAttributes?: Record<string, string | number>;
}

interface CategoryAttribute {
  id: string;
  name: string;
  type: string;
  options: string[];
  required: boolean;
}

export default function CategoryAttributesFilter({ 
  categoryId, 
  onAttributesChange, 
  selectedAttributes = {} 
}: CategoryAttributesFilterProps) {
  const [attributes, setAttributes] = useState<CategoryAttribute[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedValues, setSelectedValues] = useState<Record<string, string | number>>(selectedAttributes);

  // Fetch attributes when category changes
  useEffect(() => {
    if (!categoryId) {
      setAttributes([]);
      setSelectedValues({});
      return;
    }

    const fetchAttributes = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/categories/${categoryId}/attributes`);
        if (!response.ok) {
          throw new Error('Failed to fetch category attributes');
        }
        const data = await response.json();
        setAttributes(data);
      } catch (error) {
        console.error('Error fetching category attributes:', error);
        setAttributes([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAttributes();
  }, [categoryId]);

  // Reset selected values when attributes change
  useEffect(() => {
    const validSelectedValues: Record<string, string | number> = {};
    
    // Zadrži samo one odabrane vrijednosti koje još uvijek postoje u novim atributima
    Object.entries(selectedValues).forEach(([attrId, value]) => {
      if (attributes.some(attr => attr.id === attrId)) {
        validSelectedValues[attrId] = value;
      }
    });
    
    setSelectedValues(validSelectedValues);
    onAttributesChange(validSelectedValues);
  }, [attributes, onAttributesChange]);

  const handleAttributeChange = (attributeId: string, value: string | number) => {
    const newValues = { ...selectedValues };
    
    if (value && value !== 'all') {
      newValues[attributeId] = value;
    } else {
      delete newValues[attributeId];
    }
    
    setSelectedValues(newValues);
    onAttributesChange(newValues);
  };

  if (loading) {
    return <div className="text-sm text-gray-500">Učitavanje atributa...</div>;
  }

  if (attributes.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="font-medium text-sm">Atributi kategorije</h3>
      
      {attributes.map((attribute) => (
        <div key={attribute.id} className="space-y-2">
          <Label htmlFor={`attr-${attribute.id}`} className="text-sm font-normal">
            {attribute.name}
          </Label>
          
          {attribute.type === 'SELECT' && attribute.options.length > 0 && (
            <Select
              value={selectedValues[attribute.id] !== undefined ? String(selectedValues[attribute.id]) : ''}
              onValueChange={(value) => handleAttributeChange(attribute.id, value)}
            >
              <SelectTrigger id={`attr-${attribute.id}`} className="w-full">
                <SelectValue placeholder="Odaberite..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Svi</SelectItem>
                {attribute.options.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          {attribute.type === 'TEXT' && (
            <Input
              id={`attr-${attribute.id}`}
              type="text"
              placeholder="Unesite vrijednost..."
              value={selectedValues[attribute.id] !== undefined ? String(selectedValues[attribute.id]) : ''}
              onChange={(e) => handleAttributeChange(attribute.id, e.target.value)}
              className="w-full"
            />
          )}
          
          {attribute.type === 'NUMBER' && (
            <Input
              id={`attr-${attribute.id}`}
              type="number"
              placeholder="Unesite vrijednost..."
              value={selectedValues[attribute.id] !== undefined ? String(selectedValues[attribute.id]) : ''}
              onChange={(e) => handleAttributeChange(attribute.id, e.target.value)}
              className="w-full"
            />
          )}
          
          {attribute.type === 'BOOLEAN' && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id={`attr-${attribute.id}`}
                checked={selectedValues[attribute.id] === 'true'}
                onCheckedChange={(checked) => 
                  handleAttributeChange(attribute.id, checked ? 'true' : '')
                }
              />
              <label
                htmlFor={`attr-${attribute.id}`}
                className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Da
              </label>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
