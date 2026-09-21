Scenario

This is the final day of Week 3 — Advanced Multi-Vendor Commerce Platform.

The goal today is to bring together everything developed during Days 1–4 and ensure the marketplace works as a complete, secure, reliable, and production-ready application.

You should not introduce major new features today. Instead, focus on integration, validation, bug fixing, security, performance, usability, and documentation.

Task 1: Complete End-to-End Marketplace Flow

Verify the complete customer journey from beginning to end.

The final flow should work as:

Register / Login
↓
Browse Marketplace
↓
Browse Vendors
↓
View Product
↓
Add Products
from Multiple Vendors
↓
Multi-Vendor Cart
↓
Checkout
↓
Payment
↓
Parent Order
↓
Vendor-Specific Orders
↓
Inventory Deduction
↓
Vendor Processing
↓
Order Delivered
↓
Vendor Earnings
↓
Settlement Request
↓
Admin Settlement

Fix any integration issues discovered between these modules.

Task 2: Customer Final Validation

Verify the complete customer experience.

Customer should be able to:
Register/login.
Browse products.
Search products.
Filter products.
Browse vendors.
Visit vendor storefronts.
View product details.
Select product variants.
Add products to cart.
Purchase products from multiple vendors.
Complete checkout.
Make payment.
View order confirmation.
View order history.
View order details.
Track order status.
Cancel eligible orders.
View payment/refund status.

Test both successful and failed scenarios.

Task 3: Vendor Final Validation

Verify the complete vendor workflow.

Vendor should be able to:
Register their store.
View vendor approval status.
Access the vendor dashboard after approval.
Update store information.
Create products.
Manage product images.
Manage variants.
Manage inventory.
View low-stock products.
View inventory history.
Receive vendor-specific orders.
Process orders.
Update order status.
View sales.
View commissions.
View earnings.
Request settlement.
View settlement history.

Ensure the vendor cannot access another vendor's resources.

Task 4: Admin Final Validation

Verify the complete admin workflow.

Admin should be able to:
View marketplace statistics.
Manage vendors.
Approve vendors.
Suspend vendors.
Reactivate vendors.
View products.
View orders.
View vendor orders.
Configure commission rates.
View marketplace sales.
View commissions.
View vendor earnings.
View financial transactions.
Review settlement requests.
Process settlements.
Handle appropriate refunds/cancellations.

All admin-only actions must be protected by authorization.

Task 5: Multi-Vendor Order Integrity

Perform detailed testing of multi-vendor orders.

Example:

Customer buys:

Vendor A → Product 1 × 2
Vendor A → Product 2 × 1

Vendor B → Product 3 × 1

Vendor C → Product 4 × 3

Verify that the system creates:

Parent Order
│
├── Vendor A Order
│ ├── Product 1 × 2
│ └── Product 2 × 1
│
├── Vendor B Order
│ └── Product 3 × 1
│
└── Vendor C Order
└── Product 4 × 3

Verify:

Correct totals.
Correct vendor ownership.
Correct inventory deductions.
Correct commission.
Correct vendor earnings.
Correct customer order display.
Task 6: Inventory & Order Consistency

Test inventory behavior throughout the order lifecycle.

Verify:
Stock decreases after successful purchase.
Stock does not decrease after failed payment.
Stock cannot become negative.
Out-of-stock products cannot be purchased.
Variant stock is correctly deducted.
Inventory history records sales.
Cancelled orders correctly restore inventory where applicable.
Refunded orders correctly update inventory according to the implemented business rules.

Test simultaneous/rapid purchase attempts where possible to identify race conditions.

Task 7: Payment & Financial Integrity

Perform a complete financial audit.

For every completed order verify:

Customer Payment
=
Vendor Gross Sales
=
Platform Commission
+
Vendor Earnings

Example:

Order Amount: PKR 20,000
Commission (10%): PKR 2,000
Vendor Earnings: PKR 18,000

Verify:

Payment record exists.
Transaction ID is unique.
Commission is created once.
Vendor earning is created once.
Duplicate payment callbacks do not duplicate financial records.
Refunds correctly adjust financial records.
Settlements correctly reduce available vendor balance.
Task 8: Security Audit

Perform a security review of the entire application.

