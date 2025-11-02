import { z } from 'zod';

export const b2bDiscountGroupSchema = z.object({
  name: z.string().min(3, 'Naziv mora imati najmanje 3 karaktera.'),
  description: z.string().optional().nullable(),
  priority: z.coerce.number().int().min(0).default(0),
  stackingStrategy: z.enum(['MAX', 'ADDITIVE', 'PRIORITY']).default('MAX'),
});

export const updateB2bDiscountGroupSchema = b2bDiscountGroupSchema.partial();

export const groupMemberSchema = z.object({
  userId: z.string().min(1, 'Korisnik je obavezan.'),
});

export const groupCategoryDiscountSchema = z.object({
  categoryId: z.string().min(1, 'Kategorija je obavezna.'),
  discountPercentage: z.coerce.number().min(0).max(100),
});

export const groupManufacturerDiscountSchema = z.object({
  manufacturerId: z.string().min(1, 'Proizvođač je obavezan.'),
  discountPercentage: z.coerce.number().min(0).max(100),
});

export const groupCategoryManufacturerDiscountSchema = z.object({
  categoryId: z.string().min(1, 'Kategorija je obavezna.'),
  manufacturerId: z.string().min(1, 'Proizvođač je obavezan.'),
  discountPercentage: z.coerce.number().min(0).max(100),
});

export type CreateB2bGroupInput = z.infer<typeof b2bDiscountGroupSchema>;
export type UpdateB2bGroupInput = z.infer<typeof updateB2bDiscountGroupSchema>;
export type GroupMemberInput = z.infer<typeof groupMemberSchema>;
export type GroupCategoryDiscountInput = z.infer<typeof groupCategoryDiscountSchema>;
export type GroupManufacturerDiscountInput = z.infer<typeof groupManufacturerDiscountSchema>;
export type GroupCategoryManufacturerDiscountInput = z.infer<
  typeof groupCategoryManufacturerDiscountSchema
>;
