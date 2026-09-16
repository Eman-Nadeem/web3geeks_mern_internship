import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as registerVendor, GET as getActiveVendors } from '@/app/api/vendors/route';
import { PATCH as updateVendorProfile, GET as getVendorDetail } from '@/app/api/vendors/[id]/route';
import { POST as createProduct, GET as getProducts } from '@/app/api/products/route';
import { PATCH as updateProduct, DELETE as deleteProduct } from '@/app/api/products/[id]/route';
import { PATCH as updateVendorStatus } from '@/app/api/admin/vendors/[id]/status/route';
import { requireVendor, assertProductOwnership, requireAdmin, requireAuth, AppError } from '@/lib/guards';
import { registerSchema, vendorRegistrationSchema, productCreateSchema, vendorStatusUpdateSchema } from '@/lib/validations';
import { hashPassword, verifyPassword, createSessionToken, verifySessionToken } from '@/lib/auth';

// Mock dependencies
vi.mock('@/lib/prisma', () => {
  return {
    default: {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      vendor: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      product: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
      $transaction: vi.fn((callback) => callback(prismaMock)),
    },
  };
});

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

describe('Multi-Vendor Marketplace Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // Scenario 1: User registers as a vendor -> vendor created with PENDING status
  // --------------------------------------------------------------------------
  it('Scenario 1: User registers as a vendor -> vendor created with PENDING status', async () => {
    const mockUser = {
      id: 'usr-100',
      name: 'Elena Rostova',
      email: 'elena@example.com',
      role: 'CUSTOMER',
    };

    vi.mocked(auth.getCurrentUser).mockResolvedValueOnce(mockUser as any);
    prismaMock.vendor.findUnique.mockResolvedValueOnce(null); // No existing vendor for user
    prismaMock.vendor.findUnique.mockResolvedValueOnce(null); // Slug is available

    const newVendor = {
      id: 'ven-100',
      name: 'Artisan Goods',
      slug: 'artisan-goods',
      description: 'Handmade crafts',
      email: 'elena@example.com',
      status: 'PENDING',
      ownerId: mockUser.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.vendor.create.mockResolvedValueOnce(newVendor);
    prismaMock.user.update.mockResolvedValueOnce({ ...mockUser, role: 'VENDOR' });

    const req = new NextRequest('http://localhost:3000/api/vendors', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Artisan Goods',
        slug: 'artisan-goods',
        description: 'Handmade crafts',
        email: 'elena@example.com',
      }),
    });

    const response = await registerVendor(req);
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.status).toBe('PENDING');
    expect(json.data.ownerId).toBe(mockUser.id);
  });

  // --------------------------------------------------------------------------
  // Scenario 2: Admin approves the vendor -> status becomes ACTIVE
  // --------------------------------------------------------------------------
  it('Scenario 2: Admin approves the vendor -> status becomes ACTIVE', async () => {
    const adminUser = {
      id: 'admin-1',
      name: 'Admin User',
      email: 'admin@marketplace.com',
      role: 'ADMIN',
    };

    vi.mocked(auth.getCurrentUser).mockResolvedValueOnce(adminUser as any);

    const pendingVendor = {
      id: 'ven-100',
      slug: 'artisan-goods',
      status: 'PENDING',
    };

    prismaMock.vendor.findUnique.mockResolvedValueOnce(pendingVendor);
    prismaMock.vendor.update.mockResolvedValueOnce({
      ...pendingVendor,
      status: 'ACTIVE',
    });

    const req = new NextRequest('http://localhost:3000/api/admin/vendors/ven-100/status', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'ACTIVE' }),
    });

    const response = await updateVendorStatus(req, {
      params: Promise.resolve({ id: 'ven-100' }),
    });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.status).toBe('ACTIVE');
  });

  // --------------------------------------------------------------------------
  // Scenario 3: Approved vendor can access dashboard; pending/suspended cannot
  // --------------------------------------------------------------------------
  it('Scenario 3: Approved vendor can perform active actions; pending/suspended is restricted', async () => {
    // 3a: Active vendor passes guard
    const activeVendorUser = {
      id: 'usr-active',
      role: 'VENDOR',
    };
    const activeVendor = {
      id: 'ven-active',
      ownerId: 'usr-active',
      status: 'ACTIVE',
    };

    vi.mocked(auth.getCurrentUser).mockResolvedValueOnce(activeVendorUser as any);
    prismaMock.vendor.findUnique.mockResolvedValueOnce(activeVendor);

    const result = await requireVendor(['ACTIVE']);
    expect(result.vendor.status).toBe('ACTIVE');

    // 3b: Pending vendor restricted when ACTIVE status is required
    const pendingVendorUser = {
      id: 'usr-pending',
      role: 'VENDOR',
    };
    const pendingVendor = {
      id: 'ven-pending',
      ownerId: 'usr-pending',
      status: 'PENDING',
    };

    vi.mocked(auth.getCurrentUser).mockResolvedValueOnce(pendingVendorUser as any);
    prismaMock.vendor.findUnique.mockResolvedValueOnce(pendingVendor);

    await expect(requireVendor(['ACTIVE'])).rejects.toThrow(/pending/i);
  });

  // --------------------------------------------------------------------------
  // Scenario 4: Vendor creates a product -> product is automatically attached
  // --------------------------------------------------------------------------
  it('Scenario 4: Vendor creates a product -> product is automatically attached to that vendor', async () => {
    const vendorUser = {
      id: 'usr-100',
      role: 'VENDOR',
    };
    const vendor = {
      id: 'ven-100',
      ownerId: 'usr-100',
      slug: 'artisan-goods',
      status: 'ACTIVE',
    };

    vi.mocked(auth.getCurrentUser).mockResolvedValueOnce(vendorUser as any);
    prismaMock.vendor.findUnique.mockResolvedValueOnce(vendor);
    prismaMock.product.findUnique.mockResolvedValueOnce(null); // Slug unique

    const createdProduct = {
      id: 'prod-1',
      name: 'Handmade Ceramic Cup',
      slug: 'handmade-ceramic-cup',
      description: 'Stoneware handcrafted cup',
      price: 28.0,
      stock: 15,
      category: 'Kitchenware',
      status: 'ACTIVE',
      vendorId: 'ven-100', // Verified attached to vendor
      vendor: { id: 'ven-100', name: 'Artisan Goods', slug: 'artisan-goods' },
    };

    prismaMock.product.create.mockResolvedValueOnce(createdProduct);

    // Notice: Client maliciously passes a forged vendorId: "ven-hacked"
    const req = new NextRequest('http://localhost:3000/api/products', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Handmade Ceramic Cup',
        slug: 'handmade-ceramic-cup',
        description: 'Stoneware handcrafted cup',
        price: 28.0,
        stock: 15,
        category: 'Kitchenware',
        vendorId: 'ven-hacked', // MUST BE IGNORED by server
      }),
    });

    const response = await createProduct(req);
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.data.vendorId).toBe('ven-100'); // Attached strictly to session vendor!
  });

  // --------------------------------------------------------------------------
  // Scenario 5: Vendor A cannot edit or delete Vendor B's product (expect 403)
  // --------------------------------------------------------------------------
  it("Scenario 5: Vendor A cannot edit or delete Vendor B's product (expect 403 Forbidden)", async () => {
    const vendorAUser = {
      id: 'usr-vendor-a',
      role: 'VENDOR',
    };
    const vendorA = {
      id: 'ven-vendor-a',
      ownerId: 'usr-vendor-a',
      status: 'ACTIVE',
    };

    // Product belongs to Vendor B!
    const productB = {
      id: 'prod-vendor-b',
      name: 'Vendor B Product',
      vendorId: 'ven-vendor-b',
    };

    // Test PATCH
    vi.mocked(auth.getCurrentUser).mockResolvedValueOnce(vendorAUser as any);
    prismaMock.vendor.findUnique.mockResolvedValueOnce(vendorA);
    prismaMock.product.findUnique.mockResolvedValueOnce(productB);

    const patchReq = new NextRequest('http://localhost:3000/api/products/prod-vendor-b', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Hacked Title' }),
    });

    const patchRes = await updateProduct(patchReq, {
      params: Promise.resolve({ id: 'prod-vendor-b' }),
    });
    expect(patchRes.status).toBe(403);

    // Test DELETE
    vi.mocked(auth.getCurrentUser).mockResolvedValueOnce(vendorAUser as any);
    prismaMock.vendor.findUnique.mockResolvedValueOnce(vendorA);
    prismaMock.product.findUnique.mockResolvedValueOnce(productB);

    const deleteReq = new NextRequest('http://localhost:3000/api/products/prod-vendor-b', {
      method: 'DELETE',
    });

    const deleteRes = await deleteProduct(deleteReq, {
      params: Promise.resolve({ id: 'prod-vendor-b' }),
    });
    expect(deleteRes.status).toBe(403);
  });

  // --------------------------------------------------------------------------
  // Scenario 6: Public storefront for an active vendor shows only active products
  // --------------------------------------------------------------------------
  it('Scenario 6: Public storefront for an active vendor shows only that vendor active products', async () => {
    const activeVendor = {
      id: 'ven-active',
      name: 'TechStore',
      slug: 'techstore',
      status: 'ACTIVE',
    };

    prismaMock.vendor.findUnique.mockResolvedValueOnce(activeVendor);
    vi.mocked(auth.getCurrentUser).mockResolvedValueOnce(null); // Anonymous public user

    prismaMock.product.findMany.mockResolvedValueOnce([
      { id: 'p1', name: 'Active Keyboard', status: 'ACTIVE', vendorId: 'ven-active' },
    ]);

    // Public vendor query
    const { GET: getVendorProducts } = await import('@/app/api/vendors/[id]/products/route');
    const req = new NextRequest('http://localhost:3000/api/vendors/ven-active/products');
    const res = await getVendorProducts(req, {
      params: Promise.resolve({ id: 'ven-active' }),
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.length).toBe(1);
    expect(json.data[0].status).toBe('ACTIVE');
  });

  // --------------------------------------------------------------------------
  // Scenario 7: Public storefront for a suspended vendor is unreachable (expect 404)
  // --------------------------------------------------------------------------
  it('Scenario 7: Public storefront for a suspended vendor is unreachable (expect 404)', async () => {
    const suspendedVendor = {
      id: 'ven-suspended',
      name: 'Suspended Store',
      status: 'SUSPENDED',
      ownerId: 'usr-different-owner',
    };

    prismaMock.vendor.findUnique.mockResolvedValueOnce(suspendedVendor);
    vi.mocked(auth.getCurrentUser).mockResolvedValueOnce(null); // Anonymous public user

    const req = new NextRequest('http://localhost:3000/api/vendors/ven-suspended');
    const res = await getVendorDetail(req, {
      params: Promise.resolve({ id: 'ven-suspended' }),
    });

    expect(res.status).toBe(404);
  });

  // --------------------------------------------------------------------------
  // Scenario 8: Customer can browse vendors and products without a vendor account
  // --------------------------------------------------------------------------
  it('Scenario 8: Customer can browse vendors and products without a vendor account', async () => {
    prismaMock.vendor.findMany.mockResolvedValueOnce([
      { id: 'v1', name: 'Vendor 1', slug: 'v-1', status: 'ACTIVE' },
    ]);
    prismaMock.product.findMany.mockResolvedValueOnce([
      { id: 'p1', name: 'Product 1', price: 20, vendor: { name: 'Vendor 1', slug: 'v-1' } },
    ]);

    // Browse vendors
    const vendorRes = await getActiveVendors();
    const vendorJson = await vendorRes.json();
    expect(vendorRes.status).toBe(200);
    expect(vendorJson.data.length).toBe(1);

    // Browse products
    const productReq = new NextRequest('http://localhost:3000/api/products');
    const productRes = await getProducts(productReq);
    const productJson = await productRes.json();
    expect(productRes.status).toBe(200);
    expect(productJson.data.length).toBe(1);
    expect(productJson.data[0].vendor.name).toBe('Vendor 1');
  });

  // --------------------------------------------------------------------------
  // Scenario 9: Admin can approve, suspend, and reactivate vendors
  // --------------------------------------------------------------------------
  it('Scenario 9: Admin can approve, suspend, and reactivate vendors', async () => {
    const adminUser = { id: 'admin-1', role: 'ADMIN' };

    // 1. Suspend active vendor
    vi.mocked(auth.getCurrentUser).mockResolvedValueOnce(adminUser as any);
    prismaMock.vendor.findUnique.mockResolvedValueOnce({ id: 'v-1', status: 'ACTIVE', slug: 'v1' });
    prismaMock.vendor.update.mockResolvedValueOnce({ id: 'v-1', status: 'SUSPENDED' });

    const suspendReq = new NextRequest('http://localhost:3000/api/admin/vendors/v-1/status', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'SUSPENDED' }),
    });
    const suspendRes = await updateVendorStatus(suspendReq, { params: Promise.resolve({ id: 'v-1' }) });
    expect(suspendRes.status).toBe(200);
    expect((await suspendRes.json()).data.status).toBe('SUSPENDED');

    // 2. Reactivate suspended vendor
    vi.mocked(auth.getCurrentUser).mockResolvedValueOnce(adminUser as any);
    prismaMock.vendor.findUnique.mockResolvedValueOnce({ id: 'v-1', status: 'SUSPENDED', slug: 'v1' });
    prismaMock.vendor.update.mockResolvedValueOnce({ id: 'v-1', status: 'ACTIVE' });

    const reactivateReq = new NextRequest('http://localhost:3000/api/admin/vendors/v-1/status', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'ACTIVE' }),
    });
    const reactivateRes = await updateVendorStatus(reactivateReq, { params: Promise.resolve({ id: 'v-1' }) });
    expect(reactivateRes.status).toBe(200);
    expect((await reactivateRes.json()).data.status).toBe('ACTIVE');
  });

  // --------------------------------------------------------------------------
  // Scenario 10: Unauthenticated / unauthorized requests return 401 / 403
  // --------------------------------------------------------------------------
  it('Scenario 10: Unauthenticated requests return 401, unauthorized return 403', async () => {
    // 10a: Unauthenticated request to vendor registration returns 401
    vi.mocked(auth.getCurrentUser).mockResolvedValueOnce(null);

    const req = new NextRequest('http://localhost:3000/api/vendors', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test' }),
    });
    const res = await registerVendor(req);
    expect(res.status).toBe(401);

    // 10b: Customer role attempting admin action returns 403
    const customerUser = { id: 'c-1', role: 'CUSTOMER' };
    vi.mocked(auth.getCurrentUser).mockResolvedValueOnce(customerUser as any);

    const adminReq = new NextRequest('http://localhost:3000/api/admin/vendors/v-1/status', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'ACTIVE' }),
    });
    const adminRes = await updateVendorStatus(adminReq, { params: Promise.resolve({ id: 'v-1' }) });
    expect(adminRes.status).toBe(403);
  });
});
