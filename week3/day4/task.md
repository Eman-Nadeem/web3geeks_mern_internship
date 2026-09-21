Scenario

With the multi-vendor cart, checkout, order splitting, and inventory management completed on Day 3, today's focus is to implement the financial layer of the marketplace.

The platform should be able to process a customer payment, calculate the platform's commission, determine each vendor's earnings, and maintain a clear financial record for every vendor order.

The system should be designed so that customer payment, vendor earnings, platform commission, refunds, and settlement records remain traceable.

Task 1: Payment System

Implement a payment flow for customer orders.

Requirements

Support at least one payment method:

Cash on Delivery
Online Payment / Mock Payment Gateway

If a real payment gateway is not available, create a mock payment provider that simulates:

Pending
Successful
Failed

Do not mark an order as paid simply because the checkout request was submitted.

The payment status must be updated only after the payment process succeeds.

Task 2: Payment Entity

Create a dedicated payment model/entity.

A payment should contain:

Payment ID
Parent order ID
Customer
Amount
Currency
Payment method
Transaction/reference ID
Payment status
Gateway/provider
Paid at
Created at
Updated at

Suggested statuses:

Pending
Paid
Failed
Refunded
Partially Refunded

The transaction/reference ID should be unique.

Task 3: Payment Verification

Implement server-side payment verification.

Requirements

The backend should:

Validate the order.
Validate the payable amount.
Verify payment status.
Prevent duplicate payment processing.
Prevent the same transaction from being processed twice.
Update the order only after successful payment.

Do not trust the following values directly from the frontend:

Payment amount
Order total
Payment status
Transaction status

The backend must calculate and verify the values.

Task 4: Platform Commission

Introduce a marketplace commission system.

For every vendor order, calculate:

Vendor Order Subtotal
↓
Platform Commission
↓
Vendor Earnings

Example:

Vendor Order Subtotal: PKR 10,000

Platform Commission: 10%
Commission: PKR 1,000

Vendor Earnings: PKR 9,000
Requirements

The commission rate should be configurable.

Do not hardcode the commission percentage throughout the application.

For example:

Platform Commission = 10%

The rate may be stored in:

Admin settings
Database configuration
Marketplace configuration
Task 5: Commission Records

Create a commission record for every vendor order.

Store:

Vendor
Parent order
Vendor order
Gross amount
Commission rate
Commission amount
Vendor earning
Currency
Status
Created date

Suggested statuses:

Pending
Earned
Refunded
Cancelled
Important

Store the commission rate and calculated amounts at the time of the order.

If the admin later changes the commission rate, historical orders must not change.

Task 6: Vendor Earnings

Create a vendor earnings system.

Vendor dashboard should display:

Total Sales
Platform Commission
Net Earnings
Pending Earnings
Available Balance

Example:

Total Sales PKR 150,000
Commission PKR 15,000
Net Earnings PKR 135,000
Pending Earnings PKR 25,000
Available Balance PKR 110,000

The exact balance rules should be documented.

Task 7: Vendor Financial Dashboard

Create a financial section in the vendor dashboard.

Requirements

Vendor should be able to view:

Total sales
Total commission
Net earnings
Pending earnings
Available balance
Number of completed orders
Recent transactions

Provide filters for:

Date range
Order
Payment status
Transaction type

Example:

Date Order Gross Commission Earnings Status
Sep 17 #1001-A PKR 10,000 PKR 1,000 PKR 9,000 Earned
Sep 17 #1002-A PKR 5,000 PKR 500 PKR 4,500 Pending
Task 8: Admin Financial Dashboard

Create a basic admin financial overview.

Admin should be able to see:

Total Marketplace Sales
Total Platform Commission
Total Vendor Earnings
Pending Settlements
Completed Settlements
Refund Amount

Admin should be able to filter financial data by:

Vendor
Date range
Order
Payment status
Settlement status
Task 9: Vendor Settlement System

Implement a basic settlement/payout system.

Create a settlement entity containing:

Settlement ID
Vendor
Amount
Period
Status
Payment reference
Requested/created date
Processed date

Suggested statuses:

Pending
Processing
Paid
Rejected
Vendor

A vendor should be able to:

View available balance.
Request a settlement/payout.
View previous settlements.
Admin

Admin should be able to:

View payout requests.
Approve/process settlement.
Mark settlement as paid.
Reject a request where appropriate.
Task 10: Settlement Rules

Define clear rules for when vendor earnings become available.

For example:

Order Paid
↓
Vendor Earnings Pending
↓
Order Delivered
↓
Earnings Become Available
↓
Vendor Requests Settlement
↓
Admin Processes Settlement
↓
Settlement Paid

Document the chosen business rules.

Do not allow vendors to withdraw:

Pending earnings
Cancelled order earnings
Refunded amounts
Amounts already included in another settlement
Task 11: Refund & Cancellation Financial Handling

