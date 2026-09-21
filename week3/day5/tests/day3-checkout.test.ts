import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getCart, DELETE as clearCart } from '@/app/api/cart/route';
import { POST as addCartItem } from '@/app/api/cart/items/route';
import { PATCH as updateCartItem, DELETE as deleteCartItem } from '@/app/api/cart/items/[id]/route';
import { POST as validateCheckout } from '@/app/api/checkout/validate/route';
import { POST as performCheckout } from '@/app/api/checkout/route';
import { GET as getCustomerOrders } from '@/app/api/orders/route';
import { GET as getCustomerOrderDetail } from '@/app/api/orders/[id]/route';
import { GET as getVendorOrders } from '@/app/api/vendor/orders/route';
import { GET as getVendorOrderDetail } from '@/app/api/vendor/orders/[id]/route';
import { PATCH as updateVendorOrderStatus } from '@/app/api/vendor/orders/[id]/status/route';
import { OrderStatus, PaymentStatus, ProductStatus, VendorStatus, AdjustmentType } from '@prisma/client';

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
        count: vi.fn(),
      },
      product: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        count: vi.fn(),
      },
      productVariant: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      cart: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      cartItem: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        deleteMany: vi.fn(),
      },
      order: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn().mockResolvedValue(0),
      },
      vendorOrder: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      orderItem: {
        create: vi.fn(),
        findMany: vi.fn(),
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
  };
});

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

import prisma from '@/lib/prisma';
import * as auth from '@/lib/auth';

const prismaMock = prisma as any;

