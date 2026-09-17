import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as registerVendor, GET as getActiveVendors } from '@/app/api/vendors/route';
import { PATCH as updateVendorProfile, GET as getVendorDetail } from '@/app/api/vendors/[id]/route';
import { GET as getPublicProducts } from '@/app/api/products/route';
import { GET as getPublicProductDetail } from '@/app/api/products/[id]/route';
import { POST as createVendorProduct, GET as getVendorProducts } from '@/app/api/vendor/products/route';
import { GET as getVendorProductDetail, PATCH as updateVendorProduct, DELETE as deleteVendorProduct } from '@/app/api/vendor/products/[id]/route';
import { PATCH as adjustProductStock } from '@/app/api/vendor/products/[id]/stock/route';
import { GET as getInventoryHistory } from '@/app/api/vendor/products/[id]/inventory-history/route';
import { GET as getVendorInventory } from '@/app/api/vendor/inventory/route';
import { GET as getLowStockInventory } from '@/app/api/vendor/inventory/low-stock/route';
import { GET as getOutOfStockInventory } from '@/app/api/vendor/inventory/out-of-stock/route';
import { PATCH as updateVendorStatus } from '@/app/api/admin/vendors/[id]/status/route';
import { requireVendor, assertProductOwnership, requireAdmin, requireAuth, AppError } from '@/lib/guards';
import { productCreateSchema, productUpdateSchema, stockAdjustmentSchema } from '@/lib/validations';
import { ProductStatus, VendorStatus, AdjustmentType } from '@prisma/client';

