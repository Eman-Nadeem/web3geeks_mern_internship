import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireVendor, successResponse, errorResponse, AppError } from '@/lib/guards';
import { createSettlementSchema } from '@/lib/validations';
import { getVendorAvailableCommissionRecords, roundCurrency } from '@/lib/financials';

export async function GET(req: NextRequest) {
  try {
    const { vendor } = await requireVendor();
    const { searchParams } = new URL(req.url);

    const status = searchParams.get('status');

    const settlements = await prisma.settlement.findMany({
      where: {
        vendorId: vendor.id,
        ...(status ? { status: status as any } : {}),
      },
      include: {
        items: {
          include: {
            commissionRecord: {
              include: {
                vendorOrder: true,
              },
            },
          },
        },
      },
      orderBy: { requestedAt: 'desc' },
    });

    return successResponse(settlements);
  } catch (error: any) {
    if (error instanceof AppError) {
      return errorResponse(error.message, error.statusCode, error.details);
    }
    console.error('Error fetching settlements:', error);
    return errorResponse('Failed to fetch settlements.', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { vendor } = await requireVendor();

    let body = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const parseResult = createSettlementSchema.safeParse(body);
    const requestedAmount = parseResult.success ? parseResult.data.amount : undefined;

    // Run settlement creation inside single atomic transaction
    const newSettlement = await prisma.$transaction(
      async (tx) => {
        // 1. Fetch live available EARNED commission records that have no SettlementItem
        const availableRecords = await getVendorAvailableCommissionRecords(vendor.id, tx);

        if (!availableRecords || availableRecords.length === 0) {
          throw new AppError('No available earnings to settle. Orders must be delivered before earnings become available.', 400);
        }

        const maxAvailable = roundCurrency(
          availableRecords.reduce((sum: number, r: { vendorEarning: number }) => sum + r.vendorEarning, 0)
        );

        if (maxAvailable <= 0) {
          throw new AppError('Available balance is zero. Settlement request rejected.', 400);
        }

        if (requestedAmount && requestedAmount > maxAvailable) {
          throw new AppError(
            `Requested settlement amount (${requestedAmount}) exceeds available balance (${maxAvailable}).`,
            400
          );
        }

        const settlementAmount = maxAvailable;

        // 2. Generate unique settlement number
        const settlementCount = await tx.settlement.count();
        const settlementNumber = `SET-${1001 + settlementCount}-${Date.now().toString(36).toUpperCase().slice(-4)}`;

        const periodStart = availableRecords[0].createdAt;
        const periodEnd = availableRecords[availableRecords.length - 1].createdAt;

        // 3. Create Settlement
        const settlement = await tx.settlement.create({
          data: {
            settlementNumber,
            vendorId: vendor.id,
            amount: settlementAmount,
            currency: 'PKR',
            periodStart,
            periodEnd,
            status: 'PENDING',
            requestedAt: new Date(),
          },
        });

        // 4. Create SettlementItems to atomically lock each CommissionRecord
        for (const record of availableRecords) {
          await tx.settlementItem.create({
            data: {
              settlementId: settlement.id,
              commissionRecordId: record.id,
            },
          });
        }

        // 5. Append FinancialTransaction ledger entry
        await tx.financialTransaction.create({
          data: {
            vendorId: vendor.id,
            type: 'SETTLEMENT',
            amount: settlementAmount,
            direction: 'DEBIT',
            referenceId: settlement.id,
            description: `Settlement request ${settlement.settlementNumber} for ${availableRecords.length} completed order(s)`,
          },
        });

        return await tx.settlement.findUnique({
          where: { id: settlement.id },
          include: {
            items: {
              include: {
                commissionRecord: true,
              },
            },
          },
        });
      },
      {
        maxWait: 15000,
        timeout: 25000,
      }
    );

    return successResponse(newSettlement, 201);
  } catch (error: any) {
    if (error instanceof AppError) {
      return errorResponse(error.message, error.statusCode, error.details);
    }
    if (error.code === 'P2002' || error.message?.includes('Unique constraint')) {
      return errorResponse('Earnings are currently being settled in a concurrent request.', 400);
    }
    console.error('Error creating settlement request:', error);
    return errorResponse(error.message || 'Failed to request settlement.', 500);
  }
}
