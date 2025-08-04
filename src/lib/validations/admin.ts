import { z } from 'zod';

// Shema za validaciju na frontendu (forma)
export const createB2bUserFormSchema = z.object({
  name: z.string().min(3, { message: 'Ime mora imati najmanje 3 karaktera.' }),
  email: z.string().email({ message: 'Unesite ispravnu email adresu.' }),
  password: z.string().min(8, { message: 'Lozinka mora imati najmanje 8 karaktera.' }),
  companyName: z.string().min(2, { message: 'Naziv firme mora imati najmanje 2 karaktera.' }),
  taxId: z.string().min(5, { message: 'Porezni broj mora imati najmanje 5 karaktera.' }),
  discountPercentage: z.string()
    .refine((val) => !isNaN(parseFloat(val)), { message: 'Unesite ispravan broj.' })
    .refine((val) => parseFloat(val) >= 0 && parseFloat(val) <= 100, { message: 'Popust mora biti između 0 i 100.' })
    .optional(),
});

export type CreateB2bUserFormValues = z.infer<typeof createB2bUserFormSchema>;

// Shema za validaciju na backendu (API)
export const createB2bUserApiSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(8),
  companyName: z.string().min(2),
  taxId: z.string().min(5),
  discountPercentage: z.number().min(0).max(100).optional(),
});

// Shema za ažuriranje korisnika (forma)
export const updateUserFormSchema = createB2bUserFormSchema.extend({
  password: z.string().optional(), // Lozinka je opcionalna pri ažuriranju
});

export type UpdateUserFormValues = z.infer<typeof updateUserFormSchema>;

// Shema za ažuriranje korisnika (API)
export const updateUserApiSchema = createB2bUserApiSchema.extend({
  password: z.string().min(8).optional(),
});


