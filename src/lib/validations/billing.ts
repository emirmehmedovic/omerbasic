import { z } from 'zod';

export const billingInfoSchema = z.object({
  companyName: z.string().optional().or(z.literal('')), // Dozvoljava prazan string ili validan string
  taxId: z.string().optional().or(z.literal('')),       // Dozvoljava prazan string ili validan string
});

export type BillingInfoFormValues = z.infer<typeof billingInfoSchema>;
