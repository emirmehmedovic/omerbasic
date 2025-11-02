import { z } from 'zod';

export const manufacturerBaseSchema = z.object({
  name: z.string().min(2, 'Naziv mora imati najmanje 2 karaktera.'),
  description: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  website: z
    .string()
    .url('Unesite ispravan URL.')
    .optional()
    .or(z.literal(''))
    .transform((val) => (val ? val : undefined)),
});

export const createManufacturerSchema = manufacturerBaseSchema;

export const updateManufacturerSchema = manufacturerBaseSchema.partial();

export type CreateManufacturerInput = z.infer<typeof createManufacturerSchema>;
export type UpdateManufacturerInput = z.infer<typeof updateManufacturerSchema>;
