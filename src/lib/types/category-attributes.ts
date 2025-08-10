// Tipovi za atribute kategorija
export type AttributeType = 'string' | 'number' | 'boolean' | 'enum';

export interface CategoryAttribute {
  id: string;
  name: string;
  label: string;
  type: AttributeType;
  unit?: string | null;
  options?: string[] | null;
  isRequired: boolean;
  isFilterable: boolean;
  sortOrder: number;
  categoryId: string;
}

export interface CategoryAttributeFormValues {
  name: string;
  label: string;
  type: AttributeType;
  unit?: string | null;
  options?: string[] | null;
  isRequired: boolean;
  isFilterable: boolean;
  sortOrder: number;
  categoryId: string; // Added categoryId field to match schema requirements
}

// Tipovi za vrijednosti atributa proizvoda
export interface ProductAttributeValue {
  id: string;
  value: string;
  productId: string;
  attributeId: string;
  attribute?: CategoryAttribute;
}

export interface ProductAttributeValueFormValues {
  attributeId: string;
  value: string;
}

// Tipovi za cross-reference proizvoda
export interface ProductCrossReference {
  id: string;
  productId: string;
  referenceType: string;
  referenceNumber: string;
  manufacturer?: string | null;
  notes?: string | null;
  replacementId?: string | null;
  replacement?: {
    id: string;
    name: string;
    catalogNumber: string;
    oemNumber?: string | null;
  } | null;
}

export interface ProductCrossReferenceFormValues {
  referenceType: string;
  referenceNumber: string;
  manufacturer?: string | null;
  notes?: string | null;
  replacementId?: string | null;
}
