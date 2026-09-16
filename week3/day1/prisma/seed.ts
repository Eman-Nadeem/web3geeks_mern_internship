import { PrismaClient, UserRole, VendorStatus, ProductStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding marketplace database...');

  // Clean existing records in reverse dependency order
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

  // 2. Create Active Vendor User & Vendor
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

  // 3. Create Products for Active Vendor
  const products = [
    {
      name: 'Pro Wireless Mechanical Keyboard',
      slug: 'pro-wireless-mechanical-keyboard',
      description: 'Hot-swappable custom mechanical keyboard with low-latency 2.4GHz wireless and Bluetooth 5.2.',
      price: 139.99,
      stock: 45,
      category: 'Electronics',
      imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80',
      status: ProductStatus.ACTIVE,
      vendorId: activeVendor.id,
    },
    {
      name: 'Ultra-Clear 4K UHD 27" Monitor',
      slug: 'ultra-clear-4k-uhd-monitor',
      description: 'Factory-calibrated color accuracy (99% DCI-P3) with USB-C 90W power delivery and anti-glare finish.',
      price: 449.0,
      stock: 18,
      category: 'Displays',
      imageUrl: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=800&q=80',
      status: ProductStatus.ACTIVE,
      vendorId: activeVendor.id,
    },
    {
      name: 'Studio ANC Wireless Headphones',
      slug: 'studio-anc-wireless-headphones',
      description: 'Active hybrid noise cancellation with 40-hour battery life and spatial audio driver support.',
      price: 189.5,
      stock: 32,
      category: 'Audio',
      imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
      status: ProductStatus.ACTIVE,
      vendorId: activeVendor.id,
    },
    {
      name: 'Ergonomic Memory Foam Wrist Rest',
      slug: 'ergonomic-memory-foam-wrist-rest',
      description: 'Cooling gel infused wrist rest designed for long coding sessions and wrist support.',
      price: 24.99,
      stock: 60,
      category: 'Accessories',
      imageUrl: 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&w=800&q=80',
      status: ProductStatus.ACTIVE,
      vendorId: activeVendor.id,
    },
  ];

  for (const prod of products) {
    await prisma.product.create({ data: prod });
  }
  console.log(`Created ${products.length} products for ${activeVendor.name}`);

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

  console.log('Database seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error('Error during database seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