Integrate the financial system with the order lifecycle from Day 3.

When an eligible order is cancelled/refunded:

Update payment status where applicable.
Reverse the appropriate vendor earning.
Reverse or adjust the platform commission.
Update settlement calculations.
Create a financial transaction/history record.

Example:

Original Sale: PKR 10,000
Commission: PKR 1,000
Vendor Earnings: PKR 9,000

Refund:
Vendor Earnings -PKR 9,000
Platform Commission -PKR 1,000

Handle partial refunds if the existing order architecture supports them.

Task 12: Financial Transaction Ledger

Create a financial transaction/history system.

Every important financial event should create a record.

Examples:

PAYMENT
SALE
COMMISSION
REFUND
SETTLEMENT
ADJUSTMENT

Each record should include:

Transaction ID
Vendor
Order
Type
Amount
Direction
Reference
Description
Timestamp

This provides an auditable history of marketplace financial activity.

Task 13: Idempotency & Duplicate Protection

Prevent duplicate financial operations.

The system should handle situations such as:

Payment callback received twice.
User refreshes payment page.
Checkout request submitted twice.
Settlement request submitted repeatedly.
Same refund processed twice.

Use appropriate unique transaction/reference IDs or idempotency mechanisms.

A financial operation must not accidentally:

Charge customer twice
OR
Create commission twice
OR
Pay vendor twice
Task 14: Authorization & Financial Data Isolation
Customer

Can:

View their own payments.
View their own orders.
View refund/payment status.

Cannot:

View vendor earnings.
View marketplace commission data.
View another customer's payment information.
Vendor

Can:

View their own sales.
View their own commissions.
View their own earnings.
Request settlements.
View their own settlement history.

Cannot:

View another vendor's financial data.
Modify commission records.
Modify payment amounts.
Mark their own settlement as paid.
Admin

Can:

View marketplace financial data.
Configure commission rate.
Review vendor earnings.
Process settlements.
Manage refunds/financial adjustments where authorized.
API Requirements

Implement APIs according to the existing project architecture.

Payments
POST /payments
GET /payments/:id
POST /payments/:id/verify
Vendor Earnings
GET /vendor/earnings
GET /vendor/transactions
Settlements
POST /vendor/settlements
GET /vendor/settlements
GET /vendor/settlements/:id
Admin Financial APIs
GET /admin/financials
GET /admin/commissions
GET /admin/settlements
PATCH /admin/settlements/:id/status
Commission Settings
GET /admin/settings/commission
PATCH /admin/settings/commission

Adjust endpoint naming according to the existing project.

Frontend Requirements
Customer

Create/update:

Checkout payment section
Payment status
Order payment information
Order confirmation
Vendor

Create:

Earnings dashboard
Sales summary
Commission breakdown
Transaction history
Settlement request
Settlement history
Admin

Create:

Financial dashboard
Commission settings
Vendor earnings view
Settlement management
Payment/transaction history
Validation & Testing

Test at least the following:

Customer can initiate a payment.
Successful payment updates the correct order.
Failed payment does not mark the order as paid.
Duplicate payment callbacks do not create duplicate payments.
Correct commission is calculated.
Vendor earnings are calculated correctly.
Historical commission rates remain unchanged after rate changes.
Vendor can see only their own earnings.
Vendor cannot modify commission records.
Vendor cannot withdraw pending earnings.
Vendor can request a valid settlement.
Vendor cannot request more than their available balance.
Admin can process settlements.
Paid settlements reduce the available vendor balance.
Refunds correctly adjust vendor earnings and commission.
Cancelled orders do not incorrectly contribute to available earnings.
Financial transactions are recorded for payments, sales, commissions, refunds, and settlements.
Duplicate settlement requests are prevented.
Customer cannot access another customer's payment information.
Admin financial totals match the underlying order/payment records.
Deliverables
Payment model/entity
Payment processing flow
Payment verification
Payment status management
Configurable marketplace commission
Commission records
Vendor earnings calculation
Vendor financial dashboard
Admin financial dashboard
Vendor settlement/payout system
Settlement history
Refund/cancellation financial handling
Financial transaction ledger
Idempotency/duplicate protection
Role-based financial authorization
API validation and error handling
Tests
Updated README/API documentation
Final Goal

By the end of Day 4, the marketplace should have a complete financial flow:

Customer Checkout
↓
Payment
↓
Parent Order
↓
Vendor Orders
↓
┌─────┴─────┐
↓ ↓
Commission Vendor Earnings
↓ ↓
Platform Pending
Revenue ↓
Delivered
↓
Available Balance
↓
Settlement Request
↓
Admin Processing
↓
Vendor Paid

Day 4 should leave the system financially ready for Day 5 final integration, end-to-end testing, security validation, bug fixing, documentation, and production-readiness review.