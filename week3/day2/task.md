scenario

With the vendor architecture, ownership rules, vendor onboarding, and storefront foundation completed on Day 1, today's focus is to build a proper vendor inventory and product management system.

Each vendor should be able to independently manage their catalog, pricing, stock, product status, and product variations without affecting other vendors.

Task 1: Vendor Product Management

Extend the product system so vendors can fully manage their own marketplace catalog.

Requirements

A vendor should be able to:

Create products.
View their products.
View product details.
Update products.
Delete products where allowed.
Search their products.
Filter products by:
Category
Status
Stock availability
Sort products by:
Newest
Oldest
Price
Stock

Each product must remain associated with exactly one vendor.

Product Fields

A product should support at least:

Product name
Slug
Description
Price
Compare-at/original price
Category
Images
Stock quantity
SKU
Status
Vendor
Created date
Updated date

Suggested product statuses:

Draft
Active
Out of Stock
Archived
Task 2: Vendor Inventory Management

Build inventory management specifically for vendors.

Requirements

Vendors should be able to:

View current stock.
Increase stock.
Decrease stock.
Set stock to a specific quantity.
View low-stock products.
View out-of-stock products.

Implement a minimum stock threshold.

Example:

Stock: 7
Low Stock Threshold: 10

Status: Low Stock

If:

stock = 0

the product should automatically become Out of Stock or otherwise become unavailable for purchase.

Task 3: Inventory Adjustment History

Create an inventory history system.

Whenever stock changes, record:

Product
Vendor
Previous quantity
New quantity
Quantity changed
Adjustment type
Reason
User who made the change
Timestamp

Example adjustment types:

RESTOCK
SALE
MANUAL_ADJUSTMENT
RETURN
DAMAGE

Example:

Product: Wireless Mouse
Previous Stock: 20
New Stock: 35
Change: +15
Type: RESTOCK
Reason: New supplier shipment
Updated By: Vendor Admin

Inventory history should not be editable after creation.

Task 4: SKU & Product Uniqueness

Implement proper product identification rules.

Requirements
Each product should have a SKU.
SKU should be unique within the appropriate scope.
Prevent duplicate SKUs according to your marketplace design.
Product slugs should be unique.
Validate price and stock values.
Prevent negative stock.
Prevent negative prices.

Return clear validation errors for invalid data.

Task 5: Product Images

Improve product image management.

Requirements

Vendors should be able to:

Upload product images.
Set a primary image.
Remove images.
Reorder images if supported.

A product should have:

One primary image.
Optional additional images.

The frontend should clearly display the primary image in:

Vendor dashboard
Marketplace listing
Product details page
Vendor storefront
Task 6: Product Variants

Add basic product variant support.

Products that require different options should support variants such as:

T-Shirt
├── Small / Black
├── Medium / Black
├── Large / Black
├── Small / White
└── Medium / White

Each variant should support:

Variant name/options
SKU
Price
Stock quantity
Image where applicable
Status

Example:

Product: Premium T-Shirt

Variant:
Size: Large
Color: Black
SKU: TSH-L-BLK
Price: PKR 2,500
Stock: 12

If variants are implemented, inventory should be tracked at the variant level rather than only at the product level.

Task 7: Marketplace Product Listing

Update the public marketplace to properly support multiple vendors.

Requirements

The marketplace should display:

Product image
Product name
Price
Discount/original price
Stock availability
Vendor/store name
Category

Users should be able to filter products by:

Vendor
Category
Price range
Availability

Users should also be able to search products by name/description.

Task 8: Product Details Page

Create or improve the public product details page.

The page should show:

Product images
Product name
Description
Price
Available stock
Variants
SKU where appropriate
Vendor/store information
Vendor storefront link
Product availability

The page should not expose private vendor information.

Task 9: Vendor Dashboard Inventory Overview

Add an inventory overview to the vendor dashboard.

Display useful statistics such as:

Total Products
Active Products
Draft Products
Low Stock
Out of Stock
Total Inventory Units

Also provide a product/inventory table:

Product SKU Stock Status Price Actions
Product A PRD-001 25 Active PKR 2,000 Edit
Product B PRD-002 4 Low Stock PKR 3,500 Edit
Product C PRD-003 0 Out of Stock PKR 1,500 Edit
Task 10: Authorization & Vendor Isolation

All vendor inventory operations must enforce ownership.

Vendor A must NOT be able to:
View Vendor B's private inventory.
Modify Vendor B's products.
Change Vendor B's stock.
View Vendor B's inventory history.
Delete Vendor B's products.
Create inventory adjustments for Vendor B.

Do not trust a vendorId supplied by the frontend.

The backend should determine the vendor from the authenticated user's permissions and ownership.

API Requirements

Implement appropriate APIs based on the existing architecture.

Vendor Products
GET /vendor/products
POST /vendor/products
GET /vendor/products/:id
PATCH /vendor/products/:id
DELETE /vendor/products/:id
Inventory
GET /vendor/inventory
GET /vendor/inventory/low-stock
GET /vendor/inventory/out-of-stock
PATCH /vendor/products/:id/stock
Inventory History
GET /vendor/products/:id/inventory-history
Public Marketplace
GET /products
GET /products/:slug
GET /products?vendor=
GET /products?category=
GET /products?minPrice=&maxPrice=

Adjust endpoint names according to the existing project structure.

Validation & Testing

Test at least the following:

Vendor can create a product.
Product automatically belongs to the authenticated vendor.
Vendor can update their own product.
Vendor cannot update another vendor's product.
Vendor cannot change another vendor's stock.
Negative stock is rejected.
Negative prices are rejected.
SKU uniqueness is enforced.
Stock changes create an inventory history record.
Product automatically becomes out of stock when stock reaches zero.
Low-stock products are correctly identified.
Marketplace only shows products according to their public status.
Product details correctly show the associated vendor.
Vendor inventory statistics are accurate.
Variant-level inventory works correctly if variants are implemented.
Unauthorized users cannot access private vendor inventory APIs.
Deliverables
Vendor product management
Product search/filter/sorting
Vendor inventory management
Low-stock and out-of-stock handling
Inventory adjustment history
SKU validation
Product image management
Product variants
Marketplace product filtering
Public product details page
Vendor inventory dashboard
Vendor ownership/isolation enforcement
API validation
Error handling
Tests for inventory and authorization
Updated API/README documentation
Final Goal

By the end of Day 2, each vendor should have a fully isolated product and inventory system.

The marketplace should now support:

Marketplace
│
├── Vendor A
│ ├── Products
│ ├── Inventory
│ └── Variants
│
├── Vendor B
│ ├── Products
│ ├── Inventory
│ └── Variants
│
└── Vendor C
├── Products
├── Inventory
└── Variants

The implementation should prepare the platform for Day 3: Multi-Vendor Cart, Checkout & Order Splitting.