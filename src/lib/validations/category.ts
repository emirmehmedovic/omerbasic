import { z } from 'zod';

const imageUrlSchema = z
  .string()
  .trim()
  .refine((value) => {
    if (value === '') return true;
    if (value.startsWith('/')) return true;
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }, { message: 'URL slike nije ispravan.' })
  .transform((value) => (value === '' ? undefined : value));

export const categoryFormSchema = z.object({
  name: z.string().min(3, { message: 'Naziv mora imati najmanje 3 znaka.' }).max(255),
  parentId: z.string().transform(val => val === '' ? undefined : val).optional(),
  imageUrl: imageUrlSchema.optional(),
  externalId: z.string().transform(val => val === '' ? undefined : val).optional(),
});

export const updateCategorySchema = categoryFormSchema.partial();
