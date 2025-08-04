import { z } from 'zod';

export const categoryFormSchema = z.object({
  name: z.string().min(3, { message: 'Naziv mora imati najmanje 3 znaka.' }).max(255),
      parentId: z.string().transform(val => val === '' ? undefined : val).optional(),
});

export const updateCategorySchema = categoryFormSchema.partial();