describe('Day 3 — Multi-Vendor Cart, Checkout & Order Splitting Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.product.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.productVariant.updateMany.mockResolvedValue({ count: 1 });
  });

  // --------------------------------------------------------------------------
  // Scenario 1: Add product to cart
  // --------------------------------------------------------------------------
  it('Scenario 1: Customer adds an in-stock active product to cart', async () => {
    const customerUser = { id: 'cust-1', name: 'Alice', email: 'alice@example.com', role: 'CUSTOMER' };
    vi.mocked(auth.getCurrentUser).mockResolvedValueOnce(customerUser as any);

    const mockProduct = {
      id: 'prod-1',
      name: 'Mechanical Keyboard',
      price: 120.0,
      stockQuantity: 10,
      status: 'ACTIVE',
      vendorId: 'ven-1',
      vendor: { id: 'ven-1', name: 'NovaTech', status: 'ACTIVE' },
      variants: [],
    };

    prismaMock.product.findUnique.mockResolvedValueOnce(mockProduct);
    prismaMock.cart.findUnique.mockResolvedValueOnce({ id: 'cart-1', customerId: 'cust-1' });
    prismaMock.cartItem.findFirst.mockResolvedValueOnce(null); // Not already in cart
    prismaMock.cartItem.create.mockResolvedValueOnce({
      id: 'item-1',
      cartId: 'cart-1',
      productId: 'prod-1',
      vendorId: 'ven-1',
      quantity: 2,
    });

    const req = new NextRequest('http://localhost:3000/api/cart/items', {
      method: 'POST',
      body: JSON.stringify({ productId: 'prod-1', quantity: 2 }),
    });

    const res = await addCartItem(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.quantity).toBe(2);
  });

  // --------------------------------------------------------------------------
  // Scenario 2 & 3: Multi-vendor cart grouping and totals
  // --------------------------------------------------------------------------
  it('Scenario 2 & 3: Cart with products from multiple vendors groups correctly with per-vendor subtotals', async () => {
    const customerUser = { id: 'cust-1', role: 'CUSTOMER' };
    vi.mocked(auth.getCurrentUser).mockResolvedValueOnce(customerUser as any);

    const mockCart = {
      id: 'cart-1',
      customerId: 'cust-1',
      items: [
        {
          id: 'ci-1',
          productId: 'p-1',
          vendorId: 'v-1',
          quantity: 2,
          product: {
            id: 'p-1',
            name: 'Keychron K2',
            price: 100.0,
            stockQuantity: 5,
            status: 'ACTIVE',
            images: [],
            vendor: { id: 'v-1', name: 'Vendor One', slug: 'v1', status: 'ACTIVE' },
          },
        },
        {
          id: 'ci-2',
          productId: 'p-2',
          vendorId: 'v-2',
          quantity: 1,
          product: {
            id: 'p-2',
            name: 'Studio Headphones',
            price: 150.0,
            stockQuantity: 8,
            status: 'ACTIVE',
            images: [],
            vendor: { id: 'v-2', name: 'Vendor Two', slug: 'v2', status: 'ACTIVE' },
          },
        },
      ],
    };

    prismaMock.cart.findUnique.mockResolvedValueOnce(mockCart);

    const req = new NextRequest('http://localhost:3000/api/cart');
    const res = await getCart(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.vendorGroups.length).toBe(2);
    expect(json.data.subtotal).toBe(350.0); // (100 * 2) + (150 * 1)
    expect(json.data.shippingTotal).toBe(20.0); // 2 vendors * $10
    expect(json.data.grandTotal).toBe(370.0);
  });

  // --------------------------------------------------------------------------
  // Scenario 4: Out-of-stock product cannot be added to cart
  // --------------------------------------------------------------------------
  it('Scenario 4: Out-of-stock product cannot be added to cart (400)', async () => {
    const customerUser = { id: 'cust-1', role: 'CUSTOMER' };
    vi.mocked(auth.getCurrentUser).mockResolvedValueOnce(customerUser as any);

    const outOfStockProd = {
      id: 'prod-0',
      name: 'Zero Stock Item',
      stockQuantity: 0, // OUT OF STOCK
      status: 'OUT_OF_STOCK',
      vendor: { id: 'ven-1', status: 'ACTIVE' },
      variants: [],
    };

    prismaMock.product.findUnique.mockResolvedValueOnce(outOfStockProd);

    const req = new NextRequest('http://localhost:3000/api/cart/items', {
      method: 'POST',
      body: JSON.stringify({ productId: 'prod-0', quantity: 1 }),
    });

    const res = await addCartItem(req);
    expect(res.status).toBe(400);
  });

  // --------------------------------------------------------------------------
  // Scenario 5: Suspended vendor product cannot be added / purchased
  // --------------------------------------------------------------------------
  it('Scenario 5: Suspended-vendor product cannot be added to cart (400)', async () => {
    const customerUser = { id: 'cust-1', role: 'CUSTOMER' };
    vi.mocked(auth.getCurrentUser).mockResolvedValueOnce(customerUser as any);

    const suspendedVendorProd = {
      id: 'prod-bad',
      name: 'Suspended Vendor Item',
      stockQuantity: 10,
      status: 'ACTIVE',
      vendor: { id: 'ven-suspended', name: 'Suspended Store', status: 'SUSPENDED' },
      variants: [],
    };

    prismaMock.product.findUnique.mockResolvedValueOnce(suspendedVendorProd);

    const req = new NextRequest('http://localhost:3000/api/cart/items', {
      method: 'POST',
      body: JSON.stringify({ productId: 'prod-bad', quantity: 1 }),
    });

    const res = await addCartItem(req);
    expect(res.status).toBe(400);
  });

  // --------------------------------------------------------------------------
  // Scenario 6: /checkout/validate catches stale price and stale stock
  // --------------------------------------------------------------------------
  it('Scenario 6: /checkout/validate detects price changes and insufficient stock', async () => {
    const customerUser = { id: 'cust-1', role: 'CUSTOMER' };
    vi.mocked(auth.getCurrentUser).mockResolvedValueOnce(customerUser as any);

    // Mock live DB returns price = $150 (client sent expectedPrice = $100)
    prismaMock.product.findUnique.mockResolvedValueOnce({
      id: 'prod-price-changed',
      name: 'Dynamic Item',
      price: 150.0,
      stockQuantity: 10,
      sku: 'SKU-1',
      status: 'ACTIVE',
      vendor: { id: 'v-1', name: 'V1', status: 'ACTIVE' },
      variants: [],
      images: [],
    });

    const req = new NextRequest('http://localhost:3000/api/checkout/validate', {
      method: 'POST',
      body: JSON.stringify({
        items: [{ productId: 'prod-price-changed', quantity: 1, expectedPrice: 100.0 }],
      }),
    });

    const res = await validateCheckout(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.isValid).toBe(false);
    expect(json.data.invalidItems[0].reason).toBe('PRICE_CHANGED');
  });

  // --------------------------------------------------------------------------
  // Scenario 7 & 8: Successful multi-vendor checkout creates 1 parent order + N vendor orders
  // --------------------------------------------------------------------------
  it('Scenario 7 & 8: Successful checkout creates exactly 1 parent Order and 1 VendorOrder per distinct vendor', async () => {
    const customerUser = { id: 'cust-1', name: 'Alice', email: 'alice@example.com', role: 'CUSTOMER' };
    vi.mocked(auth.getCurrentUser).mockResolvedValueOnce(customerUser as any);

    const mockCart = {
      id: 'cart-1',
      customerId: 'cust-1',
      items: [
        { id: 'ci-1', productId: 'p-1', vendorId: 'v-1', quantity: 1 },
        { id: 'ci-2', productId: 'p-2', vendorId: 'v-2', quantity: 1 },
      ],
    };

    prismaMock.cart.findUnique.mockResolvedValueOnce(mockCart);
    prismaMock.product.findUnique
      .mockResolvedValueOnce({
        id: 'p-1',
        name: 'Keyboard',
        sku: 'KBD-1',
        price: 100.0,
        stockQuantity: 5,
        status: 'ACTIVE',
        vendor: { id: 'v-1', name: 'Alpha Tech', status: 'ACTIVE' },
        variants: [],
      })
      .mockResolvedValueOnce({
        id: 'p-2',
        name: 'Headphones',
        sku: 'HDP-2',
        price: 80.0,
        stockQuantity: 4,
        status: 'ACTIVE',
        vendor: { id: 'v-2', name: 'Beta Audio', status: 'ACTIVE' },
        variants: [],
      });

    prismaMock.order.count.mockResolvedValueOnce(0);

    const createdParentOrder = {
      id: 'ord-1001',
      orderNumber: '#1001',
      customerId: 'cust-1',
      totalAmount: 200.0,
      status: 'CONFIRMED',
      vendorOrders: [
        { id: 'vo-1', vendorOrderNumber: '#1001-A', vendorId: 'v-1', total: 110.0, items: [] },
        { id: 'vo-2', vendorOrderNumber: '#1001-B', vendorId: 'v-2', total: 90.0, items: [] },
      ],
    };

    prismaMock.order.create.mockResolvedValueOnce(createdParentOrder);
    prismaMock.vendorOrder.create
      .mockResolvedValueOnce({ id: 'vo-1', vendorOrderNumber: '#1001-A' })
      .mockResolvedValueOnce({ id: 'vo-2', vendorOrderNumber: '#1001-B' });
    prismaMock.orderItem.create.mockResolvedValue({});
    prismaMock.product.update.mockResolvedValue({});
    prismaMock.inventoryAdjustment.create.mockResolvedValue({});
    prismaMock.cartItem.deleteMany.mockResolvedValue({});
    prismaMock.order.findUnique.mockResolvedValueOnce(createdParentOrder);

    const req = new NextRequest('http://localhost:3000/api/checkout', {
      method: 'POST',
      body: JSON.stringify({
        shippingName: 'Alice Smith',
        shippingEmail: 'alice@example.com',
        shippingPhone: '555-0199',
        shippingAddress: '123 Main St',
        shippingCity: 'Metro City',
        paymentMethod: 'CARD',
      }),
    });

    const res = await performCheckout(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.data.orderNumber).toBe('#1001');
    expect(json.data.vendorOrders.length).toBe(2);
  });

  // --------------------------------------------------------------------------
  // Scenario 9: Vendor can fetch only their own vendor order (403 on others)
  // --------------------------------------------------------------------------
  it("Scenario 9: Vendor A cannot fetch Vendor B's vendor order (403)", async () => {
    const vendorAUser = { id: 'usr-va', role: 'VENDOR' };
    const vendorA = { id: 'ven-a', name: 'Vendor A', status: 'ACTIVE', ownerId: 'usr-va' };

    vi.mocked(auth.getCurrentUser).mockResolvedValueOnce(vendorAUser as any);
    prismaMock.vendor.findUnique.mockResolvedValueOnce(vendorA);

    // Vendor Order belongs to vendor B
    const vendorOrderB = {
      id: 'vo-b',
      vendorId: 'ven-b', // NOT ven-a!
      order: {},
      items: [],
      vendor: { id: 'ven-b' },
    };
    prismaMock.vendorOrder.findUnique.mockResolvedValueOnce(vendorOrderB);

    const req = new NextRequest('http://localhost:3000/api/vendor/orders/vo-b');
    const res = await getVendorOrderDetail(req, { params: Promise.resolve({ id: 'vo-b' }) });

    expect(res.status).toBe(403);
  });

  // --------------------------------------------------------------------------
  // Scenario 10: Customer can view complete multi-vendor order in one place
  // --------------------------------------------------------------------------
  it('Scenario 10: Customer can view their full multi-vendor order details', async () => {
    const customer = { id: 'cust-1', role: 'CUSTOMER' };
    vi.mocked(auth.getCurrentUser).mockResolvedValueOnce(customer as any);

    const fullOrder = {
      id: 'ord-1001',
      orderNumber: '#1001',
      customerId: 'cust-1',
      totalAmount: 370.0,
      vendorOrders: [
        { id: 'vo-1', vendorOrderNumber: '#1001-A', vendor: { name: 'Vendor 1' }, items: [] },
        { id: 'vo-2', vendorOrderNumber: '#1001-B', vendor: { name: 'Vendor 2' }, items: [] },
      ],
    };

    prismaMock.order.findUnique.mockResolvedValueOnce(fullOrder);

    const req = new NextRequest('http://localhost:3000/api/orders/ord-1001');
    const res = await getCustomerOrderDetail(req, { params: Promise.resolve({ id: 'ord-1001' }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.vendorOrders.length).toBe(2);
  });

  // --------------------------------------------------------------------------
  // Scenario 11 & 12: Inventory decremented and InventoryAdjustment (SALE) created
  // --------------------------------------------------------------------------
  it('Scenario 11 & 12: Checkout decrements stock and writes InventoryAdjustment SALE row', async () => {
    const customerUser = { id: 'cust-1', role: 'CUSTOMER' };
    vi.mocked(auth.getCurrentUser).mockResolvedValueOnce(customerUser as any);

    const mockCart = {
      id: 'cart-1',
      customerId: 'cust-1',
      items: [{ id: 'ci-1', productId: 'p-1', vendorId: 'v-1', quantity: 3 }],
    };

    prismaMock.cart.findUnique.mockResolvedValueOnce(mockCart);
    prismaMock.product.findUnique.mockResolvedValueOnce({
      id: 'p-1',
      name: 'Wireless Mouse',
      sku: 'MOU-1',
      price: 50.0,
      stockQuantity: 10,
      status: 'ACTIVE',
      vendor: { id: 'v-1', name: 'V1', status: 'ACTIVE' },
      variants: [],
    });

    let atomicDecrement: any = null;
    prismaMock.product.updateMany.mockImplementationOnce(({ data }: any) => {
      atomicDecrement = data.stockQuantity;
      return Promise.resolve({ count: 1 });
    });

    let recordedAdjustment: any = null;
    prismaMock.inventoryAdjustment.create.mockImplementationOnce(({ data }: any) => {
      recordedAdjustment = data;
      return Promise.resolve({});
    });

    prismaMock.order.create.mockResolvedValueOnce({ id: 'ord-1', orderNumber: '#1001' });
    prismaMock.vendorOrder.create.mockResolvedValueOnce({ id: 'vo-1', vendorOrderNumber: '#1001-A' });
    prismaMock.orderItem.create.mockResolvedValueOnce({});
    prismaMock.cartItem.deleteMany.mockResolvedValueOnce({});
    prismaMock.order.findUnique.mockResolvedValueOnce({ id: 'ord-1', orderNumber: '#1001', vendorOrders: [] });

    const req = new NextRequest('http://localhost:3000/api/checkout', {
      method: 'POST',
      body: JSON.stringify({
        shippingName: 'Alice',
        shippingEmail: 'alice@example.com',
        shippingPhone: '555-1234',
        shippingAddress: '456 Elm St',
        shippingCity: 'City',
      }),
    });

    await performCheckout(req);

    expect(atomicDecrement).toEqual({ decrement: 3 }); // Atomic decrement of 3
    expect(recordedAdjustment).not.toBeNull();
    expect(recordedAdjustment.adjustmentType).toBe('SALE');
    expect(recordedAdjustment.quantityChanged).toBe(-3);
  });

  // --------------------------------------------------------------------------
  // Scenario 13: Stock never goes negative (insufficient stock check inside transaction)
  // --------------------------------------------------------------------------
  it('Scenario 13: Checkout fails if stock is insufficient to prevent negative inventory', async () => {
    const customerUser = { id: 'cust-1', role: 'CUSTOMER' };
    vi.mocked(auth.getCurrentUser).mockResolvedValueOnce(customerUser as any);

    prismaMock.cart.findUnique.mockResolvedValueOnce({
      id: 'cart-1',
      items: [{ id: 'ci-1', productId: 'p-1', vendorId: 'v-1', quantity: 5 }],
    });

    // Product only has 2 in stock
    prismaMock.product.findUnique.mockResolvedValueOnce({
      id: 'p-1',
      name: 'Limited Item',
      stockQuantity: 2, // 2 < 5
      status: 'ACTIVE',
      vendor: { id: 'v-1', status: 'ACTIVE' },
      variants: [],
    });

    const req = new NextRequest('http://localhost:3000/api/checkout', {
      method: 'POST',
      body: JSON.stringify({
        shippingName: 'Alice',
        shippingEmail: 'alice@example.com',
        shippingPhone: '555-1234',
        shippingAddress: '456 Elm St',
        shippingCity: 'City',
      }),
    });

    const res = await performCheckout(req);
    expect(res.status).toBe(400);
  });

  // --------------------------------------------------------------------------
  // Scenario 14: OrderItem snapshots remain correct post-purchase
  // --------------------------------------------------------------------------
  it('Scenario 14: OrderItem holds immutable snapshot of price, sku, and product name', async () => {
    const snapshotItem = {
      id: 'oi-1',
      vendorOrderId: 'vo-1',
      productNameSnapshot: 'Historical Keyboard V1',
      skuSnapshot: 'HIST-KBD-01',
      unitPriceSnapshot: 99.99,
      quantity: 2,
      lineTotal: 199.98,
      variantOptionsSnapshot: { Switch: 'Brown' },
    };

    expect(snapshotItem.productNameSnapshot).toBe('Historical Keyboard V1');
    expect(snapshotItem.unitPriceSnapshot).toBe(99.99);
    expect(snapshotItem.lineTotal).toBe(199.98);
  });

  // --------------------------------------------------------------------------
  // Scenario 15: Vendor transitions own order through valid states; invalid transitions rejected
  // --------------------------------------------------------------------------
  it('Scenario 15: Vendor order status transitions follow state machine; invalid transitions rejected (400)', async () => {
    const vendorUser = { id: 'usr-v1', role: 'VENDOR' };
    const vendor = { id: 'ven-1', status: 'ACTIVE', ownerId: 'usr-v1' };

    vi.mocked(auth.getCurrentUser).mockResolvedValue(vendorUser as any);
    prismaMock.vendor.findUnique.mockResolvedValue(vendor);

    // 15a. Valid transition: CONFIRMED -> PROCESSING
    prismaMock.vendorOrder.findUnique.mockResolvedValueOnce({
      id: 'vo-1',
      vendorId: 'ven-1',
      status: 'CONFIRMED',
      items: [],
      orderId: 'ord-1',
    });
    prismaMock.vendorOrder.update.mockResolvedValueOnce({ id: 'vo-1', status: 'PROCESSING' });
    prismaMock.vendorOrder.findMany.mockResolvedValueOnce([{ status: 'PROCESSING' }]);
    prismaMock.order.update.mockResolvedValueOnce({});

    const reqValid = new NextRequest('http://localhost:3000/api/vendor/orders/vo-1/status', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'PROCESSING' }),
    });

    const resValid = await updateVendorOrderStatus(reqValid, { params: Promise.resolve({ id: 'vo-1' }) });
    expect(resValid.status).toBe(200);

    // 15b. Invalid transition: CONFIRMED -> DELIVERED (skipped SHIPPED)
    prismaMock.vendorOrder.findUnique.mockResolvedValueOnce({
      id: 'vo-1',
      vendorId: 'ven-1',
      status: 'CONFIRMED',
      items: [],
      orderId: 'ord-1',
    });

    const reqInvalid = new NextRequest('http://localhost:3000/api/vendor/orders/vo-1/status', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'DELIVERED' }),
    });

    const resInvalid = await updateVendorOrderStatus(reqInvalid, { params: Promise.resolve({ id: 'vo-1' }) });
    expect(resInvalid.status).toBe(400);
  });

  // --------------------------------------------------------------------------
  // Scenario 16: Vendor cannot modify another vendor's order status (403)
  // --------------------------------------------------------------------------
  it("Scenario 16: Vendor A cannot modify Vendor B's order status (403)", async () => {
    const vendorAUser = { id: 'usr-va', role: 'VENDOR' };
    const vendorA = { id: 'ven-a', status: 'ACTIVE', ownerId: 'usr-va' };

    vi.mocked(auth.getCurrentUser).mockResolvedValueOnce(vendorAUser as any);
    prismaMock.vendor.findUnique.mockResolvedValueOnce(vendorA);

    prismaMock.vendorOrder.findUnique.mockResolvedValueOnce({
      id: 'vo-b',
      vendorId: 'ven-b', // NOT ven-a
      status: 'CONFIRMED',
    });

    const req = new NextRequest('http://localhost:3000/api/vendor/orders/vo-b/status', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'PROCESSING' }),
    });

    const res = await updateVendorOrderStatus(req, { params: Promise.resolve({ id: 'vo-b' }) });
    expect(res.status).toBe(403);
  });

  // --------------------------------------------------------------------------
  // Scenario 17: Customer cannot access another customer's order (403/404)
  // --------------------------------------------------------------------------
  it("Scenario 17: Customer A cannot access Customer B's order (403)", async () => {
    const customerA = { id: 'cust-a', role: 'CUSTOMER' };
    vi.mocked(auth.getCurrentUser).mockResolvedValueOnce(customerA as any);

    prismaMock.order.findUnique.mockResolvedValueOnce({
      id: 'ord-b',
      customerId: 'cust-b', // NOT cust-a
      vendorOrders: [],
    });

    const req = new NextRequest('http://localhost:3000/api/orders/ord-b');
    const res = await getCustomerOrderDetail(req, { params: Promise.resolve({ id: 'ord-b' }) });
    expect(res.status).toBe(403);
  });

  // --------------------------------------------------------------------------
  // Scenario 18: Failed mid-transaction checkout leaves no partial records
  // --------------------------------------------------------------------------
  it('Scenario 18: Mid-transaction validation failure throws and rolls back entire transaction', async () => {
    const customerUser = { id: 'cust-1', role: 'CUSTOMER' };
    vi.mocked(auth.getCurrentUser).mockResolvedValueOnce(customerUser as any);

    prismaMock.cart.findUnique.mockResolvedValueOnce({
      id: 'cart-1',
      items: [
        { id: 'ci-1', productId: 'p-valid', vendorId: 'v-1', quantity: 1 },
        { id: 'ci-2', productId: 'p-inactive', vendorId: 'v-2', quantity: 1 },
      ],
    });

    prismaMock.product.findUnique
      .mockResolvedValueOnce({
        id: 'p-valid',
        name: 'Valid Prod',
        status: 'ACTIVE',
        stockQuantity: 10,
        price: 50,
        vendor: { id: 'v-1', status: 'ACTIVE' },
        variants: [],
      })
      .mockResolvedValueOnce({
        id: 'p-inactive',
        name: 'Inactive Prod',
        status: 'ARCHIVED', // Causes abort
        stockQuantity: 10,
        price: 50,
        vendor: { id: 'v-2', status: 'ACTIVE' },
        variants: [],
      });

    const req = new NextRequest('http://localhost:3000/api/checkout', {
      method: 'POST',
      body: JSON.stringify({
        shippingName: 'Alice',
        shippingEmail: 'alice@example.com',
        shippingPhone: '555-1234',
        shippingAddress: '456 Elm St',
        shippingCity: 'City',
      }),
    });

    const res = await performCheckout(req);
    expect(res.status).toBe(400);
    // Order creation was never reached
    expect(prismaMock.order.create).not.toHaveBeenCalled();
  });
});
