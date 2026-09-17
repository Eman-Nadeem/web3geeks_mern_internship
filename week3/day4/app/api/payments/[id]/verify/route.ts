import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, successResponse, errorResponse, AppError } from '@/lib/guards';
import { verifyPaymentSchema } from '@/lib/validations';
import { getCurrentCommissionRate, calculateCommission } from '@/lib/financials';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    let body = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const parseResult = verifyPaymentSchema.safeParse(body);
    const simulatedStatus = parseResult.success ? parseResult.data.simulatedStatus : undefined;

    // 1. Re-fetch Payment and parent Order directly from DB (never trust request body)
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            vendorOrders: {
              include: {
                commissionRecord: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      return errorResponse('Payment record not found.', 404);
    }

    // Check customer authorization
    if (payment.customerId !== user.id && user.role !== 'ADMIN') {
      return errorResponse('Forbidden: You do not own this payment record.', 403);
    }

    // Verify amount integrity against parent order
    if (payment.amount !== payment.order.totalAmount) {
      return errorResponse(
        `Payment amount mismatch. Stored: ${payment.amount}, Order Total: ${payment.order.totalAmount}`,
        400
      );
    }

    // If client requested simulated failure
    if (simulatedStatus === 'FAILED') {
      const updatedPayment = await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'FAILED',
        },
      });

      return successResponse({
        verified: false,
        payment: updatedPayment,
        message: 'Payment verification marked as failed.',
      });
    }

    // 2. Idempotent state transition using conditional updateMany guard
    const updated = await prisma.$transaction(
      async (tx) => {
        // Atomic conditional check: only flip if status is currently PENDING
        const result = await tx.payment.updateMany({
          where: {
            id: payment.id,
            status: 'PENDING',
          },
          data: {
            status: 'PAID',
            paidAt: new Date(),
          },
        });

        // If count === 0, payment was already processed (or is in non-PENDING state)
        if (result.count === 0) {
          const freshPayment = await tx.payment.findUnique({
            where: { id: payment.id },
          });
          return {
            alreadyProcessed: true,
            payment: freshPayment,
          };
        }

        // First successful transition to PAID: execute financial ledger and commission creation
        // A. Update parent Order paymentStatus
        await tx.order.update({
          where: { id: payment.orderId },
          data: {
            paymentStatus: 'PAID',
            status: 'CONFIRMED',
          },
        });

        // B. Read current commission rate from CommissionSetting (snapshotting)
        const currentRate = await getCurrentCommissionRate(tx);

        // C. Record Payment in the FinancialTransaction ledger
        await tx.financialTransaction.create({
          data: {
            orderId: payment.orderId,
            type: 'PAYMENT',
            amount: payment.amount,
            direction: 'CREDIT',
            referenceId: payment.referenceId,
            description: `Payment received for Order ${payment.order.orderNumber}`,
          },
        });

        // D. Create CommissionRecord and ledger entries for each VendorOrder
        for (const vOrder of payment.order.vendorOrders) {
          // Check if commission record already exists for this vendor order
          const existingCommission = await tx.commissionRecord.findUnique({
            where: { vendorOrderId: vOrder.id },
          });

          if (!existingCommission) {
            const { grossAmount, commissionRate, commissionAmount, vendorEarning } = calculateCommission(
              vOrder.subtotal,
              currentRate
            );

            await tx.commissionRecord.create({
              data: {
                vendorId: vOrder.vendorId,
                orderId: payment.orderId,
                vendorOrderId: vOrder.id,
                grossAmount,
                commissionRate,
                commissionAmount,
                vendorEarning,
                currency: 'PKR',
                status: 'PENDING',
              },
            });

            // Write SALE ledger entry for gross sales
            await tx.financialTransaction.create({
              data: {
                vendorId: vOrder.vendorId,
                orderId: payment.orderId,
                vendorOrderId: vOrder.id,
                type: 'SALE',
                amount: grossAmount,
                direction: 'CREDIT',
                referenceId: payment.referenceId,
                description: `Gross sale for VendorOrder ${vOrder.vendorOrderNumber}`,
              },
            });

            // Write COMMISSION ledger entry for platform fee
            await tx.financialTransaction.create({
              data: {
                vendorId: vOrder.vendorId,
                orderId: payment.orderId,
                vendorOrderId: vOrder.id,
                type: 'COMMISSION',
                amount: commissionAmount,
                direction: 'DEBIT',
                referenceId: payment.referenceId,
                description: `Platform commission on VendorOrder ${vOrder.vendorOrderNumber} (${(commissionRate * 100).toFixed(1)}%)`,
              },
            });
          }
        }

        const freshPayment = await tx.payment.findUnique({
          where: { id: payment.id },
        });

        return {
          alreadyProcessed: false,
          payment: freshPayment,
        };
      },
      {
        maxWait: 15000,
        timeout: 25000,
      }
    );

    return successResponse({
      verified: updated.payment?.status === 'PAID',
      idempotentNoOp: updated.alreadyProcessed,
      payment: updated.payment,
      message: updated.alreadyProcessed
        ? 'Payment was already verified and processed.'
        : 'Payment successfully verified and recorded.',
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return errorResponse(error.message, error.statusCode, error.details);
    }
    console.error('Error verifying payment:', error);
    return errorResponse('Failed to verify payment.', 500);
  }
}