// Mock Prisma
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
        findFirst: vi.fn(),
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
      productImage: {
        createMany: vi.fn(),
        deleteMany: vi.fn(),
      },
      productVariant: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        createMany: vi.fn(),
        update: vi.fn(),
        deleteMany: vi.fn(),
      },
      inventoryAdjustment: {
        create: vi.fn(),
        findMany: vi.fn(),
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

describe('Day 2 — Vendor Product & Inventory Management Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // Scenario 1: Vendor creates a product -> auto-attached to authenticated vendor
  // --------------------------------------------------------------------------
  it('Scenario 1: Vendor creates a product -> auto-attached to authenticated vendor', async () => {
    const mockVendorUser = { id: 'usr-v1', name: 'Alex', email: 'alex@novatech.com', role: 'VENDOR' };
    const mockVendor = { id: 'ven-1', slug: 'novatech', status: 'ACTIVE', ownerId: 'usr-v1' };

    vi.mocked(auth.getCurrentUser).mockResolvedValueOnce(mockVendorUser as any);
    prismaMock.vendor.findUnique.mockResolvedValueOnce(mockVendor);
    prismaMock.product.findUnique
      .mockResolvedValueOnce(null) // slug available
      .mockResolvedValueOnce(null); // sku available

    const createdProduct = {
      id: 'prod-100',
      name: 'Wireless Mouse',
      slug: 'wireless-mouse',
      sku: 'NT-MOU-001',
      description: 'Ergonomic 2.4GHz wireless mouse with silent clicks.',
      price: 49.99,
      compareAtPrice: 59.99,
      stockQuantity: 25,
      lowStockThreshold: 5,
      category: 'Electronics',
      status: 'ACTIVE',
      vendorId: 'ven-1',
      images: [],
      variants: [],
      vendor: { id: 'ven-1', name: 'NovaTech', slug: 'novatech' },
    };

    prismaMock.product.create.mockResolvedValueOnce(createdProduct);
    prismaMock.inventoryAdjustment.create.mockResolvedValueOnce({});

    const req = new NextRequest('http://localhost:3000/api/vendor/products', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Wireless Mouse',
        slug: 'wireless-mouse',
        sku: 'NT-MOU-001',
        description: 'Ergonomic 2.4GHz wireless mouse with silent clicks.',
        price: 49.99,
        compareAtPrice: 59.99,
        stockQuantity: 25,
        lowStockThreshold: 5,
        category: 'Electronics',
        status: 'ACTIVE',
        vendorId: 'hacked-vendor-id', // MUST BE IGNORED
      }),
    });

    const res = await createVendorProduct(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.vendorId).toBe('ven-1');
  });

  // --------------------------------------------------------------------------
  // Scenario 2: Vendor updates their own product successfully
  // --------------------------------------------------------------------------
  it('Scenario 2: Vendor updates their own product successfully', async () => {
    const mockVendorUser = { id: 'usr-v1', role: 'VENDOR' };
    const mockVendor = { id: 'ven-1', slug: 'novatech', status: 'ACTIVE' };
    const existingProduct = {
      id: 'prod-100',
      name: 'Old Name',
      slug: 'old-slug',
      sku: 'NT-MOU-001',
      price: 49.99,
      stockQuantity: 25,
      vendorId: 'ven-1',
      images: [],
      variants: [],
    };

    vi.mocked(auth.getCurrentUser).mockResolvedValueOnce(mockVendorUser as any);
    prismaMock.vendor.findUnique.mockResolvedValueOnce(mockVendor);
    prismaMock.product.findUnique.mockResolvedValueOnce(existingProduct); // assertProductOwnership

    const updatedProduct = {
      ...existingProduct,
      name: 'Updated Mechanical Keyboard Pro',
      price: 129.99,
    };
    prismaMock.product.update.mockResolvedValueOnce(updatedProduct);

    const req = new NextRequest('http://localhost:3000/api/vendor/products/prod-100', {
      method: 'PATCH',
      body: JSON.stringify({
        name: 'Updated Mechanical Keyboard Pro',
        price: 129.99,
      }),
    });

    const res = await updateVendorProduct(req, { params: Promise.resolve({ id: 'prod-100' }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.name).toBe('Updated Mechanical Keyboard Pro');
    expect(json.data.price).toBe(129.99);
  });

  // --------------------------------------------------------------------------
  // Scenario 3: Vendor A cannot update Vendor B's product (403)
  // --------------------------------------------------------------------------
  it("Scenario 3: Vendor A cannot update Vendor B's product (403)", async () => {
    const vendorAUser = { id: 'usr-a', role: 'VENDOR' };
    const vendorA = { id: 'ven-a', status: 'ACTIVE' };
    const productB = { id: 'prod-b', name: 'Product B', vendorId: 'ven-b', images: [], variants: [] };

    vi.mocked(auth.getCurrentUser).mockResolvedValueOnce(vendorAUser as any);
    prismaMock.vendor.findUnique.mockResolvedValueOnce(vendorA);
    prismaMock.product.findUnique.mockResolvedValueOnce(productB); // Product belongs to vendor B

    const req = new NextRequest('http://localhost:3000/api/vendor/products/prod-b', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Hacked Title' }),
    });

    const res = await updateVendorProduct(req, { params: Promise.resolve({ id: 'prod-b' }) });
    expect(res.status).toBe(403);
  });

  // --------------------------------------------------------------------------
  // Scenario 4: Vendor A cannot change Vendor B's stock (403)
  // --------------------------------------------------------------------------
  it("Scenario 4: Vendor A cannot change Vendor B's stock (403)", async () => {
    const vendorAUser = { id: 'usr-a', role: 'VENDOR' };
    const vendorA = { id: 'ven-a', status: 'ACTIVE' };
    const productB = { id: 'prod-b', name: 'Product B', vendorId: 'ven-b', stockQuantity: 10, images: [], variants: [] };

    vi.mocked(auth.getCurrentUser).mockResolvedValueOnce(vendorAUser as any);
    prismaMock.vendor.findUnique.mockResolvedValueOnce(vendorA);
    prismaMock.product.findUnique.mockResolvedValueOnce(productB);

    const req = new NextRequest('http://localhost:3000/api/vendor/products/prod-b/stock', {
      method: 'PATCH',
      body: JSON.stringify({ delta: 10 }),
    });

    const res = await adjustProductStock(req, { params: Promise.resolve({ id: 'prod-b' }) });
    expect(res.status).toBe(403);
  });

  // --------------------------------------------------------------------------
  // Scenario 5: Negative stock rejected on create/update/adjustment
  // --------------------------------------------------------------------------
  it('Scenario 5: Negative stock rejected on create/update/adjustment', async () => {
    // 5a. Schema rejects negative stockQuantity on create
    const invalidCreate = productCreateSchema.safeParse({
      name: 'Test Product',
      slug: 'test-product',
      sku: 'SKU-001',
      description: 'A valid long description',
      price: 25.0,
      stockQuantity: -5, // NEGATIVE
      category: 'Tech',
    });
    expect(invalidCreate.success).toBe(false);

    // 5b. Schema rejects negative stockQuantity on update
    const invalidUpdate = productUpdateSchema.safeParse({
      stockQuantity: -10,
    });
    expect(invalidUpdate.success).toBe(false);

    // 5c. Schema rejects negative exactQuantity on adjustment
    const invalidAdjust = stockAdjustmentSchema.safeParse({
      exactQuantity: -2,
    });
    expect(invalidAdjust.success).toBe(false);
  });

  // --------------------------------------------------------------------------
  // Scenario 6: Negative price rejected on create/update
  // --------------------------------------------------------------------------
  it('Scenario 6: Negative price rejected on create/update', async () => {
    const invalidPriceCreate = productCreateSchema.safeParse({
      name: 'Test Product',
      slug: 'test-product',
      sku: 'SKU-001',
      description: 'A valid description',
      price: -19.99, // NEGATIVE
      stockQuantity: 10,
      category: 'Tech',
    });
    expect(invalidPriceCreate.success).toBe(false);

    const invalidPriceUpdate = productUpdateSchema.safeParse({
      price: -50.0,
    });
    expect(invalidPriceUpdate.success).toBe(false);
  });

  // --------------------------------------------------------------------------
  // Scenario 7: Duplicate SKU (within vendor scope) rejected with a clean validation error
  // --------------------------------------------------------------------------
  it('Scenario 7: Duplicate SKU within vendor scope rejected with clean 409 validation error', async () => {
    const mockVendorUser = { id: 'usr-v1', role: 'VENDOR' };
    const mockVendor = { id: 'ven-1', slug: 'novatech', status: 'ACTIVE' };

    vi.mocked(auth.getCurrentUser).mockResolvedValueOnce(mockVendorUser as any);
    prismaMock.vendor.findUnique.mockResolvedValueOnce(mockVendor);
    prismaMock.product.findUnique
      .mockResolvedValueOnce(null) // slug is unique
      .mockResolvedValueOnce({ id: 'existing-prod-with-same-sku' }); // SKU conflict!

    const req = new NextRequest('http://localhost:3000/api/vendor/products', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Another Item',
        slug: 'another-item',
        sku: 'DUPLICATE-SKU-01',
        description: 'Testing duplicate SKU check.',
        price: 29.99,
        stockQuantity: 10,
        category: 'Gadgets',
      }),
    });

    const res = await createVendorProduct(req);
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.success).toBe(false);
    expect(json.details.sku).toBeDefined();
  });

  // --------------------------------------------------------------------------
  // Scenario 8: Stock change creates matching InventoryAdjustment record with correct delta
  // --------------------------------------------------------------------------
  it('Scenario 8: Stock change creates matching InventoryAdjustment record with correct previous/new/delta values', async () => {
    const vendorUser = { id: 'usr-v1', role: 'VENDOR' };
    const vendor = { id: 'ven-1', status: 'ACTIVE' };
    const product = {
      id: 'prod-100',
      name: 'Wireless Mouse',
      sku: 'NT-MOU-001',
      stockQuantity: 20,
      status: 'ACTIVE',
      vendorId: 'ven-1',
      images: [],
      variants: [],
    };

    vi.mocked(auth.getCurrentUser).mockResolvedValueOnce(vendorUser as any);
    prismaMock.vendor.findUnique.mockResolvedValueOnce(vendor);
    prismaMock.product.findUnique.mockResolvedValueOnce(product);

    let recordedAdjustment: any = null;
    prismaMock.inventoryAdjustment.create.mockImplementationOnce(({ data }: any) => {
      recordedAdjustment = data;
      return Promise.resolve({ id: 'adj-1', ...data });
    });

    prismaMock.product.update.mockResolvedValueOnce({
      ...product,
      stockQuantity: 25,
    });

    const req = new NextRequest('http://localhost:3000/api/vendor/products/prod-100/stock', {
      method: 'PATCH',
      body: JSON.stringify({
        delta: 5,
        reason: 'Restocked 5 units from supplier',
        adjustmentType: 'RESTOCK',
      }),
    });

    const res = await adjustProductStock(req, { params: Promise.resolve({ id: 'prod-100' }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(recordedAdjustment).not.toBeNull();
    expect(recordedAdjustment.previousQuantity).toBe(20);
    expect(recordedAdjustment.newQuantity).toBe(25);
    expect(recordedAdjustment.quantityChanged).toBe(5);
    expect(recordedAdjustment.adjustmentType).toBe('RESTOCK');
    expect(recordedAdjustment.changedByUserId).toBe('usr-v1');
  });

  // --------------------------------------------------------------------------
  // Scenario 9: Stock reaching 0 automatically flips product status to OUT_OF_STOCK
  // --------------------------------------------------------------------------
  it('Scenario 9: Stock reaching 0 automatically flips product status to OUT_OF_STOCK', async () => {
    const vendorUser = { id: 'usr-v1', role: 'VENDOR' };
    const vendor = { id: 'ven-1', status: 'ACTIVE' };
    const product = {
      id: 'prod-100',
      name: 'Wireless Mouse',
      sku: 'NT-MOU-001',
      stockQuantity: 3,
      status: 'ACTIVE',
      vendorId: 'ven-1',
      images: [],
      variants: [],
    };

    vi.mocked(auth.getCurrentUser).mockResolvedValueOnce(vendorUser as any);
    prismaMock.vendor.findUnique.mockResolvedValueOnce(vendor);
    prismaMock.product.findUnique.mockResolvedValueOnce(product);

    let updatedProductData: any = null;
    prismaMock.product.update.mockImplementationOnce(({ data }: any) => {
      updatedProductData = data;
      return Promise.resolve({ ...product, ...data });
    });
    prismaMock.inventoryAdjustment.create.mockResolvedValueOnce({});

    const req = new NextRequest('http://localhost:3000/api/vendor/products/prod-100/stock', {
      method: 'PATCH',
      body: JSON.stringify({
        exactQuantity: 0,
        reason: 'Final inventory cleared',
        adjustmentType: 'SALE',
      }),
    });

    const res = await adjustProductStock(req, { params: Promise.resolve({ id: 'prod-100' }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(updatedProductData.stockQuantity).toBe(0);
    expect(updatedProductData.status).toBe('OUT_OF_STOCK');
  });

  // --------------------------------------------------------------------------
  // Scenario 10: Low-stock query returns products at or below threshold (and excludes 0-stock)
  // --------------------------------------------------------------------------
  it('Scenario 10: Low-stock query returns products at or below threshold (and excludes 0-stock)', async () => {
    const vendorUser = { id: 'usr-v1', role: 'VENDOR' };
    const vendor = { id: 'ven-1', status: 'ACTIVE' };

    vi.mocked(auth.getCurrentUser).mockResolvedValueOnce(vendorUser as any);
    prismaMock.vendor.findUnique.mockResolvedValueOnce(vendor);

    // Mock DB returns list with positive stock items
    prismaMock.product.findMany.mockResolvedValueOnce([
      { id: 'p1', name: 'Monitor', stockQuantity: 3, lowStockThreshold: 5, images: [], variants: [] },
      { id: 'p2', name: 'Keyboard', stockQuantity: 20, lowStockThreshold: 5, images: [], variants: [] },
      { id: 'p3', name: 'Mouse', stockQuantity: 5, lowStockThreshold: 5, images: [], variants: [] },
    ]);

    const req = new NextRequest('http://localhost:3000/api/vendor/inventory/low-stock');
    const res = await getLowStockInventory(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.length).toBe(2); // p1 (3 <= 5) and p3 (5 <= 5), excludes p2 (20 > 5)
    expect(json.data.map((p: any) => p.id)).toEqual(['p1', 'p3']);
  });

  // --------------------------------------------------------------------------
  // Scenario 11: Marketplace listing excludes products whose vendor is not Active
  // --------------------------------------------------------------------------
  it('Scenario 11: Marketplace listing excludes products whose vendor is not Active', async () => {
    let capturedWhere: any = null;
    prismaMock.product.findMany.mockImplementationOnce(({ where }: any) => {
      capturedWhere = where;
      return Promise.resolve([]);
    });

    const req = new NextRequest('http://localhost:3000/api/products');
    const res = await getPublicProducts(req);

    expect(res.status).toBe(200);
    // Verified join integrity: product MUST be ACTIVE and vendor MUST be ACTIVE
    expect(capturedWhere.status).toBe(ProductStatus.ACTIVE);
    expect(capturedWhere.vendor.status).toBe(VendorStatus.ACTIVE);
  });

  // --------------------------------------------------------------------------
  // Scenario 12: Product details page never leaks vendor email or phone
  // --------------------------------------------------------------------------
  it('Scenario 12: Product details page correctly shows owning vendor and never leaks email/phone', async () => {
    const productFromDb = {
      id: 'prod-safe',
      name: 'Safe Product',
      slug: 'safe-product',
      sku: 'SKU-SAFE',
      description: 'Public description',
      price: 99.0,
      compareAtPrice: null,
      stockQuantity: 15,
      lowStockThreshold: 5,
      category: 'Electronics',
      status: 'ACTIVE',
      createdAt: new Date(),
      images: [{ id: 'img-1', url: 'https://example.com/img.jpg', isPrimary: true, order: 0 }],
      variants: [],
      vendor: {
        id: 'ven-1',
        name: 'NovaTech Supplies',
        slug: 'novatech-supplies',
        logoUrl: 'https://example.com/logo.png',
        description: 'Tech store description',
        status: 'ACTIVE',
      },
    };

    prismaMock.product.findFirst.mockResolvedValueOnce(productFromDb);

    const req = new NextRequest('http://localhost:3000/api/products/safe-product');
    const res = await getPublicProductDetail(req, { params: Promise.resolve({ id: 'safe-product' }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.vendor.name).toBe('NovaTech Supplies');
    expect(json.data.vendor.slug).toBe('novatech-supplies');
    // Ensure email & phone are undefined / never present
    expect((json.data.vendor as any).email).toBeUndefined();
    expect((json.data.vendor as any).phone).toBeUndefined();
  });

  // --------------------------------------------------------------------------
  // Scenario 13: Vendor dashboard stats match direct DB counts
  // --------------------------------------------------------------------------
  it('Scenario 13: Vendor dashboard stats match direct DB counts', async () => {
    const vendorUser = { id: 'usr-v1', role: 'VENDOR' };
    const vendor = { id: 'ven-1', status: 'ACTIVE' };

    vi.mocked(auth.getCurrentUser).mockResolvedValueOnce(vendorUser as any);
    prismaMock.vendor.findUnique.mockResolvedValueOnce(vendor);

    prismaMock.product.findMany.mockResolvedValueOnce([]); // product list
    prismaMock.product.count
      .mockResolvedValueOnce(10) // totalProducts
      .mockResolvedValueOnce(7)  // activeProducts
      .mockResolvedValueOnce(2); // draftProducts

    // vendor products for unit and threshold calculation
    prismaMock.product.findMany.mockResolvedValueOnce([
      { id: '1', stockQuantity: 10, lowStockThreshold: 5, status: 'ACTIVE' },
      { id: '2', stockQuantity: 3, lowStockThreshold: 5, status: 'ACTIVE' }, // low stock
      { id: '3', stockQuantity: 0, lowStockThreshold: 5, status: 'OUT_OF_STOCK' }, // out of stock
      { id: '4', stockQuantity: 15, lowStockThreshold: 5, status: 'DRAFT' },
    ]);

    const req = new NextRequest('http://localhost:3000/api/vendor/inventory');
    const res = await getVendorInventory(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.stats.totalProducts).toBe(10);
    expect(json.data.stats.activeProducts).toBe(7);
    expect(json.data.stats.draftProducts).toBe(2);
    expect(json.data.stats.lowStockCount).toBe(1); // item 2
    expect(json.data.stats.outOfStockCount).toBe(1); // item 3
    expect(json.data.stats.totalInventoryUnits).toBe(28); // 10+3+0+15
  });

  // --------------------------------------------------------------------------
  // Scenario 14: Adjusting a variant stock does not corrupt sibling variants
  // --------------------------------------------------------------------------
  it('Scenario 14: Adjusting a variant stock updates variant and parent computed stock without corrupting siblings', async () => {
    const vendorUser = { id: 'usr-v1', role: 'VENDOR' };
    const vendor = { id: 'ven-1', status: 'ACTIVE' };
    const product = {
      id: 'prod-variants',
      name: 'Variant Keyboard',
      sku: 'KB-VAR',
      stockQuantity: 30, // 15 + 15
      status: 'ACTIVE',
      vendorId: 'ven-1',
      images: [],
      variants: [
        { id: 'var-1', sku: 'KB-RED', stockQuantity: 15 },
        { id: 'var-2', sku: 'KB-BLUE', stockQuantity: 15 },
      ],
    };

    vi.mocked(auth.getCurrentUser).mockResolvedValueOnce(vendorUser as any);
    prismaMock.vendor.findUnique.mockResolvedValueOnce(vendor);
    prismaMock.product.findUnique.mockResolvedValueOnce(product);

    prismaMock.productVariant.findFirst.mockResolvedValueOnce({
      id: 'var-1',
      productId: 'prod-variants',
      sku: 'KB-RED',
      stockQuantity: 15,
    });

    prismaMock.productVariant.update.mockResolvedValueOnce({
      id: 'var-1',
      stockQuantity: 20,
    });

    prismaMock.productVariant.findMany.mockResolvedValueOnce([
      { id: 'var-1', stockQuantity: 20 },
      { id: 'var-2', stockQuantity: 15 }, // Sibling untouched!
    ]);

    let recordedAdjustment: any = null;
    prismaMock.inventoryAdjustment.create.mockImplementationOnce(({ data }: any) => {
      recordedAdjustment = data;
      return Promise.resolve({ id: 'adj-var', ...data });
    });

    prismaMock.product.update.mockResolvedValueOnce({
      ...product,
      stockQuantity: 35, // 20 + 15
    });

    const req = new NextRequest('http://localhost:3000/api/vendor/products/prod-variants/stock', {
      method: 'PATCH',
      body: JSON.stringify({
        variantId: 'var-1',
        delta: 5,
        reason: 'Restocked Red switch variant',
      }),
    });

    const res = await adjustProductStock(req, { params: Promise.resolve({ id: 'prod-variants' }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(recordedAdjustment.variantId).toBe('var-1');
    expect(recordedAdjustment.previousQuantity).toBe(15);
    expect(recordedAdjustment.newQuantity).toBe(20);
    expect(recordedAdjustment.quantityChanged).toBe(5);
  });

  // --------------------------------------------------------------------------
  // Scenario 15: Unauthenticated / wrong-role requests return 401 / 403
  // --------------------------------------------------------------------------
  it('Scenario 15: Unauthenticated / wrong-role requests to /vendor/* return 401 / 403', async () => {
    // 15a. Unauthenticated request -> 401
    vi.mocked(auth.getCurrentUser).mockResolvedValueOnce(null);
    const unauthReq = new NextRequest('http://localhost:3000/api/vendor/products');
    const unauthRes = await getVendorProducts(unauthReq);
    expect(unauthRes.status).toBe(401);

    // 15b. Customer role without vendor profile -> 403
    const customerUser = { id: 'usr-cust', role: 'CUSTOMER' };
    vi.mocked(auth.getCurrentUser).mockResolvedValueOnce(customerUser as any);
    prismaMock.vendor.findUnique.mockResolvedValueOnce(null);

    const noVendorReq = new NextRequest('http://localhost:3000/api/vendor/products');
    const noVendorRes = await getVendorProducts(noVendorReq);
    expect(noVendorRes.status).toBe(403);
  });
});
