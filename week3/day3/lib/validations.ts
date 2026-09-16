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

export const productImageSchema = z.object({
  id: z.string().optional(),
  url: z.string().trim().url('Must be a valid image URL'),
  isPrimary: z.boolean().default(false),
  order: z.coerce.number().int().default(0),
});

export const productVariantSchema = z.object({
  id: z.string().optional(),
  sku: z.string().trim().min(2, 'Variant SKU must be at least 2 characters').max(50),
  options: z.record(z.string(), z.string()).refine((obj) => Object.keys(obj).length > 0, {
    message: 'Variant must have at least one attribute option (e.g. Size or Color)',
  }),
  price: z.coerce.number().positive('Variant price must be greater than zero').optional().nullable(),
  stockQuantity: z.coerce.number().int('Stock must be an integer').nonnegative('Variant stock cannot be negative').default(0),
  imageUrl: z.string().trim().url('Must be a valid URL').or(z.literal('')).optional().nullable(),
  status: z.enum(['DRAFT', 'ACTIVE', 'OUT_OF_STOCK', 'ARCHIVED']).default('ACTIVE'),
});

export const productCreateSchema = z.object({
  name: z.string().trim().min(2, 'Product name must be at least 2 characters').max(150),
  slug: z
    .string()
    .trim()
    .min(2, 'Slug must be at least 2 characters')
    .max(150)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  sku: z.string().trim().min(2, 'SKU must be at least 2 characters').max(50),
  description: z.string().trim().min(5, 'Description must be at least 5 characters'),
  price: z.coerce.number().positive('Price must be greater than zero'),
  compareAtPrice: z.coerce.number().positive('Compare-at price must be greater than zero').optional().nullable(),
  stockQuantity: z.coerce.number().int('Stock must be an integer').nonnegative('Stock cannot be negative').default(0),
  lowStockThreshold: z.coerce.number().int('Threshold must be an integer').nonnegative('Threshold cannot be negative').default(5),
  category: z.string().trim().min(2, 'Category must be at least 2 characters'),
  status: z.enum(['DRAFT', 'ACTIVE', 'OUT_OF_STOCK', 'ARCHIVED']).default('ACTIVE'),
  images: z.array(productImageSchema).optional().default([]),
  variants: z.array(productVariantSchema).optional().default([]),
  imageUrl: z.string().trim().url('Must be a valid URL').or(z.literal('')).optional(),
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
  sku: z.string().trim().min(2).max(50).optional(),
  description: z.string().trim().min(5).optional(),
  price: z.coerce.number().positive('Price must be greater than zero').optional(),
  compareAtPrice: z.coerce.number().positive('Compare-at price must be greater than zero').optional().nullable(),
  stockQuantity: z.coerce.number().int('Stock must be an integer').nonnegative('Stock cannot be negative').optional(),
  lowStockThreshold: z.coerce.number().int().nonnegative().optional(),
  category: z.string().trim().min(2).optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'OUT_OF_STOCK', 'ARCHIVED']).optional(),
  images: z.array(productImageSchema).optional(),
  variants: z.array(productVariantSchema).optional(),
  imageUrl: z.string().trim().url('Must be a valid URL').or(z.literal('')).optional(),
});

export const stockAdjustmentSchema = z.object({
  variantId: z.string().optional().nullable(),
  adjustmentType: z.enum(['RESTOCK', 'SALE', 'MANUAL_ADJUSTMENT', 'RETURN', 'DAMAGE']).default('MANUAL_ADJUSTMENT'),
  delta: z.coerce.number().int().optional(),
  exactQuantity: z.coerce.number().int().nonnegative('Stock quantity cannot be negative').optional(),
  reason: z.string().trim().max(500).optional(),
}).refine((data) => data.delta !== undefined || data.exactQuantity !== undefined, {
  message: 'Must provide either a delta (e.g. +5, -2) or an exactQuantity (e.g. 20)',
});

export const vendorStatusUpdateSchema = z.object({
  status: z.enum(['PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED'], {
    message: 'Status must be PENDING, ACTIVE, SUSPENDED, or REJECTED',
  }),
});

export const cartItemAddSchema = z.object({
  productId: z.string().trim().min(1, 'Product ID is required'),
  variantId: z.string().trim().optional().nullable(),
  quantity: z.coerce.number().int().positive('Quantity must be at least 1').default(1),
});

export const cartItemUpdateSchema = z.object({
  quantity: z.coerce.number().int().positive('Quantity must be at least 1'),
});

export const checkoutSchema = z.object({
  shippingName: z.string().trim().min(2, 'Shipping name must be at least 2 characters'),
  shippingEmail: z.string().trim().email('Valid shipping email is required'),
  shippingPhone: z.string().trim().min(5, 'Shipping phone must be valid'),
  shippingAddress: z.string().trim().min(5, 'Shipping address is required'),
  shippingCity: z.string().trim().min(2, 'Shipping city is required'),
  shippingPostalCode: z.string().trim().optional().nullable(),
  paymentMethod: z.string().trim().min(2).default('CARD'),
});

export const vendorOrderStatusUpdateSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'], {
    message: 'Status must be PENDING, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, or CANCELLED',
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VendorRegistrationInput = z.infer<typeof vendorRegistrationSchema>;
export type VendorUpdateInput = z.infer<typeof vendorUpdateSchema>;
export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
export type ProductImageInput = z.infer<typeof productImageSchema>;
export type ProductVariantInput = z.infer<typeof productVariantSchema>;
export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;
export type VendorStatusUpdateInput = z.infer<typeof vendorStatusUpdateSchema>;
export type CartItemAddInput = z.infer<typeof cartItemAddSchema>;
export type CartItemUpdateInput = z.infer<typeof cartItemUpdateSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type VendorOrderStatusUpdateInput = z.infer<typeof vendorOrderStatusUpdateSchema>;
