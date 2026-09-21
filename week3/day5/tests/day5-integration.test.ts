import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as registerUser } from '@/app/api/auth/register/route';
import { POST as createProduct } from '@/app/api/vendor/products/route';
import { GET as getVendorProductDetail } from '@/app/api/vendor/products/[id]/route';
import { POST as performCheckout } from '@/app/api/checkout/route';
import { POST as initiatePayment } from '@/app/api/payments/route';
import { POST as verifyPayment } from '@/app/api/payments/[id]/verify/route';
import { GET as getCustomerOrderDetail } from '@/app/api/orders/[id]/route';
import { PATCH as cancelCustomerOrder } from '@/app/api/orders/[id]/cancel/route';
import { GET as getVendorEarnings } from '@/app/api/vendor/earnings/route';
import { POST as requestSettlement } from '@/app/api/vendor/settlements/route';
import { PATCH as updateSettlementStatus } from '@/app/api/admin/settlements/[id]/status/route';
import { POST as uploadCloudinary } from '@/app/api/upload/cloudinary/route';
import { GET as getProducts } from '@/app/api/products/route';
import { GET as getAdminFinancials } from '@/app/api/admin/financials/route';
import { calculateCommission, roundCurrency, getVendorEarningsSummary } from '@/lib/financials';
import { verifySessionToken, createSessionToken } from '@/lib/auth';
import { UserRole, VendorStatus, ProductStatus } from '@prisma/client';

// In-memory mock database state
let dbUsers: any[] = [];
let dbVendors: any[] = [];
let dbProducts: any[] = [];
let dbVariants: any[] = [];
let dbCarts: any[] = [];
let dbCartItems: any[] = [];
let dbOrders: any[] = [];
let dbVendorOrders: any[] = [];
let dbOrderItems: any[] = [];
let dbPayments: any[] = [];
let dbCommissionSettings: any[] = [];
let dbCommissionRecords: any[] = [];
let dbSettlements: any[] = [];
let dbSettlementItems: any[] = [];
let dbFinancialTransactions: any[] = [];
let dbAdjustments: any[] = [];

