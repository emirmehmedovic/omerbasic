import { z } from 'zod';

// Shema za dinamičke atribute
export const dynamicAttributesSchema = z.record(z.string(), z.string().optional());

// Shema za validaciju na frontendu (u formi)
export const productFormSchema = z.object({
  name: z.string().min(3, { message: 'Naziv mora imati najmanje 3 znaka.' }).max(255),
  description: z.string().min(10, { message: 'Opis mora imati najmanje 10 znakova.' }),
  price: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: 'Cijena mora biti ispravan pozitivan broj.',
  }),
  imageUrl: z.string().optional().or(z.literal('')), // Removed extra comma
  categoryId: z.string().cuid({ message: 'Kategorija nije ispravna.' }),
  // Dinamički atributi kategorije
  categoryAttributes: dynamicAttributesSchema.optional(),

  // Novi detaljni atributi
  vehicleBrand: z.string().optional().or(z.literal('')),
  vehicleModel: z.string().optional().or(z.literal('')),
  yearOfManufacture: z.string().optional().or(z.literal('')).refine((val) => !val || /^\d{4}$/.test(val), {
    message: 'Godina mora biti ispravan četverocifreni broj.',
  }),
  engineType: z.string().optional().or(z.literal('')),
  catalogNumber: z.string().min(1, { message: 'Kataloški broj je obavezan.' }),
  oemNumber: z.string().optional().or(z.literal('')),
  weight: z.string().optional().or(z.literal('')).refine((val) => !val || !isNaN(parseFloat(val)), {
    message: 'Težina mora biti ispravan broj.',
  }),
  width: z.string().optional().or(z.literal('')).refine((val) => !val || !isNaN(parseFloat(val)), {
    message: 'Širina mora biti ispravan broj.',
  }),
  height: z.string().optional().or(z.literal('')).refine((val) => !val || !isNaN(parseFloat(val)), {
    message: 'Visina mora biti ispravan broj.',
  }),
  length: z.string().optional().or(z.literal('')).refine((val) => !val || !isNaN(parseFloat(val)), {
    message: 'Dužina mora biti ispravan broj.',
  }),
  unitOfMeasure: z.string().optional().or(z.literal('')), 
  stock: z.string().optional().or(z.literal('')).refine((val) => !val || /^\d+$/.test(val), {
    message: 'Zalihe moraju biti cijeli broj.',
  }),
  lowStockThreshold: z.string().optional().or(z.literal('')).refine((val) => !val || /^\d+$/.test(val), {
    message: 'Prag zaliha mora biti cijeli broj ili prazan.',
  }),
  generationIds: z.array(z.string()).optional()
});

// Shema za validaciju na backendu (API) i za slanje podataka
export const productApiSchema = productFormSchema.extend({
  // Transformiramo stringove u brojeve prije slanja na API
  price: z.coerce.number().positive({ message: 'Cijena mora biti pozitivan broj.' }),
  yearOfManufacture: z.preprocess(
    (val) => (val === null || val === undefined) ? '' : String(val),
    z.string().optional()
      .transform(val => {
        if (!val || val === '') return null;
        const num = parseInt(val);
        return isNaN(num) ? null : num;
      })
  ),
  weight: z.preprocess(
    // Pretprocesiranje - pretvaranje u string ako nije
    (val) => (val === null || val === undefined) ? '' : String(val),
    // Zatim validacija i transformacija
    z.string().optional()
      .transform(val => {
        if (!val || val === '') return null;
        const num = parseFloat(val);
        return isNaN(num) ? null : num;
      })
  ),
  width: z.preprocess(
    (val) => (val === null || val === undefined) ? '' : String(val),
    z.string().optional()
      .transform(val => {
        if (!val || val === '') return null;
        const num = parseFloat(val);
        return isNaN(num) ? null : num;
      })
  ),
  height: z.preprocess(
    (val) => (val === null || val === undefined) ? '' : String(val),
    z.string().optional()
      .transform(val => {
        if (!val || val === '') return null;
        const num = parseFloat(val);
        return isNaN(num) ? null : num;
      })
  ),
  length: z.preprocess(
    (val) => (val === null || val === undefined) ? '' : String(val),
    z.string().optional()
      .transform(val => {
        if (!val || val === '') return null;
        const num = parseFloat(val);
        return isNaN(num) ? null : num;
      })
  ),
  stock: z.coerce.number().int().min(0, { message: 'Zalihe ne mogu biti negativne.' }).default(0),
  lowStockThreshold: z.preprocess(
    (val) => (val === null || val === undefined) ? '' : String(val),
    z.string().optional().transform((val) => {
      if (!val || val === '') return null;
      const num = parseInt(val, 10);
      return isNaN(num) ? null : num;
    })
  ),
});

export const updateProductSchema = productApiSchema.partial();
