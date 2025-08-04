import { z } from 'zod';




// Shema za validaciju na frontendu (u formi)
export const productFormSchema = z.object({
  name: z.string().min(3, { message: 'Naziv mora imati najmanje 3 znaka.' }).max(255),
  description: z.string().min(10, { message: 'Opis mora imati najmanje 10 znakova.' }),
  price: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: 'Cijena mora biti ispravan pozitivan broj.',
  }),
  imageUrl: z.string().optional().or(z.literal('')), // Removed extra comma
  categoryId: z.string().cuid({ message: 'Kategorija nije ispravna.' }),

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
  generationIds: z.array(z.string()).optional()
});

// Shema za validaciju na backendu (API) i za slanje podataka
export const productApiSchema = productFormSchema.extend({
  // Transformiramo stringove u brojeve prije slanja na API
  price: z.coerce.number().positive({ message: 'Cijena mora biti pozitivan broj.' }),
  yearOfManufacture: z.string().optional().nullable()
    .transform(val => val === '' || val === '0' || val === undefined ? null : parseInt(val as string)),
  weight: z.string().optional().nullable()
    .transform(val => val === '' || val === '0' || val === undefined ? null : parseFloat(val as string)),
  width: z.string().optional().nullable()
    .transform(val => val === '' || val === '0' || val === undefined ? null : parseFloat(val as string)),
  height: z.string().optional().nullable()
    .transform(val => val === '' || val === '0' || val === undefined ? null : parseFloat(val as string)),
  length: z.string().optional().nullable()
    .transform(val => val === '' || val === '0' || val === undefined ? null : parseFloat(val as string)),
  stock: z.coerce.number().int().min(0, { message: 'Zalihe ne mogu biti negativne.' }).default(0),
});

export const updateProductSchema = productApiSchema.partial();
