import { z } from 'zod';

export const profileFormSchema = z.object({
  name: z.string().min(3, 'Ime mora imati najmanje 3 znaka.').optional(),
  email: z.string().email('Unesite ispravnu email adresu.').optional(),
  companyName: z.string().optional(),
  taxId: z.string().optional(),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;

export const addressFormSchema = z.object({
  street: z.string().min(3, 'Ulica mora imati najmanje 3 znaka.'),
  city: z.string().min(2, 'Grad mora imati najmanje 2 znaka.'),
  postalCode: z.string().min(3, 'Poštanski broj mora imati najmanje 3 znaka.'),
  country: z.string().min(2, 'Država mora imati najmanje 2 znaka.'),
});

export type AddressFormValues = z.infer<typeof addressFormSchema>;

export const changePasswordFormSchema = z.object({
  currentPassword: z.string().min(1, 'Trenutna lozinka je obavezna.'),
  newPassword: z.string().min(6, 'Nova lozinka mora imati najmanje 6 znakova.'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Lozinke se ne podudaraju.',
  path: ['confirmPassword'], // Poveži grešku s poljem za potvrdu lozinke
});

export type ChangePasswordFormValues = z.infer<typeof changePasswordFormSchema>;