Test:
Authentication
Protected routes require authentication.
Invalid tokens are rejected.
Expired sessions/tokens are handled correctly.
Authorization

Test that:

Customer cannot access vendor dashboard.
Vendor cannot access admin dashboard.
Vendor A cannot access Vendor B's products.
Vendor A cannot access Vendor B's orders.
Vendor A cannot access Vendor B's earnings.
Customer A cannot access Customer B's orders.
Regular users cannot access admin APIs.
Input Security

Validate:

Request bodies
Query parameters
Route parameters
File uploads
Prices
Quantities
IDs

Protect against common issues such as:

Injection attacks
Unauthorized object access
Mass assignment
Malicious file uploads
XSS where applicable
Task 9: API Validation & Error Handling

Review every major API.

Ensure APIs return consistent responses.

Example:

{
"success": false,
"message": "You are not authorized to access this resource."
}

Use appropriate status codes:

400 → Validation Error
401 → Unauthenticated
403 → Forbidden
404 → Resource Not Found
409 → Conflict
422 → Invalid Business Rule
500 → Internal Server Error

Do not expose:

Database errors
Stack traces
Secrets
Internal implementation details

in production responses.

Task 10: Frontend Error & Loading States

Review the frontend for all major flows.

Every important operation should have:

Loading state
Success state
Error state
Empty state
Disabled state where appropriate

Examples:

Loading Products...
No Products Found
Unable to Load Products

For destructive operations such as:

Delete product
Cancel order
Suspend vendor
Process settlement

provide an appropriate confirmation step.

Task 11: Responsive UI & UX Review

Test the application on:

Desktop
Tablet
Mobile

Review:

Navigation
Marketplace
Product details
Cart
Checkout
Vendor dashboard
Admin dashboard
Tables
Forms
Modals
Notifications

Fix:

Overflow issues
Broken layouts
Unreadable tables
Inaccessible buttons
Poor form behavior
Missing mobile interactions
Task 12: Performance Optimization

Review application performance.

Backend

Check:

Database indexes.
Pagination.
Efficient queries.
Unnecessary database requests.
N+1 query problems.
Large API responses.

Add appropriate indexes for commonly queried fields such as:

vendorId
productId
categoryId
slug
sku
orderId
customerId
status
createdAt
Frontend

Check:

Image optimization.
Unnecessary API calls.
Large component rendering.
Loading performance.
Pagination/infinite scrolling where appropriate.
Task 13: Pagination, Search & Filtering Review

Ensure major lists support appropriate pagination.

Review:

Marketplace products
Vendor products
Orders
Vendor orders
Vendors
Inventory
Transactions
Settlements

Verify that search/filter combinations work correctly.

Example:

Vendor = Vendor A
Status = Active
Category = Electronics
Price = PKR 1,000–10,000
Search = keyboard

The backend should apply filters correctly rather than loading the entire dataset unnecessarily.

Task 14: Database Integrity

Review all relationships created throughout Week 3.

Verify:

User
↓
Vendor
↓
Product
↓
Variant
↓
Inventory
↓
Order Item
↓
Vendor Order
↓
Parent Order
↓
Payment
↓
Commission
↓
Settlement

Check:

Required fields.
Unique constraints.
Foreign keys/references.
Cascading behavior.
Orphaned records.
Duplicate records.

Make sure deleting or archiving an entity does not unexpectedly destroy historical order or financial information.

Task 15: Automated Testing

Create or complete tests for critical business logic.

At minimum, test:

Authentication & Authorization
Login.
Protected routes.
Role restrictions.
Vendor ownership.
Products
Product creation.
Product ownership.
Product updates.
Product filtering.
Cart
Add item.
Update quantity.
Remove item.
Multi-vendor cart.
Orders
Checkout.
Order splitting.
Order totals.
Inventory deduction.
Payments
Successful payment.
Failed payment.
Duplicate payment prevention.
Financials
Commission calculation.
Vendor earnings.
Refund calculation.
Settlement balance.

Prioritize business-critical backend tests over superficial UI tests.

Task 16: Production Configuration & Environment Variables

Review configuration before deployment.

Move sensitive values to environment variables.

Examples:

DATABASE_URL
JWT_SECRET
PAYMENT_API_KEY
PAYMENT_SECRET
CLOUD_STORAGE_KEY
EMAIL_API_KEY