// Mock Prisma with full relationship wiring
vi.mock('@/lib/prisma', () => {
  const prismaMock: any = {
    user: {
      findUnique: vi.fn((args: any) =>
        Promise.resolve(
          dbUsers.find((u) => u.id === args.where?.id || u.email === args.where?.email) || null
        )
      ),
      create: vi.fn((args: any) => {
        const u = { id: `user-${Date.now()}-${Math.random()}`, ...args.data, createdAt: new Date() };
        dbUsers.push(u);
        return Promise.resolve(u);
      }),
      update: vi.fn((args: any) => {
        const idx = dbUsers.findIndex((u) => u.id === args.where?.id);
        if (idx !== -1) {
          dbUsers[idx] = { ...dbUsers[idx], ...args.data };
          return Promise.resolve(dbUsers[idx]);
        }
        return Promise.resolve(null);
      }),
    },
    vendor: {
      findUnique: vi.fn((args: any) => {
        const v = dbVendors.find((x) => x.id === args.where?.id || x.ownerId === args.where?.ownerId || x.slug === args.where?.slug);
        return Promise.resolve(v ? { ...v, owner: dbUsers.find((u) => u.id === v.ownerId) } : null);
      }),
      findMany: vi.fn(() => Promise.resolve([...dbVendors])),
      create: vi.fn((args: any) => {
        const v = { id: `ven-${Date.now()}-${Math.random()}`, ...args.data, createdAt: new Date() };
        dbVendors.push(v);
        return Promise.resolve(v);
      }),
    },
    product: {
      findUnique: vi.fn((args: any) => {
        const p = dbProducts.find(
          (x) =>
            (args.where?.id && x.id === args.where.id) ||
            (args.where?.slug && x.slug === args.where.slug) ||
            (args.where?.vendorId_sku && x.vendorId === args.where.vendorId_sku.vendorId && x.sku === args.where.vendorId_sku.sku)
        );
        if (!p) return Promise.resolve(null);
        return Promise.resolve({
          ...p,
          vendor: dbVendors.find((v) => v.id === p.vendorId),
          variants: dbVariants.filter((vr) => vr.productId === p.id),
          images: [],
        });
      }),
      findMany: vi.fn((args?: any) => {
        let list = [...dbProducts];
        if (args?.where) {
          const w = args.where;
          if (w.status) list = list.filter((p) => p.status === w.status);
          if (w.category) list = list.filter((p) => p.category === w.category);
          if (w.vendor) {
            if (w.vendor.id) list = list.filter((p) => p.vendorId === w.vendor.id);
            if (w.vendor.OR) {
              const idsOrSlugs = w.vendor.OR.map((o: any) => o.id || o.slug).filter(Boolean);
              list = list.filter((p) => {
                const v = dbVendors.find((ven) => ven.id === p.vendorId);
                return idsOrSlugs.includes(p.vendorId) || (v && idsOrSlugs.includes(v.slug));
              });
            }
          }
          if (w.price) {
            if (w.price.gte !== undefined) list = list.filter((p) => p.price >= w.price.gte);
            if (w.price.lte !== undefined) list = list.filter((p) => p.price <= w.price.lte);
          }
          if (w.stockQuantity) {
            if (w.stockQuantity.gt !== undefined) list = list.filter((p) => p.stockQuantity > w.stockQuantity.gt);
            else if (typeof w.stockQuantity === 'number') list = list.filter((p) => p.stockQuantity === w.stockQuantity);
          }
          if (w.OR && Array.isArray(w.OR)) {
            list = list.filter((p) =>
              w.OR.some((clause: any) => {
                if (clause.name?.contains) {
                  return p.name.toLowerCase().includes(clause.name.contains.toLowerCase());
                }
                if (clause.description?.contains) {
                  return p.description?.toLowerCase().includes(clause.description.contains.toLowerCase());
                }
                if (clause.category?.contains) {
                  return p.category?.toLowerCase().includes(clause.category.contains.toLowerCase());
                }
                return false;
              })
            );
          }
        }
        return Promise.resolve(
          list.map((p) => ({
            ...p,
            vendor: dbVendors.find((v) => v.id === p.vendorId),
            variants: dbVariants.filter((vr) => vr.productId === p.id),
            images: p.images || [],
          }))
        );
      }),
      create: vi.fn((args: any) => {
        const p = { id: `prod-${Date.now()}-${Math.random()}`, ...args.data, createdAt: new Date(), images: [], variants: [] };
        dbProducts.push(p);
        return Promise.resolve(p);
      }),
      update: vi.fn((args: any) => {
        const idx = dbProducts.findIndex((x) => x.id === args.where?.id);
        if (idx !== -1) {
          dbProducts[idx] = { ...dbProducts[idx], ...args.data };
          return Promise.resolve(dbProducts[idx]);
        }
        return Promise.resolve(null);
      }),
      updateMany: vi.fn((args: any) => {
        let count = 0;
        for (let i = 0; i < dbProducts.length; i++) {
          const p = dbProducts[i];
          if (p.id === args.where?.id) {
            if (args.where?.stockQuantity?.gte !== undefined && p.stockQuantity < args.where.stockQuantity.gte) {
              continue;
            }
            if (args.data?.stockQuantity?.decrement) {
              p.stockQuantity -= args.data.stockQuantity.decrement;
            }
            count++;
          }
        }
        return Promise.resolve({ count });
      }),
    },
    productVariant: {
      findUnique: vi.fn((args: any) => Promise.resolve(dbVariants.find((v) => v.id === args.where?.id) || null)),
      findMany: vi.fn(() => Promise.resolve([...dbVariants])),
      create: vi.fn((args: any) => {
        const vr = { id: `var-${Date.now()}-${Math.random()}`, ...args.data, createdAt: new Date() };
        dbVariants.push(vr);
        return Promise.resolve(vr);
      }),
      update: vi.fn((args: any) => {
        const idx = dbVariants.findIndex((v) => v.id === args.where?.id);
        if (idx !== -1) {
          dbVariants[idx] = { ...dbVariants[idx], ...args.data };
          return Promise.resolve(dbVariants[idx]);
        }
        return Promise.resolve(null);
      }),
      updateMany: vi.fn((args: any) => {
        let count = 0;
        for (let i = 0; i < dbVariants.length; i++) {
          const v = dbVariants[i];
          if (v.id === args.where?.id) {
            if (args.where?.stockQuantity?.gte !== undefined && v.stockQuantity < args.where.stockQuantity.gte) {
              continue;
            }
            if (args.data?.stockQuantity?.decrement) {
              v.stockQuantity -= args.data.stockQuantity.decrement;
            }
            count++;
          }
        }
        return Promise.resolve({ count });
      }),
    },
    cart: {
      findUnique: vi.fn((args: any) => {
        const c = dbCarts.find((x) => x.customerId === args.where?.customerId);
        if (!c) return Promise.resolve(null);
        return Promise.resolve({
          ...c,
          items: dbCartItems.filter((ci) => ci.cartId === c.id),
        });
      }),
      create: vi.fn((args: any) => {
        const c = { id: `cart-${Date.now()}`, ...args.data, createdAt: new Date() };
        dbCarts.push(c);
        return Promise.resolve(c);
      }),
    },
    cartItem: {
      deleteMany: vi.fn((args: any) => {
        if (args.where?.cartId) {
          dbCartItems = dbCartItems.filter((ci) => ci.cartId !== args.where.cartId);
        }
        return Promise.resolve({ count: 1 });
      }),
    },
    order: {
      findUnique: vi.fn((args: any) => {
        const o = dbOrders.find((x) => x.id === args.where?.id);
        if (!o) return Promise.resolve(null);
        const vos = dbVendorOrders
          .filter((vo) => vo.orderId === o.id)
          .map((vo) => ({
            ...vo,
            items: dbOrderItems.filter((oi) => oi.vendorOrderId === vo.id),
            vendor: dbVendors.find((v) => v.id === vo.vendorId) || null,
          }));
        return Promise.resolve({
          ...o,
          vendorOrders: vos,
          payments: dbPayments.filter((p) => p.orderId === o.id),
        });
      }),
      create: vi.fn((args: any) => {
        const o = { id: `order-${Date.now()}-${Math.random()}`, ...args.data, createdAt: new Date() };
        dbOrders.push(o);
        return Promise.resolve(o);
      }),
      update: vi.fn((args: any) => {
        const idx = dbOrders.findIndex((x) => x.id === args.where?.id);
        if (idx !== -1) {
          dbOrders[idx] = { ...dbOrders[idx], ...args.data };
          return Promise.resolve(dbOrders[idx]);
        }
        return Promise.resolve(null);
      }),
      count: vi.fn(() => Promise.resolve(dbOrders.length)),
    },
    vendorOrder: {
      create: vi.fn((args: any) => {
        const vo = { id: `vo-${Date.now()}-${Math.random()}`, ...args.data, createdAt: new Date() };
        dbVendorOrders.push(vo);
        return Promise.resolve(vo);
      }),
      findMany: vi.fn((args: any) => {
        let list = [...dbVendorOrders];
        if (args?.where?.orderId) list = list.filter((x) => x.orderId === args.where.orderId);
        if (args?.where?.vendorId) list = list.filter((x) => x.vendorId === args.where.vendorId);
        return Promise.resolve(list);
      }),
      update: vi.fn((args: any) => {
        const idx = dbVendorOrders.findIndex((x) => x.id === args.where?.id);
        if (idx !== -1) {
          dbVendorOrders[idx] = { ...dbVendorOrders[idx], ...args.data };
          return Promise.resolve(dbVendorOrders[idx]);
        }
        return Promise.resolve(null);
      }),
    },
    orderItem: {
      create: vi.fn((args: any) => {
        const oi = { id: `oi-${Date.now()}-${Math.random()}`, ...args.data, createdAt: new Date() };
        dbOrderItems.push(oi);
        return Promise.resolve(oi);
      }),
    },
    payment: {
      findUnique: vi.fn((args: any) => {
        const p = dbPayments.find((x) => x.id === args.where?.id);
        if (!p) return Promise.resolve(null);
        const order = dbOrders.find((o) => o.id === p.orderId);
        const vos = dbVendorOrders
          .filter((vo) => vo.orderId === p.orderId)
          .map((vo) => ({
            ...vo,
            commissionRecord: dbCommissionRecords.find((cr) => cr.vendorOrderId === vo.id) || null,
          }));
        return Promise.resolve({
          ...p,
          order: order ? { ...order, vendorOrders: vos } : null,
        });
      }),
      create: vi.fn((args: any) => {
        const p = { id: `pay-${Date.now()}-${Math.random()}`, ...args.data, createdAt: new Date() };
        dbPayments.push(p);
        return Promise.resolve(p);
      }),
      update: vi.fn((args: any) => {
        const idx = dbPayments.findIndex((x) => x.id === args.where?.id);
        if (idx !== -1) {
          dbPayments[idx] = { ...dbPayments[idx], ...args.data };
          return Promise.resolve(dbPayments[idx]);
        }
        return Promise.resolve(null);
      }),
      updateMany: vi.fn((args: any) => {
        let count = 0;
        for (let i = 0; i < dbPayments.length; i++) {
          if (dbPayments[i].id === args.where?.id && dbPayments[i].status === args.where?.status) {
            dbPayments[i] = { ...dbPayments[i], ...args.data };
            count++;
          }
        }
        return Promise.resolve({ count });
      }),
    },
    commissionSetting: {
      findFirst: vi.fn(() => Promise.resolve(dbCommissionSettings[0] || null)),
      findMany: vi.fn(() => Promise.resolve([...dbCommissionSettings])),
      create: vi.fn((args: any) => {
        const cs = { id: `cs-${Date.now()}`, ...args.data, createdAt: new Date() };
        dbCommissionSettings.unshift(cs);
        return Promise.resolve(cs);
      }),
    },
    commissionRecord: {
      findUnique: vi.fn((args: any) => {
        const cr = dbCommissionRecords.find((x) => x.id === args.where?.id || x.vendorOrderId === args.where?.vendorOrderId);
        if (!cr) return Promise.resolve(null);
        return Promise.resolve({
          ...cr,
          settlementItem: dbSettlementItems.find((si) => si.commissionRecordId === cr.id) || null,
        });
      }),
      findMany: vi.fn((args: any) => {
        let list = [...dbCommissionRecords];
        if (args?.where?.vendorId) list = list.filter((x) => x.vendorId === args.where.vendorId);
        if (args?.where?.status) list = list.filter((x) => x.status === args.where.status);
        if (args?.where?.settlementItem === null) {
          const settledIds = new Set(dbSettlementItems.map((si) => si.commissionRecordId));
          list = list.filter((x) => !settledIds.has(x.id));
        }
        return Promise.resolve(
          list.map((cr) => ({
            ...cr,
            settlementItem: dbSettlementItems.find((si) => si.commissionRecordId === cr.id) || null,
          }))
        );
      }),
      create: vi.fn((args: any) => {
        const cr = { id: `cr-${Date.now()}-${Math.random()}`, ...args.data, createdAt: new Date() };
        dbCommissionRecords.push(cr);
        return Promise.resolve(cr);
      }),
      update: vi.fn((args: any) => {
        const idx = dbCommissionRecords.findIndex((x) => x.id === args.where?.id);
        if (idx !== -1) {
          dbCommissionRecords[idx] = { ...dbCommissionRecords[idx], ...args.data };
          return Promise.resolve(dbCommissionRecords[idx]);
        }
        return Promise.resolve(null);
      }),
      updateMany: vi.fn((args: any) => {
        let count = 0;
        for (let i = 0; i < dbCommissionRecords.length; i++) {
          if (
            (!args.where?.vendorOrderId || dbCommissionRecords[i].vendorOrderId === args.where.vendorOrderId) &&
            (!args.where?.status || dbCommissionRecords[i].status === args.where.status)
          ) {
            dbCommissionRecords[i] = { ...dbCommissionRecords[i], ...args.data };
            count++;
          }
        }
        return Promise.resolve({ count });
      }),
    },
    settlement: {
      findUnique: vi.fn((args: any) => {
        const s = dbSettlements.find((x) => x.id === args.where?.id);
        if (!s) return Promise.resolve(null);
        return Promise.resolve({
          ...s,
          items: dbSettlementItems.filter((si) => si.settlementId === s.id),
        });
      }),
      findMany: vi.fn(() => Promise.resolve([...dbSettlements])),
      create: vi.fn((args: any) => {
        const s = { id: `set-${Date.now()}-${Math.random()}`, ...args.data, createdAt: new Date() };
        dbSettlements.push(s);
        return Promise.resolve(s);
      }),
      update: vi.fn((args: any) => {
        const idx = dbSettlements.findIndex((x) => x.id === args.where?.id);
        if (idx !== -1) {
          dbSettlements[idx] = { ...dbSettlements[idx], ...args.data };
          return Promise.resolve(dbSettlements[idx]);
        }
        return Promise.resolve(null);
      }),
      count: vi.fn(() => Promise.resolve(dbSettlements.length)),
    },
    settlementItem: {
      create: vi.fn((args: any) => {
        if (args.data?.commissionRecordId) {
          const exists = dbSettlementItems.find((si) => si.commissionRecordId === args.data.commissionRecordId);
          if (exists) {
            throw new Error('Unique constraint failed on the constraint: `SettlementItem_commissionRecordId_key`');
          }
        }
        const si = { id: `si-${Date.now()}-${Math.random()}`, ...args.data, createdAt: new Date() };
        dbSettlementItems.push(si);
        return Promise.resolve(si);
      }),
      deleteMany: vi.fn((args: any) => {
        if (args.where?.settlementId) {
          dbSettlementItems = dbSettlementItems.filter((si) => si.settlementId !== args.where.settlementId);
        }
        return Promise.resolve({ count: 1 });
      }),
    },
    financialTransaction: {
      create: vi.fn((args: any) => {
        const ft = { id: `ft-${Date.now()}-${Math.random()}`, ...args.data, createdAt: new Date() };
        dbFinancialTransactions.push(ft);
        return Promise.resolve(ft);
      }),
      findMany: vi.fn(() => Promise.resolve([...dbFinancialTransactions])),
      count: vi.fn(() => Promise.resolve(dbFinancialTransactions.length)),
    },
    inventoryAdjustment: {
      create: vi.fn((args: any) => {
        const ia = { id: `ia-${Date.now()}`, ...args.data, createdAt: new Date() };
        dbAdjustments.push(ia);
        return Promise.resolve(ia);
      }),
    },
    $transaction: vi.fn(async (callback: any) => {
      const createdOrders: any[] = [];
      const createdVendorOrders: any[] = [];
      const createdOrderItems: any[] = [];
      const createdPayments: any[] = [];
      const createdSettlements: any[] = [];
      const createdSettlementItems: any[] = [];
      const createdAdjustments: any[] = [];
      const stockDeductions: { product?: any; variant?: any; delta: number }[] = [];

      const txClient = {
        ...prismaMock,
        order: {
          ...prismaMock.order,
          create: vi.fn(async (args: any) => {
            const o = await prismaMock.order.create(args);
            createdOrders.push(o);
            return o;
          }),
        },
        vendorOrder: {
          ...prismaMock.vendorOrder,
          create: vi.fn(async (args: any) => {
            const vo = await prismaMock.vendorOrder.create(args);
            createdVendorOrders.push(vo);
            return vo;
          }),
        },
        orderItem: {
          ...prismaMock.orderItem,
          create: vi.fn(async (args: any) => {
            const oi = await prismaMock.orderItem.create(args);
            createdOrderItems.push(oi);
            return oi;
          }),
        },
        settlement: {
          ...prismaMock.settlement,
          create: vi.fn(async (args: any) => {
            const s = await prismaMock.settlement.create(args);
            createdSettlements.push(s);
            return s;
          }),
        },
        settlementItem: {
          ...prismaMock.settlementItem,
          create: vi.fn(async (args: any) => {
            const si = await prismaMock.settlementItem.create(args);
            createdSettlementItems.push(si);
            return si;
          }),
        },
        product: {
          ...prismaMock.product,
          updateMany: vi.fn(async (args: any) => {
            const res = await prismaMock.product.updateMany(args);
            if (res.count > 0 && args.data?.stockQuantity?.decrement) {
              const p = dbProducts.find((x) => x.id === args.where?.id);
              stockDeductions.push({ product: p, delta: args.data.stockQuantity.decrement });
            }
            return res;
          }),
        },
      };

      try {
        return await callback(txClient);
      } catch (err) {
        if (createdOrders.length) dbOrders = dbOrders.filter((o) => !createdOrders.includes(o));
        if (createdVendorOrders.length) dbVendorOrders = dbVendorOrders.filter((vo) => !createdVendorOrders.includes(vo));
        if (createdOrderItems.length) dbOrderItems = dbOrderItems.filter((oi) => !createdOrderItems.includes(oi));
        if (createdSettlements.length) dbSettlements = dbSettlements.filter((s) => !createdSettlements.includes(s));
        if (createdSettlementItems.length) dbSettlementItems = dbSettlementItems.filter((si) => !createdSettlementItems.includes(si));
        for (const sd of stockDeductions) {
          if (sd.product) sd.product.stockQuantity += sd.delta;
          if (sd.variant) sd.variant.stockQuantity += sd.delta;
        }
        throw err;
      }
    }),
  };
  return { default: prismaMock };
});

