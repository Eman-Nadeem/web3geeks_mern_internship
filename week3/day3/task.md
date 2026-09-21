Scenario

With vendors, products, inventory, and vendor isolation completed on Days 1 and 2, today's focus is to implement the multi-vendor shopping experience.

A customer should be able to add products from multiple vendors to a single cart and complete one checkout. The system must then automatically separate the purchase into vendor-specific orders while maintaining a single customer checkout experience.

Task 1: Shopping Cart

Implement a persistent shopping cart for authenticated customers.

Requirements

Customers should be able to:

Add products to cart.
Remove products from cart.
Increase/decrease product quantity.
View cart contents.
Clear the cart.
View subtotal.
View total item count.
Continue shopping.

Each cart item should contain:

Product
Vendor
Quantity
Unit price
Selected variant where applicable
Line total

The cart must always use the current product/vendor relationship from the backend.

Task 2: Multi-Vendor Cart

Update the cart to support products from multiple vendors.

Example:

Customer Cart

Vendor A
├── Laptop Stand × 1
└── Wireless Mouse × 2

Vendor B
├── Mechanical Keyboard × 1
└── USB Hub × 1

Vendor C
└── Office Chair × 1
Requirements
A customer can add products from different vendors.
Cart items should be grouped by vendor.
Display the vendor/store name for each group.
Calculate:
Vendor subtotal
Overall cart subtotal
Total quantity
Do not allow inactive/suspended vendor products to be added.
Do not allow unavailable/out-of-stock products to be added.
Task 3: Cart Validation

Before checkout, validate every cart item against the current database state.

Check:

Product still exists.
Product is active.
Vendor is active.
Product is available for purchase.
Requested quantity is available.
Variant exists and is active.
Variant has sufficient stock.
Current price is valid.

Do not trust:

Product price from frontend.
Vendor ID from frontend.
Stock quantity from frontend.
Cart totals calculated by frontend.

The backend must recalculate the final cart totals.

Task 4: Checkout

Create a checkout flow for the complete cart.

Checkout should collect:
Customer name
Email
Phone
Shipping address
City
Postal code where applicable
Payment method

Display an order summary containing:

Vendor A
Subtotal: PKR 5,000

Vendor B
Subtotal: PKR 3,500

Vendor C
Subtotal: PKR 7,000

-------------------------
Subtotal: PKR 15,500
Shipping: PKR 500
Total: PKR 16,000

The exact shipping calculation can be kept simple for this task.

Task 5: Vendor-Specific Order Splitting

When a customer places an order containing products from multiple vendors, automatically split the purchase into vendor-specific orders.

Example:

Checkout
│
└── Parent Order #1001
│
├── Vendor A Order #1001-A
│ ├── Product 1
│ └── Product 2
│
├── Vendor B Order #1001-B
│ └── Product 3
│
└── Vendor C Order #1001-C
└── Product 4
Requirements

Maintain a relationship between:

Customer
Parent checkout/order
Vendor orders
Order items
Products
Vendors

The customer should be able to see the purchase as one checkout/order, while vendors should only see their own order portion.

Task 6: Order Data Model

Create or update the order structure.

Parent Order

Should contain information such as:

Order ID
Customer
Total amount
Payment method
Payment status
Shipping address
Overall order status
Created date
Updated date
Vendor Order

Should contain:

Vendor order ID
Parent order ID
Vendor
Vendor subtotal
Shipping amount
Vendor total
Order status
Created date
Updated date
Order Item

Should contain:

Product
Vendor order
Product name snapshot
SKU snapshot
Unit price snapshot
Quantity
Variant information where applicable
Line total

Store important product information as a snapshot so historical orders do not change if the product is later edited.

Task 7: Inventory Reservation & Stock Deduction

Integrate checkout with the inventory system created on Day 2.

Requirements

When checkout is successfully completed:

Validate stock one final time.
Deduct the purchased quantity from inventory.
Create inventory history records.
Prevent stock from becoming negative.

Example:

Before Order:
Stock = 10

Customer buys:
Quantity = 3

After Order:
Stock = 7

Inventory History:
SALE -3

If any item cannot be fulfilled, the checkout should fail safely without creating an incomplete order.

Use a database transaction where supported so order creation and inventory updates remain consistent.

Task 8: Order Status Management

Implement basic order statuses.

Suggested statuses:

Pending
Confirmed
Processing
Shipped
Delivered
Cancelled
Requirements

Customers should be able to:

View order status.
View order details.
View vendor-specific order sections.

