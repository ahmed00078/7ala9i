import { z } from 'zod';

export const phoneRegex = /^\+?[0-9]{8}$/;
export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const loginSchema = z.object({
  identifier: z.string()
    .min(1, 'validation.identifierRequired')
    .refine(
      (val) => emailRegex.test(val) || /^\+?[\d\s]{8,}$/.test(val),
      'validation.identifierInvalid'
    ),
  password: z.string().min(6, 'validation.passwordMin'),
});

export const registerSchema = z.object({
  role: z.enum(['client', 'owner'], { required_error: 'validation.roleRequired' }),
  firstName: z.string().min(2, 'validation.firstNameMin'),
  lastName: z.string().min(2, 'validation.lastNameMin'),
  phone: z
    .string()
    .min(1, 'validation.phoneRequired')
    .regex(phoneRegex, 'validation.phoneInvalid'),
  email: z.string().email('validation.emailInvalid').optional().or(z.literal('')),
  password: z.string().min(6, 'validation.passwordMin'),
  confirmPassword: z.string().min(1, 'validation.confirmPasswordRequired'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'validation.passwordMismatch',
  path: ['confirmPassword'],
});

export const reviewSchema = z.object({
  rating: z.number().min(1, 'validation.ratingRequired').max(5),
  comment: z.string().optional(),
});

export const profileSchema = z.object({
  firstName: z.string().min(2, 'validation.firstNameMin'),
  lastName: z.string().min(2, 'validation.lastNameMin'),
  email: z.string().email('validation.emailInvalid').optional().or(z.literal('')),
});

export const serviceSchema = z.object({
  name: z.string().min(2, 'validation.nameRequired'),
  nameAr: z.string().optional(),
  nameFr: z.string().optional(),
  description: z.string().optional(),
  descriptionAr: z.string().optional(),
  price: z.number().min(0, 'validation.priceInvalid'),
  duration: z.number().min(5, 'validation.durationInvalid').max(480),
});

export const categorySchema = z.object({
  name: z.string().min(2, 'validation.nameRequired'),
  nameAr: z.string().optional(),
  nameFr: z.string().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'validation.currentPasswordRequired'),
  newPassword: z.string().min(6, 'validation.passwordMin'),
  confirmPassword: z.string().min(1, 'validation.confirmPasswordRequired'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'validation.passwordMismatch',
  path: ['confirmPassword'],
});

export type LoginForm = z.infer<typeof loginSchema>;
export type RegisterForm = z.infer<typeof registerSchema>;
export type ReviewForm = z.infer<typeof reviewSchema>;
export type ProfileForm = z.infer<typeof profileSchema>;
export type ServiceForm = z.infer<typeof serviceSchema>;
export type CategoryForm = z.infer<typeof categorySchema>;
export type ChangePasswordForm = z.infer<typeof changePasswordSchema>;
