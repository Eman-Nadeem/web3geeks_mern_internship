Scenario

Transform the existing commerce application into a multi-vendor marketplace where multiple independent vendors can sell products through the same platform.

Today's focus is on establishing the vendor system, vendor onboarding, ownership rules, and marketplace architecture that the remaining Week 3 features will build upon.

Task 1: Vendor Entity & Database Design

Create the database structure required to support multiple vendors.

Requirements
Create a Vendor entity/model.
A vendor should have at least:
id
name
slug
description
logo or image
email
phone
status
createdAt
updatedAt
Define appropriate vendor statuses, for example:
Pending
Active
Suspended
Add a relationship between users and vendors.
Decide and document whether:
One user can own one vendor, or
One user can manage multiple vendors.
Products must be associated with their owning vendor.
Expected Result

The database should clearly establish who owns each vendor and which vendor owns each product.

Task 2: Vendor Registration & Onboarding

Implement a vendor onboarding flow.

Requirements

Create an authenticated vendor registration endpoint/page where a user can submit:

Vendor/store name
Description
Contact email
Contact phone
Logo/image if supported
Any other required marketplace information

New vendors should initially have a Pending status.

Do not allow users to create duplicate vendors with the same unique identifier, such as slug or store name where appropriate.

Task 3: Vendor Management

Implement vendor management functionality.

Requirements

Authenticated users should be able to:

View their vendor profile.
Update vendor information.
View vendor status.
View their products.
Add products under their own vendor.
Update their own products.
Delete their own products where allowed.

Users must not be able to:

Modify another vendor's information.
Edit another vendor's products.
Delete another vendor's products.
Assign their products to another vendor without authorization.

All ownership checks must be enforced on the backend, not only through frontend restrictions.

Task 4: Vendor Storefront

Create a public vendor storefront.

Requirements

Each active vendor should have a unique public URL, for example:

/vendors/{vendor-slug}

The storefront should display:

Vendor name
Vendor logo/image
Vendor description
Contact/basic store information
Vendor's active products
Product image
Product name
Price
Availability/stock status

Only products belonging to that vendor should appear on its storefront.

Pending or suspended vendors should not have a publicly active storefront.

Task 5: Marketplace Product Rules

Update the existing product functionality to support the new vendor architecture.

Requirements

Every product must belong to exactly one vendor.

When creating a product:

The vendor should be determined from the authenticated user's vendor account.
A user should not be able to submit an arbitrary vendorId to take ownership of another vendor's product.
Product queries should support filtering by vendor.
Public marketplace product listings should show the associated vendor/store name.

Example:

Product
├── name
├── price
├── stock
├── category
└── vendor
├── name
└── slug
Task 6: Authorization & Security

Implement proper role and ownership checks.

Minimum Rules

Customer/User

Can browse vendors and products.
Cannot manage vendor data.

Vendor

Can manage their own vendor profile.
Can manage their own products.
Cannot access another vendor's resources.

Admin

Can view all vendors.
Can update vendor status.
Can manage vendors and their products.

Ensure unauthorized requests return appropriate HTTP status codes such as:

401 Unauthorized
403 Forbidden
404 Not Found

Do not rely on hiding buttons or routes in the frontend as the only security mechanism.

Task 7: Admin Vendor Approval

Create a basic admin workflow for vendor approval.

Requirements

Admin should be able to:

View pending vendors.
View vendor details.
Approve a vendor.
Suspend an active vendor.
Reactivate a suspended vendor.

Vendor status changes should immediately affect public marketplace visibility.

Example workflow:

Vendor Registration
↓
Pending
↓
Admin Review
↙ ↘
Approve Reject/Suspend
↓
Active
↓
Public Storefront
API Requirements

Implement appropriate APIs, for example:

Vendor
POST /vendors
GET /vendors
GET /vendors/:id
PATCH /vendors/:id
Vendor Products
GET /vendors/:id/products
POST /products
PATCH /products/:id
DELETE /products/:id
Admin
GET /admin/vendors?status=pending
PATCH /admin/vendors/:id/status

Adjust endpoint naming according to your existing project architecture.

Frontend Requirements

Create the necessary UI for:

Vendor registration
Vendor dashboard
Vendor profile
Vendor product management
Public vendor storefront
Admin vendor approval

The UI should clearly distinguish between:

Marketplace/customer views
Vendor views
Admin views
Validation & Testing

Test at least the following scenarios:

User registers as a vendor.
Vendor is created with Pending status.
Admin approves the vendor.
Approved vendor can access their dashboard.
Vendor creates a product.
Product automatically belongs to that vendor.
Vendor cannot edit another vendor's product.
Vendor cannot delete another vendor's product.
Public vendor storefront displays only active vendor products.
Suspended vendor storefront is no longer publicly available.
Customer can browse vendors and products.
Admin can approve, suspend, and reactivate vendors.
Unauthorized users cannot access vendor management endpoints.
Deliverables
Vendor database model/schema
User–Vendor relationship
Vendor registration/onboarding flow
Vendor dashboard
Vendor CRUD
Vendor-owned product management
Public vendor storefront
Admin vendor approval/status management
Role and ownership-based authorization
API validation
Proper error handling
Tests for vendor ownership and authorization
Updated README/API documentation
Final Goal

By the end of Day 1, the existing commerce application should have a working multi-vendor foundation:

Users → Vendors → Products → Public Storefronts

with proper authentication, authorization, vendor ownership, and admin approval.