import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['CUSTOMER', 'VENDOR', 'ADMIN']).default('CUSTOMER'),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const vendorRegistrationSchema = z.object({
  name: z.string().trim().min(2, 'Store name must be at least 2 characters').max(100),
  slug: z
    .string()
    .trim()
    .min(2, 'Slug must be at least 2 characters')
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  description: z.string().trim().max(1000).optional(),
  logoUrl: z.string().trim().url('Must be a valid URL').or(z.literal('')).optional(),
  email: z.string().trim().email('Contact email must be valid'),
  phone: z.string().trim().max(30).optional(),
});

export const vendorUpdateSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().max(1000).optional(),
  logoUrl: z.string().trim().url('Must be a valid URL').or(z.literal('')).optional(),
  email: z.string().trim().email('Contact email must be valid').optional(),
  phone: z.string().trim().max(30).optional(),
});

export const productCreateSchema = z.object({
  name: z.string().trim().min(2, 'Product name must be at least 2 characters').max(150),
  slug: z
    .string()
    .trim()
    .min(2, 'Slug must be at least 2 characters')
    .max(150)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  description: z.string().trim().min(5, 'Description must be at least 5 characters'),
  price: z.coerce.number().positive('Price must be greater than zero'),
  stock: z.coerce.number().int('Stock must be an integer').nonnegative('Stock cannot be negative'),
  category: z.string().trim().min(2, 'Category must be at least 2 characters'),
  imageUrl: z.string().trim().url('Must be a valid URL').or(z.literal('')).optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).default('ACTIVE'),
});

export const productUpdateSchema = z.object({
  name: z.string().trim().min(2).max(150).optional(),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(150)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens')
    .optional(),
  description: z.string().trim().min(5).optional(),
  price: z.coerce.number().positive('Price must be greater than zero').optional(),
  stock: z.coerce.number().int().nonnegative().optional(),
  category: z.string().trim().min(2).optional(),
  imageUrl: z.string().trim().url('Must be a valid URL').or(z.literal('')).optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).optional(),
});

export const vendorStatusUpdateSchema = z.object({
  status: z.enum(['PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED'], {
    message: 'Status must be PENDING, ACTIVE, SUSPENDED, or REJECTED',
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VendorRegistrationInput = z.infer<typeof vendorRegistrationSchema>;
export type VendorUpdateInput = z.infer<typeof vendorUpdateSchema>;
export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
export type VendorStatusUpdateInput = z.infer<typeof vendorStatusUpdateSchema>;
