import { z } from 'zod';

// Shema za adresu
const addressSchema = z.object({
  street: z.string().min(3, 'Ulica mora imati najmanje 3 znaka.'),
  city: z.string().min(2, 'Grad mora imati najmanje 2 znaka.'),
  postalCode: z.string().min(3, 'Poštanski broj mora imati najmanje 3 znaka.'),
  country: z.string().min(2, 'Država mora imati najmanje 2 znaka.'),
});

// Glavna shema za checkout formu
export const checkoutFormSchema = z.object({
  customerName: z.string().min(3, 'Ime i prezime su obavezni.'),
  customerEmail: z.string().email('Unesite ispravnu email adresu.'),
  customerPhone: z.string()
    .min(6, 'Broj telefona mora imati najmanje 6 brojeva.')
    .regex(/^[\d\s\+\-\(\)]+$/, 'Broj telefona može sadržavati samo brojeve, razmake, +, -, ( i ).'),
  shippingAddress: addressSchema,
  shippingMethod: z.enum(['PICKUP', 'COURIER']),
  paymentMethod: z.enum(['BANK_TRANSFER', 'CASH_ON_DELIVERY']),
});

// Tip izveden iz Zod sheme
export type CheckoutFormValues = z.infer<typeof checkoutFormSchema>;
