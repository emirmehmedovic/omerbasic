import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(3, { message: 'Ime mora imati najmanje 3 karaktera.' }),
  email: z.string().email({ message: 'Unesite validnu email adresu.' }),
  password: z.string().min(6, { message: 'Lozinka mora imati najmanje 6 karaktera.' }),
});

export type RegisterFormValues = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email({ message: 'Unesite validnu email adresu.' }),
  password: z.string().min(1, { message: 'Lozinka je obavezna.' }),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email({ message: 'Unesite validnu email adresu.' }),
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  password: z.string().min(6, { message: 'Lozinka mora imati najmanje 6 karaktera.' }),
  confirmPassword: z.string(),
  token: z.string().min(1, { message: 'Token je obavezan.' }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Lozinke se ne podudaraju.',
  path: ['confirmPassword'], // Postavlja grešku na polje za potvrdu lozinke
});

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, { message: 'Trenutna lozinka je obavezna.' }),
  newPassword: z.string().min(6, { message: 'Nova lozinka mora imati najmanje 6 karaktera.' }),
  confirmNewPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: 'Lozinke se ne podudaraju.',
  path: ['confirmNewPassword'],
});

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;