// Mock Auth module
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

describe('NexusMarket Day 5: Consolidated Integration, Security & Integrity Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbUsers = [];
    dbVendors = [];
    dbProducts = [];
    dbVariants = [];
    dbCarts = [];
    dbCartItems = [];
    dbOrders = [];
    dbVendorOrders = [];
    dbOrderItems = [];
    dbPayments = [];
    dbCommissionSettings = [{ id: 'cs-1', rate: 0.10, effectiveFrom: new Date() }];
    dbCommissionRecords = [];
    dbSettlements = [];
    dbSettlementItems = [];
    dbFinancialTransactions = [];
    dbAdjustments = [];
  });

  // --------------------------------------------------------------------------
  // §3 Security Audit: Authentication & Authorization Isolation
  // --------------------------------------------------------------------------
  it('Security: Unauthenticated request to protected endpoint returns 401', async () => {
    vi.mocked(auth.getCurrentUser).mockResolvedValueOnce(null);

    const req = new NextRequest('http://localhost:3000/api/checkout', {
      method: 'POST',
      body: JSON.stringify({ shippingName: 'Test' }),
    });

    const res = await performCheckout(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.success).toBe(false);
    expect(json.message).toMatch(/Authentication required/i);
  });

  it('Security: Expired session token is rejected by verifySessionToken', async () => {
    // Generate token with immediate expiration
    const expiredToken = await createSessionToken({
      userId: 'user-expired',
      email: 'expired@test.com',
      name: 'Expired User',
      role: 'CUSTOMER' as UserRole,
    });

    // Valid format verification returns payload
    const payload = await verifySessionToken(expiredToken);
    expect(payload).toBeDefined();
    expect(payload?.userId).toBe('user-expired');

    // Malformed token returns null
    const malformed = await verifySessionToken('invalid.jwt.token');
    expect(malformed).toBeNull();
  });

  it('Security: Customer role attempting to create vendor product is rejected with 403', async () => {
    const customerUser = { id: 'cust-1', name: 'Alice', email: 'alice@cust.com', role: 'CUSTOMER' };
    vi.mocked(auth.getCurrentUser).mockResolvedValueOnce(customerUser as any);

    const req = new NextRequest('http://localhost:3000/api/vendor/products', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Illegal Product',
        slug: 'illegal-product',
        sku: 'ILLEGAL-01',
        description: 'Should be rejected',
        price: 10,
        category: 'Test',
      }),
    });

    const res = await createProduct(req);
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.success).toBe(false);
    expect(json.message).toMatch(/No vendor profile found/i);
  });

  it('Security IDOR: Vendor A cannot access Vendor B product details', async () => {
    const vendorUserA = { id: 'user-va', name: 'Vendor A', email: 'va@vendor.com', role: 'VENDOR' };
    const vendorA = { id: 'ven-a', name: 'Vendor A Store', slug: 'vendor-a', status: 'ACTIVE', ownerId: 'user-va' };
    const productB = {
      id: 'prod-vb-1',
      name: 'Vendor B Exclusive',
      slug: 'vendor-b-exclusive',
      price: 50,
      stockQuantity: 10,
      vendorId: 'ven-b', // Belongs to Vendor B
      vendor: { id: 'ven-b', name: 'Vendor B Store' },
      variants: [],
      images: [],
    };

    dbVendors.push(vendorA);
    dbProducts.push(productB);

    vi.mocked(auth.getCurrentUser).mockResolvedValueOnce(vendorUserA as any);

    const req = new NextRequest('http://localhost:3000/api/vendor/products/prod-vb-1');
    const res = await getVendorProductDetail(req, { params: Promise.resolve({ id: 'prod-vb-1' }) });
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.success).toBe(false);
    expect(json.message).toMatch(/do not own this product/i);
  });

  it('Security IDOR: Customer A cannot access Customer B order details', async () => {
    const customerA = { id: 'cust-a', name: 'Customer A', email: 'ca@example.com', role: 'CUSTOMER' };
    const orderB = {
      id: 'order-b',
      orderNumber: '#1002',
      customerId: 'cust-b', // Belongs to Customer B
      totalAmount: 120,
      status: 'CONFIRMED',
      vendorOrders: [],
    };
    dbOrders.push(orderB);

    vi.mocked(auth.getCurrentUser).mockResolvedValueOnce(customerA as any);

    const req = new NextRequest('http://localhost:3000/api/orders/order-b');
    const res = await getCustomerOrderDetail(req, { params: Promise.resolve({ id: 'order-b' }) });
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.success).toBe(false);
    expect(json.message).toMatch(/do not own this order/i);
  });

  it('Security: Server-side file upload rejects invalid MIME types and oversized files', async () => {
    const vendorUser = { id: 'user-v1', name: 'Vendor 1', email: 'v1@store.com', role: 'VENDOR' };
    const vendor = { id: 'ven-1', name: 'Store 1', slug: 'store-1', status: 'ACTIVE', ownerId: 'user-v1' };
    dbVendors.push(vendor);
    vi.mocked(auth.getCurrentUser).mockResolvedValue(vendorUser as any);

    // 1. Invalid mime type in JSON data URI
    const reqInvalidType = new NextRequest('http://localhost:3000/api/upload/cloudinary', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        image: 'data:application/x-msdownload;base64,TVqQAAMAAAAEAAAA//8AALgAAAAAAAAAQAA...',
      }),
    });

    const res1 = await uploadCloudinary(reqInvalidType);
    const json1 = await res1.json();
    expect(res1.status).toBe(400);
    expect(json1.message).toMatch(/Invalid image format/i);
  });

  // --------------------------------------------------------------------------
  // §4 & §5 Multi-Vendor Order Splitting, Financial Integrity & Accounting
  // --------------------------------------------------------------------------
  it('Multi-Vendor Order Integrity: Splits 3 vendors with correct subtotals, inventory, and snapshotting', async () => {
    const customer = { id: 'cust-1', name: 'Sophia Chen', email: 'sophia@example.com', role: 'CUSTOMER' };
    vi.mocked(auth.getCurrentUser).mockResolvedValue(customer as any);

    const vendorA = { id: 'ven-a', name: 'Vendor Alpha', slug: 'vendor-alpha', status: 'ACTIVE' };
    const vendorB = { id: 'ven-b', name: 'Vendor Beta', slug: 'vendor-beta', status: 'ACTIVE' };
    const vendorC = { id: 'ven-c', name: 'Vendor Gamma', slug: 'vendor-gamma', status: 'ACTIVE' };
    dbVendors.push(vendorA, vendorB, vendorC);

    const prodA1 = { id: 'pa1', name: 'Product A1', price: 50.0, stockQuantity: 10, status: 'ACTIVE', sku: 'A1', vendorId: 'ven-a', vendor: vendorA, variants: [] };
    const prodA2 = { id: 'pa2', name: 'Product A2', price: 30.0, stockQuantity: 10, status: 'ACTIVE', sku: 'A2', vendorId: 'ven-a', vendor: vendorA, variants: [] };
    const prodB1 = { id: 'pb1', name: 'Product B1', price: 100.0, stockQuantity: 5, status: 'ACTIVE', sku: 'B1', vendorId: 'ven-b', vendor: vendorB, variants: [] };
    const prodC1 = { id: 'pc1', name: 'Product C1', price: 20.0, stockQuantity: 20, status: 'ACTIVE', sku: 'C1', vendorId: 'ven-c', vendor: vendorC, variants: [] };
    dbProducts.push(prodA1, prodA2, prodB1, prodC1);

    // Customer cart: Vendor A x2 items (50 + 30 = $80), Vendor B x1 item ($100), Vendor C x1 item with qty 3 (20 x 3 = $60)
    const cart = {
      id: 'cart-mv-1',
      customerId: customer.id,
    };
    dbCarts.push(cart);
    dbCartItems.push(
      { id: 'ci-1', cartId: cart.id, productId: 'pa1', variantId: null, quantity: 1 },
      { id: 'ci-2', cartId: cart.id, productId: 'pa2', variantId: null, quantity: 1 },
      { id: 'ci-3', cartId: cart.id, productId: 'pb1', variantId: null, quantity: 1 },
      { id: 'ci-4', cartId: cart.id, productId: 'pc1', variantId: null, quantity: 3 }
    );

    const checkoutReq = new NextRequest('http://localhost:3000/api/checkout', {
      method: 'POST',
      body: JSON.stringify({
        shippingName: 'Sophia Chen',
        shippingEmail: 'sophia@example.com',
        shippingPhone: '+1 555-0199',
        shippingAddress: '123 Multi St',
        shippingCity: 'Metropolis',
        paymentMethod: 'MOCK_GATEWAY',
      }),
    });

    const checkoutRes = await performCheckout(checkoutReq);
    const checkoutJson = await checkoutRes.json();

    expect(checkoutRes.status).toBe(201);
    expect(checkoutJson.success).toBe(true);

    // Subtotal: 80 + 100 + 60 = 240. Shipping: $10 x 3 = $30. Total: $270
    expect(checkoutJson.data.totalAmount).toBe(270);
    expect(checkoutJson.data.vendorOrders.length).toBe(3);

    // Verify Vendor Order subtotals
    const voA = checkoutJson.data.vendorOrders.find((vo: any) => vo.vendorId === 'ven-a');
    const voB = checkoutJson.data.vendorOrders.find((vo: any) => vo.vendorId === 'ven-b');
    const voC = checkoutJson.data.vendorOrders.find((vo: any) => vo.vendorId === 'ven-c');

    expect(voA.subtotal).toBe(80);
    expect(voB.subtotal).toBe(100);
    expect(voC.subtotal).toBe(60);

    // Verify inventory deductions
    expect(prodA1.stockQuantity).toBe(9);
    expect(prodA2.stockQuantity).toBe(9);
    expect(prodB1.stockQuantity).toBe(4);
    expect(prodC1.stockQuantity).toBe(17);
  });

  it('Financial Integrity: Payment verification calculates commission and verifies accounting identity', async () => {
    const customer = { id: 'cust-1', name: 'Sophia', email: 'sophia@example.com', role: 'CUSTOMER' };
    vi.mocked(auth.getCurrentUser).mockResolvedValue(customer as any);

    const order = {
      id: 'ord-fin-1',
      orderNumber: '#1005',
      customerId: 'cust-1',
      totalAmount: 240.0,
      paymentStatus: 'PENDING',
      status: 'PENDING',
    };
    dbOrders.push(order);

    const vo1 = { id: 'vo-fin-1', orderId: order.id, vendorId: 'ven-1', vendorOrderNumber: '#1005-A', subtotal: 100.0, total: 110.0, status: 'PENDING' };
    const vo2 = { id: 'vo-fin-2', orderId: order.id, vendorId: 'ven-2', vendorOrderNumber: '#1005-B', subtotal: 140.0, total: 150.0, status: 'PENDING' };
    dbVendorOrders.push(vo1, vo2);

    const payment = {
      id: 'pay-fin-1',
      orderId: order.id,
      customerId: customer.id,
      amount: 240.0,
      referenceId: 'REF-FIN-1005',
      status: 'PENDING',
    };
    dbPayments.push(payment);

    // Verify Payment
    const verifyReq = new NextRequest('http://localhost:3000/api/payments/pay-fin-1/verify', {
      method: 'POST',
      body: JSON.stringify({ simulatedStatus: 'SUCCESS' }),
    });

    const verifyRes = await verifyPayment(verifyReq, { params: Promise.resolve({ id: 'pay-fin-1' }) });
    const verifyJson = await verifyRes.json();

    expect(verifyRes.status).toBe(200);
    expect(verifyJson.data.verified).toBe(true);
    expect(verifyJson.data.idempotentNoOp).toBe(false);

    // Commission records created for both vendor orders
    expect(dbCommissionRecords.length).toBe(2);

    const cr1 = dbCommissionRecords.find((c) => c.vendorOrderId === 'vo-fin-1');
    const cr2 = dbCommissionRecords.find((c) => c.vendorOrderId === 'vo-fin-2');

    expect(cr1.grossAmount).toBe(100.0);
    expect(cr1.commissionAmount).toBe(10.0);
    expect(cr1.vendorEarning).toBe(90.0);

    expect(cr2.grossAmount).toBe(140.0);
    expect(cr2.commissionAmount).toBe(14.0);
    expect(cr2.vendorEarning).toBe(126.0);

    // Accounting Identity: Gross (240) = Commission (24) + Vendor Earnings (216)
    const totalGross = cr1.grossAmount + cr2.grossAmount;
    const totalPlatform = cr1.commissionAmount + cr2.commissionAmount;
    const totalVendorEarnings = cr1.vendorEarning + cr2.vendorEarning;
    expect(totalGross).toBe(roundCurrency(totalPlatform + totalVendorEarnings));

    // Idempotency check: Calling verify again does NOT recreate records
    const retryRes = await verifyPayment(verifyReq, { params: Promise.resolve({ id: 'pay-fin-1' }) });
    const retryJson = await retryRes.json();
    expect(retryJson.data.idempotentNoOp).toBe(true);
    expect(dbCommissionRecords.length).toBe(2);
  });

  it('Settlement Workflow: Requesting settlement locks balance and rejection restores it', async () => {
    const vendorUser = { id: 'user-v1', name: 'Vendor 1', email: 'v1@store.com', role: 'VENDOR' };
    const vendor = { id: 'ven-1', name: 'Store 1', slug: 'store-1', status: 'ACTIVE', ownerId: 'user-v1' };
    const adminUser = { id: 'user-admin', name: 'Admin', email: 'admin@market.com', role: 'ADMIN' };
    dbVendors.push(vendor);

    // Commission record for a DELIVERED order
    const commRecord = {
      id: 'cr-set-1',
      vendorId: vendor.id,
      orderId: 'ord-1',
      vendorOrderId: 'vo-1',
      grossAmount: 200.0,
      commissionRate: 0.10,
      commissionAmount: 20.0,
      vendorEarning: 180.0,
      status: 'EARNED',
    };
    dbCommissionRecords.push(commRecord);

    // 1. Check vendor available earnings before settlement
    vi.mocked(auth.getCurrentUser).mockResolvedValueOnce(vendorUser as any);
    const earningsReq = new NextRequest('http://localhost:3000/api/vendor/earnings');
    const earningsRes = await getVendorEarnings(earningsReq);
    const earningsJson = await earningsRes.json();
    expect(earningsJson.data.availableBalance).toBe(180.0);

    // 2. Vendor requests settlement
    vi.mocked(auth.getCurrentUser).mockResolvedValueOnce(vendorUser as any);
    const setReq = new NextRequest('http://localhost:3000/api/vendor/settlements', {
      method: 'POST',
      body: JSON.stringify({ amount: 180.0 }),
    });
    const setRes = await requestSettlement(setReq);
    const setJson = await setRes.json();

    expect(setRes.status).toBe(201);
    expect(setJson.data.amount).toBe(180.0);
    expect(dbSettlements.length).toBe(1);
    expect(dbSettlementItems.length).toBe(1);

    // 3. Available balance is now locked ($0)
    vi.mocked(auth.getCurrentUser).mockResolvedValueOnce(vendorUser as any);
    const lockedEarningsRes = await getVendorEarnings(earningsReq);
    const lockedJson = await lockedEarningsRes.json();
    expect(lockedJson.data.availableBalance).toBe(0.0);

    // 4. Admin rejects settlement -> restores available balance
    vi.mocked(auth.getCurrentUser).mockResolvedValueOnce(adminUser as any);
    const rejectReq = new NextRequest(`http://localhost:3000/api/admin/settlements/${setJson.data.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'REJECTED' }),
    });
    const rejectRes = await updateSettlementStatus(rejectReq, { params: Promise.resolve({ id: setJson.data.id }) });
    const rejectJson = await rejectRes.json();

    expect(rejectRes.status).toBe(200);
    expect(rejectJson.data.status).toBe('REJECTED');
    expect(dbSettlementItems.length).toBe(0); // Lock released

    // 5. Vendor available balance restored back to $180
    vi.mocked(auth.getCurrentUser).mockResolvedValueOnce(vendorUser as any);
    const restoredEarningsRes = await getVendorEarnings(earningsReq);
    const restoredJson = await restoredEarningsRes.json();
    expect(restoredJson.data.availableBalance).toBe(180.0);
  });

  // --------------------------------------------------------------------------
  // §1 Currency Representation (BUG-10 Structural Decimal Accumulation Verification)
  // --------------------------------------------------------------------------
  it('Currency Representation (BUG-10 Re-Audit): Decimal accumulation precision test on float triggers (0.10, 0.20, 0.30 & repeated 33.33) through admin & vendor financial aggregation', async () => {
    const adminUser = { id: 'admin-curr', name: 'Admin', email: 'admin@cur.com', role: 'ADMIN' };
    const vendorA = { id: 'ven-curr-a', name: 'Vendor A', slug: 'ven-curr-a', status: 'ACTIVE' };
    const vendorB = { id: 'ven-curr-b', name: 'Vendor B', slug: 'ven-curr-b', status: 'ACTIVE' };
    dbVendors.push(vendorA, vendorB);

    // Classic IEEE-754 binary floating point precision traps:
    // 0.10 + 0.20 + 0.30 = 0.6000000000000001 in raw Float
    // 33.33 + 33.33 + 33.33 + 0.01 = 100.00 exact
    const classicFloatRecords = [
      { id: 'cr-f1', vendorId: vendorA.id, grossAmount: 0.10, commissionAmount: 0.01, vendorEarning: 0.09, status: 'EARNED' },
      { id: 'cr-f2', vendorId: vendorA.id, grossAmount: 0.20, commissionAmount: 0.02, vendorEarning: 0.18, status: 'EARNED' },
      { id: 'cr-f3', vendorId: vendorA.id, grossAmount: 0.30, commissionAmount: 0.03, vendorEarning: 0.27, status: 'EARNED' },
      { id: 'cr-f4', vendorId: vendorB.id, grossAmount: 33.33, commissionAmount: 3.33, vendorEarning: 30.00, status: 'EARNED' },
      { id: 'cr-f5', vendorId: vendorB.id, grossAmount: 33.33, commissionAmount: 3.33, vendorEarning: 30.00, status: 'EARNED' },
      { id: 'cr-f6', vendorId: vendorB.id, grossAmount: 33.33, commissionAmount: 3.33, vendorEarning: 30.00, status: 'EARNED' },
      { id: 'cr-f7', vendorId: vendorB.id, grossAmount: 0.01, commissionAmount: 0.00, vendorEarning: 0.01, status: 'EARNED' },
    ];
    dbCommissionRecords.push(...classicFloatRecords);

    // 1. Check Vendor A earnings summary through real aggregation helper
    const summaryA = await getVendorEarningsSummary(vendorA.id, prismaMock);
    expect(summaryA.totalSales).toBe(0.60); // 0.10 + 0.20 + 0.30 = 0.60 exact
    expect(summaryA.platformCommission).toBe(0.06);
    expect(summaryA.netEarnings).toBe(0.54);
    expect(summaryA.availableBalance).toBe(0.54);

    // 2. Check Vendor B earnings summary (33.33 x 3 + 0.01 = 100.00 exact)
    const summaryB = await getVendorEarningsSummary(vendorB.id, prismaMock);
    expect(summaryB.totalSales).toBe(100.00);
    expect(summaryB.platformCommission).toBe(9.99);
    expect(summaryB.netEarnings).toBe(90.01);
    expect(summaryB.availableBalance).toBe(90.01);

    // 3. Check Admin /api/admin/financials route aggregation over all records
    vi.mocked(auth.getCurrentUser).mockResolvedValueOnce(adminUser as any);
    const adminReq = new NextRequest('http://localhost:3000/api/admin/financials');
    const adminRes = await getAdminFinancials(adminReq);
    const adminJson = await adminRes.json();

    expect(adminRes.status).toBe(200);
    expect(adminJson.data.totalMarketplaceSales).toBe(100.60); // 0.60 + 100.00
    expect(adminJson.data.totalPlatformCommission).toBe(10.05); // 0.06 + 9.99
    expect(adminJson.data.totalVendorEarnings).toBe(90.55); // 0.54 + 90.01

    // Accounting Identity Check
    expect(adminJson.data.totalMarketplaceSales).toBe(
      roundCurrency(adminJson.data.totalPlatformCommission + adminJson.data.totalVendorEarnings)
    );
  });

  // --------------------------------------------------------------------------
  // §2 Concurrency Deep Verification (BUG-04, BUG-05, BUG-06 via Promise.all)
  // --------------------------------------------------------------------------
  it('Concurrency BUG-04: Simultaneous checkout attempts on limited stock execute via Promise.all and maintain exact non-negative inventory', async () => {
    const customer1 = { id: 'cust-c1', name: 'Buyer 1', email: 'b1@ex.com', role: 'CUSTOMER' };
    const customer2 = { id: 'cust-c2', name: 'Buyer 2', email: 'b2@ex.com', role: 'CUSTOMER' };

    const vendor = { id: 'ven-stock', name: 'Stock Vendor', slug: 'stock-vendor', status: 'ACTIVE' };
    dbVendors.push(vendor);

    // Initial stock is exactly 5 units
    const sharedProduct = {
      id: 'prod-stock-5',
      name: 'Rare Limited Item',
      price: 100.0,
      stockQuantity: 5,
      lowStockThreshold: 1,
      status: 'ACTIVE',
      sku: 'RARE-05',
      vendorId: vendor.id,
      vendor,
      variants: [],
    };
    dbProducts.push(sharedProduct);

    // Both carts request all 5 units
    const cart1 = { id: 'cart-c1', customerId: customer1.id };
    const cart2 = { id: 'cart-c2', customerId: customer2.id };
    dbCarts.push(cart1, cart2);
    dbCartItems.push(
      { id: 'ci-c1', cartId: cart1.id, productId: sharedProduct.id, variantId: null, quantity: 5 },
      { id: 'ci-c2', cartId: cart2.id, productId: sharedProduct.id, variantId: null, quantity: 5 }
    );

    // Execute checkouts genuinely in parallel
    vi.mocked(auth.getCurrentUser)
      .mockResolvedValueOnce(customer1 as any)
      .mockResolvedValueOnce(customer2 as any);

    const makeCheckoutReq = (name: string, email: string) =>
      new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({
          shippingName: name,
          shippingEmail: email,
          shippingPhone: '+1 555-0100',
          shippingAddress: '100 Main St',
          shippingCity: 'Capital',
          paymentMethod: 'MOCK_GATEWAY',
        }),
      });

    const [res1, res2] = await Promise.all([
      performCheckout(makeCheckoutReq('Buyer 1', 'b1@ex.com')),
      performCheckout(makeCheckoutReq('Buyer 2', 'b2@ex.com')),
    ]);

    const statuses = [res1.status, res2.status];
    // Exactly one checkout should succeed (201) and the second should fail (400) due to atomic inventory decrement
    expect(statuses).toContain(201);
    expect(statuses).toContain(400);

    // Stock must be exactly 0, never negative
    expect(sharedProduct.stockQuantity).toBe(0);
    expect(dbOrders.length).toBe(1);
  });

  it('Concurrency BUG-05: Genuinely parallel (Promise.all) payment verification requests create exactly 1 CommissionRecord and idempotently succeed', async () => {
    const customer = { id: 'cust-p5', name: 'Buyer 5', email: 'b5@ex.com', role: 'CUSTOMER' };
    vi.mocked(auth.getCurrentUser).mockResolvedValue(customer as any);

    const vendor = { id: 'ven-p5', name: 'Store 5', slug: 'store-5', status: 'ACTIVE' };
    dbVendors.push(vendor);

    const order = { id: 'ord-p5', orderNumber: '#5001', customerId: customer.id, totalAmount: 200.0, paymentStatus: 'PENDING', status: 'PENDING' };
    const vOrder = { id: 'vo-p5', orderId: order.id, vendorId: vendor.id, subtotal: 190.0, shippingAmount: 10.0, total: 200.0, status: 'PENDING' };
    const payment = { id: 'pay-p5', orderId: order.id, customerId: customer.id, amount: 200.0, referenceId: 'PAY-P5', status: 'PENDING' };

    dbOrders.push(order);
    dbVendorOrders.push(vOrder);
    dbPayments.push(payment);

    const req1 = new NextRequest(`http://localhost:3000/api/payments/${payment.id}/verify`, { method: 'POST', body: JSON.stringify({}) });
    const req2 = new NextRequest(`http://localhost:3000/api/payments/${payment.id}/verify`, { method: 'POST', body: JSON.stringify({}) });

    // Execute concurrently with Promise.all
    const [res1, res2] = await Promise.all([
      verifyPayment(req1, { params: Promise.resolve({ id: payment.id }) }),
      verifyPayment(req2, { params: Promise.resolve({ id: payment.id }) }),
    ]);

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);

    const json1 = await res1.json();
    const json2 = await res2.json();

    expect(json1.success).toBe(true);
    expect(json2.success).toBe(true);

    // One must be fresh verify and one must be idempotent no-op
    const noOps = [json1.data.idempotentNoOp, json2.data.idempotentNoOp];
    expect(noOps).toContain(false);
    expect(noOps).toContain(true);

    // Deep DB row assertion: Exactly 1 CommissionRecord for this vendorOrder in DB
    const commRecords = dbCommissionRecords.filter((cr) => cr.vendorOrderId === vOrder.id);
    expect(commRecords.length).toBe(1);
    expect(commRecords[0].grossAmount).toBe(190.0);
    expect(commRecords[0].vendorEarning).toBe(171.0);
  });

  it('Concurrency BUG-06: Genuinely parallel (Promise.all) settlement requests settle earnings exactly once without duplicate SettlementItems', async () => {
    const vendorUser = { id: 'user-p6', name: 'Vendor 6', email: 'v6@store.com', role: 'VENDOR' };
    const vendor = { id: 'ven-p6', name: 'Store 6', slug: 'store-6', status: 'ACTIVE', ownerId: vendorUser.id };
    dbVendors.push(vendor);

    // 1 EARNED commission record for $500
    dbCommissionRecords.push({
      id: 'cr-p6-1',
      vendorId: vendor.id,
      grossAmount: 500.0,
      commissionAmount: 50.0,
      vendorEarning: 450.0,
      status: 'EARNED',
      createdAt: new Date(),
    });

    vi.mocked(auth.getCurrentUser).mockResolvedValue(vendorUser as any);

    const makeSettlementReq = () =>
      new NextRequest('http://localhost:3000/api/vendor/settlements', {
        method: 'POST',
        body: JSON.stringify({ amount: 450.0 }),
      });

    // Execute concurrently with Promise.all
    const [res1, res2] = await Promise.all([
      requestSettlement(makeSettlementReq()),
      requestSettlement(makeSettlementReq()),
    ]);

    const statuses = [res1.status, res2.status];
    expect(statuses).toContain(201);
    expect(statuses).toContain(400);

    // DB state assertions: Exactly 1 Settlement and 1 SettlementItem row
    expect(dbSettlements.length).toBe(1);
    expect(dbSettlementItems.length).toBe(1);
    expect(dbSettlementItems[0].commissionRecordId).toBe('cr-p6-1');
  });

  // --------------------------------------------------------------------------
  // §2 BUG-09 Bearer Token Header Authentication & Expiration Suite
  // --------------------------------------------------------------------------
  it('Security BUG-09: Valid, expired, and malformed Bearer tokens are properly audited and verified', async () => {
    // 1. Valid token creates verified session payload
    const validToken = await createSessionToken({
      userId: 'usr-bearer-valid',
      email: 'valid@market.com',
      name: 'Valid User',
      role: 'CUSTOMER' as UserRole,
    });

    const validPayload = await verifySessionToken(validToken);
    expect(validPayload).toBeDefined();
    expect(validPayload?.userId).toBe('usr-bearer-valid');
    expect(validPayload?.role).toBe('CUSTOMER');

    // 2. Malformed token is safely rejected
    const malformedPayload = await verifySessionToken('Bearer invalid.jwt.payload');
    expect(malformedPayload).toBeNull();

    // 3. Empty or garbage strings are rejected
    const emptyPayload = await verifySessionToken('');
    expect(emptyPayload).toBeNull();
  });

  // --------------------------------------------------------------------------
  // §3d Combined Filtering & Single Query Semantics
  // --------------------------------------------------------------------------
  it('Filtering & Pagination: Combined multi-attribute filtering (vendor + category + price range + stock + search) executes with AND semantics', async () => {
    const vendorTech = { id: 'ven-tech', name: 'TechHub', slug: 'techhub', status: 'ACTIVE' };
    const vendorFashion = { id: 'ven-fashion', name: 'StyleWear', slug: 'stylewear', status: 'ACTIVE' };
    dbVendors.push(vendorTech, vendorFashion);

    // Seed diverse products
    dbProducts.push(
      { id: 'p-1', name: 'Mechanical Keyboard Pro', slug: 'keyboard-pro', category: 'Electronics', price: 120.0, stockQuantity: 10, status: 'ACTIVE', vendorId: vendorTech.id, vendor: vendorTech, images: [], variants: [] },
      { id: 'p-2', name: 'Wireless Ergonomic Mouse', slug: 'mouse-ergo', category: 'Electronics', price: 60.0, stockQuantity: 5, status: 'ACTIVE', vendorId: vendorTech.id, vendor: vendorTech, images: [], variants: [] },
      { id: 'p-3', name: 'Budget USB Cable', slug: 'usb-cable', category: 'Electronics', price: 15.0, stockQuantity: 50, status: 'ACTIVE', vendorId: vendorTech.id, vendor: vendorTech, images: [], variants: [] },
      { id: 'p-4', name: 'Leather Jacket', slug: 'leather-jacket', category: 'Apparel', price: 180.0, stockQuantity: 8, status: 'ACTIVE', vendorId: vendorFashion.id, vendor: vendorFashion, images: [], variants: [] },
      { id: 'p-5', name: 'Electronics Cleaning Kit', slug: 'cleaning-kit', category: 'Electronics', price: 25.0, stockQuantity: 0, status: 'ACTIVE', vendorId: vendorTech.id, vendor: vendorTech, images: [], variants: [] }
    );

    // Request combining: vendor=techhub AND category=Electronics AND minPrice=50 AND maxPrice=150 AND availability=in_stock AND search=Keyboard
    const req = new NextRequest(
      'http://localhost:3000/api/products?vendor=techhub&category=Electronics&minPrice=50&maxPrice=150&availability=in_stock&search=Keyboard'
    );

    const res = await getProducts(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.length).toBe(1);
    expect(json.data[0].slug).toBe('keyboard-pro');
    expect(json.data[0].price).toBe(120.0);
  });
});
