import { z } from "zod";

// Schema za validaciju grupe atributa
export const attributeGroupSchema = z.object({
  name: z.string().min(1, "Naziv grupe je obavezan"),
  label: z.string().min(1, "Oznaka grupe je obavezna"),
  sortOrder: z.number().default(0),
  categoryId: z.string().min(1, "ID kategorije je obavezan"),
});

// Schema za validacijska pravila atributa
export const validationRulesSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
  pattern: z.string().optional(),
  required: z.boolean().optional(),
}).optional().nullable();

// Schema za podržane jedinice mjere
export const supportedUnitsSchema = z.object({
  defaultUnit: z.string(),
  units: z.array(z.string()),
  conversionFactors: z.record(z.string(), z.number()),
}).optional().nullable();

// Schema za validaciju atributa kategorije
export const categoryAttributeSchema = z.object({
  name: z.string().min(1, "Naziv atributa je obavezan"),
  label: z.string().min(1, "Oznaka atributa je obavezna"),
  type: z.enum(["string", "number", "boolean", "enum", "range", "dimension"]),
  unit: z.string().optional().nullable(),
  options: z.any().optional().nullable(),
  isRequired: z.boolean().default(false),
  isFilterable: z.boolean().default(false),
  isComparable: z.boolean().default(false),
  sortOrder: z.number().default(0),
  categoryId: z.string().min(1, "ID kategorije je obavezan"),
  groupId: z.string().optional().nullable(),
  validationRules: validationRulesSchema,
  supportedUnits: supportedUnitsSchema,
});

// Schema za validaciju vrijednosti atributa proizvoda
export const productAttributeValueSchema = z.object({
  attributeId: z.string().min(1, "ID atributa je obavezan"),
  value: z.string().min(1, "Vrijednost atributa je obavezna"),
  numericValue: z.number().optional().nullable(),
  unit: z.string().optional().nullable(),
});

// Schema za validaciju batch unosa vrijednosti atributa
export const batchAttributeValuesSchema = z.array(productAttributeValueSchema);

// Schema za validaciju cross-reference
export const productCrossReferenceSchema = z.object({
  referenceType: z.string().min(1, "Tip reference je obavezan"),
  referenceNumber: z.string().min(1, "Broj reference je obavezan"),
  manufacturer: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  replacementId: z.string().optional().nullable(),
});

// Schema za validaciju batch unosa cross-referenci
export const batchCrossReferencesSchema = z.array(productCrossReferenceSchema);

// Schema za validaciju predloška atributa
export const attributeTemplateSchema = z.object({
  name: z.string().min(1, "Naziv predloška je obavezan"),
  description: z.string().optional().nullable(),
  attributes: z.array(
    z.object({
      name: z.string().min(1, "Naziv atributa je obavezan"),
      label: z.string().min(1, "Oznaka atributa je obavezna"),
      type: z.enum(["string", "number", "boolean", "enum", "range", "dimension"]),
      unit: z.string().optional().nullable(),
      options: z.any().optional().nullable(),
      isRequired: z.boolean().default(false),
      isFilterable: z.boolean().default(false),
      isComparable: z.boolean().default(false),
      validationRules: validationRulesSchema,
      supportedUnits: supportedUnitsSchema,
    })
  ),
});