Vendors should be able to:

View their orders.
View order items belonging to them.
Update the status of their own vendor orders.

A vendor must not be able to modify another vendor's order.

Task 9: Customer Order History

Create a customer order history page.

Display:

Order number
Order date
Vendors involved
Number of items
Total amount
Payment status
Overall order status
View details action

Example:

Order #1001
Date: Sep 16, 2026

Vendors:
- Tech Store
- Office Hub
- Smart Accessories

Total: PKR 16,000
Status: Processing

The order details page should show the products grouped by vendor.

Task 10: Vendor Order Dashboard

Create a vendor-side order management page.

A vendor should see only their own orders.

Display:

Order number
Customer name
Items
Quantity
Order amount
Payment status
Shipping information required for fulfillment
Order status
Order date

Provide actions such as:

Confirm
Processing
Shipped
Delivered
Cancel

Only valid status transitions should be allowed.

Task 11: Shipping Calculation

Implement a basic shipping strategy.

You may use either:

Option A — Single Shipping Fee

One shipping fee is calculated for the entire checkout.

Option B — Per-Vendor Shipping

Each vendor order receives its own shipping amount.

If implementing per-vendor shipping:

Vendor A Shipping: PKR 200
Vendor B Shipping: PKR 250
Vendor C Shipping: PKR 300

Total Shipping: PKR 750

Document the chosen approach.

Task 12: Authorization & Security

Enforce strict access control.

Customer

Can:

Manage their own cart.
Checkout their own cart.
View their own orders.
Cancel their own eligible orders.
Vendor

Can:

View their own vendor orders.
Update their own order statuses.
View relevant customer/shipping information for fulfillment.

Cannot:

View another vendor's orders.
Modify another vendor's order.
Access another vendor's customer/order data.
Admin

Can:

View all orders.
View all vendor orders.
Manage order statuses where required.
API Requirements

Implement appropriate APIs according to the existing architecture.

Cart
GET /cart
POST /cart/items
PATCH /cart/items/:id
DELETE /cart/items/:id
DELETE /cart
Checkout
POST /checkout/validate
POST /checkout
Customer Orders
GET /orders
GET /orders/:id
PATCH /orders/:id/cancel
Vendor Orders
GET /vendor/orders
GET /vendor/orders/:id
PATCH /vendor/orders/:id/status

Adjust endpoint naming to match the existing project.

Frontend Requirements

Build or update:

Shopping cart page
Vendor-grouped cart sections
Checkout page
Order confirmation page
Customer order history
Customer order details
Vendor order dashboard
Vendor order details
Order status controls

The UI should clearly distinguish between:

Customer View

My Order → Vendor A + Vendor B + Vendor C

and:

Vendor View

My Orders → Vendor A only
Validation & Testing

Test at least the following:

Customer can add a product to cart.
Customer can add products from multiple vendors.
Cart groups items by vendor.
Cart calculates correct totals.
Out-of-stock products cannot be added.
Suspended vendor products cannot be purchased.
Checkout validates current product prices and stock.
Customer can successfully place a multi-vendor order.
One parent order is created for the checkout.
Separate vendor orders are created automatically.
Each vendor can only see its own order.
Customer can see the complete order.
Inventory is deducted correctly.
Inventory history records each sale.
Stock cannot become negative.
Product information is preserved as an order snapshot.
Vendor can update their own order status.
Vendor cannot modify another vendor's order.
Customer cannot access another customer's order.
Failed checkout does not leave partially created orders or incorrect inventory.
Deliverables
Persistent shopping cart
Multi-vendor cart grouping
Cart validation
Checkout flow
Parent order system
Vendor-specific order splitting
Order and order-item models
Inventory deduction
Inventory transaction/history integration
Order status workflow
Customer order history
Customer order details
Vendor order dashboard
Shipping calculation
Role-based order authorization
API validation and error handling
Automated/manual tests
Updated README/API documentation
Final Goal

By the end of Day 3, a customer should be able to complete this complete marketplace flow:

Browse Marketplace
↓
Select Products
↓
Products from Multiple Vendors
↓
Multi-Vendor Cart
↓
Checkout
↓
Inventory Validation
↓
Payment/Order Confirmation
↓
Parent Order
↓
┌─────┼─────┐
↓ ↓ ↓
Vendor A Vendor B Vendor C
Order Order Order

The system should provide one seamless checkout for the customer while maintaining completely isolated vendor orders and inventory.

Next: Day 4 — Payments, Vendor Commissions & Settlement System.