Ensure:

Secrets are not committed to Git.
.env files are ignored.
.env.example is provided.
Production and development configurations are separated.
Task 17: Logging & Monitoring

Implement useful application logging.

Log important events such as:

Authentication failures.
Vendor approval.
Product creation.
Order creation.
Payment failures.
Refunds.
Settlement processing.
Critical application errors.

Do not log sensitive information such as:

Passwords
Tokens
Payment secrets
Full sensitive customer information
Task 18: Documentation

Update the project documentation.

README should include:

Project Overview

Explain:

What the marketplace does.
Main user roles.
Major features.
Tech Stack

Document:

Frontend
Backend
Database
Authentication
Payment solution
Storage/services
Installation

Provide:

npm install

or the appropriate project setup commands.

Environment Variables

Document required variables using .env.example.

Database Setup

Explain migrations/seeding if applicable.

API Documentation

Document major endpoints for:

Authentication
Vendors
Products
Cart
Checkout
Orders
Payments
Commissions
Settlements
Roles

Document:

Customer
Vendor
Admin

and their permissions.

Task 19: Final Bug Fixing

Perform a complete manual QA pass.

Create a bug list and classify issues as:

Critical
High
Medium
Low

Before completion:

Fix all Critical issues.
Fix all High-priority issues.
Fix important Medium issues.
Document any known minor issues.

Do not leave known security or financial integrity issues unresolved.

Task 20: Final Demo Scenario

Perform one complete demonstration using realistic data.

Setup

Create:

3 Vendors
10+ Products
Multiple Product Categories
Products with Variants
Different Stock Levels
Multiple Customers
Demo Flow
Admin approves vendors.
Vendors add products.
Customers browse the marketplace.
Customer adds products from at least 3 vendors.
Customer completes checkout.
Payment succeeds.
Parent order is created.
Vendor-specific orders are created.
Inventory is deducted.
Vendors process their orders.
Order reaches Delivered status.
Commission is calculated.
Vendor earnings become available.
Vendor requests settlement.
Admin processes settlement.
Financial records are verified.
Final Acceptance Criteria

The project is considered complete only when:

Multi-vendor registration works.
Vendor approval works.
Vendor storefronts work.
Vendor product management works.
Inventory management works.
Product variants work where implemented.
Multi-vendor cart works.
Checkout works.
Orders split correctly by vendor.
Inventory is updated correctly.
Payments are recorded correctly.
Commission calculations are correct.
Vendor earnings are correct.
Settlement workflow works.
Customer order history works.
Vendor order management works.
Admin management works.
Vendor data is properly isolated.
Customer data is properly protected.
Financial data is properly protected.
Critical APIs are validated and tested.
Responsive UI works.
Critical performance issues are resolved.
Environment variables are secured.
Documentation is complete.
Critical and high-priority bugs are resolved.
Deliverables
Fully integrated multi-vendor commerce platform
End-to-end customer flow
Complete vendor workflow
Complete admin workflow
Multi-vendor order validation
Inventory/order consistency
Payment validation
Commission and earnings verification
Settlement verification
Security audit
API validation
Error/loading/empty states
Responsive UI fixes
Performance optimization
Database integrity checks
Automated tests for critical functionality
Production environment configuration
Logging
Updated README/API documentation
Final QA/bug report
Final demo-ready application
Final Goal

By the end of Day 5, the Week 3 project should function as a complete Advanced Multi-Vendor Commerce Platform, not just a collection of individual features.

The final architecture should support:

Marketplace
│
┌──────────────┼──────────────┐
↓ ↓ ↓
Vendor A Vendor B Vendor C
│ │ │
Products Products Products
Inventory Inventory Inventory
│ │ │
└──────────────┼──────────────┘
↓
Customer Cart
↓
Checkout
↓
Payment
↓
Parent Order
↓
Vendor-Specific Orders
↙ ↓ ↘
A B C
↓
Order Fulfillment
↓
Vendor Earnings
↓
Commission
↓
Settlement
↓
Admin Processing

Week 3 Final Outcome: A secure, tested, integrated, and production-ready multi-vendor marketplace with vendor isolation, inventory management, multi-vendor checkout, order splitting, payments, commissions, earnings, and settlements.