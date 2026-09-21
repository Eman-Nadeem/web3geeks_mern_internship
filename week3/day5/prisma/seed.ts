import { PrismaClient, UserRole, VendorStatus, ProductStatus, AdjustmentType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding marketplace database for Day 2...');

  // Clean existing records in reverse dependency order
  await prisma.inventoryAdjustment.deleteMany({});
  await prisma.productVariant.deleteMany({});
  await prisma.productImage.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.vendor.deleteMany({});
  await prisma.user.deleteMany({});

  const defaultPasswordHash = await bcrypt.hash('Password123!', 10);

  // 1. Create Admin User
  const admin = await prisma.user.create({
    data: {
      name: 'Super Admin',
      email: 'admin@marketplace.com',
      passwordHash: defaultPasswordHash,
      role: UserRole.ADMIN,
    },
  });
  console.log('Created Admin:', admin.email);

  // 2. Create Active Vendor User 1 & Vendor
  const vendorUser1 = await prisma.user.create({
    data: {
      name: 'Alex Rivera',
      email: 'alex@techstore.com',
      passwordHash: defaultPasswordHash,
      role: UserRole.VENDOR,
    },
  });

  const activeVendor = await prisma.vendor.create({
    data: {
      name: 'NovaTech Supplies',
      slug: 'novatech-supplies',
      description: 'Cutting-edge electronics, developer peripherals, and ergonomic workstation accessories.',
      logoUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=400&q=80',
      email: 'sales@novatech.example',
      phone: '+1 (555) 234-5678',
      status: VendorStatus.ACTIVE,
      ownerId: vendorUser1.id,
    },
  });
  console.log('Created Active Vendor:', activeVendor.name);

  // 3. Create Products with Images, Variants, and Initial Stock Adjustments
  // Product 1: Mechanical Keyboard (with variants)
  const keyboard = await prisma.product.create({
    data: {
      name: 'Pro Wireless Mechanical Keyboard',
      slug: 'pro-wireless-mechanical-keyboard',
      description: 'Hot-swappable custom mechanical keyboard with low-latency 2.4GHz wireless and Bluetooth 5.2. Features sound-dampening silicone and customizable RGB backlighting.',
      price: 139.99,
      compareAtPrice: 169.99,
      sku: 'NT-KB-001',
      stockQuantity: 45,
      lowStockThreshold: 10,
      category: 'Electronics',
      status: ProductStatus.ACTIVE,
      vendorId: activeVendor.id,
      images: {
        create: [
          {
            url: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80',
            isPrimary: true,
            order: 0,
          },
          {
            url: 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&w=800&q=80',
            isPrimary: false,
            order: 1,
          },
        ],
      },
      variants: {
        create: [
          {
            sku: 'NT-KB-001-RED',
            options: { Switch: 'Linear Red', Color: 'Midnight Dark' },
            price: 139.99,
            stockQuantity: 25,
            status: ProductStatus.ACTIVE,
          },
          {
            sku: 'NT-KB-001-BROWN',
            options: { Switch: 'Tactile Brown', Color: 'Arctic White' },
            price: 149.99,
            stockQuantity: 20,
            status: ProductStatus.ACTIVE,
          },
        ],
      },
    },
    include: { variants: true },
  });

  // Initial Restock Adjustments for Keyboard
  await prisma.inventoryAdjustment.create({
    data: {
      productId: keyboard.id,
      vendorId: activeVendor.id,
      previousQuantity: 0,
      newQuantity: 45,
      quantityChanged: 45,
      adjustmentType: AdjustmentType.RESTOCK,
      reason: 'Initial inventory intake from factory shipment',
      changedByUserId: vendorUser1.id,
    },
  });

  // Product 2: 4K UHD Monitor (single product, low stock)
  const monitor = await prisma.product.create({
    data: {
      name: 'Ultra-Clear 4K UHD 27" Monitor',
      slug: 'ultra-clear-4k-uhd-monitor',
      description: 'Factory-calibrated color accuracy (99% DCI-P3) with USB-C 90W power delivery, HDR400, and anti-glare finish.',
      price: 449.0,
      compareAtPrice: 499.0,
      sku: 'NT-MON-002',
      stockQuantity: 4, // Low stock (threshold is 5)
      lowStockThreshold: 5,
      category: 'Displays',
      status: ProductStatus.ACTIVE,
      vendorId: activeVendor.id,
      images: {
        create: [
          {
            url: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=800&q=80',
            isPrimary: true,
            order: 0,
          },
        ],
      },
    },
  });

  await prisma.inventoryAdjustment.create({
    data: {
      productId: monitor.id,
      vendorId: activeVendor.id,
      previousQuantity: 10,
      newQuantity: 4,
      quantityChanged: -6,
      adjustmentType: AdjustmentType.SALE,
      reason: 'Batch customer fulfillments',
      changedByUserId: vendorUser1.id,
    },
  });

  // Product 3: Studio ANC Headphones (with variants)
  const headphones = await prisma.product.create({
    data: {
      name: 'Studio ANC Wireless Headphones',
      slug: 'studio-anc-wireless-headphones',
      description: 'Active hybrid noise cancellation with 40-hour battery life and spatial audio driver support.',
      price: 189.5,
      compareAtPrice: 220.0,
      sku: 'NT-AUD-003',
      stockQuantity: 32,
      lowStockThreshold: 8,
      category: 'Audio',
      status: ProductStatus.ACTIVE,
      vendorId: activeVendor.id,
      images: {
        create: [
          {
            url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
            isPrimary: true,
            order: 0,
          },
        ],
      },
      variants: {
        create: [
          {
            sku: 'NT-AUD-003-BLK',
            options: { Color: 'Matte Black' },
            price: 189.5,
            stockQuantity: 18,
            status: ProductStatus.ACTIVE,
          },
          {
            sku: 'NT-AUD-003-SLV',
            options: { Color: 'Silver Sand' },
            price: 199.5,
            stockQuantity: 14,
            status: ProductStatus.ACTIVE,
          },
        ],
      },
    },
  });

  await prisma.inventoryAdjustment.create({
    data: {
      productId: headphones.id,
      vendorId: activeVendor.id,
      previousQuantity: 0,
      newQuantity: 32,
      quantityChanged: 32,
      adjustmentType: AdjustmentType.RESTOCK,
      reason: 'Quarterly restock',
      changedByUserId: vendorUser1.id,
    },
  });

  // Product 4: Out of stock product
  const wristRest = await prisma.product.create({
    data: {
      name: 'Ergonomic Memory Foam Wrist Rest',
      slug: 'ergonomic-memory-foam-wrist-rest',
      description: 'Cooling gel infused wrist rest designed for long coding sessions and wrist support.',
      price: 24.99,
      sku: 'NT-ACC-004',
      stockQuantity: 0,
      lowStockThreshold: 5,
      category: 'Accessories',
      status: ProductStatus.OUT_OF_STOCK,
      vendorId: activeVendor.id,
      images: {
        create: [
          {
            url: 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&w=800&q=80',
            isPrimary: true,
            order: 0,
          },
        ],
      },
    },
  });

  await prisma.inventoryAdjustment.create({
    data: {
      productId: wristRest.id,
      vendorId: activeVendor.id,
      previousQuantity: 5,
      newQuantity: 0,
      quantityChanged: -5,
      adjustmentType: AdjustmentType.SALE,
      reason: 'Sold out remaining units',
      changedByUserId: vendorUser1.id,
    },
  });

  // Product 5: Draft product
  await prisma.product.create({
    data: {
      name: 'Next-Gen Wireless Desk Charging Mat',
      slug: 'next-gen-wireless-desk-charging-mat',
      description: 'Full-desk vegan leather mat with dual fast-charging Qi coils embedded.',
      price: 79.99,
      sku: 'NT-ACC-005-DRAFT',
      stockQuantity: 15,
      lowStockThreshold: 5,
      category: 'Accessories',
      status: ProductStatus.DRAFT,
      vendorId: activeVendor.id,
      images: {
        create: [
          {
            url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80',
            isPrimary: true,
            order: 0,
          },
        ],
      },
    },
  });

  // 4. Create Pending Vendor (for Admin approval workflow demonstration)
  const vendorUser2 = await prisma.user.create({
    data: {
      name: 'Elena Rostova',
      email: 'elena@artisangoods.com',
      passwordHash: defaultPasswordHash,
      role: UserRole.VENDOR,
    },
  });

  const pendingVendor = await prisma.vendor.create({
    data: {
      name: 'Artisan Haven Studio',
      slug: 'artisan-haven-studio',
      description: 'Handcrafted ceramic mugs, sustainable linen goods, and artisanal lifestyle homeware.',
      logoUrl: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=400&q=80',
      email: 'support@artisanhaven.example',
      phone: '+1 (555) 876-5432',
      status: VendorStatus.PENDING,
      ownerId: vendorUser2.id,
    },
  });
  console.log('Created Pending Vendor (Awaiting Approval):', pendingVendor.name);

  // 5. Create Customer User
  const customer = await prisma.user.create({
    data: {
      name: 'Jordan Lee',
      email: 'customer@example.com',
      passwordHash: defaultPasswordHash,
      role: UserRole.CUSTOMER,
    },
  });
  console.log('Created Customer:', customer.email);

  console.log('Database seeding for Day 2 finished successfully!');
}

main()
  .catch((e) => {
    console.error('Error during database seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
