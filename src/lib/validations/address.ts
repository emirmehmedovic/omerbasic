import { z } from 'zod';

export const addressSchema = z.object({
  street: z.string().min(3, { message: 'Ulica mora imati najmanje 3 karaktera.' }),
  city: z.string().min(2, { message: 'Grad mora imati najmanje 2 karaktera.' }),
  postalCode: z.string().min(3, { message: 'Poštanski broj mora imati najmanje 3 karaktera.' }),
  country: z.string().min(2, { message: 'Država mora imati najmanje 2 karaktera.' }),
  isDefaultShipping: z.boolean().optional(),
  isDefaultBilling: z.boolean().optional(),
});

export type AddressFormValues = z.infer<typeof addressSchema>;
