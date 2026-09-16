import { NextResponse } from 'next/server';
import { UserRole, VendorStatus } from '@prisma/client';
import { getCurrentUser } from './auth';
import prisma from './prisma';

export class AppError extends Error {
  statusCode: number;
  details?: unknown;
  constructor(message: string, statusCode: number = 400, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function errorResponse(message: string, statusCode: number = 400, details?: unknown) {
  return NextResponse.json(
    {
      success: false,
      error: message,
      ...(details ? { details } : {}),
    },
    { status: statusCode }
  );
}

export function successResponse<T>(data: T, statusCode: number = 200) {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status: statusCode }
  );
}

/**
 * Ensures a user is authenticated. Throws AppError(401) if not.
 */
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new AppError('Authentication required. Please log in.', 401);
  }
  return user;
}

/**
 * Ensures the authenticated user has one of the allowed roles.
 */
export async function requireRole(allowedRoles: UserRole[]) {
  const user = await requireAuth();
  if (!allowedRoles.includes(user.role)) {
    throw new AppError('Access denied: insufficient permissions.', 403);
  }
  return user;
}

/**
 * Ensures the user has an associated Vendor record and optionally validates its status.
 */
export async function requireVendor(allowedStatuses?: VendorStatus[]) {
  const user = await requireAuth();

  const vendor = await prisma.vendor.findUnique({
    where: { ownerId: user.id },
  });

  if (!vendor) {
    throw new AppError('No vendor profile found for this user. Please complete vendor onboarding.', 403);
  }

  if (allowedStatuses && allowedStatuses.length > 0 && !allowedStatuses.includes(vendor.status)) {
    throw new AppError(
      `Vendor store is currently ${vendor.status.toLowerCase()}. Only ${allowedStatuses.join(', ').toLowerCase()} vendors can perform this action.`,
      403
    );
  }

  return { user, vendor };
}

/**
 * Ensures the authenticated user is an administrator.
 */
export async function requireAdmin() {
  const user = await requireAuth();
  if (user.role !== 'ADMIN') {
    throw new AppError('Admin access required.', 403);
  }
  return user;
}

/**
 * Strictly verifies that a product exists and belongs to the specified vendor.
 * Prevents cross-vendor product manipulation.
 */
export async function assertProductOwnership(productId: string, vendorId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      images: { orderBy: { order: 'asc' } },
      variants: { orderBy: { createdAt: 'asc' } },
    },
  });

  if (!product) {
    throw new AppError('Product not found.', 404);
  }

  if (product.vendorId !== vendorId) {
    throw new AppError('Forbidden: You do not own this product.', 403);
  }

  return product;
}

/**
 * Strictly verifies that a variant exists and belongs to the product and vendor.
 */
export async function assertVariantOwnership(productId: string, variantId: string, vendorId: string) {
  const product = await assertProductOwnership(productId, vendorId);

  const variant = await prisma.productVariant.findFirst({
    where: {
      id: variantId,
      productId: product.id,
    },
  });

  if (!variant) {
    throw new AppError('Product variant not found.', 404);
  }

  return { product, variant };
}
