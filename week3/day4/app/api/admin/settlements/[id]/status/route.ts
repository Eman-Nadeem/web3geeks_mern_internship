import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin, successResponse, errorResponse, isValidSettlementTransition, AppError } from '@/lib/guards';
import { updateSettlementStatusSchema } from '@/lib/validations';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();

    const parseResult = updateSettlementStatusSchema.safeParse(body);
    if (!parseResult.success) {
      return errorResponse('Invalid settlement status update data.', 400, parseResult.error.flatten().fieldErrors);
    }

    const { status: nextStatus, paymentReference } = parseResult.data;

    const settlement = await prisma.settlement.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });

    if (!settlement) {
      return errorResponse('Settlement not found.', 404);
    }

    if (!isValidSettlementTransition(settlement.status, nextStatus)) {
      return errorResponse(
        `Invalid status transition from ${settlement.status} to ${nextStatus}.`,
        400
      );
    }

    const updatedSettlement = await prisma.$transaction(
      async (tx) => {
        if (nextStatus === 'PAID') {
          const updated = await tx.settlement.update({
            where: { id: settlement.id },
            data: {
              status: 'PAID',
              paymentReference: paymentReference || undefined,
              processedAt: new Date(),
            },
            include: {
              items: {
                include: {
                  commissionRecord: true,
                },
              },
            },
          });

          // Append settlement payout confirmation ledger entry
          await tx.financialTransaction.create({
            data: {
              vendorId: settlement.vendorId,
              type: 'SETTLEMENT',
              amount: settlement.amount,
              direction: 'DEBIT',
              referenceId: paymentReference,
              description: `Settlement payout completed for ${settlement.settlementNumber}. Reference: ${paymentReference}`,
            },
          });

          return updated;
        } else if (nextStatus === 'REJECTED') {
          // Release locked commission records by deleting settlement item join rows
          await tx.settlementItem.deleteMany({
            where: { settlementId: settlement.id },
          });

          const updated = await tx.settlement.update({
            where: { id: settlement.id },
            data: {
              status: 'REJECTED',
              processedAt: new Date(),
            },
            include: {
              items: true,
            },
          });

          // Append reversal ledger entry
          await tx.financialTransaction.create({
            data: {
              vendorId: settlement.vendorId,
              type: 'ADJUSTMENT',
              amount: settlement.amount,
              direction: 'CREDIT',
              referenceId: settlement.id,
              description: `Settlement request ${settlement.settlementNumber} rejected. Earnings released back to available balance.`,
            },
          });

          return updated;
        } else {
          // PROCESSING
          return await tx.settlement.update({
            where: { id: settlement.id },
            data: {
              status: 'PROCESSING',
            },
            include: {
              items: true,
            },
          });
        }
      },
      {
        maxWait: 15000,
        timeout: 25000,
      }
    );

    return successResponse(updatedSettlement);
  } catch (error: any) {
    if (error instanceof AppError) {
      return errorResponse(error.message, error.statusCode, error.details);
    }
    console.error('Error updating settlement status:', error);
    return errorResponse('Failed to update settlement status.', 500);
  }
}
