import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as registerUser } from '@/app/api/auth/register/route';
import { POST as createProduct } from '@/app/api/vendor/products/route';
import { POST as performCheckout } from '@/app/api/checkout/route';
import { PATCH as cancelCustomerOrder } from '@/app/api/orders/[id]/cancel/route';
import { ProductStatus, VendorStatus, UserRole } from '@prisma/client';

// Mock Prisma
vi.mock('@/lib/prisma', () => {
  return {
    default: {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      vendor: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      product: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        delete: vi.fn(),
      },
      productVariant: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        createMany: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        deleteMany: vi.fn(),
      },
      cart: {
        findUnique: vi.fn(),
      },
      cartItem: {
        findMany: vi.fn(),
        deleteMany: vi.fn(),
      },
      order: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn().mockResolvedValue(0),
      },
      vendorOrder: {
        create: vi.fn(),
        update: vi.fn(),
      },
      orderItem: {
        create: vi.fn(),
      },
      inventoryAdjustment: {
        create: vi.fn(),
      },
      $transaction: vi.fn(async (callback) => callback(prismaMock)),
    },
  };
});

// Mock Auth
vi.mock('@/lib/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth')>();
  return {
    ...actual,
    getCurrentUser: vi.fn(),
    setSessionCookie: vi.fn(),
  };
});

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

import prisma from '@/lib/prisma';
import * as auth from '@/lib/auth';

const prismaMock = prisma as any;

describe('Audit Regression Tests (Instructor Review Findings Days 1–3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (callback: any) => callback(prismaMock));
  });

  // --------------------------------------------------------------------------
  // Fix 1 (P0): Client-controlled role on registration is ignored and hardcoded to CUSTOMER
  // --------------------------------------------------------------------------
  it('Fix 1 (P0): Registration with role: "ADMIN" in body strictly creates a CUSTOMER in the DB', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null); // No existing email
    prismaMock.user.create.mockImplementationOnce(async ({ data }: any) => {
      return {
        id: 'user-new-1',
        name: data.name,
        email: data.email,
        role: data.role,
        createdAt: new Date(),
      };
    });

    const req = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Attacker Admin',
        email: 'attacker@evil.com',
        password: 'Password123!',
        role: 'ADMIN', // Rogue client payload
      }),
    });

    const res = await registerUser(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.role).toBe('CUSTOMER');

    // Assert on actual DB create call
    expect(prismaMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role: 'CUSTOMER',
        }),
      })
    );
  });

  // --------------------------------------------------------------------------
  // Fix 2 (P1): Checkout conditional atomic update prevents overselling race condition
  // --------------------------------------------------------------------------
  it('Fix 2 (P1): Concurrent checkouts on stock = 1 results in exactly 1 success and 1 clean 400 rejection', async () => {
    const customerUser = { id: 'cust-1', name: 'Bob', email: 'bob@example.com', role: 'CUSTOMER' };
    vi.mocked(auth.getCurrentUser).mockResolvedValue(customerUser as any);

    let currentStock = 1; // Shared physical stock across concurrent requests
    const ordersCreated: any[] = [];
    const adjustmentsCreated: any[] = [];

    // Mock cart lookup
    prismaMock.cart.findUnique.mockResolvedValue({
      id: 'cart-1',
      customerId: 'cust-1',
      items: [{ id: 'ci-1', productId: 'prod-1', variantId: null, quantity: 1 }],
    });

    // Mock product lookup before atomic update
    prismaMock.product.findUnique.mockImplementation(async () => {
      return {
        id: 'prod-1',
        name: 'Limited Edition Mug',
        price: 25.0,
        stockQuantity: currentStock,
        status: 'ACTIVE',
        vendorId: 'ven-1',
        vendor: { id: 'ven-1', name: 'Artisan Store', status: 'ACTIVE' },
        variants: [],
      };
    });

    // Atomic updateMany simulation with true concurrency race condition handling
    prismaMock.product.updateMany.mockImplementation(async ({ where, data }: any) => {
      if (where.stockQuantity?.gte !== undefined && currentStock >= where.stockQuantity.gte) {
        currentStock -= data.stockQuantity.decrement;
        return { count: 1 };
      }
      return { count: 0 }; // Already consumed by concurrent transaction
    });

    prismaMock.order.count.mockResolvedValue(0);
    prismaMock.vendorOrder.create.mockResolvedValue({ id: 'vo-1', vendorOrderNumber: '#1001-A' });
    prismaMock.orderItem.create.mockResolvedValue({ id: 'oi-1' });
    prismaMock.cartItem.deleteMany.mockResolvedValue({});

    // Transaction mock with realistic rollback on error
    prismaMock.$transaction.mockImplementation(async (callback: any) => {
      const txOrders: any[] = [];
      const txAdjustments: any[] = [];
      const txMock = {
        ...prismaMock,
        order: {
          ...prismaMock.order,
          create: vi.fn(async ({ data }: any) => {
            const ord = { id: `order-${ordersCreated.length + txOrders.length + 1}`, ...data };
            txOrders.push(ord);
            return ord;
          }),
        },
        inventoryAdjustment: {
          ...prismaMock.inventoryAdjustment,
          create: vi.fn(async ({ data }: any) => {
            txAdjustments.push(data);
            return data;
          }),
        },
      };

      try {
        const result = await callback(txMock);
        ordersCreated.push(...txOrders);
        adjustmentsCreated.push(...txAdjustments);
        return result;
      } catch (err) {
        // Discard txOrders on rollback
        throw err;
      }
    });

    const createCheckoutReq = () =>
      new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({
          shippingName: 'Bob Customer',
          shippingEmail: 'bob@example.com',
          shippingPhone: '555-0192',
          shippingAddress: '123 Main St',
          shippingCity: 'Metropolis',
          paymentMethod: 'CARD',
        }),
      });

    // Fire two GENUINELY concurrent checkout requests simultaneously
    const [res1, res2] = await Promise.all([
      performCheckout(createCheckoutReq()),
      performCheckout(createCheckoutReq()),
    ]);

    const status1 = res1.status;
    const status2 = res2.status;

    // Exactly one must succeed (201) and exactly one must fail (400)
    const successCount = (status1 === 201 ? 1 : 0) + (status2 === 201 ? 1 : 0);
    const failureCount = (status1 === 400 ? 1 : 0) + (status2 === 400 ? 1 : 0);

    expect(successCount).toBe(1);
    expect(failureCount).toBe(1);

    // Final stock must be exactly 0 (never negative)
    expect(currentStock).toBe(0);

    // Only 1 parent order and 1 inventory adjustment should have been recorded
    expect(ordersCreated.length).toBe(1);
    expect(adjustmentsCreated.length).toBe(1);
  });

  // --------------------------------------------------------------------------
  // Fix 3 (P1): Duplicate variant SKU returns 409 Conflict with descriptive message
  // --------------------------------------------------------------------------
  it('Fix 3 (P1): Creating product with duplicate variant SKUs returns 409 Conflict', async () => {
    const activeVendorUser = {
      id: 'user-v1',
      name: 'Vendor John',
      email: 'john@vendor.com',
      role: 'VENDOR',
    };
    const mockVendor = { id: 'ven-1', name: 'John Supplies', slug: 'john-supplies', status: 'ACTIVE', ownerId: 'user-v1' };
    vi.mocked(auth.getCurrentUser).mockResolvedValueOnce(activeVendorUser as any);
    prismaMock.vendor.findUnique.mockResolvedValueOnce(mockVendor);

    prismaMock.product.findUnique.mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/vendor/products', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Custom T-Shirt',
        slug: 'custom-t-shirt',
        sku: 'TSHIRT-BASE',
        description: 'Cotton organic t-shirt',
        price: 29.99,
        category: 'Clothing',
        status: 'ACTIVE',
        variants: [
          { sku: 'TSHIRT-RED-M', options: { Color: 'Red', Size: 'M' }, price: 29.99, stockQuantity: 10 },
          { sku: 'TSHIRT-RED-M', options: { Color: 'Red', Size: 'Medium' }, price: 29.99, stockQuantity: 5 }, // Duplicate SKU
        ],
      }),
    });

    const res = await createProduct(req);
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.success).toBe(false);
    expect(json.details.variants[0]).toMatch(/Duplicate variant SKU/i);
  });

  // --------------------------------------------------------------------------
  // Fix 4 (P2): Pending vendor can draft products (forced to DRAFT)
  // --------------------------------------------------------------------------
  it('Fix 4 (P2): Pending vendor can create product, but status is forced to DRAFT', async () => {
    const pendingVendorUser = {
      id: 'user-pending',
      name: 'Pending Vendor',
      email: 'pending@vendor.com',
      role: 'VENDOR',
    };
    const mockPendingVendor = { id: 'ven-pending', name: 'Pending Store', slug: 'pending-store', status: 'PENDING', ownerId: 'user-pending' };
    vi.mocked(auth.getCurrentUser).mockResolvedValueOnce(pendingVendorUser as any);
    prismaMock.vendor.findUnique.mockResolvedValueOnce(mockPendingVendor);

    prismaMock.product.findUnique.mockResolvedValue(null);
    prismaMock.product.create.mockImplementationOnce(async ({ data }: any) => {
      return {
        id: 'prod-draft-1',
        name: data.name,
        slug: data.slug,
        status: data.status,
        vendorId: data.vendorId,
        images: [],
        variants: [],
      };
    });

    const req = new NextRequest('http://localhost:3000/api/vendor/products', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Pre-approval Draft Gadget',
        slug: 'pre-approval-draft-gadget',
        sku: 'GADGET-DRAFT-01',
        description: 'Product configured while awaiting approval',
        price: 49.99,
        category: 'Electronics',
        status: 'ACTIVE', // Vendor requests active, but should be forced to DRAFT
      }),
    });

    const res = await createProduct(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(prismaMock.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'DRAFT',
        }),
      })
    );
  });

  // --------------------------------------------------------------------------
  // Fix 9 (P2): Order cancellation on hard-deleted product completes cleanly
  // --------------------------------------------------------------------------
  it('Fix 9 (P2): Cancelling order with hard-deleted product completes without throwing foreign key error', async () => {
    const customerUser = { id: 'cust-1', name: 'Alice', email: 'alice@example.com', role: 'CUSTOMER' };
    vi.mocked(auth.getCurrentUser).mockResolvedValueOnce(customerUser as any);

    const mockOrder = {
      id: 'order-1',
      orderNumber: '#1001',
      customerId: 'cust-1',
      status: 'CONFIRMED',
      vendorOrders: [
        {
          id: 'vo-1',
          vendorId: 'ven-1',
          status: 'CONFIRMED',
          items: [
            {
              id: 'oi-1',
              productId: 'deleted-prod-id', // Hard-deleted product
              variantId: null,
              productNameSnapshot: 'Deleted Vintage Lamp',
              skuSnapshot: 'LAMP-VINTAGE',
              quantity: 1,
            },
            {
              id: 'oi-2',
              productId: 'active-prod-id', // Still existing product
              variantId: null,
              productNameSnapshot: 'Active Desk Mat',
              skuSnapshot: 'DESK-MAT',
              quantity: 2,
            },
          ],
        },
      ],
    };

    prismaMock.order.findUnique
      .mockResolvedValueOnce(mockOrder) // Ownership check
      .mockResolvedValueOnce({ ...mockOrder, status: 'CANCELLED' }); // Final lookup

    prismaMock.order.update.mockResolvedValueOnce({ id: 'order-1', status: 'CANCELLED' });
    prismaMock.vendorOrder.update.mockResolvedValueOnce({ id: 'vo-1', status: 'CANCELLED' });

    // Product lookups
    prismaMock.product.findUnique.mockImplementation(async ({ where }: any) => {
      if (where.id === 'deleted-prod-id') return null; // Deleted!
      if (where.id === 'active-prod-id') {
        return { id: 'active-prod-id', stockQuantity: 5, status: 'ACTIVE' };
      }
      return null;
    });

    prismaMock.product.update.mockResolvedValue({ id: 'active-prod-id', stockQuantity: 7 });
    prismaMock.inventoryAdjustment.create.mockResolvedValue({ id: 'adj-1' });

    const req = new NextRequest('http://localhost:3000/api/orders/order-1/cancel', {
      method: 'PATCH',
    });

    const res = await cancelCustomerOrder(req, { params: Promise.resolve({ id: 'order-1' }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.order.status).toBe('CANCELLED');
    expect(json.data.orphanedItems).toBeDefined();
    expect(json.data.orphanedItems[0].sku).toBe('LAMP-VINTAGE');

    // Only the existing product should have had stock restored and adjustment written
    expect(prismaMock.product.update).toHaveBeenCalledTimes(1);
    expect(prismaMock.product.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'active-prod-id' },
        data: { stockQuantity: 7, status: 'ACTIVE' },
      })
    );
    expect(prismaMock.inventoryAdjustment.create).toHaveBeenCalledTimes(1);
  });
});
